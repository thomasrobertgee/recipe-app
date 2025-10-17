# backend/schemas.py

from sqlmodel import SQLModel
from typing import List, Optional
from pydantic import Field, computed_field
from datetime import date

class PantryItem(SQLModel):
    ingredient_id: int
    name: str
    category: Optional[str] = None

class PantryItemCreate(SQLModel):
    ingredient_name: str

class IngredientInRecipe(SQLModel):
    ingredient_id: int
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
    tags: List[str]

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
    tags: List[str]

class PriceHistoryBase(SQLModel):
    ingredient_name: str
    price: str
    store: str

class PriceHistoryCreate(PriceHistoryBase):
    category: Optional[str] = None

class PriceHistoryRead(PriceHistoryBase):
    id: int
    ingredient_id: int
    category: Optional[str] = None
    date_recorded: date

class UserBase(SQLModel):
    email: str

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=72)

class UserRead(UserBase):
    id: int
    household_size: Optional[int]
    dietary_restrictions: List[str]
    weekly_budget: Optional[float] = None

class UserUpdate(SQLModel):
    household_size: Optional[int] = None
    dietary_restrictions: Optional[List[str]] = None
    weekly_budget: Optional[float] = None

class Token(SQLModel):
    access_token: str
    token_type: str

class GenerateRequest(SQLModel):
    specials: List[PriceHistoryRead]
    preferences: UserRead
    pantry_items: List[PantryItem]

class RecipeRating(SQLModel):
    rating: int = Field(ge=1, le=5)

class RecipeModificationRequest(SQLModel):
    original_recipe: RecipeResponse
    modification_prompt: str