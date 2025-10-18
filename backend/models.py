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


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: Optional[str] = Field(default=None)
    google_user_id: Optional[str] = Field(default=None, unique=True, index=True) # <-- NEW

    # Profile preferences
    dietary_restrictions: Optional[str] = Field(default=None)
    preferred_cuisines: Optional[str] = Field(default=None)
    cooking_skill: Optional[str] = Field(default="beginner") # beginner, intermediate, advanced
    
    saved_recipes: List["Recipe"] = Relationship(back_populates="saved_by_users", link_model=UserRecipeLink)
    pantry_items: List["Ingredient"] = Relationship(back_populates="users_with_in_pantry", link_model=UserPantryLink)
    ratings: List["UserRecipeRatingLink"] = Relationship(back_populates="user")


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
    saved_by_users: List[User] = Relationship(back_populates="saved_recipes", link_model=UserRecipeLink)
    ratings: List[UserRecipeRatingLink] = Relationship(back_populates="recipe")


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

    ingredient: Ingredient = Relationship(back_populates="price_history")