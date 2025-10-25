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
    SupplierProfile, # <-- NEW IMPORT
    # --- *** NEW MEAL PLAN IMPORT *** ---
    MealPlanEntry
)
from schemas import (
    GenerateRequest, UserCreate, UserRead, UserUpdate, Token,
    RecipeResponse, IngredientInRecipe, RecipeCreate, PriceHistoryCreate,
    PriceHistoryRead, RecipeRating, PantryItem, PantryItemCreate,
    RecipeModificationRequest, GoogleLoginRequest,
    BarcodeLookupResponse,
    SupplierRegistrationRequest, SupplierProfileRead, # <-- NEW IMPORTS
    # --- *** NEW MEAL PLAN IMPORTS *** ---
    MealPlanEntryCreate, MealPlanEntryRead,
    # --- NEW IMPORT ---
    ReceiptScanResponse
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
            session.commit() # Commit category update immediately
            session.refresh(exact_match)
        return exact_match
    else:
        # Create new ingredient
        print(f"--- [get_or_create_ingredient] No exact match found. Creating new ingredient: '{cleaned_name}' with category: '{category}'")
        new_ingredient = Ingredient(name=cleaned_name, category=category)
        session.add(new_ingredient)
        try: # Wrap flush/refresh in try-except in case of issues before final commit
            session.commit() # Commit the new ingredient
            session.refresh(new_ingredient) # Ensure object has ID
            print(f"--- [get_or_create_ingredient] Created new ingredient ID: {new_ingredient.id}")
            return new_ingredient
        except Exception as e:
            session.rollback() # Rollback if commit fails
            print(f"--- [get_or_create_ingredient] Error during commit/refresh for new ingredient '{cleaned_name}': {e}")
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

    ingredient_links = [] # Collect links before adding
    for ing_data in recipe_data.ingredients:
        # Use a nested session or handle potential creation errors
        try:
            ingredient = get_or_create_ingredient(ing_data.name, session, category=None)
            if ingredient: # Check if ingredient was successfully created/found
                if ingredient.id is None:
                     session.refresh(ingredient) # Should have ID after commit in get_or_create

                if new_recipe.id is None: # Should have ID after initial flush, but double-check
                     print(f"Warning: Recipe ID is None before creating link for ingredient '{ing_data.name}'")
                     continue

                if ingredient.id is None: # Should have ID now, but final check
                     print(f"Warning: Ingredient ID is None before creating link for ingredient '{ing_data.name}'")
                     continue

                link = RecipeIngredientLink(recipe_id=new_recipe.id, ingredient_id=ingredient.id, quantity=ing_data.quantity)
                ingredient_links.append(link)
            else:
                print(f"Warning: Skipping ingredient link for invalid name: '{ing_data.name}' in recipe '{recipe_data.title}'")
        except Exception as e:
             # This might happen if concurrent requests try to create the same ingredient
             print(f"Error processing ingredient '{ing_data.name}' for recipe '{recipe_data.title}': {e}. Skipping link.")
             # Consider rollback or more robust handling depending on desired behavior

    if ingredient_links:
        session.add_all(ingredient_links) # Bulk add links

    # Commit after adding recipe and links
    try:
        session.commit()
        session.refresh(new_recipe) # Refresh to load relationships if needed by caller immediately
        return new_recipe
    except Exception as e:
        session.rollback()
        print(f"Error saving recipe '{recipe_data.title}' to DB: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save recipe: {e}")


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
    session.flush() # Get user ID
    # session.refresh(new_user) # Refresh might not be needed before profile creation

    if new_user.id is None:
        print("CRITICAL: User ID not generated after flush in supplier registration.")
        session.rollback() # Rollback if user ID is missing
        raise HTTPException(status_code=500, detail="Failed to create supplier user record.")


    new_profile = SupplierProfile(
        user_id=new_user.id,
        business_name=request.profile.business_name,
        address=request.profile.address
    )
    session.add(new_profile)
    try:
        session.commit()
        session.refresh(new_user) # Refresh user AFTER commit to load profile relationship
        # session.refresh(new_profile) # Refresh profile if needed
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
        google_sub = id_info['sub'] # Google's unique ID for the user

        # Prioritize finding user by Google ID
        user = session.exec(select(User).where(User.google_user_id == google_sub)).first()
        if user:
            # User found by Google ID, log them in
            access_token = create_access_token(data={"sub": user.email})
            return Token(access_token=access_token, token_type="bearer")

        # If not found by Google ID, try finding by email
        user = session.exec(select(User).where(User.email == email)).first()
        if user:
            # User found by email, link Google ID if not already linked
            if not user.google_user_id:
                 user.google_user_id = google_sub
                 session.add(user)
                 session.commit()
                 session.refresh(user)
            access_token = create_access_token(data={"sub": user.email})
            return Token(access_token=access_token, token_type="bearer")

        # If user not found by Google ID or email, create a new user
        new_user = User(
            email=email,
            google_user_id=google_sub,
            hashed_password=None, # No password needed for Google login
            adult_count=1, # Default values
            child_count=0,
            weekly_budget=None,
            has_completed_onboarding=False # Start onboarding
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)

        access_token = create_access_token(data={"sub": new_user.email})
        return Token(access_token=access_token, token_type="bearer")

    except ValueError as e:
        # Token verification failed
        print(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except Exception as e:
        # Other potential errors (database, etc.)
        print(f"Error during Google auth: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")


@app.get("/users/me", response_model=UserRead)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.put("/users/me", response_model=UserRead)
def update_user_me(user_update: UserUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # Convert Pydantic model to dict, excluding unset fields
    update_data = user_update.model_dump(exclude_unset=True)
    profile_updated = False
    for key, value in update_data.items():
        # Handle setting budget to None explicitly
        if key == 'weekly_budget' and value is None:
             if getattr(current_user, key) is not None:
                  setattr(current_user, key, None)
                  profile_updated = True
        # Update only if value is provided and different
        elif value is not None and getattr(current_user, key) != value:
            setattr(current_user, key, value)
            profile_updated = True

    if profile_updated:
        session.add(current_user)
        try:
            session.commit()
            session.refresh(current_user)
            print(f"User profile updated for user ID: {current_user.id}")
        except Exception as e:
            session.rollback()
            print(f"Error committing profile update for user ID {current_user.id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to save profile updates.")
    else:
        print(f"No profile changes detected for user ID: {current_user.id}")

    return current_user


@app.get("/api/users/me/saved-recipes", response_model=List[RecipeResponse])
def get_saved_recipes(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # Eager load necessary relationships
    user_with_recipes = session.exec(
        select(User)
        .where(User.id == current_user.id)
        .options(
            selectinload(User.saved_recipes) # Load the list of saved Recipe objects
            .selectinload(Recipe.links) # For each Recipe, load its links
            .selectinload(RecipeIngredientLink.ingredient) # For each link, load the Ingredient
        )
    ).first()

    if not user_with_recipes:
        # This shouldn't happen if get_current_user worked, but good practice
        raise HTTPException(status_code=404, detail="User not found")

    response_recipes = []
    for recipe in user_with_recipes.saved_recipes:
         # Check if links were actually loaded (they should be with selectinload)
         if not recipe.links:
              print(f"Warning: Recipe {recipe.id} ('{recipe.title}') loaded without ingredient links.")
              response_ingredients = []
         else:
             response_ingredients = []
             for link in recipe.links:
                 # Check if ingredient was loaded for the link
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

         # Calculate average rating directly
         avg_rating = 0.0
         if recipe.rating_count > 0:
             # Ensure float division, handle potential division by zero if needed (though nullif helps)
             avg_rating = round(float(recipe.total_rating) / float(recipe.rating_count), 1)

         # Construct the response object
         response_recipe = RecipeResponse(
             id=recipe.id,
             title=recipe.title,
             description=recipe.description,
             instructions=recipe.instructions,
             ingredients=response_ingredients,
             tags=recipe.tags or [], # Ensure tags is a list
             total_rating=recipe.total_rating,
             rating_count=recipe.rating_count,
             average_rating=avg_rating # Include calculated average
         )
         response_recipes.append(response_recipe)

    return response_recipes


@app.post("/api/users/me/saved-recipes/{recipe_id}", status_code=201)
def save_a_recipe(recipe_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Fetch user with saved_recipes relationship loaded
    user = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.saved_recipes))
    ).first()

    # Should not happen if get_current_user works, but check anyway
    if not user:
         raise HTTPException(status_code=404, detail="User not found")

    # Check if recipe is already in the user's saved list
    if not any(saved.id == recipe.id for saved in user.saved_recipes):
        user.saved_recipes.append(recipe)
        session.add(user) # Add user to session to track changes
        try:
            session.commit()
            print(f"User {current_user.id} saved recipe {recipe_id}")
            return {"message": "Recipe saved successfully"}
        except Exception as e:
            session.rollback()
            print(f"Error saving recipe {recipe_id} for user {current_user.id}: {e}")
            raise HTTPException(status_code=500, detail="Could not save recipe.")
    else:
        print(f"Recipe {recipe_id} already saved by user {current_user.id}")
        # Return 200 OK instead of 201 Created if already saved
        return {"message": "Recipe already saved"}


@app.delete("/api/users/me/saved-recipes/{recipe_id}", status_code=204)
def unsave_a_recipe(recipe_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        # Recipe doesn't exist, nothing to unsave, return success (idempotent)
        print(f"Attempt to unsave non-existent recipe ID {recipe_id} by user {current_user.id}")
        return

    # Fetch user with saved_recipes relationship loaded
    user = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.saved_recipes))
    ).first()

    if not user:
         # Should not happen, but handle just in case
         raise HTTPException(status_code=404, detail="User not found")

    # Find the specific recipe object in the user's list
    recipe_to_remove = next((saved for saved in user.saved_recipes if saved.id == recipe_id), None)

    if recipe_to_remove:
        user.saved_recipes.remove(recipe_to_remove)
        session.add(user) # Mark user for update
        try:
            session.commit()
            print(f"User {current_user.id} unsaved recipe {recipe_id}")
            # No content needed for 204 response
        except Exception as e:
             session.rollback()
             print(f"Error unsaving recipe {recipe_id} for user {current_user.id}: {e}")
             raise HTTPException(status_code=500, detail="Could not unsave recipe.")
    else:
         # Recipe wasn't saved by this user, still return success (idempotent)
         print(f"User {current_user.id} tried to unsave recipe {recipe_id}, but it was not in their list.")
         # No content needed for 204 response


