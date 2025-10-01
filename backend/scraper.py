# backend/scraper.py

import requests
from bs4 import BeautifulSoup
import time

# The URL of our own application's API
API_URL = "http://127.0.0.1:8000/api/specials"

# The URL of the Coles specials page
COLES_URL = "https://www.coles.com.au/on-special"

# A User-Agent header makes our request look like it's from a real browser
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def clear_old_specials():
    """Calls our API to delete all current specials."""
    print("--- Clearing old specials ---")
    try:
        response = requests.delete(API_URL)
        response.raise_for_status()
        print("Old specials cleared successfully.")
    except requests.exceptions.RequestException as e:
        print(f"Error clearing old specials: {e}")

def save_special(ingredient_name, price, store):
    """Calls our API to save a new special."""
    payload = {
        "ingredient_name": ingredient_name,
        "price": price,
        "store": store
    }
    try:
        response = requests.post(API_URL, json=payload)
        if response.status_code == 200:
            print(f"  ✅ Saved: {ingredient_name}")
        else:
            print(f"  ❌ Failed to save: {ingredient_name}. Status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Error saving {ingredient_name}: {e}")

def scrape_coles_specials():
    """Scrapes the Coles website and saves the specials to our database."""
    print("\n--- Starting Coles specials scrape ---")
    
    try:
        # 1. Fetch the page content
        response = requests.get(COLES_URL, headers=HEADERS)
        response.raise_for_status()

        # 2. Parse the HTML
        soup = BeautifulSoup(response.content, 'html.parser')

        # 3. Find all product containers using the new selector
        products = soup.find_all('section', attrs={'data-testid': 'product-tile'})
        
        if not products:
            print("Could not find any products. The website structure might have changed again.")
            return

        print(f"Found {len(products)} products on the page. Processing...")

        # 4. Loop through each product and extract the data
        for product in products:
            name_tag = product.find('h2', class_='product__title')
            price_tag = product.find('span', class_='price__value')
            
            # The "price per unit" is often in a different tag, let's find it
            unit_price_tag = product.find('div', class_='price__calculation_method')

            if name_tag and price_tag:
                # Clean up the text
                name = name_tag.get_text(strip=True)
                price = price_tag.get_text(strip=True)
                
                # Combine price and unit price for a more descriptive string
                full_price_string = price
                if unit_price_tag:
                    unit_price = unit_price_tag.get_text(strip=True).split('|')[0].strip()
                    # e.g., "$2.50 ($1.47 per 100g)"
                    full_price_string = f"{price} ({unit_price})"

                # 5. Save the cleaned data to our database via our API
                save_special(
                    ingredient_name=name,
                    price=full_price_string,
                    store="Coles"
                )
                # Small delay to be polite to Coles' servers
                time.sleep(0.1)

    except requests.exceptions.RequestException as e:
        print(f"Error fetching the URL: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    clear_old_specials()
    scrape_coles_specials()
    print("\n--- Scraping complete! ---")