# backend/seed.py

from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import Recipe, Ingredient, RecipeIngredientLink, Special, User
from security import get_password_hash # Import the password hashing function

# A curated list of 150 meat, seafood, and produce specials
SPECIALS_DATA = [
    # --- Coles (50) ---
    {"ingredient_name": "Coles Australian Lamb Loin Chops", "price": "$28.00 ($28.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles RSPCA Approved Australian Chicken Breast Fillets Large Pack", "price": "$11.00 ($11.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian No Added Hormones Beef Rump Steak", "price": "$22.00 ($22.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Made Easy Chicken Schnitzel", "price": "$12.50 ($20.83 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles RSPCA Approved Chicken Portions With BBQ Rub", "price": "$6.00 ($6.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Pork Loin Chops", "price": "$14.00 ($14.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Made Easy Slow Cooked Lamb Shanks", "price": "$15.00 ($17.65 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Pork Belly Bites", "price": "$10.00 ($20.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Lamb Leg Roast", "price": "$12.00 ($12.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Beef Sizzle Steak", "price": "$20.00 ($20.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Tassal Tasmanian Sliced Smoked Salmon", "price": "$13.00 ($65.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Green Banana Prawns Thawed", "price": "$22.00 ($22.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Thawed Barramundi Fillets Skin On", "price": "$29.00 ($29.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "John West Tuna Tempters", "price": "$1.25 ($1.32 per 100g)", "store": "Coles"},
    {"ingredient_name": "Birds Eye Oven Bake Fish Fillets", "price": "$5.00 ($1.19 per 100g)", "store": "Coles"},
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
    {"ingredient_name": "Coles Australian Red Perino Tomatoes", "price": "$3.50 ($17.50 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Broccoli", "price": "$3.90 ($3.90 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Pineapples", "price": "$2.50 ($2.50 each)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Royal Gala Apples", "price": "$4.50 ($4.50 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Celery Bunch", "price": "$2.90 ($2.90 each)", "store": "Coles"},
    {"ingredient_name": "Coles Lebanese Cucumbers", "price": "$3.90 ($3.90 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Sweet Corn", "price": "$1.00 ($1.00 each)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Garlic", "price": "$2.50 ($10.00 per 100g)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Brown Onions", "price": "$3.00 ($3.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Red Capsicum", "price": "$6.90 ($6.90 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Green Spring Onions Bunch", "price": "$2.80 ($2.80 each)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Fresh Ginger", "price": "$2.00 ($8.00 per 100g)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Fresh Basil", "price": "$3.00 ($3.00 each)", "store": "Coles"},
    {"ingredient_name": "Coles Free Range Chicken Drumsticks", "price": "$5.00 ($5.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Australian Pork Scotch Fillet Steak", "price": "$24.00 ($24.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Beef Burgers", "price": "$8.00 ($16.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Lamb Cutlets", "price": "$40.00 ($40.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Frozen Raw Prawns", "price": "$18.00 ($25.71 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Thawed Squid Tubes", "price": "$19.00 ($19.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Beef & Pork Mince", "price": "$7.50 ($15.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles Smoked Cod Fillets", "price": "$15.00 ($30.00 per 1kg)", "store": "Coles"},
    {"ingredient_name": "Coles RSPCA Approved Whole Chicken", "price": "$4.50 ($4.50 per 1kg)", "store": "Coles"},
    # Woolworths (50)
    {"ingredient_name": "Woolworths RSPCA Approved Chicken Breast Fillets", "price": "$11.00 ($11.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Australian Lamb Forequarter Chops", "price": "$16.00 ($16.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Australian Beef Porterhouse Steak", "price": "$30.00 ($30.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Australian Pork Mid Loin Chops", "price": "$12.00 ($12.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Beef Sausages", "price": "$7.00 ($12.73 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Chicken Kiev Garlic Butter", "price": "$10.00 ($14.29 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Heart Smart Beef Mince", "price": "$9.00 ($18.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Lamb Leg Steak", "price": "$25.00 ($25.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Pork Belly Rashers", "price": "$20.00 ($20.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Australian Diced Beef", "price": "$15.00 ($15.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Fresh Barramundi Fillets Skin On", "price": "$32.00 ($32.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Cooked Tiger Prawns", "price": "$28.00 ($28.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Sealord Hoki Fillets", "price": "$8.00 ($2.00 per 100g)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Smoked Salmon Slices", "price": "$7.50 ($7.50 per 100g)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Prawn Hargow", "price": "$6.00 ($2.40 per 100g)", "store": "Woolworths"},
    {"ingredient_name": "Australian Hass Avocados", "price": "2 for $4.00", "store": "Woolworths"},
    {"ingredient_name": "Australian Royal Gala Apples", "price": "$3.50 ($3.50 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Bananas", "price": "$3.00 ($3.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Strawberries", "price": "$2.50 ($10.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Blueberries", "price": "$4.00 ($32.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Washed Potatoes", "price": "$3.50 ($1.75 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Carrots", "price": "$1.50 ($1.50 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Broccoli", "price": "$3.50 ($3.50 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Zucchini", "price": "$4.50 ($4.50 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Red Onions", "price": "$2.50 ($2.50 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Green Beans", "price": "$3.00 ($12.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Cup Mushrooms", "price": "$5.00 ($20.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Iceberg Lettuce", "price": "$2.00 ($2.00 each)", "store": "Woolworths"},
    {"ingredient_name": "Australian Cherry Tomatoes", "price": "$3.00 ($12.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Pineapples", "price": "$3.00 ($3.00 each)", "store": "Woolworths"},
    {"ingredient_name": "Australian Seedless Watermelon", "price": "$1.50 ($1.50 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Celery", "price": "$2.50 ($2.50 each)", "store": "Woolworths"},
    {"ingredient_name": "Australian Lebanese Cucumbers", "price": "$4.00 ($4.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Sweet Corn", "price": "$1.20 ($1.20 each)", "store": "Woolworths"},
    {"ingredient_name": "Australian Garlic", "price": "$2.00 ($8.00 per 100g)", "store": "Woolworths"},
    {"ingredient_name": "Australian Brown Onions", "price": "$2.50 ($2.50 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Red Capsicum", "price": "$7.00 ($7.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Lamb Souvlaki Strips", "price": "$16.00 ($32.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Chicken Breast Tenders", "price": "$11.00 ($22.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Cooked & Peeled Prawns", "price": "$15.00 ($50.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Fresh Ling Fillets", "price": "$24.00 ($24.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Woolworths Pork & Veal Mince", "price": "$8.00 ($16.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Ingham's Turkey Breast Mince", "price": "$10.00 ($20.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "D'orsogna Flame Roasted Sweet Chilli Chicken", "price": "$27.00 ($27.00 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Kent Pumpkin", "price": "$1.50 ($1.50 per 1kg)", "store": "Woolworths"},
    {"ingredient_name": "Australian Green Cabbage", "price": "$3.90 ($3.90 each)", "store": "Woolworths"},
    {"ingredient_name": "Australian Fresh Coriander", "price": "$3.00 ($3.00 each)", "store": "Woolworths"},
    # Aldi (50)
    {"ingredient_name": "Almare Saltwater Farm Atlantic Salmon", "price": "$12.99 ($52.00 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Brannans Butchery BBQ Sausages", "price": "$5.99 ($10.89 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Brannans Butchery Chicken Breast Fillets", "price": "$9.99 ($9.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Brannans Butchery Lamb Loin Chops", "price": "$24.99 ($24.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Brannans Butchery Pork Belly", "price": "$16.99 ($16.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Jindurra Station Beef Mince", "price": "$6.49 ($12.98 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "The Farmstand Pork Roast", "price": "$7.99 ($7.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Brannans Butchery Chicken Drumsticks", "price": "$3.49 ($3.49 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Brannans Butchery Beef Eye Fillet Steak", "price": "$44.99 ($44.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Willowton Free Range Whole Chicken", "price": "$6.49 ($6.49 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Ocean Royale Frozen Raw Prawns", "price": "$15.99 ($31.98 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Ocean Royale Whiting Fillets", "price": "$8.99 ($22.48 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "The Fishmonger Smoked Salmon", "price": "$5.49 ($54.90 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Ocean Royale Calamari Rings", "price": "$5.99 ($14.98 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "The Fishmonger Tuna Slices in Oil", "price": "$1.19 ($1.19 per 100g)", "store": "Aldi"},
    {"ingredient_name": "Australian Truss Tomatoes", "price": "$3.99 ($3.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Australian Carrots", "price": "$1.19 ($1.19 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Australian Brown Onions", "price": "$1.99 ($1.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Australian Washed Potatoes", "price": "$2.99 ($1.50 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Australian Broccoli", "price": "$2.99 ($2.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Australian Zucchini", "price": "$2.99 ($2.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Australian Capsicum", "price": "$1.99 ($1.99 each)", "store": "Aldi"},
    {"ingredient_name": "Australian Avocado", "price": "$1.49 ($1.49 each)", "store": "Aldi"},
    {"ingredient_name": "Australian Bananas", "price": "$1.99 ($1.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Australian Strawberries", "price": "$2.99 ($11.96 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Australian Blueberries", "price": "$3.49 ($27.92 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Australian Apples", "price": "$2.99 ($2.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Australian Iceberg Lettuce", "price": "$1.99 ($1.99 each)", "store": "Aldi"},
    {"ingredient_name": "Australian Cup Mushrooms", "price": "$3.99 ($15.96 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Australian Celery", "price": "$2.49 ($2.49 each)", "store": "Aldi"},
    {"ingredient_name": "Australian Green Beans", "price": "$1.99 ($7.96 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Australian Sweet Corn", "price": "$0.99 ($0.99 each)", "store": "Aldi"},
    {"ingredient_name": "Australian Garlic", "price": "$1.99 ($7.96 per 100g)", "store": "Aldi"},
    {"ingredient_name": "Australian Ginger", "price": "$1.49 ($5.96 per 100g)", "store": "Aldi"},
    {"ingredient_name": "Australian Kent Pumpkin", "price": "$1.29 ($1.29 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Australian Sweet Potatoes", "price": "$1.99 ($1.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Brannans Butchery Pork Sausages", "price": "$8.99 ($8.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Jindurra Station Rump Steak", "price": "$19.99 ($19.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Brannans Butchery Chicken Wings", "price": "$3.99 ($3.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "The Fishmonger Basa Fillets", "price": "$8.99 ($8.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Ocean Royale Scallops", "price": "$10.99 ($36.63 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "The Fresh Salad Co Baby Spinach", "price": "$1.99 ($1.66 per 100g)", "store": "Aldi"},
    {"ingredient_name": "Imperial Mandarin", "price": "$2.99 ($2.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Australian Red Seedless Grapes", "price": "$4.99 ($4.99 per 1kg)", "store": "Aldi"},
    {"ingredient_name": "Australian Fresh Mint", "price": "$2.49 ($2.49 each)", "store": "Aldi"},
]


def seed_database():
    print("🔄 Clearing and seeding database with 150 specials and 26 test users...")
    create_db_and_tables()

    with Session(engine) as session:
        # Clear existing data
        session.query(RecipeIngredientLink).delete()
        session.query(Special).delete()
        session.query(Recipe).delete()
        session.query(Ingredient).delete()
        session.query(User).delete()
        print("Old data cleared.")
        session.commit()

        # Add new test users
        alphabet = "abcdefghijklmnopqrstuvwxyz"
        hashed_password = get_password_hash("1234567890")
        for letter in alphabet:
            email = f"{letter}@{letter}.com"
            new_user = User(email=email, hashed_password=hashed_password)
            session.add(new_user)
        print(f"{len(alphabet)} test users created.")
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
        
        print(f"{len(SPECIALS_DATA)} new specials created.")
        session.commit()

    print(f"✅ Database seeded successfully!")

if __name__ == "__main__":
    seed_database()