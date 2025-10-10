# backend/scraper.py

import requests
import os
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import time

# --- UPDATED: API URL for prices ---
API_URL = "http://127.0.0.1:8000/api/prices"
load_dotenv()

CATEGORY_MAP = {
    "meat-seafood": "Meat & Seafood",
    "fruit-vegetables": "Fruit & Vegetables"
}

CATEGORIES_TO_SCRAPE = [
    "https://www.coles.com.au/on-special/meat-seafood",
    "https://www.coles.com.au/on-special/fruit-vegetables",
]

def clear_old_prices():
    """Clears today's price records before starting a new scrape."""
    print("--- Clearing today's price records ---")
    try:
        # --- UPDATED: Endpoint for deleting today's prices ---
        response = requests.delete(f"{API_URL}/today")
        response.raise_for_status()
        print("Today's price records cleared successfully.")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error clearing price records: {e}")
        return False

def save_price_record(ingredient_name, price, store, category):
    """Saves a single price record to the database."""
    payload = {
        "ingredient_name": ingredient_name,
        "price": price,
        "store": store,
        "category": category
    }
    try:
        response = requests.post(API_URL, json=payload)
        if response.status_code != 200:
            print(f"Failed to save '{ingredient_name}': {response.status_code} {response.text}")
        return response.status_code == 200
    except requests.exceptions.RequestException as e:
        print(f"Error saving price record: {e}")
        return False

def scrape_coles_specials():
    """
    Scrapes specified categories from Coles and saves each item as a
    price history record for the current day.
    """
    print("\n--- Starting targeted category scrape for Coles ---")
    
    api_key = os.getenv("SCRAPINGBEE_API_KEY")
    if not api_key:
        print("Error: SCRAPINGBEE_API_KEY not found in .env file.")
        return

    all_products_to_save = []

    for base_url in CATEGORIES_TO_SCRAPE:
        page_num = 1
        category_slug = base_url.split('/')[-1]
        category_name = CATEGORY_MAP.get(category_slug, "Other Specials")
        print(f"\n--- Scraping Category: {category_name} ---")

        while True:
            page_url = f"{base_url}?page={page_num}"
            print(f"Scraping Page {page_num}: {page_url}")

            try:
                response = requests.get(
                    url='https://app.scrapingbee.com/api/v1/',
                    params={
                        'api_key': api_key,
                        'url': page_url,
                        'render_js': 'true',
                        'wait_for': "[data-testid='product-tile']",
                        'country_code': 'au' 
                    },
                    timeout=120
                )
                response.raise_for_status()

                soup = BeautifulSoup(response.content, 'html.parser')
                products = soup.find_all('section', attrs={'data-testid': 'product-tile'})
                
                if not products:
                    print(f"No products found on page {page_num}. Moving to next category.")
                    break

                print(f"Found {len(products)} products on this page.")
                for product in products:
                    name_tag = product.find('h2', class_='product__title')
                    price_tag = product.find('span', class_='price__value')
                    unit_price_tag = product.find('div', class_='price__calculation_method')
                    
                    if name_tag and price_tag:
                        name = name_tag.get_text(strip=True)
                        price = price_tag.get_text(strip=True)
                        
                        full_price_string = price
                        if unit_price_tag:
                            unit_price = unit_price_tag.get_text(strip=True).split('|')[0].strip()
                            full_price_string = f"{price} ({unit_price})"

                        if price:
                            all_products_to_save.append({
                                "name": name,
                                "price": full_price_string,
                                "store": "Coles",
                                "category": category_name
                            })
                
                page_num += 1
                time.sleep(2)

            except requests.exceptions.RequestException as e:
                print(f"Error fetching page {page_num}: {e}. Moving to next category.")
                break
            except Exception as e:
                print(f"An unexpected error occurred on page {page_num}: {e}. Moving to next category.")
                break

    if not all_products_to_save:
        print("No products were found across any categories.")
        return

    print(f"\n--- All pages scraped. Found a total of {len(all_products_to_save)} products. Processing and saving... ---")
    total_saved_count = 0
    for special in all_products_to_save:
        if save_price_record(
            ingredient_name=special["name"],
            price=special["price"],
            store=special["store"],
            category=special["category"]
        ):
            total_saved_count += 1
    
    print(f"\n--- Scraping complete! A total of {total_saved_count} price records were saved. ---")

if __name__ == "__main__":
    if clear_old_prices():
        scrape_coles_specials()