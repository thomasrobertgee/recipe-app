# backend/models.py (Corrected)

from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship

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

    # --- THIS IS THE FIX ---
    # Changed 'cascade_deletes' to 'cascade_delete' (singular)
    links: List[RecipeIngredientLink] = Relationship(back_populates="recipe", cascade_delete=True)