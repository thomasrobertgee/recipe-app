# backend/seed.py

import requests
import json
from datetime import date
# --- *** FIX: Import func *** ---
from sqlmodel import Session, select, SQLModel, func
# --- *** END FIX *** ---
from database import engine, create_db_and_tables
from models import User, Ingredient, PriceHistory, Recipe, RecipeIngredientLink
from security import get_password_hash
from ai_service import generate_recipes_from_specials
from schemas import UserRead, PriceHistoryRead

# --- SETTINGS ---
API_URL = "http://127.0.0.1:8000"
NUM_TEST_USERS = 26
TEST_USER_PASSWORD = "1234567890"
# --- NEW: Default postcode for test users ---
TEST_USER_POSTCODE = "3000" 
# --- END NEW ---
NUM_RECIPES_TO_GENERATE = 3

# Helper function to get or create ingredient
def get_or_create_ingredient(session: Session, name: str, category: str) -> Ingredient:
    # Try to find existing ingredient first (case-insensitive)
    existing_ingredient = session.exec(
        select(Ingredient).where(Ingredient.name.ilike(name))
    ).first()
    
    if existing_ingredient:
        # Update category if it's missing and provided now
        if not existing_ingredient.category and category:
            existing_ingredient.category = category
            session.add(existing_ingredient)
            session.commit()
            session.refresh(existing_ingredient)
        return existing_ingredient
    else:
        # Create new one
        new_ingredient = Ingredient(name=name, category=category)
        session.add(new_ingredient)
        session.commit()
        session.refresh(new_ingredient)
        return new_ingredient

# Helper to save price
def save_price(session: Session, ingredient_name: str, price: str, store: str, category: str):
    ingredient = get_or_create_ingredient(session, ingredient_name, category)
    today = date.today()
    
    # Check if a record for this ingredient+store+date already exists
    existing_record = session.exec(
        select(PriceHistory).where(
            PriceHistory.ingredient_id == ingredient.id,
            PriceHistory.store == store,
            PriceHistory.date_recorded == today
        )
    ).first()
    
    if not existing_record:
        new_price = PriceHistory(
            ingredient_id=ingredient.id,
            price=price,
            store=store,
            date_recorded=today
        )
        session.add(new_price)
    else:
        # Optional: Update price if it's different
        if existing_record.price != price:
            existing_record.price = price
            session.add(existing_record)


# --- UPDATED: Create test users with postcode ---
def create_test_users(session: Session):
    print(f"Creating {NUM_TEST_USERS} test users (a@a.com to z@z.com)...")
    hashed_password = get_password_hash(TEST_USER_PASSWORD)
    
    for i in range(NUM_TEST_USERS):
        letter = chr(ord('a') + i)
        email = f"{letter}@{letter}.com"
        
        existing_user = session.exec(select(User).where(User.email == email)).first()
        if not existing_user:
            new_user = User(
                email=email,
                hashed_password=hashed_password,
                adult_count=2,
                child_count=1,
                weekly_budget=150,
                # --- NEW: Set default postcode ---
                postcode=TEST_USER_POSTCODE,
                # --- END NEW ---
                has_completed_onboarding=True
            )
            session.add(new_user)
    
    session.commit()
    print("Test users created successfully.")
# --- END UPDATE ---

# --- Data simulation functions ---
def scrape_coles(session: Session):
    print("Seeding Coles specials...")
    specials = [
        {"name": "Coles RSPCA Approved Chicken Breast Fillets Large Pack", "price": "$12.00/kg", "category": "Meat & Seafood"},
        {"name": "Coles Australian Lamb Leg Roast", "price": "$12.50/kg", "category": "Meat & Seafood"},
        {"name": "Tassal Tasmanian Sliced Smoked Salmon 250g", "price": "$12.00", "category": "Meat & Seafood"},
        {"name": "Coles Australian Beef Rump Steak", "price": "$15.00/kg", "category": "Meat & Seafood"},
        {"name": "Coles RSPCA Approved Chicken Thigh Fillets", "price": "$11.00/kg", "category": "Meat & Seafood"},
        {"name": "Coles Australian Pork Loin Chops", "price": "$10.00/kg", "category": "Meat & Seafood"},
        {"name": "Gold Kiwifruit", "price": "$0.80/ea", "category": "Fruit & Vegetables"},
        {"name": "Australian Red Seedless Grapes", "price": "$4.90/kg", "category": "Fruit & Vegetables"},
        {"name": "Australian Washed Potatoes 2kg Bag", "price": "$4.00/bag", "category": "Fruit & Vegetables"},
        {"name": "Australian Shepard Avocados", "price": "$1.50/ea", "category": "Fruit & Vegetables"},
        {"name": "Australian Iceberg Lettuce", "price": "$2.50/ea", "category": "Fruit & Vegetables"},
        {"name": "Australian Brown Onions 1kg Bag", "price": "$2.00/bag", "category": "Fruit & Vegetables"},
        {"name": "Australian Carrots 1kg Bag", "price": "$2.00/bag", "category": "Fruit & Vegetables"},
        {"name": "Australian Broccoli", "price": "$3.90/kg", "category": "Fruit & Vegetables"},
        {"name": "Australian Red Capsicum", "price": "$5.90/kg", "category": "Fruit & Vegetables"},
    ]
    for item in specials:
        save_price(session, item["name"], item["price"], "Coles", item["category"])
    print(f"Added {len(specials)} Coles specials.")

