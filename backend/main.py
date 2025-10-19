# backend/main.py

# --- (Keep all existing imports and setup) ---
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from contextlib import asynccontextmanager
from typing import List, Optional, Dict
from sqlmodel import Session, select, func, delete, Float # Added Float
from sqlalchemy.orm import selectinload
from datetime import date
import os
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests # Added requests

from database import engine, create_db_and_tables, get_session
from models import (
    User, Recipe, Ingredient, RecipeIngredientLink, PriceHistory,
    UserRecipeRatingLink, UserPantryLink, UserRecipeLink
)
from schemas import (
    GenerateRequest, UserCreate, UserRead, UserUpdate, Token,
    RecipeResponse, IngredientInRecipe, RecipeCreate, PriceHistoryCreate,
    PriceHistoryRead, RecipeRating, PantryItem, PantryItemCreate,
    RecipeModificationRequest, GoogleLoginRequest,
    BarcodeLookupResponse # Added BarcodeLookupResponse
)
from security import get_password_hash, verify_password, create_access_token, get_current_user
from ai_service import generate_recipes_from_specials, modify_recipe_with_ai

origins = [
    "http://localhost:5173",
    "http://192.168.1.102:5173" # Make sure this matches your PC's IP if testing mobile
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up... 🚀")
    create_db_and_tables()
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

# --- UPDATED with logging ---
def get_or_create_ingredient(name: str, session: Session, category: Optional[str] = None) -> Ingredient:
    print(f"--- [get_or_create_ingredient] Called with name: '{name}', category: '{category}'")
    
    # Attempt exact match (case-insensitive)
    search_name_lower = name.lower()
    exact_match = session.exec(select(Ingredient).where(func.lower(Ingredient.name) == search_name_lower)).first()

    if exact_match:
        print(f"--- [get_or_create_ingredient] Found existing ingredient ID: {exact_match.id}, Name: {exact_match.name}")
        # Update category if provided and missing
        if category and not exact_match.category:
            print(f"--- [get_or_create_ingredient] Updating category to '{category}' for ingredient ID: {exact_match.id}")
            exact_match.category = category
            session.add(exact_match)
            session.commit()
            session.refresh(exact_match)
        return exact_match
    else:
        # Create new ingredient
        print(f"--- [get_or_create_ingredient] No exact match found. Creating new ingredient: '{name}' with category: '{category}'")
        new_ingredient = Ingredient(name=name, category=category)
        session.add(new_ingredient)
        session.commit()
        session.refresh(new_ingredient)
        print(f"--- [get_or_create_ingredient] Created new ingredient ID: {new_ingredient.id}")
        return new_ingredient
# --- END UPDATE ---

def _save_recipe_to_db(recipe_data: RecipeCreate, session: Session) -> Recipe:
    # ...(no changes needed here)...
    new_recipe = Recipe(
        title=recipe_data.title,
        description=recipe_data.description,
        instructions=recipe_data.instructions,
        tags=recipe_data.tags
    )
    session.add(new_recipe)

    for ing_data in recipe_data.ingredients:
        # Pass category=None explicitly if not provided by AI,
        # get_or_create_ingredient handles potential updates later
        ingredient = get_or_create_ingredient(ing_data.name, session, category=None)
        link = RecipeIngredientLink(recipe=new_recipe, ingredient=ingredient, quantity=ing_data.quantity)
        session.add(link)

    session.commit()
    session.refresh(new_recipe)
    return new_recipe


@app.post("/register", response_model=UserRead)
def create_user(user: UserCreate, session: Session = Depends(get_session)):
    # ...(no changes needed here)...
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


@app.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    # ...(no changes needed here)...
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer")


@app.post("/api/auth/google", response_model=Token)
def login_with_google(google_token: GoogleLoginRequest, session: Session = Depends(get_session)):
    # ...(no changes needed here)...
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
    # ...(no changes needed here)...
    return current_user

@app.put("/users/me", response_model=UserRead)
def update_user_me(user_update: UserUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # ...(no changes needed here)...
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
    # ...(no changes needed here)...
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
        response_ingredients = [
            IngredientInRecipe(ingredient_id=link.ingredient.id, name=link.ingredient.name, quantity=link.quantity)
            for link in recipe.links
        ]

        response_recipe = RecipeResponse(
            id=recipe.id,
            title=recipe.title,
            description=recipe.description,
            instructions=recipe.instructions,
            ingredients=response_ingredients,
            tags=recipe.tags,
            total_rating=recipe.total_rating,
            rating_count=recipe.rating_count,
        )
        response_recipes.append(response_recipe)

    return response_recipes


@app.post("/api/users/me/saved-recipes/{recipe_id}", status_code=201)
def save_a_recipe(recipe_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # ...(no changes needed here)...
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    user = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.saved_recipes))
    ).first()

    if recipe not in user.saved_recipes:
        user.saved_recipes.append(recipe)
        session.add(user)
        session.commit()
    return {"message": "Recipe saved successfully"}


