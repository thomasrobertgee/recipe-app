# backend/main.py

from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File # <-- Added UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from contextlib import asynccontextmanager
from typing import List, Optional, Dict
# --- FIX: Import SQLModel here ---
from sqlmodel import SQLModel, Session, select, func, delete, Float # Added SQLModel
# --- END FIX ---
from sqlalchemy.orm import selectinload
from datetime import date
import os
import shutil # <-- Added shutil for file operations
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests # Added requests
# --- NEW VISION IMPORTS ---
from google.cloud import vision
import io
# --- END NEW VISION IMPORTS ---
# --- Import BaseModel for type hint in modify endpoint ---
from pydantic import BaseModel


from database import engine, create_db_and_tables, get_session
from models import (
    User, Recipe, Ingredient, RecipeIngredientLink, PriceHistory,
    UserRecipeRatingLink, UserPantryLink, UserRecipeLink,
    SupplierProfile # <-- NEW IMPORT
)
from schemas import (
    GenerateRequest, UserCreate, UserRead, UserUpdate, Token,
    RecipeResponse, IngredientInRecipe, RecipeCreate, PriceHistoryCreate,
    PriceHistoryRead, RecipeRating, PantryItem, PantryItemCreate,
    RecipeModificationRequest, GoogleLoginRequest,
    BarcodeLookupResponse,
    SupplierRegistrationRequest, SupplierProfileRead # <-- NEW IMPORTS
)
from security import get_password_hash, verify_password, create_access_token, get_current_user
# --- IMPORT NEW AI FUNCTION ---
from ai_service import (
    generate_recipes_from_specials,
    modify_recipe_with_ai,
    parse_receipt_text_with_ai # <-- IMPORT PARSE FUNCTION
)
# --- END IMPORT ---

origins = [
    "http://localhost:5173",
    "http://192.168.1.102:5173" # Make sure this matches your PC's IP if testing mobile
]

# --- Directory to save uploaded receipts (optional) ---
UPLOAD_DIR = "uploaded_receipts"
os.makedirs(UPLOAD_DIR, exist_ok=True) # Create directory if it doesn't exist

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up... 🚀")
    create_db_and_tables()
    # --- Initialize Google Vision Client ---
    # This automatically uses GOOGLE_APPLICATION_CREDENTIALS env var
    try:
        # Check if credentials env var is set before initializing
        if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            app.state.vision_client = vision.ImageAnnotatorClient()
            print("Google Vision Client initialized successfully.")
        else:
            print("WARNING: GOOGLE_APPLICATION_CREDENTIALS not set. Vision API will not work.")
            app.state.vision_client = None
    except Exception as e:
        print(f"ERROR: Failed to initialize Google Vision Client: {e}")
        app.state.vision_client = None # Set to None if init fails
    # --- End Vision Client Init ---
    yield
    print("Shutting down...")

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- NEW SUPPLIER DEPENDENCY ---
def get_current_supplier(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> SupplierProfile:
    if current_user.role != "supplier":
        raise HTTPException(status_code=403, detail="Access forbidden: Not a supplier.")

    # Eagerly load the supplier profile
    supplier_user = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.supplier_profile))
    ).first()

    if not supplier_user or not supplier_user.supplier_profile: # Added check for supplier_user itself
        # This should not happen if registration is correct, but it's good practice
        print(f"CRITICAL: Supplier user ID {current_user.id} found but profile relationship is missing.")
        raise HTTPException(status_code=404, detail="Supplier profile not found.")

    return supplier_user.supplier_profile
# --- END NEW DEPENDENCY ---


# --- UPDATED with logging ---
def get_or_create_ingredient(name: str, session: Session, category: Optional[str] = None) -> Optional[Ingredient]: # Return Optional
    # Basic input sanitization
    cleaned_name = name.strip()
    if not cleaned_name:
        # Avoid creating ingredients with empty names
        print("--- [get_or_create_ingredient] Received empty name, skipping.")
        return None # Return None

    print(f"--- [get_or_create_ingredient] Called with cleaned name: '{cleaned_name}', category: '{category}'")

    # Attempt exact match (case-insensitive)
    search_name_lower = cleaned_name.lower()
    exact_match = session.exec(select(Ingredient).where(func.lower(Ingredient.name) == search_name_lower)).first()

    if exact_match:
        print(f"--- [get_or_create_ingredient] Found existing ingredient ID: {exact_match.id}, Name: {exact_match.name}")
        # Update category if provided and missing
        if category and not exact_match.category:
            print(f"--- [get_or_create_ingredient] Updating category to '{category}' for ingredient ID: {exact_match.id}")
            exact_match.category = category
            session.add(exact_match)
        return exact_match
    else:
        # Create new ingredient
        print(f"--- [get_or_create_ingredient] No exact match found. Creating new ingredient: '{cleaned_name}' with category: '{category}'")
        new_ingredient = Ingredient(name=cleaned_name, category=category)
        session.add(new_ingredient)
        try: # Wrap flush/refresh in try-except in case of issues before final commit
            session.flush() # Assigns ID without full commit
            session.refresh(new_ingredient) # Ensure object has ID
            print(f"--- [get_or_create_ingredient] Created new ingredient ID: {new_ingredient.id}")
            return new_ingredient
        except Exception as e:
            print(f"--- [get_or_create_ingredient] Error during flush/refresh for new ingredient '{cleaned_name}': {e}")
            # session.rollback() # Let the main endpoint handle the rollback.
            return None

