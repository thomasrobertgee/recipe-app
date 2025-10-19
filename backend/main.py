# backend/main.py

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from contextlib import asynccontextmanager
from typing import List, Optional, Dict
from sqlmodel import Session, select, func, delete # <-- Added delete
from sqlalchemy.orm import selectinload
from datetime import date
import os
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from database import engine, create_db_and_tables, get_session
from models import ( # <-- Grouped imports
    User, Recipe, Ingredient, RecipeIngredientLink, PriceHistory,
    UserRecipeRatingLink, UserPantryLink, UserRecipeLink # <-- Added UserRecipeLink explicitly
)
from schemas import (
    GenerateRequest, UserCreate, UserRead, UserUpdate, Token,
    RecipeResponse, IngredientInRecipe, RecipeCreate, PriceHistoryCreate,
    PriceHistoryRead, RecipeRating, PantryItem, PantryItemCreate,
    RecipeModificationRequest, GoogleLoginRequest
)
from security import get_password_hash, verify_password, create_access_token, get_current_user
from ai_service import generate_recipes_from_specials, modify_recipe_with_ai

# --- ADD YOUR NETWORK ORIGIN HERE ---
origins = [
    "http://localhost:5173",
    "http://192.168.1.102:5173" # <-- ADDED YOUR PC's NETWORK IP
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
    allow_origins=origins, # <-- Use the updated list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- (Rest of the file remains the same) ---

def get_or_create_ingredient(name: str, session: Session, category: Optional[str] = None) -> Ingredient:
    exact_match = session.exec(select(Ingredient).where(func.lower(Ingredient.name) == name.lower())).first()
    if exact_match:
        if category and not exact_match.category:
            exact_match.category = category
            session.add(exact_match)
            session.commit()
            session.refresh(exact_match)
        return exact_match

    new_ingredient = Ingredient(name=name, category=category)
    session.add(new_ingredient)
    session.commit()
    session.refresh(new_ingredient)
    return new_ingredient


def _save_recipe_to_db(recipe_data: RecipeCreate, session: Session) -> Recipe:
    new_recipe = Recipe(
        title=recipe_data.title,
        description=recipe_data.description,
        instructions=recipe_data.instructions,
        tags=recipe_data.tags
    )
    session.add(new_recipe)

    for ing_data in recipe_data.ingredients:
        ingredient = get_or_create_ingredient(ing_data.name, session)
        link = RecipeIngredientLink(recipe=new_recipe, ingredient=ingredient, quantity=ing_data.quantity)
        session.add(link)

    session.commit()
    session.refresh(new_recipe)
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
        # Set defaults explicitly for clarity
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

        # 1. Check if user exists with this Google ID
        user = session.exec(select(User).where(User.google_user_id == google_sub)).first()
        if user:
            access_token = create_access_token(data={"sub": user.email})
            return Token(access_token=access_token, token_type="bearer")

        # 2. If not, check if user exists with this email
        user = session.exec(select(User).where(User.email == email)).first()
        if user:
            # Email exists, but not linked to Google. Link it.
            if not user.google_user_id: # Only link if not already linked
                 user.google_user_id = google_sub
                 session.add(user)
                 session.commit()
                 session.refresh(user)
            access_token = create_access_token(data={"sub": user.email})
            return Token(access_token=access_token, token_type="bearer")

        # 3. If no user exists at all, create a new one
        new_user = User(
            email=email,
            google_user_id=google_sub,
            hashed_password=None, # No password for OAuth users
            # Set defaults explicitly
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
        # Handle potential None for budget
        if key == 'weekly_budget' and value is None:
             setattr(current_user, key, None)
        elif value is not None: # Avoid overwriting with None unless intended (like budget)
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
        raise HTTPException(status_code=404, detail="User not found") # Should not happen with Depends(get_current_user)

    response_recipes = []
    for recipe in user_with_recipes.saved_recipes:
        response_ingredients = [
            IngredientInRecipe(ingredient_id=link.ingredient.id, name=link.ingredient.name, quantity=link.quantity)
            for link in recipe.links
        ]

        avg_rating = 0
        if recipe.rating_count > 0:
            avg_rating = round(recipe.total_rating / recipe.rating_count, 1)

        # Construct RecipeResponse manually to include average_rating
        response_recipe = RecipeResponse(
            id=recipe.id,
            title=recipe.title,
            description=recipe.description,
            instructions=recipe.instructions,
            ingredients=response_ingredients,
            tags=recipe.tags,
            total_rating=recipe.total_rating,
            rating_count=recipe.rating_count,
            # average_rating=avg_rating # Add average_rating if schema includes it
        )
        # Use RecipeResponse.from_orm if you prefer that method
        # response_recipe = RecipeResponse.from_orm(recipe, ingredients=response_ingredients)

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

    if recipe not in user.saved_recipes:
        user.saved_recipes.append(recipe)
        session.add(user)
        session.commit()
    return {"message": "Recipe saved successfully"}

@app.delete("/api/users/me/saved-recipes/{recipe_id}", status_code=204)
def unsave_a_recipe(recipe_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
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
    # No return needed for 204

@app.get("/api/pantry", response_model=List[PantryItem])
def get_pantry_items(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    user_with_pantry = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.pantry_items))
    ).first()
    return [PantryItem(ingredient_id=ing.id, name=ing.name, category=ing.category) for ing in user_with_pantry.pantry_items]

@app.post("/api/pantry", response_model=PantryItem)
def add_pantry_item(item: PantryItemCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    ingredient = get_or_create_ingredient(item.ingredient_name, session)

    user = session.exec(
        select(User).where(User.id == current_user.id).options(selectinload(User.pantry_items))
    ).first()

    if ingredient in user.pantry_items:
        # Return existing item data instead of raising error? Or just 200 OK?
        # raise HTTPException(status_code=400, detail="Item already in pantry")
        print(f"Item '{ingredient.name}' already in pantry for user {current_user.id}")
        return PantryItem(ingredient_id=ingredient.id, name=ingredient.name, category=ingredient.category)


    user.pantry_items.append(ingredient)
    session.add(user)
    session.commit()
    return PantryItem(ingredient_id=ingredient.id, name=ingredient.name, category=ingredient.category)

@app.delete("/api/pantry/{ingredient_id}", status_code=204)
def remove_pantry_item(ingredient_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
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
    # No return needed for 204

@app.get("/api/ingredients/search", response_model=List[PantryItem])
def search_ingredients(q: str, session: Session = Depends(get_session)):
    if not q or len(q) < 2:
        return []

    search_term = f"%{q.lower()}%"
    ingredients = session.exec(
        select(Ingredient)
        .where(
            Ingredient.is_staple == True, # Only search staples? Or all ingredients?
            func.lower(Ingredient.name).like(search_term)
        )
        .limit(10)
    ).all()

    return [PantryItem(ingredient_id=ing.id, name=ing.name, category=ing.category) for ing in ingredients]

@app.get("/api/ingredients/staples", response_model=Dict[str, List[PantryItem]])
def get_staple_ingredients(session: Session = Depends(get_session)):
    staples = session.exec(select(Ingredient).where(Ingredient.is_staple == True).order_by(Ingredient.category, Ingredient.name)).all() # Added ordering

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
    # Sort categories alphabetically
    return dict(sorted(categorized_staples.items()))


@app.get("/")
def read_root(): return {"message": "Welcome!"}

@app.post("/api/generate-recipes")
def generate_recipes_endpoint(request: GenerateRequest, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)): # Added current_user
    # Ensure preferences passed match the current user for security/privacy?
    # Or rely on the fact that GenerateRequest contains UserRead, not sensitive data.

    ai_generated_recipes = generate_recipes_from_specials(
        specials_list=request.specials,
        preferences=request.preferences,
        pantry_items=request.pantry_items
    )
    saved_recipes_count = 0
    if not isinstance(ai_generated_recipes, list):
         print(f"AI service did not return a list: {ai_generated_recipes}")
         raise HTTPException(status_code=500, detail="AI failed to generate recipes in expected format.")

    for recipe_dict in ai_generated_recipes:
        if not isinstance(recipe_dict, dict):
             print(f"AI generated item is not a dictionary: {recipe_dict}")
             continue # Skip this item
        try:
            # Ensure ingredients list exists and is a list
            if 'ingredients' not in recipe_dict or not isinstance(recipe_dict['ingredients'], list):
                print(f"Skipping recipe due to missing or invalid ingredients: {recipe_dict.get('title')}")
                continue

            recipe_data = RecipeCreate(**recipe_dict)
            saved_recipe = _save_recipe_to_db(recipe_data, session)
            # --- Automatically save generated recipe for the user ---
            user = session.exec(
                select(User).where(User.id == current_user.id).options(selectinload(User.saved_recipes))
            ).first()
            if saved_recipe not in user.saved_recipes:
                 user.saved_recipes.append(saved_recipe)
                 session.add(user)
                 session.commit() # Commit after each save? Or once at the end? Once is better.
            # --- End auto-save ---
            saved_recipes_count += 1
        except Exception as e:
            # Catch validation errors or DB errors
            print(f"Could not validate or save AI recipe '{recipe_dict.get('title', 'N/A')}': {e}")
            # Optionally: Log the problematic recipe_dict for debugging

    # Commit any newly saved recipes for the user
    session.commit()

    return {"message": f"Successfully generated and saved {saved_recipes_count} new recipes."}


@app.get("/api/prices/today", response_model=List[PriceHistoryRead])
def get_todays_prices(session: Session = Depends(get_session)):
    today = date.today()
    # Corrected typo: PriceTopping -> PriceHistory
    db_prices = session.exec(
        select(PriceHistory)
        .where(PriceHistory.date_recorded == today)
        .options(selectinload(PriceHistory.ingredient)) # Eager load ingredient
    ).all()

    return [
        PriceHistoryRead(
            id=p.id,
            ingredient_id=p.ingredient_id, # Use p.ingredient_id directly
            date_recorded=p.date_recorded.isoformat(),
            price=p.price,
            store=p.store,
            ingredient_name=p.ingredient.name, # Access name from loaded ingredient
            category=p.ingredient.category    # Access category from loaded ingredient
        ) for p in db_prices
    ]

@app.post("/api/prices", response_model=PriceHistoryRead)
def create_price_record(price_data: PriceHistoryCreate, session: Session = Depends(get_session)):
    ingredient = get_or_create_ingredient(price_data.ingredient_name, session, category=price_data.category)

    # Check if a record for this ingredient, store, and date already exists
    today = date.today()
    existing_record = session.exec(
        select(PriceHistory).where(
            PriceHistory.ingredient_id == ingredient.id,
            PriceHistory.store == price_data.store,
            PriceHistory.date_recorded == today
        )
    ).first()

    if existing_record:
        # Update existing record if price is different
        if existing_record.price != price_data.price:
             existing_record.price = price_data.price
             session.add(existing_record)
             session.commit()
             session.refresh(existing_record)
             print(f"Updated price for {ingredient.name} at {price_data.store} for {today}")
             new_price_record = existing_record
        else:
             print(f"Skipping duplicate price for {ingredient.name} at {price_data.store} for {today}")
             new_price_record = existing_record # Return existing data
    else:
        # Create new record
        new_price_record = PriceHistory(
            ingredient_id=ingredient.id,
            price=price_data.price,
            store=price_data.store,
            date_recorded=today # Ensure date is set
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
    today = date.today()
    try:
        # Use delete() for potentially better performance on large deletes
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
    # Check if ingredient exists first
    ingredient = session.get(Ingredient, ingredient_id)
    if not ingredient:
         raise HTTPException(status_code=404, detail="Ingredient not found.")

    history = session.exec(
        select(PriceHistory)
        .where(PriceHistory.ingredient_id == ingredient_id)
        .order_by(PriceHistory.date_recorded.desc())
        # .options(selectinload(PriceHistory.ingredient)) # Not needed if we have ingredient already
    ).all()

    # No need to check if history is empty, return [] is correct if no history

    return [
        PriceHistoryRead(
            id=h.id,
            ingredient_id=h.ingredient_id,
            date_recorded=h.date_recorded.isoformat(),
            price=h.price,
            store=h.store,
            ingredient_name=ingredient.name # Use name from ingredient object
        ) for h in history
    ]

@app.get("/api/tags", response_model=List[str])
def get_all_tags(session: Session = Depends(get_session)):
    # Optimized query to fetch distinct tags directly from the database if possible
    # This might require specific DB features or a different approach
    # Fallback to fetching all recipes:
    all_recipes = session.exec(select(Recipe.tags)).all() # Fetch only tags column
    all_tags = set()
    for tags_list in all_recipes:
        if tags_list: # Check if tags_list is not None
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
    query = select(Recipe).options(
        selectinload(Recipe.links).selectinload(RecipeIngredientLink.ingredient)
    )

    # Calculate average rating using SQL functions for efficiency
    average_rating_sql = func.coalesce(
         func.cast(Recipe.total_rating, Float) / func.nullif(Recipe.rating_count, 0),
         0.0 # Ensure division by zero returns 0.0 (float)
    )

    if min_rating is not None:
        query = query.where(average_rating_sql >= min_rating)

    if sort_by is not None:
        if sort_by == "rating_asc":
            query = query.order_by(average_rating_sql.asc())
        elif sort_by == "rating_desc":
            query = query.order_by(average_rating_sql.desc())
        # Add other sort options like title?
        elif sort_by == "title_asc":
            query = query.order_by(Recipe.title.asc())
        elif sort_by == "title_desc":
            query = query.order_by(Recipe.title.desc())


    db_recipes = session.exec(query).all()

    # Filter by tags in Python after fetching if complex JSON query is not feasible/performant
    if tags:
        selected_tags = {tag.strip().lower() for tag in tags.split(',')}
        db_recipes = [
            recipe for recipe in db_recipes
            if recipe.tags and selected_tags.issubset({t.lower() for t in recipe.tags}) # Handle potential None for tags
        ]

    response_recipes = []
    for recipe in db_recipes:
        response_ingredients = [
            IngredientInRecipe(ingredient_id=link.ingredient.id, name=link.ingredient.name, quantity=link.quantity)
            for link in recipe.links
        ]

        avg_rating = 0
        if recipe.rating_count > 0:
            avg_rating = round(recipe.total_rating / recipe.rating_count, 1)

        # Manually construct to include avg_rating
        response_recipe = RecipeResponse(
            id=recipe.id,
            title=recipe.title,
            description=recipe.description,
            instructions=recipe.instructions,
            ingredients=response_ingredients,
            tags=recipe.tags,
            total_rating=recipe.total_rating,
            rating_count=recipe.rating_count,
            # average_rating=avg_rating # Add if schema supports it
        )
        # Or use from_orm if preferred
        # response_recipe = RecipeResponse.from_orm(recipe, ingredients=response_ingredients)

        response_recipes.append(response_recipe)

    return response_recipes

@app.post("/api/recipes", response_model=RecipeResponse)
def create_recipe(recipe_data: RecipeCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Creates and saves a single new recipe, optionally saves for the user."""
    try:
        new_recipe = _save_recipe_to_db(recipe_data, session)

        # --- Consider if creating should automatically save for the user ---
        # If yes:
        # user = session.exec(
        #     select(User).where(User.id == current_user.id).options(selectinload(User.saved_recipes))
        # ).first()
        # if new_recipe not in user.saved_recipes:
        #      user.saved_recipes.append(new_recipe)
        #      session.add(user)
        #      session.commit()
        # --- End auto-save ---

        # Eager load the new recipe's links and ingredients for the response
        session.refresh(new_recipe, attribute_names=["links"])
        # Ensure ingredients within links are loaded if needed
        for link in new_recipe.links:
             session.refresh(link, attribute_names=["ingredient"])


        response_ingredients = [
            IngredientInRecipe(ingredient_id=link.ingredient.id, name=link.ingredient.name, quantity=link.quantity)
            for link in new_recipe.links
        ]

        # Manually construct response
        response_recipe = RecipeResponse(
            id=new_recipe.id,
            title=new_recipe.title,
            description=new_recipe.description,
            instructions=new_recipe.instructions,
            ingredients=response_ingredients,
            tags=new_recipe.tags,
            total_rating=new_recipe.total_rating, # Should be 0
            rating_count=new_recipe.rating_count  # Should be 0
            # average_rating=0.0 # Add if schema supports
        )
        # Or use from_orm
        # response_recipe = RecipeResponse.from_orm(new_recipe, ingredients=response_ingredients)

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
        # Update existing rating
        old_rating = existing_rating_link.rating
        existing_rating_link.rating = rating.rating
        recipe.total_rating = recipe.total_rating - old_rating + rating.rating
        session.add(existing_rating_link)
    else:
        # Add new rating
        recipe.total_rating += rating.rating
        recipe.rating_count += 1
        new_rating_link = UserRecipeRatingLink(user_id=current_user.id, recipe_id=recipe_id, rating=rating.rating)
        session.add(new_rating_link)

    session.add(recipe) # Add recipe again to ensure changes are staged
    session.commit()
    # No need to refresh recipe unless returning it

    return {"message": "Recipe rated successfully"}


@app.post("/api/recipes/modify", response_model=RecipeCreate)
def modify_recipe_endpoint(request: RecipeModificationRequest, session: Session = Depends(get_session)):
    """
    Receives an original recipe and a modification prompt,
    and returns a new, AI-modified recipe dict (matching RecipeCreate schema).
    This new recipe is NOT saved to the database automatically.
    """
    try:
        # Ensure original_recipe is a dict for the AI service
        if isinstance(request.original_recipe, SQLModel):
             original_recipe_dict = request.original_recipe.model_dump()
        else:
             # Handle case if it's already a dict (less likely with FastAPI validation)
             original_recipe_dict = request.original_recipe


        modified_recipe_data = modify_recipe_with_ai(
            original_recipe=original_recipe_dict,
            modification_prompt=request.modification_prompt
        )

        # Check if AI returned an error structure
        if isinstance(modified_recipe_data, dict) and "error" in modified_recipe_data:
            print(f"AI modification failed: {modified_recipe_data['error']}")
            raise HTTPException(status_code=500, detail=modified_recipe_data["error"])

        # Validate the AI output against the RecipeCreate schema
        # This ensures the AI result is in the correct format before sending back
        validated_recipe = RecipeCreate(**modified_recipe_data)
        return validated_recipe # Return the Pydantic model instance

    except Exception as e:
        # Catch validation errors or errors from the AI service call
        print(f"Error in modification endpoint: {e}")
        # Consider more specific error handling/logging
        raise HTTPException(status_code=500, detail="Failed to process recipe modification.")


@app.delete("/api/recipes/{recipe_id}", status_code=204) # Use 204 No Content
def delete_recipe(recipe_id: int, session: Session = Depends(get_session)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe: raise HTTPException(status_code=404, detail="Recipe not found")

    # Manually delete related links first if cascade delete is not set/reliable
    session.exec(delete(UserRecipeRatingLink).where(UserRecipeRatingLink.recipe_id == recipe_id))
    session.exec(delete(UserRecipeLink).where(UserRecipeLink.recipe_id == recipe_id))
    session.exec(delete(RecipeIngredientLink).where(RecipeIngredientLink.recipe_id == recipe_id))

    session.delete(recipe)
    session.commit()
    # No return for 204

@app.delete("/api/recipes", status_code=200) # Maybe 200 OK with message?
def delete_all_recipes(session: Session = Depends(get_session)):

    try:
        # Manually delete links first
        deleted_ratings = session.exec(delete(UserRecipeRatingLink)).rowcount
        deleted_saves = session.exec(delete(UserRecipeLink)).rowcount
        deleted_ingredients = session.exec(delete(RecipeIngredientLink)).rowcount

        # Now delete all recipes
        deleted_recipes = session.exec(delete(Recipe)).rowcount

        session.commit()
        print(f"Deleted all recipes: {deleted_recipes} recipes, {deleted_ingredients} ingredients links, {deleted_saves} saves, {deleted_ratings} ratings.")
        return {"message": f"All {deleted_recipes} recipes and related data have been cleared."}
    except Exception as e:
        session.rollback()
        print(f"Error deleting all recipes: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear all recipes.")