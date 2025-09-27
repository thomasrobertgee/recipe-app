# backend/models.py

from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship

class RecipeIngredientLink(SQLModel, table=True):
    recipe_id: Optional[int] = Field(default=None, foreign_key="recipe.id", primary_key=True)
    ingredient_id: Optional[int] = Field(default=None, foreign_key="ingredient.id", primary_key=True)
    quantity: str = Field(index=True)

    # Add relationships back to Recipe and Ingredient
    recipe: "Recipe" = Relationship(back_populates="links")
    ingredient: "Ingredient" = Relationship(back_populates="links")

class Ingredient(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)

    links: List[RecipeIngredientLink] = Relationship(back_populates="ingredient")

class Recipe(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    description: str
    instructions: str

    # This defines the "many" side of the one-to-many relationship
    # to the link table
    links: List[RecipeIngredientLink] = Relationship(back_populates="recipe")