def scrape_woolworths(session: Session):
    print("Seeding Woolworths specials...")
    specials = [
        {"name": "Woolworths RSPCA Approved Chicken Breast Fillet", "price": "$11.50/kg", "category": "Meat & Seafood"},
        {"name": "Australian Lamb Leg Roast Bone In", "price": "$12.00/kg", "category": "Meat & Seafood"},
        {"name": "Tassal Tasmanian Smoked Salmon 200g", "price": "$11.50", "category": "Meat & Seafood"},
        {"name": "Woolworths Australian Beef Rump Steak", "price": "$16.00/kg", "category": "Meat & Seafood"},
        {"name": "Woolworths RSPCA Approved Chicken Thigh Fillet", "price": "$10.50/kg", "category": "Meat & Seafood"},
        {"name": "Australian Pork Loin Chops", "price": "$9.50/kg", "category": "Meat & Seafood"},
        {"name": "New Zealand Gold Kiwifruit", "price": "$0.85/ea", "category": "Fruit & Vegetables"},
        {"name": "Australian Red Seedless Grapes", "price": "$4.50/kg", "category": "Fruit & Vegetables"},
        {"name": "Australian Brushed Potatoes 2kg Bag", "price": "$4.50/bag", "category": "Fruit & Vegetables"},
        {"name": "Australian Avocados", "price": "$1.40/ea", "category": "Fruit & Vegetables"},
        {"name": "Australian Iceberg Lettuce", "price": "$2.80/ea", "category": "Fruit & Vegetables"},
        {"name": "Australian Brown Onions 1kg Bag", "price": "$2.20/bag", "category": "Fruit & Vegetables"},
        {"name": "Australian Carrots 1kg Bag", "price": "$2.00/bag", "category": "Fruit & Vegetables"},
        {"name": "Australian Broccoli", "price": "$3.50/kg", "category": "Fruit & Vegetables"},
        {"name": "Australian Red Capsicum", "price": "$6.00/kg", "category": "Fruit & Vegetables"},
    ]
    for item in specials:
        save_price(session, item["name"], item["price"], "Woolworths", item["category"])
    print(f"Added {len(specials)} Woolworths specials.")

def scrape_aldi(session: Session):
    print("Seeding Aldi specials...")
    specials = [
        {"name": "ALDI Chicken Breast Fillet 1kg", "price": "$10.99/kg", "category": "Meat & Seafood"},
        {"name": "ALDI Lamb Leg Roast", "price": "$11.99/kg", "category": "Meat & Seafood"},
        {"name": "ALDI Smoked Salmon 200g", "price": "$9.99", "category": "Meat & Seafood"},
        {"name": "ALDI Rump Steak (approx. 500g)", "price": "$14.99/kg", "category": "Meat & Seafood"},
        {"name": "ALDI Chicken Thigh Fillets 1kg", "price": "$9.99/kg", "category": "Meat & Seafood"},
        {"name": "ALDI Pork Loin Chops (approx. 700g)", "price": "$8.99/kg", "category": "Meat & Seafood"},
        {"name": "ALDI Gold Kiwifruit 500g", "price": "$3.99/pk", "category": "Fruit & Vegetables"},
        {"name": "ALDI Red Seedless Grapes 500g", "price": "$2.99/pk", "category": "Fruit & Vegetables"},
        {"name": "ALDI Brushed Potatoes 2kg", "price": "$3.49/bag", "category": "Fruit & Vegetables"},
        {"name": "ALDI Avocados 2 Pack", "price": "$2.49/pk", "category": "Fruit & Vegetables"},
        {"name": "ALDI Iceberg Lettuce", "price": "$2.29/ea", "category": "Fruit & Vegetables"},
        {"name": "ALDI Brown Onions 1kg", "price": "$1.99/bag", "category": "Fruit & Vegetables"},
        {"name": "ALDI Carrots 1kg", "price": "$1.79/bag", "category": "Fruit & Vegetables"},
        {"name": "ALDI Broccoli", "price": "$3.29/kg", "category": "Fruit & Vegetables"},
        {"name": "ALDI Red Capsicum 2 Pack", "price": "$2.99/pk", "category": "Fruit & Vegetables"},
    ]
    for item in specials:
        save_price(session, item["name"], item["price"], "Aldi", item["category"])
    print(f"Added {len(specials)} Aldi specials.")

