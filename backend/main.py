# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # Import CORS Middleware
from contextlib import asynccontextmanager
from typing import List
from sqlmodel import Session
from database import engine, create_db_and_tables
from models import Recipe, RecipeIngredientLink, Ingredient
from schemas import RecipeResponse, IngredientInRecipe

# Define the origins that are allowed to connect to our backend
origins = [
    "http://localhost:5173", # The address of our React frontend
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up... 🚀")
    create_db_and_tables()
    yield
    print("Shutting down...")

app = FastAPI(lifespan=lifespan)

# Add the CORS middleware to the app
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

@app.get("/api/recipes", response_model=List[RecipeResponse])
def get_recipes():
    with Session(engine) as session:
        db_recipes = session.query(Recipe).all()
        response_recipes = []
        for recipe in db_recipes:
            ingredients_for_recipe = []
            links = session.query(RecipeIngredientLink).filter(RecipeIngredientLink.recipe_id == recipe.id).all()
            for link in links:
                ingredient = session.get(Ingredient, link.ingredient_id)
                if ingredient:
                    ingredients_for_recipe.append(
                        IngredientInRecipe(name=ingredient.name, quantity=link.quantity)
                    )
            response_recipes.append(
                RecipeResponse(
                    id=recipe.id,
                    title=recipe.title,
                    description=recipe.description,
                    instructions=recipe.instructions,
                    ingredients=ingredients_for_recipe
                )
            )
        return response_recipes