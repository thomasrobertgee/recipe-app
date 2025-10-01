# backend/scraper.py (Simple, Single-Page HTML Scraper)

import requests
from bs4 import BeautifulSoup
import time

API_URL = "http://127.0.0.1:8000/api/specials"
COLES_URL = "https://www.coles.com.au/on-special"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

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
        # We check for 200 OK, but don't raise for status to avoid stopping on a single validation error
        if response.status_code == 200:
            return True
        else:
            # Silently fail to keep the log clean during a large scrape
            return False
    except requests.exceptions.RequestException:
        return False

def scrape_coles_specials():
    """Scrapes the first page of the Coles website and saves the specials."""
    print("\n--- Starting single-page Coles specials scrape ---")
    total_saved_count = 0
    
    try:
        # 1. Fetch the page content
        response = requests.get(COLES_URL, headers=HEADERS)
        response.raise_for_status()

        # 2. Parse the HTML
        soup = BeautifulSoup(response.content, 'html.parser')

        # 3. Find all product containers
        products = soup.find_all('section', attrs={'data-testid': 'product-tile'})
        
        if not products:
            print("Could not find any products. The website may be blocking the request.")
            return

        print(f"Found {len(products)} products on the page. Processing...")

        # 4. Loop through each product and extract the data
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

                # 5. Save the cleaned data to our database via our API
                if save_special(ingredient_name=name, price=full_price_string, store="Coles"):
                    total_saved_count += 1
        
        print(f"\n--- Scraping complete! A total of {total_saved_count} specials were saved. ---")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching the URL: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    if clear_old_specials():
        scrape_coles_specials()