# backend/models.py

from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship, Column, JSON

class UserPantryLink(SQLModel, table=True):
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", primary_key=True)
    ingredient_id: Optional[int] = Field(default=None, foreign_key="ingredient.id", primary_key=True)

class UserRecipeLink(SQLModel, table=True):
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", primary_key=True)
    recipe_id: Optional[int] = Field(default=None, foreign_key="recipe.id", primary_key=True)

class UserRecipeRatingLink(SQLModel, table=True):
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", primary_key=True)
    recipe_id: Optional[int] = Field(default=None, foreign_key="recipe.id", primary_key=True)
    rating: int = Field()

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
    is_staple: bool = Field(default=False)
    category: Optional[str] = Field(default=None, index=True)

    links: List[RecipeIngredientLink] = Relationship(back_populates="ingredient")
    specials: List[Special] = Relationship(back_populates="ingredient")
    pantry_users: List["User"] = Relationship(back_populates="pantry_items", link_model=UserPantryLink)


class Recipe(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    description: str
    instructions: str
    links: List[RecipeIngredientLink] = Relationship(back_populates="recipe", cascade_delete=True)
    
    total_rating: int = Field(default=0)
    rating_count: int = Field(default=0)
    
    saved_by_users: List["User"] = Relationship(back_populates="saved_recipes", link_model=UserRecipeLink)

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    household_size: Optional[int] = Field(default=2)
    dietary_restrictions: List[str] = Field(default=[], sa_column=Column(JSON))
    weekly_budget: Optional[float] = Field(default=None)
    
    saved_recipes: List[Recipe] = Relationship(back_populates="saved_by_users", link_model=UserRecipeLink)
    pantry_items: List[Ingredient] = Relationship(back_populates="pantry_users", link_model=UserPantryLink)