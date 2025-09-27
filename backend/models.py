# backend/models.py

from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship

# This is a "link table" that connects Recipes and Ingredients
# It allows a recipe to have many ingredients, and an ingredient to be in many recipes
class RecipeIngredientLink(SQLModel, table=True):
    recipe_id: Optional[int] = Field(default=None, foreign_key="recipe.id", primary_key=True)
    ingredient_id: Optional[int] = Field(default=None, foreign_key="ingredient.id", primary_key=True)
    # We store the quantity here, as it's specific to the link
    quantity: str = Field(index=True) # e.g., "1 cup", "200g", "1 large"

class Ingredient(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)

    # The relationship back to the recipes
    recipes: List["Recipe"] = Relationship(back_populates="ingredients", link_model=RecipeIngredientLink)

class Recipe(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    description: str
    instructions: str

    # The relationship to the ingredients
    ingredients: List[Ingredient] = Relationship(back_populates="recipes", link_model=RecipeIngredientLink)