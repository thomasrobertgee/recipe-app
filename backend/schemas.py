# backend/schemas.py

from sqlmodel import SQLModel, Field
from typing import Optional, List, Dict

class UserCreate(SQLModel):
    email: str
    password: str

class UserRead(SQLModel):
    id: int
    email: str
    dietary_restrictions: Optional[str] = None
    preferred_cuisines: Optional[str] = None
    cooking_skill: Optional[str] = None

class UserUpdate(SQLModel):
    email: Optional[str] = None
    dietary_restrictions: Optional[str] = None
    preferred_cuisines: Optional[str] = None
    cooking_skill: Optional[str] = None

class Token(SQLModel):
    access_token: str
    token_type: str

class GoogleLoginRequest(SQLModel):
    token: str

class IngredientInRecipe(SQLModel):
    name: str
    quantity: str
    ingredient_id: Optional[int] = None # For frontend keying if needed

class RecipeCreate(SQLModel):
    title: str
    description: str
    instructions: str
    ingredients: List[IngredientInRecipe]
    tags: List[str] = []

class RecipeResponse(SQLModel):
    id: int
    title: str
    description: str
    instructions: str
    ingredients: List[IngredientInRecipe]
    tags: List[str]
    total_rating: int
    rating_count: int

    @classmethod
    def from_orm(cls, recipe, **kwargs):
        # Calculate average_rating
        avg = 0
        if recipe.rating_count > 0:
            avg = round(recipe.total_rating / recipe.rating_count, 1)
        
        # Merge calculated fields with model fields
        data = recipe.model_dump()
        data['average_rating'] = avg
        
        # Allow overriding with kwargs
        data.update(kwargs)
        
        # Create the response model
        # We manually construct to ensure validation
        return cls(
            id=data['id'],
            title=data['title'],
            description=data['description'],
            instructions=data['instructions'],
            ingredients=data['ingredients'],
            tags=data['tags'],
            total_rating=data['total_rating'],
            rating_count=data['rating_count']
        )

class PriceHistoryCreate(SQLModel):
    ingredient_name: str
    price: str
    store: str
    category: Optional[str] = None

class PriceHistoryRead(SQLModel):
    id: int
    ingredient_id: int
    date_recorded: str
    price: str
    store: str
    ingredient_name: Optional[str] = None
    category: Optional[str] = None

class GenerateRequest(SQLModel):
    specials: List[PriceHistoryRead]
    preferences: UserRead
    pantry_items: List[Dict] # List of PantryItem objects


class RecipeRating(SQLModel):
    rating: float = Field(ge=1, le=5)

class PantryItem(SQLModel):
    ingredient_id: int
    name: str
    category: Optional[str] = None

class PantryItemCreate(SQLModel):
    ingredient_name: str

class RecipeModificationRequest(SQLModel):
    original_recipe: RecipeCreate # AI-generated, so it follows RecipeCreate schema
    modification_prompt: str