# --- END UPDATE ---

def _save_recipe_to_db(recipe_data: RecipeCreate, session: Session) -> Recipe:
    new_recipe = Recipe(
        title=recipe_data.title,
        description=recipe_data.description,
        instructions=recipe_data.instructions,
        tags=recipe_data.tags
    )
    session.add(new_recipe)
    session.flush() # Flush to get recipe ID before adding links

    for ing_data in recipe_data.ingredients:
        ingredient = get_or_create_ingredient(ing_data.name, session, category=None)
        if ingredient: # Check if ingredient was successfully created/found
            if ingredient.id is None:
                 session.flush() # Flush again if needed to get ingredient ID
                 session.refresh(ingredient)

            if new_recipe.id is None: # Should have ID after initial flush, but double-check
                 print(f"Warning: Recipe ID is None before creating link for ingredient '{ing_data.name}'")
                 continue

            if ingredient.id is None: # Should have ID now, but final check
                 print(f"Warning: Ingredient ID is None before creating link for ingredient '{ing_data.name}'")
                 continue

            link = RecipeIngredientLink(recipe_id=new_recipe.id, ingredient_id=ingredient.id, quantity=ing_data.quantity)
            session.add(link)
        else:
            print(f"Warning: Skipping ingredient link for invalid name: '{ing_data.name}' in recipe '{recipe_data.title}'")

    session.refresh(new_recipe) # Refresh to load relationships if needed by caller immediately
    return new_recipe


