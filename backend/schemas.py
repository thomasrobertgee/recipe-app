# backend/schemas.py

from sqlmodel import SQLModel
from typing import List, Optional
from pydantic import Field, computed_field

class IngredientInRecipe(SQLModel):
    name: str
    quantity: str

class RecipeResponse(SQLModel):
    id: int
    title: str
    description: str
    instructions: str
    ingredients: List[IngredientInRecipe]
    total_rating: int
    rating_count: int

    @computed_field
    @property
    def average_rating(self) -> float:
        if self.rating_count > 0:
            return self.total_rating / self.rating_count
        return 0.0

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
    password: str = Field(min_length=8, max_length=72)

class UserRead(UserBase):
    id: int
    household_size: Optional[int]
    # --- UPDATED ---
    dietary_restrictions: List[str]

class UserUpdate(SQLModel):
    household_size: Optional[int] = None
    # --- UPDATED ---
    dietary_restrictions: Optional[List[str]] = None

class Token(SQLModel):
    access_token: str
    token_type: str

class GenerateRequest(SQLModel):
    specials: List[SpecialRead]
    preferences: UserRead

class RecipeRating(SQLModel):
    rating: int = Field(ge=1, le=5)