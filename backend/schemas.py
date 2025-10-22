# backend/schemas.py

from sqlmodel import SQLModel, Field
from typing import Optional, List, Dict
# --- *** NEW: Import date *** ---
from datetime import date
# Import validator if needed later
# from pydantic import validator
# import math

class UserCreate(SQLModel):
    email: str
    password: str

class UserRead(SQLModel):
    id: int
    email: str
    role: str # <-- NEW FIELD
    dietary_restrictions: Optional[str] = None
    preferred_cuisines: Optional[str] = None
    cooking_skill: Optional[str] = None
    # --- NEW FIELDS ---
    adult_count: int
    child_count: int
    weekly_budget: Optional[int] = None
    has_completed_onboarding: bool

class UserUpdate(SQLModel):
    email: Optional[str] = None
    dietary_restrictions: Optional[str] = None
    preferred_cuisines: Optional[str] = None
    cooking_skill: Optional[str] = None
    # --- NEW FIELDS ---
    adult_count: Optional[int] = None
    child_count: Optional[int] = None
    weekly_budget: Optional[int] = None
    has_completed_onboarding: Optional[bool] = None

class Token(SQLModel):
    access_token: str
    token_type: str

class GoogleLoginRequest(SQLModel):
    token: str

# --- NEW SUPPLIER SCHEMAS ---
class SupplierProfileCreate(SQLModel):
    business_name: str
    address: Optional[str] = None

class SupplierProfileRead(SupplierProfileCreate):
    id: int
    user_id: int

class SupplierRegistrationRequest(SQLModel):
    user: UserCreate
    profile: SupplierProfileCreate
# --- END NEW SCHEMAS ---

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
    # --- *** FIX: Add average_rating field *** ---
    average_rating: float = 0.0 # Default to 0.0, ensure it's a float
    # --- *** END FIX *** ---

    # --- Your existing from_orm method (no changes needed here now) ---
    @classmethod
    def from_orm(cls, recipe, **kwargs):
        # Calculate average_rating
        avg = 0.0 # Use float
        if recipe.rating_count > 0:
             # Ensure float division
            avg = round(float(recipe.total_rating) / float(recipe.rating_count), 1)

        # Merge calculated fields with model fields
        data = recipe.model_dump()
        # Add calculated avg to data before creating instance
        data['average_rating'] = avg

        # Allow overriding with kwargs
        data.update(kwargs)

        # Create the response model
        # Pydantic should handle the extra 'average_rating' field now
        # if it's defined in the model above.
        return cls(
            id=data['id'],
            title=data['title'],
            description=data['description'],
            instructions=data['instructions'],
            ingredients=data['ingredients'],
            tags=data.get('tags', []), # Use .get for safety
            total_rating=data['total_rating'],
            rating_count=data['rating_count'],
            # Pydantic will now expect average_rating
            average_rating=data['average_rating']
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

# --- NEW SCHEMA ---
class BarcodeLookupResponse(SQLModel):
    product_name: Optional[str] = None
    error: Optional[str] = None

# --- *** NEW MEAL PLAN SCHEMAS *** ---
class MealPlanEntryCreate(SQLModel):
    recipe_id: int
    # --- *** FIX: Renamed 'date' to 'plan_date' *** ---
    plan_date: date # Expects a date object or string in "YYYY-MM-DD" format

class MealPlanEntryRead(SQLModel):
    id: int
    user_id: int
    recipe_id: int
    # --- *** FIX: Renamed 'date' to 'plan_date' *** ---
    plan_date: date
    recipe: RecipeResponse # Nest the full recipe details
# --- *** END NEW MEAL PLAN SCHEMAS *** ---