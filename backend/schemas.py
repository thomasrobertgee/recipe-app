# backend/schemas.py

from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any, Dict
from datetime import date
from models import Recipe # Import Recipe for full response model

# --- *** NEW: Import SQLModel base for schema definitions *** ---
# Using Pydantic's BaseModel for schemas is fine,
# but if we wanted to share models (like SQLModel does), we'd import from sqlmodel.
# Sticking with BaseModel as per original structure for non-db-models.

# --- User Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserRead(BaseModel):
    id: int
    email: EmailStr
    role: str # <-- NEW FIELD
    # Profile preferences
    dietary_restrictions: Optional[str] = None
    preferred_cuisines: Optional[str] = None
    cooking_skill: Optional[str] = "beginner"
    # --- NEW ONBOARDING FIELDS ---
    adult_count: int = 1
    child_count: int = 0
    weekly_budget: Optional[int] = None
    postcode: Optional[str] = None # <-- NEW FIELD
    has_completed_onboarding: bool = False
    # --- END NEW ONBOARDING FIELDS ---

    class Config:
        orm_mode = True

class UserUpdate(BaseModel):
    # --- Allow updating all onboarding fields ---
    dietary_restrictions: Optional[str] = None
    preferred_cuisines: Optional[str] = None
    cooking_skill: Optional[str] = None # Use None to allow unsetting
    adult_count: Optional[int] = None
    child_count: Optional[int] = None
    weekly_budget: Optional[int] = None
    postcode: Optional[str] = None
    has_completed_onboarding: Optional[bool] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class GoogleLoginRequest(BaseModel):
    token: str

# --- Recipe Schemas ---
class IngredientInRecipe(BaseModel):
    ingredient_id: int
    name: str
    quantity: str
    
    class Config:
        orm_mode = True

class RecipeCreate(BaseModel):
    title: str
    description: str
    instructions: str
    ingredients: List[IngredientInRecipe] # Use the detailed schema
    tags: Optional[List[str]] = []

class RecipeResponse(BaseModel):
    id: int
    title: str
    description: str
    instructions: str
    ingredients: List[IngredientInRecipe]
    tags: List[str]
    # --- Rating fields ---
    total_rating: int
    rating_count: int
    average_rating: float # <-- NEW calculated field

    class Config:
        orm_mode = True

class RecipeRating(BaseModel):
    rating: float # Changed from int to float for 1-5 stars

# --- Generate/Modify Schemas ---
class GenerateRequest(BaseModel):
    specials: List[str]
    preferences: Dict[str, Any]
    pantry_items: List[str]

class RecipeModificationRequest(BaseModel):
    original_recipe: RecipeCreate # Re-use RecipeCreate, as it has the full structure
    modification_prompt: str


# --- PriceHistory Schemas ---
class PriceHistoryCreate(BaseModel):
    ingredient_name: str
    price: str
    store: str
    category: Optional[str] = None # Include category
    expiry_date: Optional[date] = None # <-- NEW: Expiry date

class PriceHistoryRead(BaseModel):
    id: int
    ingredient_id: int
    date_recorded: str # Keep as string for simple JSON
    price: str
    store: str
    ingredient_name: str # Add name for easier frontend use
    category: Optional[str] = None # Add category
    expiry_date: Optional[date] = None # <-- NEW: Expiry date
    # --- NEW: Analytics ---
    view_count: int
    save_count: int
    supplier_profile_id: Optional[int] = None # <-- NEW

    class Config:
        orm_mode = True

# --- Pantry Schemas ---
class PantryItem(BaseModel):
    ingredient_id: int
    name: str
    category: Optional[str] = None

    class Config:
        orm_mode = True

class PantryItemCreate(BaseModel):
    ingredient_name: str # Frontend will send the name

# --- Barcode Schema ---
class BarcodeLookupResponse(BaseModel):
    product_name: Optional[str] = None
    error: Optional[str] = None

# --- NEW: Receipt Scan Schema ---
class ReceiptScanResponse(BaseModel):
    message: str
    detected_items: List[str] # List of potential item names (strings)

# --- NEW IMPORTS (for Supplier Registration) ---
class SupplierProfileCreate(BaseModel):
    business_name: str
    address: Optional[str] = None
    postcode: str # <-- Require postcode on registration
    # --- NEW: Optional Storefront Fields ---
    logo_url: Optional[str] = None
    business_type: Optional[str] = None # e.g., "Butcher"
    description: Optional[str] = None
    opening_hours: Optional[str] = None # Simple text for now
    # --- END NEW ---

# --- *** UPDATED: Simplified Supplier Registration Request *** ---
class SupplierRegistrationRequest(BaseModel):
    user: UserCreate
    # profile: SupplierProfileCreate # <-- REMOVED
# --- *** END UPDATE *** ---

# --- *** NEW: Supplier Profile Read Schema *** ---
class SupplierProfileRead(BaseModel):
    id: int
    user_id: int
    business_name: str
    address: Optional[str] = None
    postcode: Optional[str] = None
    # --- NEW: Storefront Fields ---
    logo_url: Optional[str] = None
    business_type: Optional[str] = None
    description: Optional[str] = None
    opening_hours: Optional[str] = None
    # --- END NEW ---
    is_featured: bool # --- NEW ---
    
    class Config:
        orm_mode = True
# --- *** END NEW *** ---

# --- *** NEW SUPPLIER PROFILE UPDATE IMPORT *** ---
class SupplierProfileUpdate(BaseModel):
    business_name: Optional[str] = None
    address: Optional[str] = None
    postcode: Optional[str] = None
    logo_url: Optional[str] = None
    business_type: Optional[str] = None
    description: Optional[str] = None
    opening_hours: Optional[str] = None
# --- *** END NEW *** ---


# --- *** NEW MEAL PLAN SCHEMAS *** ---
class MealPlanEntryCreate(BaseModel):
    recipe_id: int
    plan_date: date
    meal_type: str = "Dinner" # Default to Dinner
    use_for_leftovers: bool = False # Default to False

class MealPlanEntryRead(BaseModel):
    id: int
    user_id: int
    recipe_id: int
    plan_date: date
    meal_type: str # <-- NEW
    use_for_leftovers: bool # <-- NEW
    recipe: RecipeResponse # Embed the full recipe details

    class Config:
        orm_mode = True
# --- *** END NEW MEAL PLAN SCHEMAS *** ---

# --- *** NEW SEARCH SCHEMAS *** ---
class RecipeSearchResult(BaseModel):
    id: int
    title: str

# Note: We re-use PantryItem for ingredient results
# Note: We re-use PriceHistoryRead for specials results

class GlobalSearchResponse(BaseModel):
    recipes: List[RecipeSearchResult]
    ingredients: List[PantryItem]
    specials: List[PriceHistoryRead]
    has_more: bool # Flag if results were truncated by the limit
# --- *** END NEW SEARCH SCHEMAS *** ---