@app.post("/register", response_model=UserRead)
def create_user(user: UserCreate, session: Session = Depends(get_session)):
    existing_user = session.exec(select(User).where(User.email == user.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        hashed_password=hashed_password,
        adult_count=1,
        child_count=0,
        weekly_budget=None,
        has_completed_onboarding=False
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user


# --- NEW SUPPLIER REGISTRATION ---
@app.post("/register/supplier", response_model=UserRead)
def create_supplier(request: SupplierRegistrationRequest, session: Session = Depends(get_session)):
    existing_user = session.exec(select(User).where(User.email == request.user.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(request.user.password)
    new_user = User(
        email=request.user.email,
        hashed_password=hashed_password,
        role="supplier",
        has_completed_onboarding=True
    )
    session.add(new_user)
    session.flush()
    session.refresh(new_user)

    if new_user.id is None:
        print("CRITICAL: User ID not generated after flush in supplier registration.")
        raise HTTPException(status_code=500, detail="Failed to create supplier user record.")


    new_profile = SupplierProfile(
        user_id=new_user.id,
        business_name=request.profile.business_name,
        address=request.profile.address
    )
    session.add(new_profile)
    try:
        session.commit()
        session.refresh(new_user)
        session.refresh(new_profile)
    except Exception as e:
        session.rollback()
        print(f"Error committing supplier profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to save supplier profile.")

    return new_user
# --- END NEW SUPPLIER REGISTRATION ---


@app.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer")


@app.post("/api/auth/google", response_model=Token)
def login_with_google(google_token: GoogleLoginRequest, session: Session = Depends(get_session)):
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not google_client_id:
        raise HTTPException(status_code=500, detail="Google Client ID not configured")

    try:
        id_info = id_token.verify_oauth2_token(
            google_token.token,
            google_requests.Request(),
            google_client_id
        )

        email = id_info['email']
        google_sub = id_info['sub']

        user = session.exec(select(User).where(User.google_user_id == google_sub)).first()
        if user:
            access_token = create_access_token(data={"sub": user.email})
            return Token(access_token=access_token, token_type="bearer")

        user = session.exec(select(User).where(User.email == email)).first()
        if user:
            if not user.google_user_id:
                 user.google_user_id = google_sub
                 session.add(user)
                 session.commit()
                 session.refresh(user)
            access_token = create_access_token(data={"sub": user.email})
            return Token(access_token=access_token, token_type="bearer")

        new_user = User(
            email=email,
            google_user_id=google_sub,
            hashed_password=None,
            adult_count=1,
            child_count=0,
            weekly_budget=None,
            has_completed_onboarding=False
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)

        access_token = create_access_token(data={"sub": new_user.email})
        return Token(access_token=access_token, token_type="bearer")

    except ValueError as e:
        print(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except Exception as e:
        print(f"Error during Google auth: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")


@app.get("/users/me", response_model=UserRead)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.put("/users/me", response_model=UserRead)
def update_user_me(user_update: UserUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == 'weekly_budget' and value is None:
             setattr(current_user, key, None)
        elif value is not None:
            setattr(current_user, key, value)

    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


@app.get("/api/users/me/saved-recipes", response_model=List[RecipeResponse])
def get_saved_recipes(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    user_with_recipes = session.exec(
        select(User)
        .where(User.id == current_user.id)
        .options(
            selectinload(User.saved_recipes)
            .selectinload(Recipe.links)
            .selectinload(RecipeIngredientLink.ingredient)
        )
    ).first()

    if not user_with_recipes:
        raise HTTPException(status_code=404, detail="User not found")

    response_recipes = []
    for recipe in user_with_recipes.saved_recipes:
         if not recipe.links:
              print(f"Warning: Recipe {recipe.id} ('{recipe.title}') loaded without ingredient links.")
              response_ingredients = []
         else:
             response_ingredients = []
             for link in recipe.links:
                 if link.ingredient:
                     response_ingredients.append(
                         IngredientInRecipe(
                             ingredient_id=link.ingredient.id,
                             name=link.ingredient.name,
                             quantity=link.quantity
                         )
                     )
                 else:
                      print(f"Warning: Ingredient link in recipe {recipe.id} missing ingredient data.")

         avg_rating = 0.0
         if recipe.rating_count > 0:
             avg_rating = round(float(recipe.total_rating) / float(recipe.rating_count), 1)

         response_recipe = RecipeResponse(
             id=recipe.id,
             title=recipe.title,
             description=recipe.description,
             instructions=recipe.instructions,
             ingredients=response_ingredients,
             tags=recipe.tags or [],
             total_rating=recipe.total_rating,
             rating_count=recipe.rating_count,
             average_rating=avg_rating
         )
         response_recipes.append(response_recipe)

    return response_recipes


@app.post("/api/users/me/saved-recipes/{recipe_id}", status_code=201)
def save_a_recipe(recipe_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    user = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.saved_recipes))
    ).first()

    if not user:
         raise HTTPException(status_code=404, detail="User not found")

    if not any(saved.id == recipe.id for saved in user.saved_recipes):
        user.saved_recipes.append(recipe)
        session.add(user)
        session.commit()
        print(f"User {current_user.id} saved recipe {recipe_id}")
        return {"message": "Recipe saved successfully"}
    else:
        print(f"Recipe {recipe_id} already saved by user {current_user.id}")
        return {"message": "Recipe already saved"}


@app.delete("/api/users/me/saved-recipes/{recipe_id}", status_code=204)
def unsave_a_recipe(recipe_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        print(f"Attempt to unsave non-existent recipe ID {recipe_id} by user {current_user.id}")
        return

    user = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.saved_recipes))
    ).first()

    if not user:
         raise HTTPException(status_code=404, detail="User not found")

    recipe_to_remove = next((saved for saved in user.saved_recipes if saved.id == recipe_id), None)

    if recipe_to_remove:
        user.saved_recipes.remove(recipe_to_remove)
        session.add(user)
        session.commit()
        print(f"User {current_user.id} unsaved recipe {recipe_id}")
    else:
         print(f"User {current_user.id} tried to unsave recipe {recipe_id}, but it was not in their list.")


@app.get("/api/pantry", response_model=List[PantryItem])
def get_pantry_items(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    user_with_pantry = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.pantry_items))
    ).first()
    if not user_with_pantry:
        raise HTTPException(status_code=404, detail="User not found")

    return [PantryItem(ingredient_id=ing.id, name=ing.name, category=ing.category) for ing in user_with_pantry.pantry_items]


# --- UPDATED with logging & check for None ingredient ---
@app.post("/api/pantry", response_model=PantryItem)
def add_pantry_item(item: PantryItemCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    print(f"--- [POST /api/pantry] Received request to add item name: '{item.ingredient_name}' for user ID: {current_user.id}")

    ingredient = get_or_create_ingredient(item.ingredient_name, session, category=None)
    if not ingredient:
        raise HTTPException(status_code=400, detail="Invalid ingredient name provided.")

    print(f"--- [POST /api/pantry] get_or_create_ingredient returned ingredient ID: {ingredient.id}, Name: {ingredient.name}")

    user = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.pantry_items))
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if any(pantry_item.id == ingredient.id for pantry_item in user.pantry_items):
        print(f"--- [POST /api/pantry] Item '{ingredient.name}' (ID: {ingredient.id}) already in pantry for user ID: {current_user.id}. Skipping add.")
    else:
        print(f"--- [POST /api/pantry] Adding ingredient ID: {ingredient.id} to pantry for user ID: {current_user.id}")
        user.pantry_items.append(ingredient)
        session.add(user)
        session.commit()
        print(f"--- [POST /api/pantry] Commit successful.")

    return PantryItem(ingredient_id=ingredient.id, name=ingredient.name, category=ingredient.category)
# --- END UPDATE ---


@app.delete("/api/pantry/{ingredient_id}", status_code=204)
def remove_pantry_item(ingredient_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    ingredient = session.get(Ingredient, ingredient_id)
    if not ingredient:
        print(f"Attempt to remove non-existent ingredient ID {ingredient_id} from pantry for user {current_user.id}")
        return

    user = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.pantry_items))
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    item_to_remove = next((item for item in user.pantry_items if item.id == ingredient_id), None)

    if item_to_remove:
        user.pantry_items.remove(item_to_remove)
        session.add(user)
        session.commit()
        print(f"Removed ingredient ID {ingredient_id} from pantry for user {current_user.id}")
    else:
        print(f"Ingredient ID {ingredient_id} not found in pantry for user {current_user.id}")