@app.delete("/api/users/me/saved-recipes/{recipe_id}", status_code=204)
def unsave_a_recipe(recipe_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # ...(no changes needed here)...
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    user = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.saved_recipes))
    ).first()

    if recipe in user.saved_recipes:
        user.saved_recipes.remove(recipe)
        session.add(user)
        session.commit()


@app.get("/api/pantry", response_model=List[PantryItem])
def get_pantry_items(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # ...(no changes needed here)...
    user_with_pantry = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.pantry_items))
    ).first()
    return [PantryItem(ingredient_id=ing.id, name=ing.name, category=ing.category) for ing in user_with_pantry.pantry_items]


# --- UPDATED with logging ---
@app.post("/api/pantry", response_model=PantryItem)
def add_pantry_item(item: PantryItemCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    print(f"--- [POST /api/pantry] Received request to add item name: '{item.ingredient_name}' for user ID: {current_user.id}")
    
    # Category is not provided when adding via barcode/name, get_or_create handles it
    ingredient = get_or_create_ingredient(item.ingredient_name, session, category=None)
    print(f"--- [POST /api/pantry] get_or_create_ingredient returned ingredient ID: {ingredient.id}, Name: {ingredient.name}")

    user = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.pantry_items))
    ).first()

    # Check if the ingredient *object* is already in the user's pantry list
    if ingredient in user.pantry_items:
        print(f"--- [POST /api/pantry] Item '{ingredient.name}' (ID: {ingredient.id}) already in pantry for user ID: {current_user.id}. Skipping add.")
    else:
        print(f"--- [POST /api/pantry] Adding ingredient ID: {ingredient.id} to pantry for user ID: {current_user.id}")
        user.pantry_items.append(ingredient)
        session.add(user) # Add user to session to track the relationship change
        session.commit()
        print(f"--- [POST /api/pantry] Commit successful.")

    # Return the details of the ingredient that was added or already existed
    return PantryItem(ingredient_id=ingredient.id, name=ingredient.name, category=ingredient.category)
# --- END UPDATE ---


@app.delete("/api/pantry/{ingredient_id}", status_code=204)
def remove_pantry_item(ingredient_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # ...(no changes needed here)...
    ingredient = session.get(Ingredient, ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    user = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.pantry_items))
    ).first()

    if ingredient in user.pantry_items:
        user.pantry_items.remove(ingredient)
        session.add(user)
        session.commit()


@app.get("/api/ingredients/search", response_model=List[PantryItem])
def search_ingredients(q: str, session: Session = Depends(get_session)):
    # ...(no changes needed here)...
    if not q or len(q) < 2:
        return []

    search_term = f"%{q.lower()}%"
    ingredients = session.exec(
        select(Ingredient)
        .where(
            Ingredient.is_staple == True,
            func.lower(Ingredient.name).like(search_term)
        )
        .limit(10)
    ).all()

    return [PantryItem(ingredient_id=ing.id, name=ing.name, category=ing.category) for ing in ingredients]


@app.get("/api/ingredients/staples", response_model=Dict[str, List[PantryItem]])
def get_staple_ingredients(session: Session = Depends(get_session)):
    # ...(no changes needed here)...
    staples = session.exec(select(Ingredient).where(Ingredient.is_staple == True).order_by(Ingredient.category, Ingredient.name)).all()

    categorized_staples = {}
    for staple in staples:
        category = staple.category or "Other"
        if category not in categorized_staples:
            categorized_staples[category] = []

        categorized_staples[category].append(PantryItem(
            ingredient_id=staple.id,
            name=staple.name,
            category=staple.category
        ))
    return dict(sorted(categorized_staples.items()))


