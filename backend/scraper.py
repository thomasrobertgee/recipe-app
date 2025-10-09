# backend/scraper.py

import requests
import os
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import time

API_URL = "http://127.0.0.1:8000/api/specials"
load_dotenv()

# --- NEW: List of categories to scrape ---
CATEGORIES_TO_SCRAPE = [
    "https://www.coles.com.au/on-special/meat-seafood",
    "https://www.coles.com.au/on-special/fruit-vegetables",
]

def clear_old_specials():
    print("--- Clearing old specials ---")
    try:
        response = requests.delete(API_URL)
        response.raise_for_status()
        print("Old specials cleared successfully.")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error clearing old specials: {e}")
        return False

def save_special(ingredient_name, price, store):
    payload = {"ingredient_name": ingredient_name, "price": price, "store": store}
    try:
        response = requests.post(API_URL, json=payload)
        if response.status_code != 200:
            print(f"Failed to save '{ingredient_name}': {response.status_code} {response.text}")
        return response.status_code == 200
    except requests.exceptions.RequestException as e:
        print(f"Error saving special: {e}")
        return False

def scrape_coles_specials():
    """
    Scrapes specific categories from Coles, handling pagination dynamically
    and extracting detailed price information.
    """
    print("\n--- Starting targeted category scrape for Coles specials ---")
    
    api_key = os.getenv("SCRAPINGBEE_API_KEY")
    if not api_key:
        print("Error: SCRAPINGBEE_API_KEY not found in .env file.")
        return

    all_products_found = []

    # Loop through each category URL
    for base_url in CATEGORIES_TO_SCRAPE:
        page_num = 1
        category_name = base_url.split('/')[-1]
        print(f"\n--- Scraping Category: {category_name} ---")

        # Loop through pages until no more products are found
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
                        'wait_for': '[data-testid="product-tile"]',
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
                all_products_found.extend(products)
                
                page_num += 1
                time.sleep(2) # Wait between page requests

            except requests.exceptions.RequestException as e:
                print(f"Error fetching page {page_num}: {e}. Moving to next category.")
                break # Stop trying this category if a page fails
            except Exception as e:
                print(f"An unexpected error occurred on page {page_num}: {e}. Moving to next category.")
                break

    if not all_products_found:
        print("No products were found across any categories.")
        return

    print(f"\n--- All pages scraped. Found a total of {len(all_products_found)} products. Processing and saving... ---")
    total_saved_count = 0
    for product in all_products_found:
        name_tag = product.find('h2', class_='product__title')
        price_tag = product.find('span', class_='price__value')
        # --- NEW: Find the unit price ---
        unit_price_tag = product.find('div', class_='price__calculation_method')
        
        if name_tag and price_tag:
            name = name_tag.get_text(strip=True)
            price = price_tag.get_text(strip=True)
            
            full_price_string = price
            if unit_price_tag:
                # Extract and clean up the unit price text
                unit_price = unit_price_tag.get_text(strip=True).split('|')[0].strip()
                full_price_string = f"{price} ({unit_price})"

            if price:
                if save_special(ingredient_name=name, price=full_price_string, store="Coles"):
                    total_saved_count += 1
    
    print(f"\n--- Scraping complete! A total of {total_saved_count} unique specials were saved. ---")

if __name__ == "__main__":
    if clear_old_specials():
        scrape_coles_specials()