# backend/main.py

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from contextlib import asynccontextmanager
from typing import List, Optional
from sqlmodel import Session, select, func

from database import engine, create_db_and_tables, get_session
from models import User, Recipe, Ingredient, RecipeIngredientLink, Special, UserRecipeRatingLink
from schemas import (
    GenerateRequest, UserCreate, UserRead, UserUpdate, Token,
    RecipeResponse, IngredientInRecipe, RecipeCreate, SpecialCreate,
    SpecialRead, RecipeRating
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

def _save_recipe_to_db(recipe_data: RecipeCreate, session: Session) -> Recipe:
    new_recipe = Recipe(title=recipe_data.title, description=recipe_data.description, instructions=recipe_data.instructions)
    for ing_data in recipe_data.ingredients:
        ingredient = session.exec(select(Ingredient).where(Ingredient.name == ing_data.name)).first()
        if not ingredient:
            ingredient = Ingredient(name=ing_data.name)
        link = RecipeIngredientLink(recipe=new_recipe, ingredient=ingredient, quantity=ing_data.quantity)
        session.add(link)
    session.add(new_recipe)
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
        response_ingredients = [IngredientInRecipe(name=link.ingredient.name, quantity=link.quantity) for link in recipe.links]
        response_recipes.append(RecipeResponse.from_orm(recipe, update={'ingredients': response_ingredients}))
    return response_recipes

@app.post("/api/users/me/saved-recipes/{recipe_id}", status_code=201)
def save_a_recipe(recipe_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    session.add(current_user)
    
    if recipe not in current_user.saved_recipes:
        current_user.saved_recipes.append(recipe)
        session.commit()
    return {"message": "Recipe saved successfully"}

@app.delete("/api/users/me/saved-recipes/{recipe_id}", status_code=204)
def unsave_a_recipe(recipe_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    session.add(current_user)
    
    if recipe in current_user.saved_recipes:
        current_user.saved_recipes.remove(recipe)
        session.commit()
    return

@app.get("/")
def read_root(): return {"message": "Welcome!"}

@app.post("/api/generate-recipes")
def generate_recipes_endpoint(request: GenerateRequest, session: Session = Depends(get_session)):
    ai_generated_recipes = generate_recipes_from_specials(specials_list=request.specials, preferences=request.preferences)
    saved_recipes_count = 0
    for recipe_dict in ai_generated_recipes:
        try:
            recipe_data = RecipeCreate(**recipe_dict)
            _save_recipe_to_db(recipe_data, session)
            saved_recipes_count += 1
        except Exception as e:
            print(f"Could not validate or save AI recipe: {e}")
    return {"message": f"Successfully generated and saved {saved_recipes_count} new recipes."}

@app.get("/api/specials", response_model=List[SpecialRead])
def get_specials(session: Session = Depends(get_session)):
    db_specials = session.exec(select(Special)).all()
    return [SpecialRead.from_orm(s, update={'ingredient_name': s.ingredient.name}) for s in db_specials]

@app.get("/api/recipes", response_model=List[RecipeResponse])
def get_recipes(
    session: Session = Depends(get_session),
    min_rating: Optional[float] = Query(None, ge=1, le=5),
    sort_by: Optional[str] = Query(None)
):
    # --- THIS IS THE FIX ---
    # Use a CASE statement to avoid division by zero
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
    response_recipes = []
    for recipe in db_recipes:
        response_ingredients = [IngredientInRecipe(name=link.ingredient.name, quantity=link.quantity) for link in recipe.links]
        response_recipes.append(
            RecipeResponse.from_orm(
                recipe, 
                update={'ingredients': response_ingredients}
            )
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