# --- BARCODE LOOKUP ENDPOINT ---
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
# --- END BARCODE LOOKUP ---


@app.get("/")
def read_root(): return {"message": "Welcome!"}

@app.post("/api/generate-recipes")
def generate_recipes_endpoint(request: GenerateRequest, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # ...(no changes needed here)...
    ai_generated_recipes = generate_recipes_from_specials(
        specials_list=request.specials,
        preferences=request.preferences,
        pantry_items=request.pantry_items
    )
    saved_recipes_count = 0
    if not isinstance(ai_generated_recipes, list):
         print(f"AI service did not return a list: {ai_generated_recipes}")
         raise HTTPException(status_code=500, detail="AI failed to generate recipes in expected format.")

    user = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.saved_recipes))
    ).first()

    for recipe_dict in ai_generated_recipes:
        if not isinstance(recipe_dict, dict):
             print(f"AI generated item is not a dictionary: {recipe_dict}")
             continue
        try:
            if 'ingredients' not in recipe_dict or not isinstance(recipe_dict['ingredients'], list):
                print(f"Skipping recipe due to missing or invalid ingredients: {recipe_dict.get('title')}")
                continue

            recipe_data = RecipeCreate(**recipe_dict)
            saved_recipe = _save_recipe_to_db(recipe_data, session)

            if saved_recipe not in user.saved_recipes:
                 user.saved_recipes.append(saved_recipe)
                 session.add(user)

            saved_recipes_count += 1
        except Exception as e:
            print(f"Could not validate or save AI recipe '{recipe_dict.get('title', 'N/A')}': {e}")

    session.commit()

    return {"message": f"Successfully generated and saved {saved_recipes_count} new recipes."}


@app.get("/api/prices/today", response_model=List[PriceHistoryRead])
def get_todays_prices(session: Session = Depends(get_session)):
    # ...(no changes needed here)...
    today = date.today()
    db_prices = session.exec(
        select(PriceHistory)
        .where(PriceHistory.date_recorded == today)
        .options(selectinload(PriceHistory.ingredient))
    ).all()

    return [
        PriceHistoryRead(
            id=p.id,
            ingredient_id=p.ingredient_id,
            date_recorded=p.date_recorded.isoformat(),
            price=p.price,
            store=p.store,
            ingredient_name=p.ingredient.name,
            category=p.ingredient.category
        ) for p in db_prices
    ]


@app.post("/api/prices", response_model=PriceHistoryRead)
def create_price_record(price_data: PriceHistoryCreate, session: Session = Depends(get_session)):
    # ...(no changes needed here)...
    ingredient = get_or_create_ingredient(price_data.ingredient_name, session, category=price_data.category)
    today = date.today()
    existing_record = session.exec(
        select(PriceHistory).where(
            PriceHistory.ingredient_id == ingredient.id,
            PriceHistory.store == price_data.store,
            PriceHistory.date_recorded == today
        )
    ).first()

    if existing_record:
        if existing_record.price != price_data.price:
             existing_record.price = price_data.price
             session.add(existing_record)
             session.commit()
             session.refresh(existing_record)
             print(f"Updated price for {ingredient.name} at {price_data.store} for {today}")
             new_price_record = existing_record
        else:
             print(f"Skipping duplicate price for {ingredient.name} at {price_data.store} for {today}")
             new_price_record = existing_record
    else:
        new_price_record = PriceHistory(
            ingredient_id=ingredient.id,
            price=price_data.price,
            store=price_data.store,
            date_recorded=today
        )
        session.add(new_price_record)
        session.commit()
        session.refresh(new_price_record)
        print(f"Created new price for {ingredient.name} at {price_data.store} for {today}")


    return PriceHistoryRead(
        id=new_price_record.id,
        ingredient_id=ingredient.id,
        date_recorded=new_price_record.date_recorded.isoformat(),
        price=new_price_record.price,
        store=new_price_record.store,
        ingredient_name=ingredient.name,
        category=ingredient.category
    )


