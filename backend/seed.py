# backend/seed.py

from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import Recipe, Ingredient, RecipeIngredientLink, Special

# Extracted on 1 October 2025 from Coles HTML
SPECIALS_DATA = [
    {"ingredient_name": "Coles Australian Lamb Loin Chops", "price": "$28.00 ($28.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles RSPCA Approved Australian Chicken Breast Fillets Large Pack", "price": "$11.00 ($11.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian No Added Hormones Beef Rump Steak", "price": "$22.00 ($22.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Made Easy Chicken Schnitzel", "price": "$12.50 ($20.83 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles RSPCA Approved Chicken Portions With BBQ Rub", "price": "$6.00 ($6.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Tassal Tasmanian Sliced Smoked Salmon", "price": "$13.00 ($65.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Pork Loin Chops", "price": "$14.00 ($14.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Made Easy Slow Cooked Lamb Shanks In Red Wine & Rosemary", "price": "$15.00 ($17.65 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Pork Belly Bites", "price": "$10.00 ($20.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "KB's Prawn Gyoza", "price": "$10.00 ($2.50 per 100g)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Lamb Leg Roast", "price": "$12.00 ($12.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Steggles Chicken Breast Goujons", "price": "$10.00 ($2.50 per 100g)", "store": "Coles"},
    {"ingredient_name": "Don Melosi Leg Ham", "price": "$24.00 ($24.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Primo Short Cut Rindless Bacon", "price": "$11.50 ($23.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Moredough Kitchens Puff Pastry", "price": "$5.50 ($1.38 per 100g)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Green Banana Prawns Thawed", "price": "$22.00 ($22.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Hans Twiggy Sticks", "price": "$18.00 ($36.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Beef Sizzle Steak", "price": "$20.00 ($20.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Strawberries", "price": "$3.50 ($14.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian White Seedless Grapes", "price": "$4.90 ($4.90 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Shepard Avocados", "price": "$1.50 ($1.50 each)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Blueberries", "price": "$3.50 ($28.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Mandarins", "price": "$2.90 ($2.90 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Washed Potatoes", "price": "$4.00 ($2.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Carrots", "price": "$2.00 ($2.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Zucchini", "price": "$3.90 ($3.90 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Red Onions", "price": "$3.00 ($3.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Green Beans", "price": "$2.50 ($10.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Cup Mushrooms", "price": "$4.50 ($18.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Iceberg Lettuce", "price": "$2.50 ($2.50 each)", "store": "Coles"},
    {"ingredient_name": "Coles Kitchen Garlic Bread", "price": "$3.20 ($0.71 per 100g)", "store": "Coles"},
    {"ingredient_name": "Coles Kitchen Green Goddess Style Salad Kit", "price": "$5.50 ($1.83 per 100g)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Red Perino Tomatoes", "price": "$3.50 ($17.50 per 1kg)", "store": "Coles"},
]

def seed_database():
    print("🔄 Clearing and seeding database with live data...")
    create_db_and_tables()

    with Session(engine) as session:
        # Clear existing data from Specials table only
        session.query(Special).delete()
        print("Old specials cleared.")
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

    print(f"✅ Database seeded successfully with {len(SPECIALS_DATA)} new specials!")

if __name__ == "__main__":
    seed_database()