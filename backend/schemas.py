# backend/schemas.py

from sqlmodel import SQLModel
from typing import List

# This defines the shape of an ingredient when it's part of a recipe response
class IngredientInRecipe(SQLModel):
    name: str
    quantity: str

# This defines the shape of the main recipe response
class RecipeResponse(SQLModel):
    id: int
    title: str
    description: str
    instructions: str
    ingredients: List[IngredientInRecipe]