def clear_data(session: Session):
    print("Clearing old data (Recipes, Prices, Users, Ingredients)...")
    
    # Delete in correct order to respect foreign keys
    session.exec(delete(RecipeIngredientLink))
    session.exec(delete(PriceHistory))
    # Add other link tables here if they depend on User or Recipe
    # e.g., UserRecipeLink, UserPantryLink, UserRecipeRatingLink, MealPlanEntry
    
    # Clear data from models
    session.exec(delete(Recipe))
    session.exec(delete(User))
    session.exec(delete(Ingredient))
    # Add other main tables here
    # e.g., SupplierProfile
    
    session.commit()
    print("Old data cleared.")

def generate_sample_recipes(session: Session, test_user: User, specials_list: list):
    print(f"Generating {NUM_RECIPES_TO_GENERATE} sample recipes for user {test_user.email}...")
    
    # Convert models to schemas for the AI service
    try:
        user_prefs = UserRead.model_validate(test_user)
        specials_read = [PriceHistoryRead.model_validate(s) for s in specials_list]
    except Exception as e:
        print(f"Error validating models for AI: {e}")
        return

    # Mock pantry items (empty for simplicity in seeder)
    pantry_items = [] 
    
    try:
        ai_recipes = generate_recipes_from_specials(
            specials_list=specials_read,
            preferences=user_prefs,
            pantry_items=pantry_items
        )

        if not ai_recipes:
            print("AI service returned no recipes.")
            return

        for recipe_data in ai_recipes:
            # Manually create recipe and links
            new_recipe = Recipe(
                title=recipe_data.get('title', 'AI Recipe'),
                description=recipe_data.get('description', 'AI generated description'),
                instructions=recipe_data.get('instructions', 'No instructions provided.'),
                tags=recipe_data.get('tags', [])
            )
            session.add(new_recipe)
            session.commit() # Commit to get recipe ID
            session.refresh(new_recipe)

            ingredient_links = []
            for ing_data in recipe_data.get('ingredients', []):
                ingredient = get_or_create_ingredient(session, ing_data['name'], category=None)
                link = RecipeIngredientLink(
                    recipe_id=new_recipe.id,
                    ingredient_id=ingredient.id,
                    quantity=ing_data['quantity']
                )
                ingredient_links.append(link)
            
            session.add_all(ingredient_links)
            session.commit()
        
        print(f"Successfully generated and saved {len(ai_recipes)} recipes.")

    except Exception as e:
        print(f"Error during AI recipe generation or saving: {e}")
        session.rollback()


def main():
    print("--- Starting Database Seeder ---")
    # Ensure tables are created
    create_db_and_tables() 
    
    session = Session(engine)
    
    try:
        # 1. Clear all existing data
        # clear_data(session) # Commented out to prevent accidental deletion
        # print("NOTE: Data clearing is disabled. Run clear_data() manually if needed.")
        
        # 2. Create Test Users
        create_test_users(session)
        
        # 3. Scrape/Seed Specials
        scrape_coles(session)
        scrape_woolworths(session)
        scrape_aldi(session)
        
        session.commit() # Commit all specials
        print("All specials committed.")

        # 4. (Optional) Generate sample recipes for the first user
        first_user = session.exec(select(User).where(User.email == "a@a.com")).first()
        today_specials = session.exec(select(PriceHistory).where(PriceHistory.date_recorded == date.today())).all()
        
        if first_user and today_specials and NUM_RECIPES_TO_GENERATE > 0:
            # Check if user already has recipes
            recipe_count = session.exec(select(func.count(Recipe.id))).one()
            if recipe_count == 0:
                generate_sample_recipes(session, first_user, today_specials)
            else:
                print(f"Skipping AI recipe generation, {recipe_count} recipes already exist.")
        else:
            print("Skipping AI recipe generation (no user, no specials, or num_recipes=0).")

        print("\n--- Database Seeding Complete! ---")
        
    except Exception as e:
        print(f"\n--- An error occurred during seeding ---")
        print(e)
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    # This allows the seeder to be run directly
    # e.g., python seed.py
    main()