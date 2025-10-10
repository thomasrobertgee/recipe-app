# backend/main.py

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from contextlib import asynccontextmanager
from typing import List, Optional, Dict
from sqlmodel import Session, select, func
from sqlalchemy.orm import selectinload
from datetime import date

from database import engine, create_db_and_tables, get_session
from models import User, Recipe, Ingredient, RecipeIngredientLink, PriceHistory, UserRecipeRatingLink, UserPantryLink
from schemas import (
    GenerateRequest, UserCreate, UserRead, UserUpdate, Token,
    RecipeResponse, IngredientInRecipe, RecipeCreate, PriceHistoryCreate,
    PriceHistoryRead, RecipeRating, PantryItem, PantryItemCreate
)
from security import get_password_hash, verify_password, create_access_token, get_current_user
from ai_service import generate_recipes_from_specials

origins = ["http://localhost:5173"]

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
    new_user = User(email=user.email, hashed_password=hashed_password)
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

@app.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer")

@app.get("/users/me", response_model=UserRead)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.put("/users/me", response_model=UserRead)
def update_user_me(user_update: UserUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user

@app.get("/api/users/me/saved-recipes", response_model=List[RecipeResponse])
def get_saved_recipes(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    response_recipes = []
    for recipe in current_user.saved_recipes:
        response_ingredients = [
            IngredientInRecipe(ingredient_id=link.ingredient.id, name=link.ingredient.name, quantity=link.quantity)
            for link in recipe.links
        ]
        response_recipes.append(RecipeResponse.from_orm(recipe, update={'ingredients': response_ingredients}))
    return response_recipes

@app.post("/api/users/me/saved-recipes/{recipe_id}", status_code=201)
def save_a_recipe(recipe_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    if recipe not in current_user.saved_recipes:
        current_user.saved_recipes.append(recipe)
        session.commit()
    return {"message": "Recipe saved successfully"}

@app.delete("/api/users/me/saved-recipes/{recipe_id}", status_code=204)
def unsave_a_recipe(recipe_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    if recipe in current_user.saved_recipes:
        current_user.saved_recipes.remove(recipe)
        session.commit()
    return

@app.get("/api/pantry", response_model=List[PantryItem])
def get_pantry_items(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    return [PantryItem(ingredient_id=ing.id, name=ing.name, category=ing.category) for ing in current_user.pantry_items]

@app.post("/api/pantry", response_model=PantryItem)
def add_pantry_item(item: PantryItemCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    ingredient = get_or_create_ingredient(item.ingredient_name, session)
    
    if ingredient in current_user.pantry_items:
        raise HTTPException(status_code=400, detail="Item already in pantry")
        
    current_user.pantry_items.append(ingredient)
    session.add(current_user)
    session.commit()
    return PantryItem(ingredient_id=ingredient.id, name=ingredient.name, category=ingredient.category)

@app.delete("/api/pantry/{ingredient_id}", status_code=204)
def remove_pantry_item(ingredient_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    ingredient = session.get(Ingredient, ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    if ingredient in current_user.pantry_items:
        current_user.pantry_items.remove(ingredient)
        session.commit()

@app.get("/api/ingredients/search", response_model=List[PantryItem])
def search_ingredients(q: str, session: Session = Depends(get_session)):
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
    
    return [PantryItem(ingredient_id=ing.id, name=ing.name) for ing in ingredients]

@app.get("/api/ingredients/staples", response_model=Dict[str, List[PantryItem]])
def get_staple_ingredients(session: Session = Depends(get_session)):
    staples = session.exec(select(Ingredient).where(Ingredient.is_staple == True)).all()
    
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
    return categorized_staples

@app.get("/")
def read_root(): return {"message": "Welcome!"}

@app.post("/api/generate-recipes")
def generate_recipes_endpoint(request: GenerateRequest, session: Session = Depends(get_session)):
    # --- UPDATED: Use the specials list sent from the frontend request body ---
    ai_generated_recipes = generate_recipes_from_specials(
        specials_list=request.specials,
        preferences=request.preferences,
        pantry_items=request.pantry_items
    )
    saved_recipes_count = 0
    for recipe_dict in ai_generated_recipes:
        try:
            recipe_data = RecipeCreate(**recipe_dict)
            _save_recipe_to_db(recipe_data, session)
            saved_recipes_count += 1
        except Exception as e:
            print(f"Could not validate or save AI recipe: {e}")
    return {"message": f"Successfully generated and saved {saved_recipes_count} new recipes."}


@app.get("/api/prices/today", response_model=List[PriceHistoryRead])
def get_todays_prices(session: Session = Depends(get_session)):
    """Gets all the price records recorded today (i.e., the current specials)."""
    today = date.today()
    db_prices = session.exec(
        select(PriceHistory)
        .where(PriceHistory.date_recorded == today)
        .options(selectinload(PriceHistory.ingredient))
    ).all()
    
    return [
        PriceHistoryRead.from_orm(p, update={
            'ingredient_name': p.ingredient.name,
            'category': p.ingredient.category
        }) for p in db_prices
    ]

@app.post("/api/prices", response_model=PriceHistoryRead)
def create_price_record(price_data: PriceHistoryCreate, session: Session = Depends(get_session)):
    """Creates a new price history record."""
    ingredient = get_or_create_ingredient(price_data.ingredient_name, session, category=price_data.category)
    
    new_price_record = PriceHistory(
        ingredient_id=ingredient.id,
        price=price_data.price,
        store=price_data.store
    )
    session.add(new_price_record)
    session.commit()
    session.refresh(new_price_record)
    
    return PriceHistoryRead.from_orm(new_price_record, update={'ingredient_name': ingredient.name, 'category': ingredient.category})

@app.delete("/api/prices/today")
def delete_todays_prices(session: Session = Depends(get_session)):
    """Deletes all price records from today before a new scrape."""
    today = date.today()
    try:
        prices_to_delete = session.exec(select(PriceHistory).where(PriceHistory.date_recorded == today)).all()
        for price in prices_to_delete:
            session.delete(price)
        session.commit()
        return {"message": "Today's price records have been cleared."}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ingredient/{ingredient_id}/price-history", response_model=List[PriceHistoryRead])
def get_price_history_for_ingredient(ingredient_id: int, session: Session = Depends(get_session)):
    """Gets the full price history for a single ingredient."""
    history = session.exec(
        select(PriceHistory)
        .where(PriceHistory.ingredient_id == ingredient_id)
        .order_by(PriceHistory.date_recorded.desc())
        .options(selectinload(PriceHistory.ingredient))
    ).all()

    if not history:
        raise HTTPException(status_code=404, detail="No price history found for this ingredient.")
        
    return [
        PriceHistoryRead.from_orm(h, update={'ingredient_name': h.ingredient.name}) for h in history
    ]

@app.get("/api/tags", response_model=List[str])
def get_all_tags(session: Session = Depends(get_session)):
    all_recipes = session.exec(select(Recipe)).all()
    all_tags = set()
    for recipe in all_recipes:
        for tag in recipe.tags:
            all_tags.add(tag)
    return sorted(list(all_tags))

@app.get("/api/recipes", response_model=List[RecipeResponse])
def get_recipes(
    session: Session = Depends(get_session),
    min_rating: Optional[float] = Query(None, ge=1, le=5),
    sort_by: Optional[str] = Query(None),
    tags: Optional[str] = Query(None)
):
    average_rating = func.coalesce(Recipe.total_rating / func.nullif(Recipe.rating_count, 0), 0)
    query = select(Recipe)
    
    if min_rating is not None:
        query = query.where(average_rating >= min_rating)

    if sort_by is not None:
        if sort_by == "rating_asc":
            query = query.order_by(average_rating.asc())
        elif sort_by == "rating_desc":
            query = query.order_by(average_rating.desc())
            
    db_recipes = session.exec(query).all()

    if tags:
        selected_tags = {tag.strip() for tag in tags.split(',')}
        db_recipes = [
            recipe for recipe in db_recipes
            if selected_tags.issubset(set(recipe.tags))
        ]

    response_recipes = []
    for recipe in db_recipes:
        response_ingredients = [
            IngredientInRecipe(ingredient_id=link.ingredient.id, name=link.ingredient.name, quantity=link.quantity)
            for link in recipe.links
        ]
        response_recipes.append(
            RecipeResponse.from_orm(recipe, update={'ingredients': response_ingredients})
        )
    return response_recipes

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
        recipe.total_rating -= existing_rating_link.rating
        existing_rating_link.rating = rating.rating
        recipe.total_rating += rating.rating
        session.add(existing_rating_link)
    else:
        recipe.total_rating += rating.rating
        recipe.rating_count += 1
        new_rating_link = UserRecipeRatingLink(user_id=current_user.id, recipe_id=recipe_id, rating=rating.rating)
        session.add(new_rating_link)

    session.add(recipe)
    session.commit()
    session.refresh(recipe)
    return {"message": "Recipe rated successfully"}


@app.delete("/api/recipes/{recipe_id}")
def delete_recipe(recipe_id: int, session: Session = Depends(get_session)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe: raise HTTPException(status_code=404, detail="Recipe not found")
    session.delete(recipe)
    session.commit()
    return {"message": "Recipe deleted successfully."}

@app.delete("/api/recipes")
def delete_all_recipes(session: Session = Depends(get_session)):
    session.query(RecipeIngredientLink).delete()
    session.query(Recipe).delete()
    session.commit()
    return {"message": "All recipes have been cleared."}