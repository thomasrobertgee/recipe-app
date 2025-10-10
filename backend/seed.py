# backend/seed.py

from sqlmodel import Session, select, func
from database import engine, create_db_and_tables
from models import Recipe, Ingredient, RecipeIngredientLink, PriceHistory, User
from security import get_password_hash
from datetime import date, timedelta
import random
import re # <-- NEW: Import the regular expression module

# --- A curated list of 30 meat, seafood, and produce specials ---
SPECIALS_DATA = [
    # --- Coles (10) ---
    {"ingredient_name": "Coles Australian Lamb Loin Chops", "price": "$28.00 ($28.00 per 1kg)", "store": "Coles", "category": "Meat & Seafood"},
    {"ingredient_name": "Coles RSPCA Approved Australian Chicken Breast Fillets", "price": "$11.00 ($11.00 per 1kg)", "store": "Coles", "category": "Meat & Seafood"},
    {"ingredient_name": "Coles Australian No Added Hormones Beef Rump Steak", "price": "$22.00 ($22.00 per 1kg)", "store": "Coles", "category": "Meat & Seafood"},
    {"ingredient_name": "Tassal Tasmanian Sliced Smoked Salmon", "price": "$13.00 ($65.00 per 1kg)", "store": "Coles", "category": "Meat & Seafood"},
    {"ingredient_name": "Coles Australian Green Banana Prawns Thawed", "price": "$22.00 ($22.00 per 1kg)", "store": "Coles", "category": "Meat & Seafood"},
    {"ingredient_name": "Coles Australian Strawberries", "price": "$3.50 ($14.00 per 1kg)", "store": "Coles", "category": "Fruit & Vegetables"},
    {"ingredient_name": "Coles Australian Shepard Avocados", "price": "$1.50 ($1.50 each)", "store": "Coles", "category": "Fruit & Vegetables"},
    {"ingredient_name": "Coles Australian Washed Potatoes", "price": "$4.00 ($2.00 per 1kg)", "store": "Coles", "category": "Fruit & Vegetables"},
    {"ingredient_name": "Coles Australian Zucchini", "price": "$3.90 ($3.90 per 1kg)", "store": "Coles", "category": "Fruit & Vegetables"},
    {"ingredient_name": "Coles Australian Broccoli", "price": "$3.90 ($3.90 per 1kg)", "store": "Coles", "category": "Fruit & Vegetables"},
    
    # --- Woolworths (10) ---
    {"ingredient_name": "Woolworths RSPCA Approved Chicken Breast Fillets", "price": "$11.00 ($11.00 per 1kg)", "store": "Woolworths", "category": "Meat & Seafood"},
    {"ingredient_name": "Woolworths Australian Lamb Forequarter Chops", "price": "$16.00 ($16.00 per 1kg)", "store": "Woolworths", "category": "Meat & Seafood"},
    {"ingredient_name": "Woolworths Australian Beef Porterhouse Steak", "price": "$30.00 ($30.00 per 1kg)", "store": "Woolworths", "category": "Meat & Seafood"},
    {"ingredient_name": "Woolworths Fresh Barramundi Fillets Skin On", "price": "$32.00 ($32.00 per 1kg)", "store": "Woolworths", "category": "Meat & Seafood"},
    {"ingredient_name": "Woolworths Cooked Tiger Prawns", "price": "$28.00 ($28.00 per 1kg)", "store": "Woolworths", "category": "Meat & Seafood"},
    {"ingredient_name": "Australian Hass Avocados", "price": "$2.00 ($2.00 each)", "store": "Woolworths", "category": "Fruit & Vegetables"},
    {"ingredient_name": "Australian Royal Gala Apples", "price": "$3.50 ($3.50 per 1kg)", "store": "Woolworths", "category": "Fruit & Vegetables"},
    {"ingredient_name": "Australian Bananas", "price": "$3.00 ($3.00 per 1kg)", "store": "Woolworths", "category": "Fruit & Vegetables"},
    {"ingredient_name": "Australian Carrots", "price": "$1.50 ($1.50 per 1kg)", "store": "Woolworths", "category": "Fruit & Vegetables"},
    {"ingredient_name": "Australian Red Onions", "price": "$2.50 ($2.50 per 1kg)", "store": "Woolworths", "category": "Fruit & Vegetables"},
    
    # --- Aldi (10) ---
    {"ingredient_name": "Almare Saltwater Farm Atlantic Salmon", "price": "$12.99 ($52.00 per 1kg)", "store": "Aldi", "category": "Meat & Seafood"},
    {"ingredient_name": "Brannans Butchery Chicken Breast Fillets", "price": "$9.99 ($9.99 per 1kg)", "store": "Aldi", "category": "Meat & Seafood"},
    {"ingredient_name": "Brannans Butchery Lamb Loin Chops", "price": "$24.99 ($24.99 per 1kg)", "store": "Aldi", "category": "Meat & Seafood"},
    {"ingredient_name": "Jindurra Station Beef Mince", "price": "$6.49 ($12.98 per 1kg)", "store": "Aldi", "category": "Meat & Seafood"},
    {"ingredient_name": "Ocean Royale Frozen Raw Prawns", "price": "$15.99 ($31.98 per 1kg)", "store": "Aldi", "category": "Meat & Seafood"},
    {"ingredient_name": "Australian Truss Tomatoes", "price": "$3.99 ($3.99 per 1kg)", "store": "Aldi", "category": "Fruit & Vegetables"},
    {"ingredient_name": "Australian Capsicum", "price": "$1.99 ($1.99 each)", "store": "Aldi", "category": "Fruit & Vegetables"},
    {"ingredient_name": "Australian Blueberries", "price": "$3.49 ($27.92 per 1kg)", "store": "Aldi", "category": "Fruit & Vegetables"},
    {"ingredient_name": "Australian Iceberg Lettuce", "price": "$1.99 ($1.99 each)", "store": "Aldi", "category": "Fruit & Vegetables"},
    {"ingredient_name": "Australian Kent Pumpkin", "price": "$1.29 ($1.29 per 1kg)", "store": "Aldi", "category": "Fruit & Vegetables"},
]

