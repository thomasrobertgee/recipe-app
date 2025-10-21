# backend/ai_service.py

import os
from openai import OpenAI
from typing import List, Dict, Optional
import json # Import json
# --- Import Pydantic BaseModel for type checking ---
from pydantic import BaseModel

# Load environment variables if you use python-dotenv
# from dotenv import load_dotenv
# load_dotenv()

# Ensure API key is loaded
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_recipes_from_specials(
    specials_list: List[BaseModel], # Use BaseModel for type hint flexibility
    preferences: BaseModel,      # Use BaseModel for type hint flexibility
    pantry_items: List[Dict]
) -> List[Dict]:
    """
    Generates recipes based on specials, preferences, and pantry items using OpenAI.
    """
    try:
        # --- FIX: Convert Pydantic models to dicts before dumping ---
        specials_dict_list = [special.model_dump() for special in specials_list]
        preferences_dict = preferences.model_dump()
        # Pantry items are already dicts, no change needed

        specials_str = json.dumps(specials_dict_list, indent=2)
        pantry_items_str = json.dumps(pantry_items, indent=2)
        preferences_str = json.dumps(preferences_dict, indent=2)
        # --- END FIX ---

        # --- *** MODIFIED PROMPT AGAIN *** ---
        prompt = f"""
        You are a recipe assistant. Given the following supermarket specials, user preferences, and pantry items, generate 3 diverse recipes.
        Focus on using the specials, but incorporate pantry items where sensible.
        Format each recipe strictly as a JSON object with keys: "title" (string), "description" (string), "instructions" (string), "ingredients" (list of objects, each with "name" (string) and "quantity" (string, e.g., "2 cups", "100g")), and "tags" (list of strings like "Quick", "Vegan", "Dinner", "Budget-Friendly").

        **Instructions Formatting Rules:**
        1. Separate each distinct step ONLY with a newline character ('\\n').
        2. Do NOT add numbers or list markers (like '1.', '-', '*') at the beginning of each step.
        3. Example of correct format for the "instructions" value: "Preheat oven to 180C.\\nMix flour and sugar.\\nBake for 25 minutes."

        Output *only* a valid JSON list containing these 3 recipe objects. Do not include any introductory text, explanations, or markdown formatting like ```json.

        Specials:
        {specials_str}

        User Preferences:
        {preferences_str}

        Pantry Items:
        {pantry_items_str}

        Generate 3 recipes in a JSON list:
        """
        # --- *** END MODIFIED PROMPT *** ---

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
        # Log the content that failed to parse
        print(f"Content was: {content if 'content' in locals() else 'Content not captured'}")
        return []
    except AttributeError as attr_err:
         print(f"AttributeError during data conversion: {attr_err}. Check if inputs are Pydantic models.")
         # Log the types of the inputs to help debug
         print(f"Type of specials_list item: {type(specials_list[0]) if specials_list else 'N/A'}")
         print(f"Type of preferences: {type(preferences)}")
         return []
    except Exception as e:
        print(f"Error generating recipes with AI: {e}")
        return [] # Return empty list on error

def modify_recipe_with_ai(original_recipe: Dict, modification_prompt: str) -> Dict:
    """
    Modifies an existing recipe based on a prompt using OpenAI.
    """
    # Assuming original_recipe is already a dict from the request
    try:
        original_recipe_str = json.dumps(original_recipe, indent=2)
    except TypeError as e:
        print(f"Error: Could not serialize original_recipe for modification: {e}")
        return {"error": "Internal server error preparing recipe data."}

    # --- *** MODIFIED PROMPT AGAIN *** ---
    prompt = f"""
    You are a recipe modification assistant. Modify the following recipe based on the user's request.
    Return the *entire* modified recipe as a single, valid JSON object matching the original structure
    (keys: "title", "description", "instructions", "ingredients" list [with "name", "quantity"], "tags" list).

    **Instructions Formatting Rules:**
    1. Separate each distinct step ONLY with a newline character ('\\n').
    2. Do NOT add numbers or list markers (like '1.', '-', '*') at the beginning of each step.
    3. Example of correct format for the "instructions" value: "Preheat oven to 180C.\\nMix flour and sugar.\\nBake for 25 minutes."

    Do NOT just describe the changes. Ensure the output is only the JSON object, with no extra text or markdown formatting.

    Original Recipe:
    {original_recipe_str}

    User Request: "{modification_prompt}"

    Modified Recipe JSON:
    """
    # --- *** END MODIFIED PROMPT *** ---
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
        print(f"Content was: {content if 'content' in locals() else 'Content not captured'}")
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
    # --- *** REFINED PROMPT *** ---
    prompt = f"""
    Analyze the following text extracted from a shopping receipt. Your goal is to identify and list the names of the grocery items purchased.
    - Carefully examine each line.
    - Extract the core name of each product, even if surrounded by noise (codes, prices, weights, quantities, symbols like '*'). Examples: "ORG BANANAS 1KG" should become "Organic Bananas", "1L MILK FULL CRM" should become "Milk Full Cream", "GRAPES RED SEEDLESS" should become "Red Seedless Grapes", "DARK CHOCOLATE *" should become "Dark Chocolate".
    - Try to combine item names that span multiple lines if it makes sense.
    - **Crucially, ignore lines that are clearly not grocery items.** This includes: prices standing alone (e.g., "0.89", "£0.95"), quantities alone (e.g., "2 @"), totals ("TOTAL", "5.08"), payment details ("MASTERCARD SALE", "AID:", "NUMBER:", "****0938", "AUTH CODE:", "MERCHANT:", "START:", "EXPIRY:"), store names/info ("TESCO", "metro", "TEL 0845..."), loyalty card info ("CLUBCARD STATEMENT", "POINTS THIS VISIT"), miscellaneous text ("alamy", "my", "ala", "CHANGE DUE", "How did we do?", "Visit www..."), and random codes or symbols.
    - Return the extracted item names as a JSON list of strings. Example: ["Milk Full Cream", "Organic Bananas", "Red Seedless Grapes", "White Bread Loaf"]
    - If, after carefully filtering, absolutely no valid grocery item names can be identified, return an empty JSON list: []
    - Output *only* the valid JSON list. Do not include explanations or markdown formatting.

    Receipt Text:
    \"\"\"
    {receipt_text}
    \"\"\"

    JSON Item List:
    """
    # --- *** END REFINED PROMPT *** ---

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

        # Handle empty or non-JSON responses gracefully before parsing
        if not content or not content.strip().startswith('['):
             print(f"--- [AI Service] AI response was empty or not a JSON list: {content}")
             return []

        item_names = json.loads(content)

        if isinstance(item_names, list):
             print(f"--- [AI Service] Parsed items: {item_names}")
             # Further clean up empty strings and ensure all are strings
             cleaned_items = [str(item).strip() for item in item_names if isinstance(item, str) and str(item).strip()] # Ensure item is string
             # Optional: Add de-duplication
             # unique_items = list(dict.fromkeys(cleaned_items))
             # return unique_items
             return cleaned_items
        else:
             print(f"--- [AI Service] AI did not return a list. Response: {item_names}")
             return []

    except json.JSONDecodeError as json_err:
        print(f"--- [AI Service] Failed to decode AI JSON response for receipt: {json_err}")
        print(f"--- [AI Service] Content was: {content if 'content' in locals() else 'Content not captured'}")
        return [] # Return empty list on JSON parsing error
    except Exception as e:
        print(f"--- [AI Service] Error parsing receipt text with AI: {e}")
        return [] # Return empty list on any other error
# --- END NEW FUNCTION ---