# backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List
from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import Recipe, Ingredient, RecipeIngredientLink, Special
from schemas import RecipeResponse, IngredientInRecipe, RecipeCreate, SpecialCreate, SpecialRead

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

@app.get("/")
def read_root():
    return {"message": "Welcome to the Recipe App Backend!"}

# --- SPECIALS ENDPOINTS ---

@app.post("/api/specials", response_model=SpecialRead)
def create_special(special_data: SpecialCreate):
    with Session(engine) as session:
        ingredient = session.exec(select(Ingredient).where(Ingredient.name == special_data.ingredient_name)).first()
        if not ingredient:
            ingredient = Ingredient(name=special_data.ingredient_name)
            session.add(ingredient)
            session.commit()
            session.refresh(ingredient)

        special = Special(
            ingredient_id=ingredient.id, 
            price=special_data.price, 
            store=special_data.store
        )
        session.add(special)
        session.commit()
        session.refresh(special)

        # We manually add ingredient_name because the SpecialRead model expects it
        return SpecialRead.from_orm(special, update={'ingredient_name': ingredient.name})

@app.get("/api/specials", response_model=List[SpecialRead])
def get_specials():
    with Session(engine) as session:
        db_specials = session.exec(select(Special)).all()
        specials_to_return = []
        for special in db_specials:
            ingredient = session.get(Ingredient, special.ingredient_id)
            if ingredient:
                 specials_to_return.append(
                    SpecialRead.from_orm(special, update={'ingredient_name': ingredient.name})
                )
        return specials_to_return

@app.delete("/api/specials/{special_id}")
def delete_special(special_id: int):
    with Session(engine) as session:
        special = session.get(Special, special_id)
        if not special:
            raise HTTPException(status_code=404, detail="Special not found")
        session.delete(special)
        session.commit()
        return {"message": "Special deleted successfully."}

@app.delete("/api/specials")
def delete_all_specials():
    with Session(engine) as session:
        statement = select(Special)
        results = session.exec(statement).all()
        for special in results:
            session.delete(special)
        session.commit()
        return {"message": "All specials cleared successfully."}


# --- RECIPES ENDPOINTS ---

@app.post("/api/recipes", response_model=RecipeResponse)
def create_recipe(recipe_data: RecipeCreate):
    with Session(engine) as session:
        new_recipe = Recipe(
            title=recipe_data.title,
            description=recipe_data.description,
            instructions=recipe_data.instructions
        )
        
        for ing_data in recipe_data.ingredients:
            ingredient = session.exec(select(Ingredient).where(Ingredient.name == ing_data.name)).first()
            if not ingredient:
                ingredient = Ingredient(name=ing_data.name)
            
            link = RecipeIngredientLink(recipe=new_recipe, ingredient=ingredient, quantity=ing_data.quantity)
            session.add(link)
        
        session.add(new_recipe)
        session.commit()
        session.refresh(new_recipe)

        response_ingredients = [
            IngredientInRecipe(name=link.ingredient.name, quantity=link.quantity) for link in new_recipe.links
        ]
        return RecipeResponse(
            id=new_recipe.id,
            title=new_recipe.title,
            description=new_recipe.description,
            instructions=new_recipe.instructions,
            ingredients=response_ingredients
        )

@app.get("/api/recipes", response_model=List[RecipeResponse])
def get_recipes():
    with Session(engine) as session:
        db_recipes = session.exec(select(Recipe)).all()
        response_recipes = []
        for recipe in db_recipes:
            response_ingredients = [
                IngredientInRecipe(name=link.ingredient.name, quantity=link.quantity) for link in recipe.links
            ]
            response_recipes.append(
                RecipeResponse(
                    id=recipe.id,
                    title=recipe.title,
                    description=recipe.description,
                    instructions=recipe.instructions,
                    ingredients=response_ingredients
                )
            )
        return response_recipes