def get_simple_price(price_string):
    if not price_string: return 0
    # --- THIS IS THE FIX: Use re.search() instead of string.match() ---
    match = re.search(r"\$(\d+\.?\d*)", price_string)
    return float(match.group(1)) if match else 0

def seed_database():
    print("🔄 Clearing and seeding database with test users and price history...")
    create_db_and_tables()

    with Session(engine) as session:
        session.query(RecipeIngredientLink).delete()
        session.query(PriceHistory).delete()
        session.query(Recipe).delete()
        print("Old price history and recipes cleared.")
        session.commit()
        
        user_count = session.exec(select(func.count(User.id))).one()
        if user_count == 0:
            alphabet = "abcdefghijklmnopqrstuvwxyz"
            hashed_password = get_password_hash("1234567890")
            for letter in alphabet:
                email = f"{letter}@{letter}.com"
                new_user = User(email=email, hashed_password=hashed_password)
                session.add(new_user)
            print(f"{len(alphabet)} test users created.")
            session.commit()

        total_records = 0
        for special_data in SPECIALS_DATA:
            ingredient_name = special_data["ingredient_name"]
            
            existing_ingredient = session.exec(select(Ingredient).where(func.lower(Ingredient.name) == ingredient_name.lower())).first()

            if existing_ingredient:
                ingredient = existing_ingredient
                if not ingredient.category:
                    ingredient.category = special_data.get("category")
                    session.add(ingredient)
            else:
                ingredient = Ingredient(name=ingredient_name, is_staple=False, category=special_data.get("category"))
                session.add(ingredient)
            
            session.commit()
            session.refresh(ingredient)

            base_price = get_simple_price(special_data["price"])
            for i in range(4):
                record_date = date.today() - timedelta(weeks=i)
                randomized_price = round(base_price * random.uniform(0.9, 1.1), 2)
                
                price_string = f"${randomized_price:.2f}"
                if "(" in special_data["price"]:
                    unit_part = special_data["price"].split('(')[1]
                    price_string += f" ({unit_part}"

                price_record = PriceHistory(
                    ingredient_id=ingredient.id,
                    price=price_string,
                    store=special_data["store"],
                    date_recorded=record_date
                )
                session.add(price_record)
                total_records += 1
        
        print(f"{total_records} new price history records created across 4 weeks.")
        session.commit()

    print("✅ Database seeded successfully!")

if __name__ == "__main__":
    seed_database()