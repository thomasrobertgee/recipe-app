# backend/main.py (Complete, final version)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List
from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import Recipe, Ingredient, RecipeIngredientLink, Special
from schemas import RecipeResponse, IngredientInRecipe, RecipeCreate, SpecialCreate, SpecialRead
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

# --- HELPER FUNCTION to save a recipe ---
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

# --- API ENDPOINTS ---

@app.get("/")
def read_root(): return {"message": "Welcome!"}

@app.post("/api/generate-recipes")
def generate_recipes_endpoint(specials: List[SpecialRead]):
    ai_generated_recipes = generate_recipes_from_specials(specials)
    saved_recipes_count = 0
    with Session(engine) as session:
        for recipe_dict in ai_generated_recipes:
            try:
                recipe_data = RecipeCreate(**recipe_dict)
                _save_recipe_to_db(recipe_data, session)
                saved_recipes_count += 1
            except Exception as e:
                print(f"Could not validate or save AI recipe: {e}")
    return {"message": f"Successfully generated and saved {saved_recipes_count} new recipes."}

# --- SPECIALS ENDPOINTS ---
@app.post("/api/specials", response_model=SpecialRead)
def create_special(special_data: SpecialCreate):
    with Session(engine) as session:
        ingredient = session.exec(select(Ingredient).where(Ingredient.name == special_data.ingredient_name)).first()
        if not ingredient:
            ingredient = Ingredient(name=special_data.ingredient_name)
        special = Special(ingredient=ingredient, price=special_data.price, store=special_data.store)
        session.add(special)
        session.commit()
        session.refresh(special)
        return SpecialRead.from_orm(special, update={'ingredient_name': ingredient.name})

@app.get("/api/specials", response_model=List[SpecialRead])
def get_specials():
    with Session(engine) as session:
        db_specials = session.exec(select(Special)).all()
        return [SpecialRead.from_orm(s, update={'ingredient_name': s.ingredient.name}) for s in db_specials]

@app.delete("/api/specials/{special_id}")
def delete_special(special_id: int):
    with Session(engine) as session:
        special = session.get(Special, special_id)
        if not special: raise HTTPException(status_code=404, detail="Special not found")
        session.delete(special)
        session.commit()
        return {"message": "Special deleted successfully."}

@app.delete("/api/specials")
def delete_all_specials():
    with Session(engine) as session:
        session.query(Special).delete()
        session.commit()
        return {"message": "All specials cleared."}

# --- RECIPES ENDPOINTS ---
@app.post("/api/recipes", response_model=RecipeResponse)
def create_recipe(recipe_data: RecipeCreate):
    with Session(engine) as session:
        new_recipe = _save_recipe_to_db(recipe_data, session)
        response_ingredients = [IngredientInRecipe(name=link.ingredient.name, quantity=link.quantity) for link in new_recipe.links]
        return RecipeResponse.from_orm(new_recipe, update={'ingredients': response_ingredients})

@app.get("/api/recipes", response_model=List[RecipeResponse])
def get_recipes():
    with Session(engine) as session:
        db_recipes = session.exec(select(Recipe)).all()
        response_recipes = []
        for recipe in db_recipes:
            response_ingredients = [IngredientInRecipe(name=link.ingredient.name, quantity=link.quantity) for link in recipe.links]
            response_recipes.append(RecipeResponse.from_orm(recipe, update={'ingredients': response_ingredients}))
        return response_recipes