# --- UPDATED RECEIPT SCAN ENDPOINT with OCR/AI ---
@app.post("/api/pantry/scan-receipt")
async def scan_receipt_endpoint(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    vision_client: vision.ImageAnnotatorClient = Depends(lambda: app.state.vision_client)
):
    print(f"--- [POST /api/pantry/scan-receipt] Received file: {file.filename}, Content-Type: {file.content_type}")

    if not vision_client:
        print("--- [POST /api/pantry/scan-receipt] Google Vision Client not initialized. Check credentials/startup.")
        raise HTTPException(status_code=503, detail="OCR service is not available.")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    try:
        content = await file.read()
        image = vision.Image(content=content)
        print(f"--- [POST /api/pantry/scan-receipt] Image content read ({len(content)} bytes).")
    except Exception as e:
        print(f"--- [POST /api/pantry/scan-receipt] Error reading file content: {e}")
        raise HTTPException(status_code=500, detail="Could not read uploaded file content.")
    finally:
        await file.close()

    extracted_text = ""
    try:
        print("--- [POST /api/pantry/scan-receipt] Sending request to Google Vision API for DOCUMENT_TEXT_DETECTION...")
        response = vision_client.document_text_detection(image=image)

        if response.error.message:
            print(f"--- [POST /api/pantry/scan-receipt] Google Vision API Error: {response.error.message}")
            raise Exception(f"Vision API Error: {response.error.message}")

        if response.full_text_annotation:
            extracted_text = response.full_text_annotation.text
            print(f"--- [POST /api/pantry/scan-receipt] OCR successful. Extracted text (first 500 chars):\n{extracted_text[:500]}...")
        else:
            print("--- [POST /api/pantry/scan-receipt] OCR completed, but no text found in the image.")
            return {"message": "Receipt processed, but no text was detected in the image.", "added_items": []}

    except Exception as e:
        print(f"--- [POST /api/pantry/scan-receipt] Error during Google Vision OCR: {e}")
        raise HTTPException(status_code=502, detail="Failed to process image using OCR service.")

    item_names = parse_receipt_text_with_ai(extracted_text)

    if not item_names:
        print("--- [POST /api/pantry/scan-receipt] AI parsing returned no items from the extracted text.")
        return {"message": "Receipt text extracted, but AI could not identify grocery items.", "added_items": []}

    added_item_details = []
    items_added_count = 0
    items_already_present = 0

    user = session.exec(select(User).where(User.id == current_user.id).options(selectinload(User.pantry_items))).first()
    if not user:
        print(f"--- [POST /api/pantry/scan-receipt] CRITICAL: Could not find user with ID {current_user.id} after authentication.")
        raise HTTPException(status_code=404, detail="User not found.")

    current_pantry_ids = {item.id for item in user.pantry_items}

    print(f"--- [POST /api/pantry/scan-receipt] Attempting to add {len(item_names)} items parsed by AI...")

    needs_commit = False
    for name in item_names:
        try:
            ingredient = get_or_create_ingredient(name, session)
            if ingredient:
                if ingredient.id not in current_pantry_ids:
                    user.pantry_items.append(ingredient)
                    added_item_details.append({"name": ingredient.name, "id": ingredient.id})
                    items_added_count += 1
                    current_pantry_ids.add(ingredient.id)
                    needs_commit = True
                    print(f"--- [POST /api/pantry/scan-receipt] Marked '{ingredient.name}' (ID: {ingredient.id}) for addition.")
                else:
                     items_already_present += 1
                     print(f"--- [POST /api/pantry/scan-receipt] Item '{ingredient.name}' (ID: {ingredient.id}) already in pantry.")
        except Exception as e:
             print(f"--- [POST /api/pantry/scan-receipt] Error processing/adding item '{name}': {e}")

    if needs_commit:
        try:
            session.add(user)
            session.commit()
            print(f"--- [POST /api/pantry/scan-receipt] Committed {items_added_count} new items to pantry.")
        except Exception as e:
            session.rollback()
            print(f"--- [POST /api/pantry/scan-receipt] CRITICAL: Failed to commit pantry updates: {e}")
            raise HTTPException(status_code=500, detail="Failed to save pantry updates.")
    else:
         print(f"--- [POST /api/pantry/scan-receipt] No new items needed to be committed.")


    return {
        "message": f"Receipt processed. Added {items_added_count} new item(s). {items_already_present} item(s) already present.",
        "added_items": added_item_details
    }
# --- END UPDATED ENDPOINT ---


@app.get("/api/ingredients/search", response_model=List[PantryItem])
def search_ingredients(q: str, session: Session = Depends(get_session)):
    if not q or len(q) < 2: return []
    search_term = f"%{q.lower()}%"
    ingredients = session.exec(select(Ingredient).where(func.lower(Ingredient.name).like(search_term)).limit(10)).all()
    return [PantryItem(ingredient_id=ing.id, name=ing.name, category=ing.category) for ing in ingredients]

@app.get("/api/ingredients/staples", response_model=Dict[str, List[PantryItem]])
def get_staple_ingredients(session: Session = Depends(get_session)):
    staples = session.exec(select(Ingredient).where(Ingredient.is_staple == True).order_by(Ingredient.category, Ingredient.name)).all()
    categorized_staples = {}
    for staple in staples:
        category = staple.category or "Other"
        if category not in categorized_staples: categorized_staples[category] = []
        categorized_staples[category].append(PantryItem(ingredient_id=staple.id, name=staple.name, category=staple.category))
    return dict(sorted(categorized_staples.items()))

