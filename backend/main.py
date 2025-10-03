from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from contextlib import asynccontextmanager
from typing import List
from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import User, Recipe, Ingredient, RecipeIngredientLink, Special
from schemas import GenerateRequest, UserCreate, UserRead, UserUpdate, Token, RecipeResponse, IngredientInRecipe, RecipeCreate, SpecialCreate, SpecialRead
from security import get_password_hash, verify_password, create_access_token, get_current_user, oauth2_scheme
from ai_service import generate_recipes_from_specials

origins = ["http://localhost:5173"]
@asynccontextmanager
async def lifespan(app: FastAPI): create_db_and_tables(); yield
app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
def get_session():
    with Session(engine) as session: yield session

def _save_recipe_to_db(recipe_data: RecipeCreate, session: Session) -> Recipe:
    new_recipe = Recipe(title=recipe_data.title, description=recipe_data.description, instructions=recipe_data.instructions)
    for ing_data in recipe_data.ingredients:
        ingredient = session.exec(select(Ingredient).where(Ingredient.name == ing_data.name)).first()
        if not ingredient: ingredient = Ingredient(name=ing_data.name)
        link = RecipeIngredientLink(recipe=new_recipe, ingredient=ingredient, quantity=ing_data.quantity)
        session.add(link)
    session.add(new_recipe)
    session.commit()
    session.refresh(new_recipe)
    return new_recipe

@app.post("/register", response_model=UserRead)
def create_user(user: UserCreate, session: Session = Depends(get_session)):
    existing_user = session.exec(select(User).where(User.email == user.email)).first()
    if existing_user: raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    new_user = User(email=user.email, hashed_password=hashed_password)
    session.add(new_user); session.commit(); session.refresh(new_user)
    return new_user

@app.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password): raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer")
    
@app.get("/users/me", response_model=UserRead, dependencies=[Depends(oauth2_scheme)])
def read_users_me(current_user: User = Depends(get_current_user)): return current_user

@app.put("/users/me", response_model=UserRead, dependencies=[Depends(oauth2_scheme)])
def update_user_me(user_update: UserUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items(): setattr(current_user, key, value)
    session.add(current_user); session.commit(); session.refresh(current_user)
    return current_user

@app.get("/")
def read_root(): return {"message": "Welcome!"}

@app.post("/api/generate-recipes", dependencies=[Depends(oauth2_scheme)])
def generate_recipes_endpoint(request: GenerateRequest, session: Session = Depends(get_session)):
    ai_generated_recipes = generate_recipes_from_specials(specials_list=request.specials, preferences=request.preferences)
    saved_recipes_count = 0
    for recipe_dict in ai_generated_recipes:
        try:
            recipe_data = RecipeCreate(**recipe_dict)
            _save_recipe_to_db(recipe_data, session)
            saved_recipes_count += 1
        except Exception as e: print(f"Could not validate or save AI recipe: {e}")
    return {"message": f"Successfully generated and saved {saved_recipes_count} new recipes."}

@app.post("/api/specials", response_model=SpecialRead, dependencies=[Depends(oauth2_scheme)])
def create_special(special_data: SpecialCreate, session: Session = Depends(get_session)):
    ingredient = session.exec(select(Ingredient).where(Ingredient.name.ilike(special_data.ingredient_name))).first()
    if not ingredient: ingredient = Ingredient(name=special_data.ingredient_name)
    special = Special(ingredient=ingredient, price=special_data.price, store=special_data.store)
    session.add(special); session.commit(); session.refresh(special)
    return SpecialRead.from_orm(special, update={'ingredient_name': ingredient.name})

@app.get("/api/specials", response_model=List[SpecialRead], dependencies=[Depends(oauth2_scheme)])
def get_specials(session: Session = Depends(get_session)):
    db_specials = session.exec(select(Special)).all()
    return [SpecialRead.from_orm(s, update={'ingredient_name': s.ingredient.name}) for s in db_specials]

@app.delete("/api/specials/{special_id}", dependencies=[Depends(oauth2_scheme)])
def delete_special(special_id: int, session: Session = Depends(get_session)):
    special = session.get(Special, special_id)
    if not special: raise HTTPException(status_code=404, detail="Special not found")
    session.delete(special); session.commit()
    return {"message": "Special deleted successfully."}

@app.delete("/api/specials", dependencies=[Depends(oauth2_scheme)])
def delete_all_specials(session: Session = Depends(get_session)):
    session.query(Special).delete(); session.commit()
    return {"message": "All specials cleared."}

@app.get("/api/recipes", response_model=List[RecipeResponse])
def get_recipes(session: Session = Depends(get_session)):
    db_recipes = session.exec(select(Recipe)).all()
    response_recipes = []
    for recipe in db_recipes:
        response_ingredients = [IngredientInRecipe(name=link.ingredient.name, quantity=link.quantity) for link in recipe.links]
        response_recipes.append(RecipeResponse.from_orm(recipe, update={'ingredients': response_ingredients}))
    return response_recipes

@app.delete("/api/recipes/{recipe_id}", dependencies=[Depends(oauth2_scheme)])
def delete_recipe(recipe_id: int, session: Session = Depends(get_session)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe: raise HTTPException(status_code=404, detail="Recipe not found")
    session.delete(recipe); session.commit()
    return {"message": "Recipe deleted successfully."}

@app.delete("/api/recipes", dependencies=[Depends(oauth2_scheme)])
def delete_all_recipes(session: Session = Depends(get_session)):
    session.query(RecipeIngredientLink).delete(); session.query(Recipe).delete(); session.commit()
    return {"message": "All recipes have been cleared."}