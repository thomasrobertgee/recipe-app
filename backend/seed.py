# backend/seed.py

from sqlmodel import Session
# ADD THIS to import the create_db_and_tables function
from database import engine, create_db_and_tables
from models import Recipe, Ingredient, RecipeIngredientLink

def seed_database():
    # ADD THIS line to create the tables before trying to add data
    create_db_and_tables()

    print("🌱 Seeding database...")

    # Create some ingredient instances
    ingredient1 = Ingredient(name="Chicken Breast")
    ingredient2 = Ingredient(name="Broccoli")
    ingredient3 = Ingredient(name="Lemon")
    ingredient4 = Ingredient(name="Olive Oil")
    ingredient5 = Ingredient(name="Garlic")
    ingredient6 = Ingredient(name="Dried Herbs (e.g., Oregano)")

    # Create a recipe instance
    recipe1 = Recipe(
        title="Sheet Pan Lemon Herb Chicken",
        description="A simple, delicious, and easy-to-clean-up one-pan meal.",
        instructions=(
            "1. Preheat oven to 200°C (400°F).\n"
            "2. Chop broccoli into florets. Mince garlic.\n"
            "3. In a large bowl, toss chicken and broccoli with olive oil, minced garlic, dried herbs, juice of half a lemon, salt, and pepper.\n"
            "4. Spread evenly on a baking sheet.\n"
            "5. Bake for 20-25 minutes, or until chicken is cooked through and broccoli is tender-crisp.\n"
            "6. Squeeze remaining lemon juice over the top before serving."
        )
    )

    with Session(engine) as session:
        session.add(ingredient1)
        session.add(ingredient2)
        session.add(ingredient3)
        session.add(ingredient4)
        session.add(ingredient5)
        session.add(ingredient6)
        session.add(recipe1)

        session.commit()

        link1 = RecipeIngredientLink(recipe_id=recipe1.id, ingredient_id=ingredient1.id, quantity="2 boneless, skinless")
        link2 = RecipeIngredientLink(recipe_id=recipe1.id, ingredient_id=ingredient2.id, quantity="1 large head")
        link3 = RecipeIngredientLink(recipe_id=recipe1.id, ingredient_id=ingredient3.id, quantity="1 whole")
        link4 = RecipeIngredientLink(recipe_id=recipe1.id, ingredient_id=ingredient4.id, quantity="2 tablespoons")
        link5 = RecipeIngredientLink(recipe_id=recipe1.id, ingredient_id=ingredient5.id, quantity="3 cloves")
        link6 = RecipeIngredientLink(recipe_id=recipe1.id, ingredient_id=ingredient6.id, quantity="1 tablespoon")

        session.add(link1)
        session.add(link2)
        session.add(link3)
        session.add(link4)
        session.add(link5)
        session.add(link6)

        session.commit()

    print("✅ Database seeded successfully!")

if __name__ == "__main__":
    seed_database()