@app.get("/api/barcode-lookup/{barcode}", response_model=BarcodeLookupResponse)
def lookup_barcode(barcode: str):
    off_api_url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
    print(f"--- [GET /api/barcode-lookup] Proxying request to: {off_api_url}")
    try:
        response = requests.get(off_api_url, timeout=10)
        response.raise_for_status()
        data = response.json()
        print(f"--- [GET /api/barcode-lookup] Received response status: {data.get('status')}")
        if data.get("status") == 1 and data.get("product") and data["product"].get("product_name"):
            product_name = data["product"]["product_name"]
            print(f"--- [GET /api/barcode-lookup] Barcode {barcode} found: {product_name}")
            return BarcodeLookupResponse(product_name=product_name)
        else:
            print(f"--- [GET /api/barcode-lookup] Product not found for barcode {barcode} in OFF API response.")
            return BarcodeLookupResponse(error="Product not found in Open Food Facts database.")
    except requests.exceptions.HTTPError as http_err:
        status_code = http_err.response.status_code
        if status_code == 404:
            print(f"--- [GET /api/barcode-lookup] OFF API returned 404 for barcode {barcode}")
            return BarcodeLookupResponse(error="Product not found (404).")
        else:
            print(f"--- [GET /api/barcode-lookup] HTTP error occurred: {http_err} - Status code: {status_code}")
            raise HTTPException(status_code=502, detail=f"Failed to fetch data from Open Food Facts: HTTP {status_code}")
    except requests.exceptions.RequestException as req_err:
        print(f"--- [GET /api/barcode-lookup] Request error occurred: {req_err}")
        raise HTTPException(status_code=503, detail="Could not connect to the barcode lookup service.")
    except Exception as e:
        print(f"--- [GET /api/barcode-lookup] An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during barcode lookup.")


# --- NEW SUPPLIER PORTAL API ---
@app.get("/api/supplier/specials", response_model=List[PriceHistoryRead])
def get_supplier_specials(
    profile: SupplierProfile = Depends(get_current_supplier),
    session: Session = Depends(get_session)
):
    """Gets all specials for the currently logged-in supplier."""
    today = date.today()
    db_prices = session.exec(
        select(PriceHistory)
        .where(
            PriceHistory.store == profile.business_name,
            PriceHistory.date_recorded == today
        )
        .options(selectinload(PriceHistory.ingredient))
    ).all()

    return [
        PriceHistoryRead(
            id=p.id, ingredient_id=p.ingredient_id, date_recorded=p.date_recorded.isoformat(), price=p.price,
            store=p.store, ingredient_name=p.ingredient.name, category=p.ingredient.category
        ) for p in db_prices
    ]

@app.post("/api/supplier/specials", response_model=PriceHistoryRead)
def create_supplier_special(
    price_data: PriceHistoryCreate,
    profile: SupplierProfile = Depends(get_current_supplier),
    session: Session = Depends(get_session)
):
    """Creates a new special for the logged-in supplier."""
    price_data.store = profile.business_name

    ingredient = get_or_create_ingredient(price_data.ingredient_name, session, category=price_data.category)
    if not ingredient: raise HTTPException(status_code=400, detail="Invalid ingredient name")

    today = date.today()

    existing_record = session.exec(select(PriceHistory).where(
        PriceHistory.ingredient_id == ingredient.id,
        PriceHistory.store == profile.business_name,
        PriceHistory.date_recorded == today
    )).first()

    if existing_record:
        print(f"Updating price for {ingredient.name} at {profile.business_name}")
        existing_record.price = price_data.price
        session.add(existing_record)
        session.commit()
        session.refresh(existing_record)
        new_price_record = existing_record
    else:
        print(f"Creating new price for {ingredient.name} at {profile.business_name}")
        new_price_record = PriceHistory(
            ingredient_id=ingredient.id,
            price=price_data.price,
            store=profile.business_name,
            date_recorded=today
        )
        session.add(new_price_record)
        session.commit()
        session.refresh(new_price_record)

    return PriceHistoryRead(
        id=new_price_record.id, ingredient_id=ingredient.id, date_recorded=new_price_record.date_recorded.isoformat(),
        price=new_price_record.price, store=new_price_record.store, ingredient_name=ingredient.name, category=ingredient.category
    )

@app.delete("/api/supplier/specials/{price_id}", status_code=204)
def delete_supplier_special(
    price_id: int,
    profile: SupplierProfile = Depends(get_current_supplier),
    session: Session = Depends(get_session)
):
    """Deletes a special, ensuring it belongs to the logged-in supplier."""
    special = session.get(PriceHistory, price_id)

    if not special:
        raise HTTPException(status_code=404, detail="Special not found.")

    if special.store != profile.business_name:
        print(f"Forbidden: Supplier {profile.business_name} tried to delete special for {special.store}")
        raise HTTPException(status_code=403, detail="Not authorized to delete this special.")

    session.delete(special)
    session.commit()
    print(f"Supplier {profile.business_name} deleted special ID {price_id}")

# --- END NEW SUPPLIER PORTAL API ---


@app.get("/")
def read_root(): return {"message": "Welcome!"}