@app.delete("/api/prices/today")
def delete_todays_prices(session: Session = Depends(get_session)):
    # ...(no changes needed here)...
    today = date.today()
    try:
        statement = delete(PriceHistory).where(PriceHistory.date_recorded == today)
        result = session.exec(statement)
        session.commit()
        deleted_count = result.rowcount
        print(f"Deleted {deleted_count} price records for {today}.")
        return {"message": f"Today's {deleted_count} price records have been cleared."}
    except Exception as e:
        session.rollback()
        print(f"Error deleting prices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ingredient/{ingredient_id}/price-history", response_model=List[PriceHistoryRead])
def get_price_history_for_ingredient(ingredient_id: int, session: Session = Depends(get_session)):
    # ...(no changes needed here)...
    ingredient = session.get(Ingredient, ingredient_id)
    if not ingredient:
         raise HTTPException(status_code=404, detail="Ingredient not found.")

    history = session.exec(
        select(PriceHistory)
        .where(PriceHistory.ingredient_id == ingredient_id)
        .order_by(PriceHistory.date_recorded.desc())
    ).all()

    return [
        PriceHistoryRead(
            id=h.id,
            ingredient_id=h.ingredient_id,
            date_recorded=h.date_recorded.isoformat(),
            price=h.price,
            store=h.store,
            ingredient_name=ingredient.name
        ) for h in history
    ]


@app.get("/api/tags", response_model=List[str])
def get_all_tags(session: Session = Depends(get_session)):
    # ...(no changes needed here)...
    all_recipes = session.exec(select(Recipe.tags)).all()
    all_tags = set()
    for tags_list in all_recipes:
        if tags_list:
            for tag in tags_list:
                all_tags.add(tag)
    return sorted(list(all_tags))


@app.get("/api/recipes", response_model=List[RecipeResponse])
def get_recipes(
    session: Session = Depends(get_session),
    min_rating: Optional[float] = Query(None, ge=1, le=5),
    sort_by: Optional[str] = Query(None),
    tags: Optional[str] = Query(None)
):
    # ...(no changes needed here)...
    query = select(Recipe).options(
        selectinload(Recipe.links).selectinload(RecipeIngredientLink.ingredient)
    )

    average_rating_sql = func.coalesce(
         func.cast(Recipe.total_rating, Float) / func.nullif(Recipe.rating_count, 0),
         0.0
    )

    if min_rating is not None:
        query = query.where(average_rating_sql >= min_rating)

    if sort_by is not None:
        if sort_by == "rating_asc":
            query = query.order_by(average_rating_sql.asc())
        elif sort_by == "rating_desc":
            query = query.order_by(average_rating_sql.desc())
        elif sort_by == "title_asc":
            query = query.order_by(Recipe.title.asc())
        elif sort_by == "title_desc":
            query = query.order_by(Recipe.title.desc())

    db_recipes = session.exec(query).all()

    if tags:
        selected_tags = {tag.strip().lower() for tag in tags.split(',')}
        db_recipes = [
            recipe for recipe in db_recipes
            if recipe.tags and selected_tags.issubset({t.lower() for t in recipe.tags})
        ]

    response_recipes = []
    for recipe in db_recipes:
        response_ingredients = [
            IngredientInRecipe(ingredient_id=link.ingredient.id, name=link.ingredient.name, quantity=link.quantity)
            for link in recipe.links
        ]

        response_recipe = RecipeResponse(
            id=recipe.id,
            title=recipe.title,
            description=recipe.description,
            instructions=recipe.instructions,
            ingredients=response_ingredients,
            tags=recipe.tags,
            total_rating=recipe.total_rating,
            rating_count=recipe.rating_count,
        )
        response_recipes.append(response_recipe)

    return response_recipes


