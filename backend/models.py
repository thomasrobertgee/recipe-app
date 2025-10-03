# backend/models.py

from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship, Column, JSON

# --- NEW: Link table for User and Recipe many-to-many relationship ---
class UserRecipeLink(SQLModel, table=True):
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", primary_key=True)
    recipe_id: Optional[int] = Field(default=None, foreign_key="recipe.id", primary_key=True)

class RecipeIngredientLink(SQLModel, table=True):
    recipe_id: Optional[int] = Field(default=None, foreign_key="recipe.id", primary_key=True)
    ingredient_id: Optional[int] = Field(default=None, foreign_key="ingredient.id", primary_key=True)
    quantity: str = Field(index=True)
    recipe: "Recipe" = Relationship(back_populates="links")
    ingredient: "Ingredient" = Relationship(back_populates="links")

class Special(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ingredient_id: int = Field(foreign_key="ingredient.id")
    price: str
    store: str
    ingredient: "Ingredient" = Relationship(back_populates="specials")

class Ingredient(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    links: List[RecipeIngredientLink] = Relationship(back_populates="ingredient")
    specials: List[Special] = Relationship(back_populates="ingredient")

class Recipe(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    description: str
    instructions: str
    links: List[RecipeIngredientLink] = Relationship(back_populates="recipe", cascade_delete=True)
    
    # --- NEW: Relationship to users who have saved this recipe ---
    saved_by_users: List["User"] = Relationship(back_populates="saved_recipes", link_model=UserRecipeLink)

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    household_size: Optional[int] = Field(default=2)
    dietary_requirements: List[str] = Field(default=[], sa_column=Column(JSON))
    allergies: List[str] = Field(default=[], sa_column=Column(JSON))
    
    # --- NEW: Relationship to recipes this user has saved ---
    saved_recipes: List[Recipe] = Relationship(back_populates="saved_by_users", link_model=UserRecipeLink)