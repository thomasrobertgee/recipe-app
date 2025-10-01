# backend/seed.py

from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import Recipe, Ingredient, RecipeIngredientLink, Special

# A list of 20 specials to populate the database
SPECIALS_DATA = [
    {"ingredient_name": "Chicken Breast Fillet", "price": "$9.50 per kg", "store": "Coles"},
    {"ingredient_name": "Beef Mince (Premium)", "price": "$14.00 per kg", "store": "Woolworths"},
    {"ingredient_name": "Pork Sausages", "price": "$7.50 per pack", "store": "Aldi"},
    {"ingredient_name": "Tasmanian Salmon Fillets", "price": "$28.00 per kg", "store": "Coles"},
    {"ingredient_name": "Broccoli", "price": "$3.00 per kg", "store": "Woolworths"},
    {"ingredient_name": "Carrots", "price": "$1.20 per kg", "store": "Aldi"},
    {"ingredient_name": "Brown Onions", "price": "$2.50 per kg", "store": "Coles"},
    {"ingredient_name": "Red Capsicum", "price": "$5.00 per kg", "store": "Woolworths"},
    {"ingredient_name": "Washed Potatoes", "price": "$3.00 for 2kg bag", "store": "Aldi"},
    {"ingredient_name": "Avocados", "price": "2 for $4.00", "store": "Coles"},
    {"ingredient_name": "Bananas", "price": "$2.90 per kg", "store": "Woolworths"},
    {"ingredient_name": "Strawberries", "price": "$3.50 per punnet", "store": "Aldi"},
    {"ingredient_name": "Cheddar Cheese Block", "price": "$8.00 per 500g", "store": "Coles"},
    {"ingredient_name": "Free Range Eggs", "price": "$4.80 per dozen", "store": "Woolworths"},
    {"ingredient_name": "Milk (2L)", "price": "$3.10 each", "store": "Aldi"},
    {"ingredient_name": "Sliced White Bread", "price": "$2.50 each", "store": "Coles"},
    {"ingredient_name": "Pasta Sauce", "price": "$2.00 each", "store": "Woolworths"},
    {"ingredient_name": "Mushrooms", "price": "$10.00 per kg", "store": "Aldi"},
    {"ingredient_name": "Baby Spinach", "price": "$2.00 per 120g bag", "store": "Coles"},
    {"ingredient_name": "Greek Yoghurt", "price": "$4.50 per 1kg tub", "store": "Woolworths"}
]

def seed_database():
    print("🔄 Clearing and seeding database...")
    create_db_and_tables()

    with Session(engine) as session:
        # Clear existing data
        session.query(RecipeIngredientLink).delete()
        session.query(Special).delete()
        session.query(Recipe).delete()
        session.query(Ingredient).delete()
        session.commit()

        # Add new specials
        for special_data in SPECIALS_DATA:
            # Find or create the ingredient
            ingredient_name = special_data["ingredient_name"]
            existing_ingredient = session.exec(select(Ingredient).where(Ingredient.name == ingredient_name)).first()

            if existing_ingredient:
                ingredient = existing_ingredient
            else:
                ingredient = Ingredient(name=ingredient_name)
                session.add(ingredient)
                session.commit()
                session.refresh(ingredient)

            # Create the special
            special = Special(
                ingredient_id=ingredient.id,
                price=special_data["price"],
                store=special_data["store"]
            )
            session.add(special)
        
        session.commit()

    print("✅ Database seeded successfully with 20 specials!")

if __name__ == "__main__":
    seed_database()