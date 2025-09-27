# backend/main.py (Corrected and Complete)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List
from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import Recipe, Ingredient, RecipeIngredientLink
from schemas import RecipeResponse, IngredientInRecipe, RecipeCreate

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

@app.post("/api/recipes", response_model=RecipeResponse)
def create_recipe(recipe_data: RecipeCreate):
    with Session(engine) as session:
        # Create Recipe object
        new_recipe = Recipe.from_orm(recipe_data)

        # Handle Ingredients and Links
        for ing_data in recipe_data.ingredients:
            existing_ingredient = session.exec(select(Ingredient).where(Ingredient.name == ing_data.name)).first()
            ingredient = existing_ingredient or Ingredient(name=ing_data.name)
            
            link = RecipeIngredientLink(recipe=new_recipe, ingredient=ingredient, quantity=ing_data.quantity)
            session.add(link)
        
        session.add(new_recipe)
        session.commit()
        session.refresh(new_recipe)

        # Manually build the response
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