@app.post("/api/recipes", response_model=RecipeResponse)
def create_recipe(recipe_data: RecipeCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # ...(no changes needed here)...
    try:
        new_recipe = _save_recipe_to_db(recipe_data, session)

        session.refresh(new_recipe, attribute_names=["links"])
        for link in new_recipe.links:
             session.refresh(link, attribute_names=["ingredient"])

        response_ingredients = [
            IngredientInRecipe(ingredient_id=link.ingredient.id, name=link.ingredient.name, quantity=link.quantity)
            for link in new_recipe.links
        ]

        response_recipe = RecipeResponse(
            id=new_recipe.id,
            title=new_recipe.title,
            description=new_recipe.description,
            instructions=new_recipe.instructions,
            ingredients=response_ingredients,
            tags=new_recipe.tags,
            total_rating=new_recipe.total_rating,
            rating_count=new_recipe.rating_count
        )
        return response_recipe

    except Exception as e:
        session.rollback()
        print(f"Could not save new recipe: {e}")
        raise HTTPException(status_code=500, detail="Failed to save the new recipe.")


@app.post("/api/recipes/{recipe_id}/rate", status_code=200)
def rate_recipe(
    recipe_id: int,
    rating: RecipeRating,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # ...(no changes needed here)...
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    existing_rating_link = session.exec(
        select(UserRecipeRatingLink).where(
            UserRecipeRatingLink.user_id == current_user.id,
            UserRecipeRatingLink.recipe_id == recipe_id
        )
    ).first()

    if existing_rating_link:
        old_rating = existing_rating_link.rating
        existing_rating_link.rating = rating.rating
        recipe.total_rating = recipe.total_rating - old_rating + rating.rating
        session.add(existing_rating_link)
    else:
        recipe.total_rating += rating.rating
        recipe.rating_count += 1
        new_rating_link = UserRecipeRatingLink(user_id=current_user.id, recipe_id=recipe_id, rating=rating.rating)
        session.add(new_rating_link)

    session.add(recipe)
    session.commit()

    return {"message": "Recipe rated successfully"}


@app.post("/api/recipes/modify", response_model=RecipeCreate)
def modify_recipe_endpoint(request: RecipeModificationRequest, session: Session = Depends(get_session)):
    # ...(no changes needed here)...
    try:
        if isinstance(request.original_recipe, SQLModel):
             original_recipe_dict = request.original_recipe.model_dump()
        else:
             original_recipe_dict = request.original_recipe

        modified_recipe_data = modify_recipe_with_ai(
            original_recipe=original_recipe_dict,
            modification_prompt=request.modification_prompt
        )

        if isinstance(modified_recipe_data, dict) and "error" in modified_recipe_data:
            print(f"AI modification failed: {modified_recipe_data['error']}")
            raise HTTPException(status_code=500, detail=modified_recipe_data["error"])

        validated_recipe = RecipeCreate(**modified_recipe_data)
        return validated_recipe

    except Exception as e:
        print(f"Error in modification endpoint: {e}")
        raise HTTPException(status_code=500, detail="Failed to process recipe modification.")


@app.delete("/api/recipes/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: int, session: Session = Depends(get_session)):
    # ...(no changes needed here)...
    recipe = session.get(Recipe, recipe_id)
    if not recipe: raise HTTPException(status_code=404, detail="Recipe not found")

    session.exec(delete(UserRecipeRatingLink).where(UserRecipeRatingLink.recipe_id == recipe_id))
    session.exec(delete(UserRecipeLink).where(UserRecipeLink.recipe_id == recipe_id))
    session.exec(delete(RecipeIngredientLink).where(RecipeIngredientLink.recipe_id == recipe_id))

    session.delete(recipe)
    session.commit()


@app.delete("/api/recipes", status_code=200)
def delete_all_recipes(session: Session = Depends(get_session)):
    # ...(no changes needed here)...
    try:
        deleted_ratings = session.exec(delete(UserRecipeRatingLink)).rowcount
        deleted_saves = session.exec(delete(UserRecipeLink)).rowcount
        deleted_ingredients = session.exec(delete(RecipeIngredientLink)).rowcount
        deleted_recipes = session.exec(delete(Recipe)).rowcount
        session.commit()
        print(f"Deleted all recipes: {deleted_recipes} recipes, {deleted_ingredients} ingredients links, {deleted_saves} saves, {deleted_ratings} ratings.")
        return {"message": f"All {deleted_recipes} recipes and related data have been cleared."}
    except Exception as e:
        session.rollback()
        print(f"Error deleting all recipes: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear all recipes.")