@app.get("/api/pantry", response_model=List[PantryItem])
def get_pantry_items(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # Eager load pantry_items relationship
    user_with_pantry = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.pantry_items))
    ).first()
    if not user_with_pantry:
        raise HTTPException(status_code=404, detail="User not found")

    # Map Ingredient objects to PantryItem schema
    return [PantryItem(ingredient_id=ing.id, name=ing.name, category=ing.category) for ing in user_with_pantry.pantry_items]


# --- UPDATED with logging & check for None ingredient ---
@app.post("/api/pantry", response_model=PantryItem)
def add_pantry_item(item: PantryItemCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    print(f"--- [POST /api/pantry] Received request to add item name: '{item.ingredient_name}' for user ID: {current_user.id}")

    # Use a separate transaction context for ingredient creation if needed, or ensure commit happens
    try:
        ingredient = get_or_create_ingredient(item.ingredient_name, session, category=None)
    except Exception as e:
        # If get_or_create fails (e.g., commit error), raise HTTP exception
        print(f"--- [POST /api/pantry] Error in get_or_create_ingredient: {e}")
        raise HTTPException(status_code=500, detail="Database error creating ingredient.")


    if not ingredient:
        # Handle case where ingredient name was invalid (e.g., empty string)
        raise HTTPException(status_code=400, detail="Invalid ingredient name provided.")

    print(f"--- [POST /api/pantry] get_or_create_ingredient returned ingredient ID: {ingredient.id}, Name: {ingredient.name}")

    # Fetch user with pantry_items relationship loaded
    user = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.pantry_items))
    ).first()

    if not user:
        # Should not happen
        raise HTTPException(status_code=404, detail="User not found")

    # Check if the ingredient ID is already in the user's pantry
    if any(pantry_item.id == ingredient.id for pantry_item in user.pantry_items):
        print(f"--- [POST /api/pantry] Item '{ingredient.name}' (ID: {ingredient.id}) already in pantry for user ID: {current_user.id}. Skipping add.")
        # Return existing item data
        return PantryItem(ingredient_id=ingredient.id, name=ingredient.name, category=ingredient.category)
    else:
        print(f"--- [POST /api/pantry] Adding ingredient ID: {ingredient.id} to pantry for user ID: {current_user.id}")
        user.pantry_items.append(ingredient)
        session.add(user) # Mark user for update
        try:
            session.commit()
            print(f"--- [POST /api/pantry] Commit successful.")
            # Return newly added item data
            return PantryItem(ingredient_id=ingredient.id, name=ingredient.name, category=ingredient.category)
        except Exception as e:
            session.rollback()
            print(f"--- [POST /api/pantry] Error committing pantry addition: {e}")
            raise HTTPException(status_code=500, detail="Failed to add item to pantry.")

