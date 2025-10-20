# backend/ai_service.py

import os
from openai import OpenAI
from typing import List, Dict, Optional
import json # Import json

# Load environment variables if you use python-dotenv
# from dotenv import load_dotenv
# load_dotenv()

# Ensure API key is loaded
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_recipes_from_specials(
    specials_list: List[Dict],
    preferences: Dict,
    pantry_items: List[Dict]
) -> List[Dict]:
    """
    Generates recipes based on specials, preferences, and pantry items using OpenAI.
    """
    # Create strings for lists to ensure proper formatting in the prompt
    specials_str = json.dumps(specials_list, indent=2)
    pantry_items_str = json.dumps(pantry_items, indent=2)
    preferences_str = json.dumps(preferences, indent=2)


    prompt = f"""
    You are a recipe assistant. Given the following supermarket specials, user preferences, and pantry items, generate 3 diverse recipes.
    Focus on using the specials, but incorporate pantry items where sensible.
    Format each recipe strictly as a JSON object with keys: "title" (string), "description" (string), "instructions" (string of steps, use newline characters for separation), "ingredients" (list of objects, each with "name" (string) and "quantity" (string, e.g., "2 cups", "100g")), and "tags" (list of strings like "Quick", "Vegan", "Dinner", "Budget-Friendly").
    Output *only* a valid JSON list containing these 3 recipe objects. Do not include any introductory text, explanations, or markdown formatting like ```json.

    Specials:
    {specials_str}

    User Preferences:
    {preferences_str}

    Pantry Items:
    {pantry_items_str}

    Generate 3 recipes in a JSON list:
    """
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo", # Or your preferred model like gpt-4-turbo-preview
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            # response_format={ "type": "json_object" } # Use if using newer models supporting JSON mode
        )
        content = response.choices[0].message.content

        # Basic parsing - assumes AI returns a valid JSON list string
        # Handle potential markdown ```json ... ```
        if content.strip().startswith("```json"):
            content = content.strip()[7:-3].strip()
        elif content.strip().startswith("```"):
             content = content.strip()[3:-3].strip()

        recipes = json.loads(content)
        # Add basic validation
        if isinstance(recipes, list) and all(isinstance(r, dict) for r in recipes):
            return recipes
        else:
            print(f"AI response was not a valid list of dicts: {content}")
            return []
    except json.JSONDecodeError as json_err:
        print(f"Failed to decode AI JSON response for recipes: {json_err}")
        print(f"Content was: {content}")
        return []
    except Exception as e:
        print(f"Error generating recipes with AI: {e}")
        return [] # Return empty list on error

def modify_recipe_with_ai(original_recipe: Dict, modification_prompt: str) -> Dict:
    """
    Modifies an existing recipe based on a prompt using OpenAI.
    """
    original_recipe_str = json.dumps(original_recipe, indent=2)

    prompt = f"""
    You are a recipe modification assistant. Modify the following recipe based on the user's request.
    Return the *entire* modified recipe as a single, valid JSON object matching the original structure
    (keys: "title", "description", "instructions", "ingredients" list [with "name", "quantity"], "tags" list).
    Do NOT just describe the changes. Ensure the output is only the JSON object, with no extra text or markdown formatting.

    Original Recipe:
    {original_recipe_str}

    User Request: "{modification_prompt}"

    Modified Recipe JSON:
    """
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo", # Or your preferred model
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5, # Lower temperature for more deterministic modification
            # response_format={ "type": "json_object" } # Use if using newer models
        )
        content = response.choices[0].message.content

        # Handle potential markdown ```json ... ```
        if content.strip().startswith("```json"):
            content = content.strip()[7:-3].strip()
        elif content.strip().startswith("```"):
             content = content.strip()[3:-3].strip()

        modified_recipe = json.loads(content)
        # Add basic validation
        if isinstance(modified_recipe, dict):
             return modified_recipe
        else:
             print(f"AI response was not a valid dict: {content}")
             return {"error": "AI returned invalid format."}

    except json.JSONDecodeError as json_err:
        print(f"Failed to decode AI JSON response for modification: {json_err}")
        print(f"Content was: {content}")
        return {"error": "Failed to decode AI response."}
    except Exception as e:
        print(f"Error modifying recipe with AI: {e}")
        return {"error": f"AI failed to modify recipe: {e}"}


# --- NEW FUNCTION for parsing receipt text ---
def parse_receipt_text_with_ai(receipt_text: str) -> List[str]:
    """
    Uses OpenAI API to extract item names from OCR'd receipt text.
    Returns a list of potential item names.
    """
    print("--- [AI Service] Parsing receipt text ---")
    # Refined prompt for better extraction
    prompt = f"""
    Analyze the following text extracted from a shopping receipt. Identify and list only the names of the grocery items purchased.
    - Ignore quantities, prices, discounts, taxes, totals, store information, addresses, dates, times, loyalty program details, payment information, and any other non-product text.
    - Focus on extracting the core name of each product. For example, "ORG BANANAS 1KG" should become "Organic Bananas", "1L MILK FULL CRM" should become "Milk Full Cream", "GRAPES RED SEEDLESS" should become "Red Seedless Grapes".
    - Try to combine lines if an item name spans multiple lines, but be cautious.
    - If an item is unclear or ambiguous, make your best guess for the item name.
    - Return the extracted item names as a JSON list of strings. Example: ["Milk Full Cream", "Organic Bananas", "Red Seedless Grapes", "White Bread Loaf"]
    - If no items can be clearly identified, return an empty JSON list: []
    - Output *only* the valid JSON list. Do not include explanations or markdown formatting.

    Receipt Text:
    \"\"\"
    {receipt_text}
    \"\"\"

    JSON Item List:
    """

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo", # Consider GPT-4-turbo for potentially better accuracy
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1, # Very low temperature for factual extraction
             # response_format={ "type": "json_object" } # Use if using newer models and sure the output will always be list-like JSON
        )
        content = response.choices[0].message.content
        print(f"--- [AI Service] Raw AI Response for receipt parsing:\n{content}") # Log raw response

        # Handle potential markdown code block ```json ... ```
        if content.strip().startswith("```json"):
            content = content.strip()[7:-3].strip() # Remove markers and whitespace
        elif content.strip().startswith("```"):
             content = content.strip()[3:-3].strip()

        item_names = json.loads(content)

        if isinstance(item_names, list):
             print(f"--- [AI Service] Parsed items: {item_names}")
             # Further clean up empty strings and ensure all are strings
             cleaned_items = [str(item).strip() for item in item_names if str(item).strip()]
             # Optional: Add de-duplication
             # unique_items = list(dict.fromkeys(cleaned_items))
             # return unique_items
             return cleaned_items
        else:
            print(f"--- [AI Service] AI did not return a list. Response: {item_names}")
            return []

    except json.JSONDecodeError as json_err:
        print(f"--- [AI Service] Failed to decode AI JSON response for receipt: {json_err}")
        print(f"--- [AI Service] Content was: {content}")
        return [] # Return empty list on JSON parsing error
    except Exception as e:
        print(f"--- [AI Service] Error parsing receipt text with AI: {e}")
        return [] # Return empty list on any other error
# --- END NEW FUNCTION ---