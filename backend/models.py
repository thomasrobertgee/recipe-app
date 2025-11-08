# backend/models.py

from sqlmodel import SQLModel, Field, Relationship, Column, JSON, Float
from typing import Optional, List, Dict, Any
from datetime import datetime, date

# --- User Recipe Link (Many-to-Many for Saved Recipes) ---
class UserRecipeLink(SQLModel, table=True):
    user_id: Optional[int] = Field(
        default=None, foreign_key="user.id", primary_key=True
    )
    recipe_id: Optional[int] = Field(
        default=None, foreign_key="recipe.id", primary_key=True
    )

# --- User Pantry Link (Many-to-Many for Pantry Items) ---
class UserPantryLink(SQLModel, table=True):
    user_id: Optional[int] = Field(
        default=None, foreign_key="user.id", primary_key=True
    )
    ingredient_id: Optional[int] = Field(
        default=None, foreign_key="ingredient.id", primary_key=True
    )

# --- User Recipe Rating Link (Many-to-Many with data) ---
class UserRecipeRatingLink(SQLModel, table=True):
    user_id: Optional[int] = Field(
        default=None, foreign_key="user.id", primary_key=True
    )
    recipe_id: Optional[int] = Field(
        default=None, foreign_key="recipe.id", primary_key=True
    )
    rating: float = Field(default=0, ge=1, le=5)

    user: "User" = Relationship(back_populates="ratings")
    recipe: "Recipe" = Relationship(back_populates="ratings")

# --- NEW: User Supplier Follow Link (Many-to-Many) ---
class UserSupplierFollow(SQLModel, table=True):
    user_id: Optional[int] = Field(
        default=None, foreign_key="user.id", primary_key=True
    )
    supplier_profile_id: Optional[int] = Field(
        default=None, foreign_key="supplierprofile.id", primary_key=True
    )
# --- END NEW ---


# --- *** UPDATED SUPPLIER PROFILE MODEL *** ---
class SupplierProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)
    business_name: str = Field(index=True)
    address: Optional[str] = None
    postcode: Optional[str] = Field(default=None, index=True) # <-- NEW FIELD
    
    # --- NEW: Storefront Fields ---
    logo_url: Optional[str] = Field(default=None)
    business_type: Optional[str] = Field(default=None, index=True) # e.g., "Butcher", "Baker"
    description: Optional[str] = Field(default=None)
    opening_hours: Optional[str] = Field(default=None) # Could be simple text or JSON
    # --- END NEW ---
    
    # --- NEW: Featured Flag ---
    is_featured: bool = Field(default=False, index=True)
    # --- END NEW ---

    user: "User" = Relationship(back_populates="supplier_profile")
    price_history: List["PriceHistory"] = Relationship(back_populates="supplier_profile") # <-- NEW RELATIONSHIP
    
    # --- NEW: Follow Relationship ---
    followed_by_users: List["User"] = Relationship(
        back_populates="followed_suppliers", link_model=UserSupplierFollow
    )
    # --- END NEW ---
# --- *** END UPDATED MODEL *** ---


# --- Recipe Ingredient Link (Many-to-Many with data) ---
class RecipeIngredientLink(SQLModel, table=True):
    recipe_id: Optional[int] = Field(
        default=None, foreign_key="recipe.id", primary_key=True
    )
    ingredient_id: Optional[int] = Field(
        default=None, foreign_key="ingredient.id", primary_key=True
    )
    quantity: str

    recipe: "Recipe" = Relationship(back_populates="links")
    ingredient: "Ingredient" = Relationship(back_populates="links")


# --- *** UPDATED MEAL PLAN MODEL *** ---
class MealPlanEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    recipe_id: int = Field(foreign_key="recipe.id", index=True)
    plan_date: date = Field(index=True) # The specific day this recipe is planned for
    meal_type: str = Field(default="Dinner", index=True) # NEW: Lunch or Dinner
    use_for_leftovers: bool = Field(default=False) # NEW: Leftovers flag

    user: "User" = Relationship(back_populates="meal_plan_entries")
    recipe: "Recipe" = Relationship(back_populates="meal_plan_entries")