# --- END UPDATE ---


@app.delete("/api/pantry/{ingredient_id}", status_code=204)
def remove_pantry_item(ingredient_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    ingredient = session.get(Ingredient, ingredient_id)
    if not ingredient:
        # Ingredient doesn't exist, nothing to remove, return success
        print(f"Attempt to remove non-existent ingredient ID {ingredient_id} from pantry for user {current_user.id}")
        return

    # Fetch user with pantry_items relationship loaded
    user = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.pantry_items))
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Find the specific ingredient object in the user's list
    item_to_remove = next((item for item in user.pantry_items if item.id == ingredient_id), None)

    if item_to_remove:
        user.pantry_items.remove(item_to_remove)
        session.add(user) # Mark user for update
        try:
            session.commit()
            print(f"Removed ingredient ID {ingredient_id} from pantry for user {current_user.id}")
            # No content for 204
        except Exception as e:
            session.rollback()
            print(f"Error removing pantry item {ingredient_id} for user {current_user.id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to remove item from pantry.")
    else:
        # Item wasn't in pantry, still return success (idempotent)
        print(f"Ingredient ID {ingredient_id} not found in pantry for user {current_user.id}")
        # No content for 204


# --- *** MODIFIED RECEIPT SCAN ENDPOINT *** ---
@app.post("/api/pantry/scan-receipt", response_model=ReceiptScanResponse) # Use new response model
async def scan_receipt_endpoint(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user), # Keep current_user for potential future use (logging?)
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
            # Return empty list if no text found
            return ReceiptScanResponse(
                message="Receipt processed, but no text was detected.",
                detected_items=[]
            )

    except Exception as e:
        print(f"--- [POST /api/pantry/scan-receipt] Error during Google Vision OCR: {e}")
        raise HTTPException(status_code=502, detail="Failed to process image using OCR service.")

    # Call AI service to parse the extracted text
    item_names = parse_receipt_text_with_ai(extracted_text)

    # --- REMOVED: Database interaction logic (fetching user, checking pantry, adding items, commit) ---

    # Return the detected item names
    if not item_names:
        print("--- [POST /api/pantry/scan-receipt] AI parsing returned no items from the extracted text.")
        return ReceiptScanResponse(
            message="Receipt text extracted, but AI could not identify grocery items.",
            detected_items=[]
        )
    else:
        print(f"--- [POST /api/pantry/scan-receipt] AI parsed {len(item_names)} potential items.")
        return ReceiptScanResponse(
            message=f"Successfully parsed {len(item_names)} potential items from receipt.",
            detected_items=item_names
        )
# --- *** END MODIFIED ENDPOINT *** ---


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
    # Sort categories alphabetically before returning
    return dict(sorted(categorized_staples.items()))

@app.get("/api/barcode-lookup/{barcode}", response_model=BarcodeLookupResponse)
def lookup_barcode(barcode: str):
    off_api_url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
    print(f"--- [GET /api/barcode-lookup] Proxying request to: {off_api_url}")
    try:
        response = requests.get(off_api_url, timeout=10) # Added timeout
        response.raise_for_status() # Raises HTTPError for bad responses (4xx or 5xx)
        data = response.json()
        print(f"--- [GET /api/barcode-lookup] Received response status: {data.get('status')}")

        # Check if product was found in the OFF response
        if data.get("status") == 1 and data.get("product") and data["product"].get("product_name"):
            product_name = data["product"]["product_name"]
            print(f"--- [GET /api/barcode-lookup] Barcode {barcode} found: {product_name}")
            return BarcodeLookupResponse(product_name=product_name)
        else:
            # Status might be 0 or product key might be missing/empty
            print(f"--- [GET /api/barcode-lookup] Product not found for barcode {barcode} in OFF API response.")
            return BarcodeLookupResponse(error="Product not found in Open Food Facts database.")

    except requests.exceptions.HTTPError as http_err:
        status_code = http_err.response.status_code
        if status_code == 404:
            # Handle 404 specifically as "not found"
            print(f"--- [GET /api/barcode-lookup] OFF API returned 404 for barcode {barcode}")
            return BarcodeLookupResponse(error="Product not found (404).")
        else:
            # Handle other HTTP errors (e.g., 500, 403)
            print(f"--- [GET /api/barcode-lookup] HTTP error occurred: {http_err} - Status code: {status_code}")
            raise HTTPException(status_code=502, detail=f"Failed to fetch data from Open Food Facts: HTTP {status_code}")
    except requests.exceptions.RequestException as req_err:
        # Handle network errors (DNS failure, connection refused, timeout, etc.)
        print(f"--- [GET /api/barcode-lookup] Request error occurred: {req_err}")
        raise HTTPException(status_code=503, detail="Could not connect to the barcode lookup service.")
    except Exception as e:
        # Catch any other unexpected errors during the process
        print(f"--- [GET /api/barcode-lookup] An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during barcode lookup.")


