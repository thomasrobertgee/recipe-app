# backend/schemas.py (Corrected)

from sqlmodel import SQLModel
from typing import List
from pydantic import Field # Import Field for validation

class IngredientInRecipe(SQLModel):
    name: str
    quantity: str

class RecipeResponse(SQLModel):
    id: int
    title: str
    description: str
    instructions: str
    ingredients: List[IngredientInRecipe]

class IngredientCreate(SQLModel):
    name: str
    quantity: str

class RecipeCreate(SQLModel):
    title: str
    description: str
    instructions: str
    ingredients: List[IngredientCreate]

class SpecialBase(SQLModel):
    ingredient_name: str
    price: str
    store: str

class SpecialCreate(SpecialBase):
    pass

class SpecialRead(SpecialBase):
    id: int
    ingredient_id: int

class UserBase(SQLModel):
    email: str

class UserCreate(UserBase):
    # --- THIS IS THE FIX ---
    # We add validation to ensure the password is between 8 and 72 characters.
    password: str = Field(min_length=8, max_length=72)

class UserRead(UserBase):
    id: int

class Token(SQLModel):
    access_token: str
    token_type: str