# --- *** END UPDATED MEAL PLAN MODEL *** ---


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: Optional[str] = Field(default=None)
    google_user_id: Optional[str] = Field(default=None, unique=True, index=True)
    role: str = Field(default="consumer", index=True) # <-- NEW FIELD

    # Profile preferences
    dietary_restrictions: Optional[str] = Field(default=None)
    preferred_cuisines: Optional[str] = Field(default=None)
    cooking_skill: Optional[str] = Field(default="beginner") # beginner, intermediate, advanced

    # --- NEW ONBOARDING FIELDS ---
    adult_count: int = Field(default=1)
    child_count: int = Field(default=0)
    weekly_budget: Optional[int] = Field(default=None)
    postcode: Optional[str] = Field(default=None, index=True) # <-- NEW FIELD
    has_completed_onboarding: bool = Field(default=False)
    # --- END NEW ONBOARDING FIELDS ---

    # --- NEW RELATIONSHIP ---
    supplier_profile: Optional["SupplierProfile"] = Relationship(back_populates="user")
    # --- END NEW RELATIONSHIP ---

    saved_recipes: List["Recipe"] = Relationship(back_populates="saved_by_users", link_model=UserRecipeLink)
    pantry_items: List["Ingredient"] = Relationship(back_populates="users_with_in_pantry", link_model=UserPantryLink)
    ratings: List["UserRecipeRatingLink"] = Relationship(back_populates="user")

    # --- *** NEW MEAL PLAN RELATIONSHIP *** ---
    meal_plan_entries: List["MealPlanEntry"] = Relationship(back_populates="user")

    # --- NEW: Follow Relationship ---
    followed_suppliers: List["SupplierProfile"] = Relationship(
        back_populates="followed_by_users", link_model=UserSupplierFollow
    )
    # --- END NEW ---


class Recipe(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    instructions: str
    tags: List[str] = Field(sa_column=Column(JSON), default=[])

    # Rating Caching
    total_rating: int = Field(default=0)
    rating_count: int = Field(default=0)

    links: List[RecipeIngredientLink] = Relationship(back_populates="recipe")
    # --- *** FIX: Changed "saved_by_users" to "saved_recipes" *** ---
    saved_by_users: List[User] = Relationship(back_populates="saved_recipes", link_model=UserRecipeLink)
    # --- *** END FIX *** ---
    ratings: List[UserRecipeRatingLink] = Relationship(back_populates="recipe")

    # --- *** NEW MEAL PLAN RELATIONSHIP *** ---
    meal_plan_entries: List["MealPlanEntry"] = Relationship(back_populates="recipe")


class Ingredient(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    category: Optional[str] = Field(default=None, index=True)
    is_staple: bool = Field(default=False) # To identify common pantry staples

    links: List[RecipeIngredientLink] = Relationship(back_populates="ingredient")
    price_history: List["PriceHistory"] = Relationship(back_populates="ingredient")
    users_with_in_pantry: List[User] = Relationship(back_populates="pantry_items", link_model=UserPantryLink)


class PriceHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ingredient_id: int = Field(foreign_key="ingredient.id")
    date_recorded: date = Field(default_factory=date.today, index=True)
    price: str
    store: str = Field(index=True)
    
    # --- NEW: Optional expiry date for supplier specials ---
    expiry_date: Optional[date] = Field(default=None, index=True)

    # --- NEW: Link to supplier profile for efficient joins ---
    supplier_profile_id: Optional[int] = Field(default=None, foreign_key="supplierprofile.id", index=True)
    supplier_profile: Optional["SupplierProfile"] = Relationship(back_populates="price_history")
    # --- END NEW ---

    # --- NEW: Supplier Analytics ---
    view_count: int = Field(default=0)
    save_count: int = Field(default=0)
    # --- END NEW ---

    ingredient: Ingredient = Relationship(back_populates="price_history")