# --- *** NEW MEAL PLAN API ENDPOINTS *** ---
@app.get("/api/meal-plan", response_model=List[MealPlanEntryRead])
def get_meal_plan(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches all meal plan entries for the logged-in user, with full recipe details.
    """
    meal_plan_entries = session.exec(
        select(MealPlanEntry)
        .where(MealPlanEntry.user_id == current_user.id)
        .options(
            # Eagerly load the recipe, its links, and the ingredient for each link
            selectinload(MealPlanEntry.recipe)
            .selectinload(Recipe.links)
            .selectinload(RecipeIngredientLink.ingredient)
        )
        .order_by(MealPlanEntry.plan_date.asc()) # Order by date
    ).all()

    # Manually construct the response to include full RecipeResponse
    response_list = []
    for entry in meal_plan_entries:
        if not entry.recipe:
            print(f"Warning: Meal plan entry {entry.id} missing recipe data.")
            continue

        recipe = entry.recipe
        response_ingredients = [
             IngredientInRecipe(ingredient_id=link.ingredient.id, name=link.ingredient.name, quantity=link.quantity)
             for link in recipe.links if link.ingredient
         ]

        avg_rating = 0.0
        if recipe.rating_count > 0:
            avg_rating = round(float(recipe.total_rating) / float(recipe.rating_count), 1)

        recipe_response = RecipeResponse(
            id=recipe.id, title=recipe.title, description=recipe.description, instructions=recipe.instructions,
            ingredients=response_ingredients, tags=recipe.tags or [],
            total_rating=recipe.total_rating, rating_count=recipe.rating_count,
            average_rating=avg_rating
        )

        response_list.append(
            MealPlanEntryRead(
                id=entry.id,
                user_id=entry.user_id,
                recipe_id=entry.recipe_id,
                plan_date=entry.plan_date,
                recipe=recipe_response # Assign the fully formed RecipeResponse
            )
        )

    return response_list


@app.post("/api/meal-plan", response_model=MealPlanEntryRead)
def add_to_meal_plan(
    entry_data: MealPlanEntryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Adds a recipe to the user's meal plan for a specific date.
    """
    # Check if recipe exists
    recipe = session.get(Recipe, entry_data.recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    new_entry = MealPlanEntry(
        user_id=current_user.id,
        recipe_id=entry_data.recipe_id,
        plan_date=entry_data.plan_date
    )

    session.add(new_entry)

    try:
        session.commit()
        session.refresh(new_entry) # Ensure the new entry has its ID

        # Re-fetch the entry with relationships loaded for the response
        full_entry = session.exec(
            select(MealPlanEntry)
            .where(MealPlanEntry.id == new_entry.id)
            .options(
                selectinload(MealPlanEntry.recipe)
                .selectinload(Recipe.links)
                .selectinload(RecipeIngredientLink.ingredient)
            )
        ).first()

        if not full_entry or not full_entry.recipe:
             # Should not happen, but indicates an issue retrieving after commit
            raise HTTPException(status_code=500, detail="Failed to retrieve full meal plan entry after creation.")

        # Construct the RecipeResponse part for the return value
        recipe = full_entry.recipe
        response_ingredients = [
             IngredientInRecipe(ingredient_id=link.ingredient.id, name=link.ingredient.name, quantity=link.quantity)
             for link in recipe.links if link.ingredient
         ]
        avg_rating = 0.0
        if recipe.rating_count > 0:
            avg_rating = round(float(recipe.total_rating) / float(recipe.rating_count), 1)
        recipe_response = RecipeResponse(
            id=recipe.id, title=recipe.title, description=recipe.description, instructions=recipe.instructions,
            ingredients=response_ingredients, tags=recipe.tags or [],
            total_rating=recipe.total_rating, rating_count=recipe.rating_count,
            average_rating=avg_rating
        )

        return MealPlanEntryRead(
            id=full_entry.id,
            user_id=full_entry.user_id,
            recipe_id=full_entry.recipe_id,
            plan_date=full_entry.plan_date,
            recipe=recipe_response
        )

    except Exception as e:
        session.rollback()
        print(f"Error adding to meal plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to save meal plan entry.")


@app.delete("/api/meal-plan/{entry_id}", status_code=204)
def remove_from_meal_plan(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a specific entry from the user's meal plan.
    """
    entry = session.get(MealPlanEntry, entry_id)

    if not entry:
        # Return 204 even if not found (idempotent delete)
        print(f"Attempt to delete non-existent meal plan entry ID {entry_id}")
        return

    if entry.user_id != current_user.id:
        print(f"Forbidden: User {current_user.id} tried to delete meal plan entry {entry_id} belonging to user {entry.user_id}")
        raise HTTPException(status_code=403, detail="Not authorized to delete this entry.")

    try:
        session.delete(entry)
        session.commit()
        print(f"User {current_user.id} deleted meal plan entry ID {entry_id}")
        # No content for 204
    except Exception as e:
        session.rollback()
        print(f"Error deleting meal plan entry {entry_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete meal plan entry.")
# --- *** END NEW MEAL PLAN API ENDPOINTS *** ---


# --- NEW SUPPLIER PORTAL API ---
@app.get("/api/supplier/specials", response_model=List[PriceHistoryRead])
def get_supplier_specials(
    profile: SupplierProfile = Depends(get_current_supplier),
    session: Session = Depends(get_session)
):
    """Gets all specials added today for the currently logged-in supplier."""
    today = date.today()
    db_prices = session.exec(
        select(PriceHistory)
        .where(
            PriceHistory.store == profile.business_name,
            PriceHistory.date_recorded == today
        )
        .options(selectinload(PriceHistory.ingredient)) # Eager load ingredient
    ).all()

    # Map to response schema
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
    """Creates or updates a special for the logged-in supplier for today."""
    # Set the store based on the logged-in supplier's profile
    price_data.store = profile.business_name

    # Get or create the ingredient, potentially updating its category
    try:
        ingredient = get_or_create_ingredient(price_data.ingredient_name, session, category=price_data.category)
    except Exception as e:
        print(f"Error getting/creating ingredient '{price_data.ingredient_name}': {e}")
        raise HTTPException(status_code=500, detail="Database error handling ingredient.")

    if not ingredient: raise HTTPException(status_code=400, detail="Invalid ingredient name")

    today = date.today()

    # Check if a record for this ingredient+store+date already exists
    existing_record = session.exec(select(PriceHistory).where(
        PriceHistory.ingredient_id == ingredient.id,
        PriceHistory.store == profile.business_name,
        PriceHistory.date_recorded == today
    )).first()

    if existing_record:
        # Update existing record if price differs
        if existing_record.price != price_data.price:
            print(f"Updating price for {ingredient.name} at {profile.business_name} from {existing_record.price} to {price_data.price}")
            existing_record.price = price_data.price
            session.add(existing_record)
        else:
            print(f"Price for {ingredient.name} at {profile.business_name} is unchanged. Skipping update.")
        record_to_return = existing_record
    else:
        # Create new price record
        print(f"Creating new price for {ingredient.name} at {profile.business_name}: {price_data.price}")
        record_to_return = PriceHistory(
            ingredient_id=ingredient.id,
            price=price_data.price,
            store=profile.business_name,
            date_recorded=today
            # Category is stored on the Ingredient model, not PriceHistory
        )
        session.add(record_to_return)

    try:
        session.commit()
        session.refresh(record_to_return)
        # Ensure ingredient details are available for the response
        session.refresh(ingredient)
    except Exception as e:
        session.rollback()
        print(f"Error committing supplier special for {ingredient.name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save special.")

    # Construct response
    return PriceHistoryRead(
        id=record_to_return.id,
        ingredient_id=ingredient.id,
        date_recorded=record_to_return.date_recorded.isoformat(),
        price=record_to_return.price,
        store=record_to_return.store,
        ingredient_name=ingredient.name, # Get name from ingredient model
        category=ingredient.category # Get category from ingredient model
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
        # Idempotent: If not found, act as if deleted
        print(f"Attempt to delete non-existent special ID {price_id} by supplier {profile.business_name}")
        return

    # Security check: Ensure the special belongs to the supplier trying to delete it
    if special.store != profile.business_name:
        print(f"Forbidden: Supplier {profile.business_name} tried to delete special ID {price_id} belonging to {special.store}")
        raise HTTPException(status_code=403, detail="Not authorized to delete this special.")

    try:
        session.delete(special)
        session.commit()
        print(f"Supplier {profile.business_name} deleted special ID {price_id}")
        # No content for 204
    except Exception as e:
        session.rollback()
        print(f"Error deleting special ID {price_id} for supplier {profile.business_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete special.")

# --- END NEW SUPPLIER PORTAL API ---


@app.get("/")
def read_root(): return {"message": "Welcome!"}

# --- *** Updated generate_recipes_endpoint to REMOVE auto-saving *** ---
@app.post("/api/generate-recipes")
def generate_recipes_endpoint(request: GenerateRequest, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    try:
        ai_generated_recipes = generate_recipes_from_specials(
            specials_list=request.specials, preferences=request.preferences, pantry_items=request.pantry_items
        )
    except Exception as ai_err:
        print(f"AI service failed: {ai_err}")
        raise HTTPException(status_code=503, detail="AI service unavailable or failed.")


    if not isinstance(ai_generated_recipes, list):
        print(f"AI service did not return a list: {ai_generated_recipes}")
        raise HTTPException(status_code=500, detail="AI failed to generate recipes in expected format.")

    saved_recipes_count = 0
    # Process recipes within a single transaction if possible
    try:
        for recipe_dict in ai_generated_recipes:
            if not isinstance(recipe_dict, dict):
                print(f"AI generated item is not a dictionary: {recipe_dict}"); continue

            # Basic validation before creating RecipeCreate object
            if 'ingredients' not in recipe_dict or not isinstance(recipe_dict['ingredients'], list):
                print(f"Skipping recipe due to missing or invalid ingredients: {recipe_dict.get('title')}"); continue
            if 'title' not in recipe_dict or not recipe_dict['title']:
                 print(f"Skipping recipe due to missing title.")
                 continue

            try:
                recipe_data = RecipeCreate(**recipe_dict)
                # _save_recipe_to_db now handles its own commit/rollback for ingredients
                saved_recipe = _save_recipe_to_db(recipe_data, session)

                if saved_recipe and saved_recipe.id:
                    saved_recipes_count += 1
                else:
                    # Log if _save_recipe_to_db failed without raising an exception (it shouldn't)
                    print(f"Failed to save recipe '{recipe_dict.get('title')}' - _save_recipe_to_db returned None or no ID.")

            except Exception as validation_err: # Catch Pydantic validation errors etc.
                 print(f"Could not validate AI recipe '{recipe_dict.get('title', 'N/A')}': {validation_err}")
                 # Decide whether to continue or fail the whole request
                 # continue

        # No explicit commit needed here if _save_recipe handles it
        # session.commit() # Commit all successfully processed recipes

    except HTTPException:
         raise # Re-raise HTTPExceptions from _save_recipe_to_db
    except Exception as e:
         # Catch potential errors during the loop or commit
         # Rollback might have already happened in _save_recipe_to_db for specific recipes
         print(f"Error processing generated recipes: {e}")
         raise HTTPException(status_code=500, detail="Failed to save one or more generated recipes.")


    return {"message": f"Successfully generated and saved {saved_recipes_count} new recipes to the database."}
# --- *** END Updated generate_recipes_endpoint *** ---

@app.get("/api/prices/today", response_model=List[PriceHistoryRead])
def get_todays_prices(session: Session = Depends(get_session)):
    today = date.today()
    # Eager load ingredient for each price history record
    db_prices = session.exec(
        select(PriceHistory)
        .where(PriceHistory.date_recorded == today)
        .options(selectinload(PriceHistory.ingredient))
    ).all()
    # Map results to the response schema
    return [
        PriceHistoryRead(
            id=p.id,
            ingredient_id=p.ingredient_id,
            date_recorded=p.date_recorded.isoformat(),
            price=p.price,
            store=p.store,
            ingredient_name=p.ingredient.name if p.ingredient else "Unknown", # Handle potential missing ingredient?
            category=p.ingredient.category if p.ingredient else None
        ) for p in db_prices
    ]

@app.post("/api/prices", response_model=PriceHistoryRead)
def create_price_record(price_data: PriceHistoryCreate, session: Session = Depends(get_session)):
    try:
        ingredient = get_or_create_ingredient(price_data.ingredient_name, session, category=price_data.category)
    except Exception as e:
         print(f"Error getting/creating ingredient '{price_data.ingredient_name}': {e}")
         raise HTTPException(status_code=500, detail="Database error handling ingredient.")

    if not ingredient: raise HTTPException(status_code=400, detail="Invalid ingredient name")

    today = date.today()
    # Check if record exists for this ingredient, store, and date
    existing_record = session.exec(select(PriceHistory).where(
        PriceHistory.ingredient_id == ingredient.id, PriceHistory.store == price_data.store, PriceHistory.date_recorded == today
    )).first()

    record_to_return = None
    if existing_record:
        # Update price if it has changed
        if existing_record.price != price_data.price:
            existing_record.price = price_data.price
            session.add(existing_record)
            print(f"Updated price for {ingredient.name} at {price_data.store} for {today}")
            record_to_return = existing_record
        else:
            print(f"Skipping duplicate price for {ingredient.name} at {price_data.store} for {today}")
            record_to_return = existing_record # Return existing record even if not updated
    else:
        # Create a new record
        new_record = PriceHistory(
            ingredient_id=ingredient.id,
            price=price_data.price,
            store=price_data.store,
            date_recorded=today
        )
        session.add(new_record)
        print(f"Created new price for {ingredient.name} at {price_data.store} for {today}")
        record_to_return = new_record

    try:
        session.commit()
        session.refresh(record_to_return)
        # Ensure ingredient is refreshed if needed for response
        session.refresh(ingredient)
    except Exception as e:
        session.rollback()
        print(f"Error committing price record for {ingredient.name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save price record.")

    # Construct response
    return PriceHistoryRead(
        id=record_to_return.id,
        ingredient_id=ingredient.id,
        date_recorded=record_to_return.date_recorded.isoformat(),
        price=record_to_return.price,
        store=record_to_return.store,
        ingredient_name=ingredient.name,
        category=ingredient.category
    )

@app.delete("/api/prices/today")
def delete_todays_prices(session: Session = Depends(get_session)):
    today = date.today()
    try:
        statement = delete(PriceHistory).where(PriceHistory.date_recorded == today)
        result = session.exec(statement)
        deleted_count = result.rowcount
        session.commit() # Commit the deletion
        print(f"Deleted {deleted_count} price records for {today}.")
        return {"message": f"Today's {deleted_count} price records have been cleared."}
    except Exception as e:
        session.rollback()
        print(f"Error deleting prices for {today}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete today's prices: {e}")

@app.get("/api/ingredient/{ingredient_id}/price-history", response_model=List[PriceHistoryRead])
def get_price_history_for_ingredient(ingredient_id: int, session: Session = Depends(get_session)):
    # Check if ingredient exists first
    ingredient = session.get(Ingredient, ingredient_id)
    if not ingredient: raise HTTPException(status_code=404, detail="Ingredient not found.")

    # Fetch history ordered by date
    history = session.exec(
        select(PriceHistory)
        .where(PriceHistory.ingredient_id == ingredient_id)
        .order_by(PriceHistory.date_recorded.desc()) # Fetch newest first
        # No need to eager load ingredient here as we already have it
    ).all()

    # Map results to response schema
    return [
        PriceHistoryRead(
            id=h.id,
            ingredient_id=h.ingredient_id,
            date_recorded=h.date_recorded.isoformat(),
            price=h.price,
            store=h.store,
            ingredient_name=ingredient.name, # Use name from the fetched ingredient
            category=ingredient.category # Use category from the fetched ingredient
        ) for h in history
    ]

@app.get("/api/tags", response_model=List[str])
def get_all_tags(session: Session = Depends(get_session)):
    # Select only the tags column
    results = session.exec(select(Recipe.tags)).all()

    all_tags = set()
    for tags_list in results:
        # Results might be tuples depending on SQLModel version, handle safely
        actual_list = tags_list[0] if isinstance(tags_list, tuple) else tags_list
        # Ensure it's a list and contains strings
        if actual_list and isinstance(actual_list, list):
            for tag in actual_list:
                 if isinstance(tag, str) and tag.strip(): # Add check for non-empty strings
                      all_tags.add(tag.strip())

    return sorted(list(all_tags))


# --- *** UPDATED /api/recipes Endpoint *** ---
@app.get("/api/recipes", response_model=List[RecipeResponse])
def get_recipes(
    session: Session = Depends(get_session), min_rating: Optional[float] = Query(None, ge=1, le=5),
    sort_by: Optional[str] = Query(None), tags: Optional[str] = Query(None)
):
    query = select(Recipe).options(
        selectinload(Recipe.links).selectinload(RecipeIngredientLink.ingredient)
    )

    # Calculate average rating using SQL functions for potential DB-level filtering/sorting
    # Use Float type casting for division
    average_rating_sql = func.coalesce(func.cast(Recipe.total_rating, Float) / func.nullif(Recipe.rating_count, 0), 0.0)

    # Apply filters
    if min_rating is not None:
        # Filter where calculated average rating is >= min_rating
        query = query.where(average_rating_sql >= min_rating)

    # Apply sorting
    if sort_by:
        if sort_by == "rating_asc":
            query = query.order_by(average_rating_sql.asc(), Recipe.title.asc())
        elif sort_by == "rating_desc":
            query = query.order_by(average_rating_sql.desc(), Recipe.title.asc())
        elif sort_by == "title_asc":
            query = query.order_by(Recipe.title.asc())
        elif sort_by == "title_desc":
            query = query.order_by(Recipe.title.desc())
        # Add more sort options if needed
    else:
         query = query.order_by(Recipe.title.asc()) # Default sort by title ascending

    # Execute the query
    db_recipes = session.exec(query).all()

    # Filter by tags in Python after fetching (easier for JSON list containment)
    if tags:
        selected_tags = {tag.strip().lower() for tag in tags.split(',') if tag.strip()}
        if selected_tags:
             # Filter the results list
             db_recipes = [
                 r for r in db_recipes
                 # Check if tags exist, is a list, and contains all selected tags (case-insensitive)
                 if r.tags and isinstance(r.tags, list) and selected_tags.issubset({t.lower() for t in r.tags})
             ]

    # Map results to response schema
    response_recipes = []
    for recipe in db_recipes:
        response_ingredients = [
             IngredientInRecipe(ingredient_id=link.ingredient.id, name=link.ingredient.name, quantity=link.quantity)
             for link in recipe.links if link.ingredient # Ensure ingredient loaded
             ]

        # Calculate average rating (again, as it's part of the response model)
        avg_rating = 0.0
        if recipe.rating_count > 0:
            avg_rating = round(float(recipe.total_rating) / float(recipe.rating_count), 1)

        # Create the response object
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
    # For now, let's assume only specific roles (e.g., admin) can create recipes manually
    # Or remove this check if any authenticated user should be able to create
    # if current_user.role != "admin":
    #     raise HTTPException(status_code=403, detail="Not authorized to create recipes")

    try:
        # _save_recipe_to_db now handles commit/rollback internally
        new_recipe = _save_recipe_to_db(recipe_data, session)

        # Refresh necessary attributes for the response after potential commits in _save_recipe
        session.refresh(new_recipe, attribute_names=["links"])
        for link in new_recipe.links:
             if link.ingredient: # Check if ingredient exists before refreshing
                session.refresh(link, attribute_names=["ingredient"])

        # Prepare response ingredients
        response_ingredients = [
            IngredientInRecipe(
                ingredient_id=link.ingredient.id,
                name=link.ingredient.name,
                quantity=link.quantity
            ) for link in new_recipe.links if link.ingredient
            ]

        avg_rating = 0.0 # New recipe starts with 0 rating

        # Construct response
        response_recipe = RecipeResponse(
            id=new_recipe.id, title=new_recipe.title, description=new_recipe.description, instructions=new_recipe.instructions,
            ingredients=response_ingredients, tags=new_recipe.tags or [],
            total_rating=new_recipe.total_rating, rating_count=new_recipe.rating_count,
            average_rating=avg_rating
        )
        # No commit needed here if _save_recipe handles it
        return response_recipe
    except HTTPException as http_err:
         # Re-raise HTTP exceptions from _save_recipe
         raise http_err
    except Exception as e:
        # Catch any other unexpected errors during recipe creation/saving
        print(f"Error processing create_recipe request: {e}")
        # Rollback might have occurred in _save_recipe, but ensure here too if needed
        # session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save the new recipe: {e}")

# --- *** Updated rate_recipe endpoint to return updated recipe *** ---
@app.post("/api/recipes/{recipe_id}/rate", response_model=RecipeResponse) # Changed response_model
def rate_recipe(
    recipe_id: int, rating: RecipeRating, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)
):
    # Fetch the recipe, eager loading relationships needed for the response
    recipe = session.exec(
        select(Recipe)
        .where(Recipe.id == recipe_id)
        .options(selectinload(Recipe.links).selectinload(RecipeIngredientLink.ingredient))
    ).first()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    new_rating_value = float(rating.rating) # Ensure float

    # Check if user has already rated this recipe
    existing_rating_link = session.exec(select(UserRecipeRatingLink).where(
        UserRecipeRatingLink.user_id == current_user.id, UserRecipeRatingLink.recipe_id == recipe_id
    )).first()

    if existing_rating_link:
        # Update existing rating
        old_rating = float(existing_rating_link.rating)
        existing_rating_link.rating = new_rating_value
        # Adjust total rating: subtract old, add new
        recipe.total_rating = (recipe.total_rating or 0) - old_rating + new_rating_value
        session.add(existing_rating_link) # Mark link for update
        print(f"User {current_user.id} updated rating for recipe {recipe_id} from {old_rating} to {new_rating_value}")
    else:
        # Add new rating
        recipe.total_rating = (recipe.total_rating or 0) + new_rating_value
        recipe.rating_count = (recipe.rating_count or 0) + 1
        new_rating_link = UserRecipeRatingLink(user_id=current_user.id, recipe_id=recipe_id, rating=new_rating_value)
        session.add(new_rating_link) # Add the new link
        print(f"User {current_user.id} rated recipe {recipe_id} with {new_rating_value}")

    session.add(recipe) # Mark recipe for update (total_rating, rating_count)
    try:
        session.commit()
        # Refresh the recipe object AFTER commit to ensure calculations use updated values
        session.refresh(recipe)
        # Refresh relations again if needed, though they should be loaded
        session.refresh(recipe, attribute_names=["links"])
        for link in recipe.links:
             if link.ingredient:
                 session.refresh(link, attribute_names=["ingredient"])

    except Exception as e:
        session.rollback()
        print(f"Error committing rating for recipe {recipe_id} by user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Could not save rating.")


    # Calculate the new average rating for the response
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
        average_rating=avg_rating # Include the newly calculated average
    )

    return updated_recipe_response # Return the updated recipe data
# --- *** END Updated rate_recipe endpoint *** ---

@app.post("/api/recipes/modify", response_model=RecipeCreate)
def modify_recipe_endpoint(request: RecipeModificationRequest, session: Session = Depends(get_session)):
    try:
        # Convert incoming Pydantic model to dict for AI service
        original_recipe_dict = request.original_recipe.model_dump()

        # Call AI service
        modified_recipe_data = modify_recipe_with_ai(
            original_recipe=original_recipe_dict,
            modification_prompt=request.modification_prompt
        )

        # Handle potential errors returned by AI service
        if isinstance(modified_recipe_data, dict) and "error" in modified_recipe_data:
            print(f"AI modification failed: {modified_recipe_data['error']}")
            # Use 503 if AI service itself failed, 500 for other issues
            status_code = 503 if "AI failed" in modified_recipe_data["error"] else 500
            raise HTTPException(status_code=status_code, detail=modified_recipe_data["error"])

        # Validate the AI's response against the RecipeCreate schema
        # This will raise validation errors if the structure is wrong
        validated_recipe = RecipeCreate(**modified_recipe_data)

        # Return the validated (but unsaved) recipe data
        return validated_recipe

    except HTTPException as http_err:
        raise http_err # Re-raise known HTTP exceptions
    except Exception as e:
        # Catch validation errors or other unexpected issues
        print(f"Error in modification endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process recipe modification: {e}")


@app.delete("/api/recipes/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: int, session: Session = Depends(get_session)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        # Idempotent: Recipe already gone or never existed
        print(f"Attempted to delete non-existent recipe ID {recipe_id}")
        return

    # Delete related links first to avoid foreign key constraints
    # Use delete() with session.exec() for bulk deletion based on criteria
    session.exec(delete(UserRecipeRatingLink).where(UserRecipeRatingLink.recipe_id == recipe_id))
    session.exec(delete(UserRecipeLink).where(UserRecipeLink.recipe_id == recipe_id))
    session.exec(delete(RecipeIngredientLink).where(RecipeIngredientLink.recipe_id == recipe_id))
    # Also delete MealPlan entries referencing this recipe
    session.exec(delete(MealPlanEntry).where(MealPlanEntry.recipe_id == recipe_id))


    # Now delete the recipe itself
    session.delete(recipe)

    try:
        session.commit()
        print(f"Deleted recipe ID {recipe_id} and associated links/ratings/meal plans.")
        # No content for 204
    except Exception as e:
        session.rollback()
        print(f"Error deleting recipe {recipe_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete recipe.")


@app.delete("/api/recipes", status_code=200)
def delete_all_recipes(session: Session = Depends(get_session)):
    # Be cautious with mass deletes! Consider adding auth checks (e.g., admin only)
    try:
        # Delete dependent records first in the correct order
        deleted_ratings = session.exec(delete(UserRecipeRatingLink)).rowcount
        deleted_saves = session.exec(delete(UserRecipeLink)).rowcount
        deleted_ingredients = session.exec(delete(RecipeIngredientLink)).rowcount
        deleted_mealplans = session.exec(delete(MealPlanEntry)).rowcount # Delete meal plan entries
        deleted_recipes = session.exec(delete(Recipe)).rowcount

        session.commit() # Commit all deletions

        print(f"Deleted all recipes: {deleted_recipes} recipes, {deleted_ingredients} ingredients links, {deleted_saves} saves, {deleted_ratings} ratings, {deleted_mealplans} meal plan entries.")
        return {"message": f"All {deleted_recipes} recipes and related data have been cleared."}
    except Exception as e:
        session.rollback()
        print(f"Error deleting all recipes: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear all recipes.")

# --- Placeholder for future endpoints ---

# Example: Get user's purchase history (linked to shopping list completion)
# @app.get("/api/users/me/purchase-history")
# async def get_purchase_history(...):
#     # Logic to retrieve purchase history records
#     pass

# Example: Get notifications
# @app.get("/api/notifications", response_model=List[NotificationRead]) # Assuming a NotificationRead schema exists
# async def get_notifications(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
#     # Fetch unread notifications for the user from the database
#     # This requires Notification and UserNotificationLink models and schemas
#     pass

# Example: Mark notification as read
# @app.post("/api/notifications/{notification_id}/mark-read", status_code=204)
# async def mark_notification_read(notification_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
#     # Find the UserNotificationLink and update its 'read' status
#     pass