# --- *** Updated generate_recipes_endpoint to REMOVE auto-saving *** ---
@app.post("/api/generate-recipes")
def generate_recipes_endpoint(request: GenerateRequest, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    ai_generated_recipes = generate_recipes_from_specials(
        specials_list=request.specials, preferences=request.preferences, pantry_items=request.pantry_items
    )
    saved_recipes_count = 0
    if not isinstance(ai_generated_recipes, list):
        print(f"AI service did not return a list: {ai_generated_recipes}")
        raise HTTPException(status_code=500, detail="AI failed to generate recipes in expected format.")

    # # --- REMOVED: Don't fetch user or saved recipes here ---
    # user = session.exec(select(User).where(User.id == current_user.id).options(selectinload(User.saved_recipes))).first()
    # if not user:
    #     raise HTTPException(status_code=404, detail="User not found")
    # saved_ids = {r.id for r in user.saved_recipes}
    # # --- END REMOVED ---

    recipes_to_return = []

    for recipe_dict in ai_generated_recipes:
        if not isinstance(recipe_dict, dict):
            print(f"AI generated item is not a dictionary: {recipe_dict}"); continue
        try:
            if 'ingredients' not in recipe_dict or not isinstance(recipe_dict['ingredients'], list):
                print(f"Skipping recipe due to missing or invalid ingredients: {recipe_dict.get('title')}"); continue
            if 'title' not in recipe_dict or not recipe_dict['title']:
                 print(f"Skipping recipe due to missing title.")
                 continue

            recipe_data = RecipeCreate(**recipe_dict)
            saved_recipe = _save_recipe_to_db(recipe_data, session) # Just save the recipe

            if saved_recipe.id is None:
                 print(f"Error: Saved recipe '{saved_recipe.title}' has no ID after saving.")
                 continue

            # --- REMOVED: Don't link recipe to user automatically ---
            # if saved_recipe.id not in saved_ids:
            #     user.saved_recipes.append(saved_recipe)
            #     session.add(user)
            #     saved_ids.add(saved_recipe.id)
            #     saved_recipes_count += 1
            #     recipes_to_return.append(saved_recipe)
            # else:
            #      print(f"Recipe '{saved_recipe.title}' (ID: {saved_recipe.id}) already exists or was already saved by user.")
            # --- END REMOVED ---

            # Increment count for successful saves, even if not linked to user here
            saved_recipes_count += 1


        except Exception as e:
             print(f"Could not validate or save AI recipe '{recipe_dict.get('title', 'N/A')}': {e}")

    try:
        session.commit() # Commit only the new recipes and their ingredients
    except Exception as e:
         session.rollback()
         print(f"Error committing generated recipes: {e}")
         raise HTTPException(status_code=500, detail="Failed to save generated recipes.")

    # Updated message to reflect only generation/saving, not linking
    return {"message": f"Successfully generated and saved {saved_recipes_count} new recipes to the database."}
# --- *** END Updated generate_recipes_endpoint *** ---

@app.get("/api/prices/today", response_model=List[PriceHistoryRead])
def get_todays_prices(session: Session = Depends(get_session)):
    today = date.today()
    db_prices = session.exec(select(PriceHistory).where(PriceHistory.date_recorded == today).options(selectinload(PriceHistory.ingredient))).all()
    return [
        PriceHistoryRead(
            id=p.id, ingredient_id=p.ingredient_id, date_recorded=p.date_recorded.isoformat(), price=p.price,
            store=p.store, ingredient_name=p.ingredient.name, category=p.ingredient.category
        ) for p in db_prices
    ]

@app.post("/api/prices", response_model=PriceHistoryRead)
def create_price_record(price_data: PriceHistoryCreate, session: Session = Depends(get_session)):
    ingredient = get_or_create_ingredient(price_data.ingredient_name, session, category=price_data.category)
    if not ingredient: raise HTTPException(status_code=400, detail="Invalid ingredient name")
    today = date.today()
    existing_record = session.exec(select(PriceHistory).where(
        PriceHistory.ingredient_id == ingredient.id, PriceHistory.store == price_data.store, PriceHistory.date_recorded == today
    )).first()
    if existing_record:
        if existing_record.price != price_data.price:
            existing_record.price = price_data.price
            session.add(existing_record); session.commit(); session.refresh(existing_record)
            print(f"Updated price for {ingredient.name} at {price_data.store} for {today}")
            new_price_record = existing_record
        else:
            print(f"Skipping duplicate price for {ingredient.name} at {price_data.store} for {today}")
            new_price_record = existing_record
    else:
        new_price_record = PriceHistory(ingredient_id=ingredient.id, price=price_data.price, store=price_data.store, date_recorded=today)
        session.add(new_price_record); session.commit(); session.refresh(new_price_record)
        print(f"Created new price for {ingredient.name} at {price_data.store} for {today}")
    return PriceHistoryRead(
        id=new_price_record.id, ingredient_id=ingredient.id, date_recorded=new_price_record.date_recorded.isoformat(),
        price=new_price_record.price, store=new_price_record.store, ingredient_name=ingredient.name, category=ingredient.category
    )

@app.delete("/api/prices/today")
def delete_todays_prices(session: Session = Depends(get_session)):
    today = date.today()
    try:
        statement = delete(PriceHistory).where(PriceHistory.date_recorded == today)
        result = session.exec(statement); session.commit()
        deleted_count = result.rowcount
        print(f"Deleted {deleted_count} price records for {today}.")
        return {"message": f"Today's {deleted_count} price records have been cleared."}
    except Exception as e:
        session.rollback(); print(f"Error deleting prices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ingredient/{ingredient_id}/price-history", response_model=List[PriceHistoryRead])
def get_price_history_for_ingredient(ingredient_id: int, session: Session = Depends(get_session)):
    ingredient = session.get(Ingredient, ingredient_id)
    if not ingredient: raise HTTPException(status_code=404, detail="Ingredient not found.")
    history = session.exec(select(PriceHistory).where(PriceHistory.ingredient_id == ingredient_id).order_by(PriceHistory.date_recorded.desc())).all()
    return [
        PriceHistoryRead(
            id=h.id, ingredient_id=h.ingredient_id, date_recorded=h.date_recorded.isoformat(), price=h.price,
            store=h.store, ingredient_name=ingredient.name
        ) for h in history
    ]

@app.get("/api/tags", response_model=List[str])
def get_all_tags(session: Session = Depends(get_session)):
    all_recipes = session.exec(select(Recipe.tags)).all()
    all_tags = set()
    for tags_list in all_recipes:
        actual_list = tags_list[0] if isinstance(tags_list, tuple) else tags_list
        if actual_list and isinstance(actual_list, list):
            for tag in actual_list:
                 if isinstance(tag, str):
                      all_tags.add(tag.strip())

    return sorted(list(all_tags))


# --- *** UPDATED /api/recipes Endpoint *** ---
@app.get("/api/recipes", response_model=List[RecipeResponse])
def get_recipes(
    session: Session = Depends(get_session), min_rating: Optional[float] = Query(None, ge=1, le=5),
    sort_by: Optional[str] = Query(None), tags: Optional[str] = Query(None)
):
    query = select(Recipe).options(
        selectinload(Recipe.links).selectinload(RecipeIngredientLink.ingredient),
        # Removed selectinload(Recipe.ratings) as it's not directly needed for RecipeResponse
        )
    average_rating_sql = func.coalesce(func.cast(Recipe.total_rating, Float) / func.nullif(Recipe.rating_count, 0), 0.0)

    if min_rating is not None: query = query.where(average_rating_sql >= min_rating)

    if sort_by is not None:
        if sort_by == "rating_asc": query = query.order_by(average_rating_sql.asc(), Recipe.title.asc())
        elif sort_by == "rating_desc": query = query.order_by(average_rating_sql.desc(), Recipe.title.asc())
        elif sort_by == "title_asc": query = query.order_by(Recipe.title.asc())
        elif sort_by == "title_desc": query = query.order_by(Recipe.title.desc())
    else:
         query = query.order_by(Recipe.title.asc()) # Default sort

    db_recipes = session.exec(query).all()

    # Filter by tags after fetching
    if tags:
        selected_tags = {tag.strip().lower() for tag in tags.split(',') if tag.strip()}
        if selected_tags:
             db_recipes = [
                 r for r in db_recipes
                 if r.tags and isinstance(r.tags, list) and selected_tags.issubset({t.lower() for t in r.tags})
             ]


    response_recipes = []
    for recipe in db_recipes:
        response_ingredients = [
             IngredientInRecipe(ingredient_id=link.ingredient.id, name=link.ingredient.name, quantity=link.quantity)
             for link in recipe.links if link.ingredient # Ensure ingredient loaded
             ]

        # --- Calculate average rating ---
        avg_rating = 0.0
        if recipe.rating_count > 0:
            avg_rating = round(float(recipe.total_rating) / float(recipe.rating_count), 1)
        # --- END Calculate ---

        # Create the response object using the updated schema
        response_recipe = RecipeResponse(
            id=recipe.id, title=recipe.title, description=recipe.description, instructions=recipe.instructions,
            ingredients=response_ingredients, tags=recipe.tags or [],
            total_rating=recipe.total_rating, rating_count=recipe.rating_count,
            average_rating=avg_rating # Pass the calculated rating
        )
        response_recipes.append(response_recipe)

    return response_recipes
# --- *** END UPDATED /api/recipes Endpoint *** ---

@app.post("/api/recipes", response_model=RecipeResponse)
def create_recipe(recipe_data: RecipeCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    try:
        new_recipe = _save_recipe_to_db(recipe_data, session)
        session.refresh(new_recipe, attribute_names=["links"])
        for link in new_recipe.links:
            session.refresh(link, attribute_names=["ingredient"])

        response_ingredients = [
            IngredientInRecipe(
                ingredient_id=link.ingredient.id,
                name=link.ingredient.name,
                quantity=link.quantity
            ) for link in new_recipe.links if link.ingredient
            ]

        avg_rating = 0.0 # New recipe has 0 rating

        response_recipe = RecipeResponse(
            id=new_recipe.id, title=new_recipe.title, description=new_recipe.description, instructions=new_recipe.instructions,
            ingredients=response_ingredients, tags=new_recipe.tags or [],
            total_rating=new_recipe.total_rating, rating_count=new_recipe.rating_count,
            average_rating=avg_rating # Include average rating
        )
        session.commit()
        return response_recipe
    except Exception as e:
        session.rollback(); print(f"Could not save new recipe: {e}")
        raise HTTPException(status_code=500, detail="Failed to save the new recipe.")

# --- *** Updated rate_recipe endpoint to return updated recipe *** ---
@app.post("/api/recipes/{recipe_id}/rate", response_model=RecipeResponse) # Changed response_model
def rate_recipe(
    recipe_id: int, rating: RecipeRating, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)
):
    # Eagerly load links and ingredients as they are needed for the response model
    recipe = session.exec(
        select(Recipe)
        .where(Recipe.id == recipe_id)
        .options(selectinload(Recipe.links).selectinload(RecipeIngredientLink.ingredient))
    ).first()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    new_rating_value = float(rating.rating)

    existing_rating_link = session.exec(select(UserRecipeRatingLink).where(
        UserRecipeRatingLink.user_id == current_user.id, UserRecipeRatingLink.recipe_id == recipe_id
    )).first()

    if existing_rating_link:
        old_rating = float(existing_rating_link.rating)
        existing_rating_link.rating = new_rating_value
        recipe.total_rating = (recipe.total_rating or 0) - old_rating + new_rating_value
        session.add(existing_rating_link)
        print(f"User {current_user.id} updated rating for recipe {recipe_id} from {old_rating} to {new_rating_value}")
    else:
        recipe.total_rating = (recipe.total_rating or 0) + new_rating_value
        recipe.rating_count = (recipe.rating_count or 0) + 1
        new_rating_link = UserRecipeRatingLink(user_id=current_user.id, recipe_id=recipe_id, rating=new_rating_value)
        session.add(new_rating_link)
        print(f"User {current_user.id} rated recipe {recipe_id} with {new_rating_value}")

    session.add(recipe)
    session.commit()
    # Refresh the recipe object AFTER commit to ensure all updates are loaded
    session.refresh(recipe)
    # Refresh relations needed for the response
    session.refresh(recipe, attribute_names=["links"])
    for link in recipe.links:
        session.refresh(link, attribute_names=["ingredient"])


    # Calculate the new average rating
    avg_rating = 0.0
    if recipe.rating_count > 0:
        avg_rating = round(float(recipe.total_rating) / float(recipe.rating_count), 1)

    # Construct the response object
    response_ingredients = [
         IngredientInRecipe(ingredient_id=link.ingredient.id, name=link.ingredient.name, quantity=link.quantity)
         for link in recipe.links if link.ingredient
     ]

    updated_recipe_response = RecipeResponse(
        id=recipe.id, title=recipe.title, description=recipe.description, instructions=recipe.instructions,
        ingredients=response_ingredients, tags=recipe.tags or [],
        total_rating=recipe.total_rating, rating_count=recipe.rating_count,
        average_rating=avg_rating
    )

    return updated_recipe_response # Return the updated recipe data
# --- *** END Updated rate_recipe endpoint *** ---

@app.post("/api/recipes/modify", response_model=RecipeCreate)
def modify_recipe_endpoint(request: RecipeModificationRequest, session: Session = Depends(get_session)):
    try:
        # --- FIX: Convert request.original_recipe to dict ---
        original_recipe_dict = request.original_recipe.model_dump()
        # --- END FIX ---

        modified_recipe_data = modify_recipe_with_ai(
            original_recipe=original_recipe_dict, # Pass the dict here
            modification_prompt=request.modification_prompt
        )

        if isinstance(modified_recipe_data, dict) and "error" in modified_recipe_data:
            print(f"AI modification failed: {modified_recipe_data['error']}")
            raise HTTPException(status_code=500, detail=modified_recipe_data["error"])

        validated_recipe = RecipeCreate(**modified_recipe_data)
        return validated_recipe

    except Exception as e:
        print(f"Error in modification endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process recipe modification: {e}")


@app.delete("/api/recipes/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: int, session: Session = Depends(get_session)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        print(f"Attempted to delete non-existent recipe ID {recipe_id}")
        return

    session.exec(delete(UserRecipeRatingLink).where(UserRecipeRatingLink.recipe_id == recipe_id))
    session.exec(delete(UserRecipeLink).where(UserRecipeLink.recipe_id == recipe_id))
    session.exec(delete(RecipeIngredientLink).where(RecipeIngredientLink.recipe_id == recipe_id))

    session.delete(recipe)
    session.commit()
    print(f"Deleted recipe ID {recipe_id} and associated links/ratings.")


@app.delete("/api/recipes", status_code=200)
def delete_all_recipes(session: Session = Depends(get_session)):
    try:
        deleted_ratings = session.exec(delete(UserRecipeRatingLink)).rowcount
        deleted_saves = session.exec(delete(UserRecipeLink)).rowcount
        deleted_ingredients = session.exec(delete(RecipeIngredientLink)).rowcount
        deleted_recipes = session.exec(delete(Recipe)).rowcount
        session.commit()
        print(f"Deleted all recipes: {deleted_recipes} recipes, {deleted_ingredients} ingredients links, {deleted_saves} saves, {deleted_ratings} ratings.")
        return {"message": f"All {deleted_recipes} recipes and related data have been cleared."}
    except Exception as e:
        session.rollback(); print(f"Error deleting all recipes: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear all recipes.")