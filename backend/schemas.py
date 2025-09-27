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

    # Add these to the bottom of backend/schemas.py

class IngredientCreate(SQLModel):
    name: str
    quantity: str

class RecipeCreate(SQLModel):
    title: str
    description: str
    instructions: str
    ingredients: List[IngredientCreate]

# Add these new classes to the bottom of backend/schemas.py

class SpecialBase(SQLModel):
    ingredient_name: str
    price: str
    store: str

class SpecialCreate(SpecialBase):
    pass

class SpecialRead(SpecialBase):
    id: int
    ingredient_id: int