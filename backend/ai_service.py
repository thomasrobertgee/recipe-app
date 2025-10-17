# backend/ai_service.py

import os
import json
from dotenv import load_dotenv
from typing import List, Dict, Union
import openai

load_dotenv()

# Initialize the OpenAI client
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_recipes_from_specials(specials_list: List, preferences: object, pantry_items: List) -> List[Dict]:
    """
    Generates recipes from a list of specials using the OpenAI API.
    """
    specials_str = ", ".join([f"{item.ingredient_name} at {item.store} for {item.price}" for item in specials_list])
    pantry_str = ", ".join([item.name for item in pantry_items]) if pantry_items else "empty"
    preferences_str = (
        f"Household Size: {preferences.household_size}, "
        f"Dietary Restrictions: {', '.join(preferences.dietary_restrictions) or 'none'}"
    )

    prompt = f"""
    You are a creative chef specializing in budget-friendly meals. Based on the following supermarket specials, user preferences, and pantry items, generate 3 unique dinner recipes.

    **Supermarket Specials:**
    {specials_str}

    **User Preferences:**
    {preferences_str}

    **User's Pantry Contains:**
    {pantry_str}

    **RESPONSE FORMAT:**
    - The output must be a single, valid JSON array of 3 recipe objects. Do not include any text or formatting outside of the JSON array.
    - Each recipe object in the array must have the following keys: "title", "description", "instructions", "ingredients", and "tags".
    - The "ingredients" key must be an array of objects, where each object has "name" and "quantity" keys (e.g., {{"name": "Chicken Breast", "quantity": "500g"}}).
    - The "tags" key should be an array of 3-5 strings that describe the recipe (e.g., "Quick & Easy", "Vegan", "High-Protein").
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            # Using response_format is good, but we still need robust parsing
        )
        response_content = response.choices[0].message.content
        data = json.loads(response_content)
        
        # More robust parsing logic
        # Case 1: The AI returned the array directly.
        if isinstance(data, list):
            return data
        
        # Case 2: The AI wrapped the array in an object (e.g., {"recipes": [...]}).
        # Find the first value in the JSON object that is a list.
        if isinstance(data, dict):
            for value in data.values():
                if isinstance(value, list):
                    return value
        
        # If neither of the above, something is wrong with the format.
        print("AI response was valid JSON but did not contain a recipe list.")
        return []

    except Exception as e:
        print(f"An unexpected error occurred during recipe generation: {e}")
        return []

def modify_recipe_with_ai(original_recipe: Dict, modification_prompt: str) -> Dict:
    """
    Takes an existing recipe and a user's modification instruction,
    and returns a new, modified recipe dictionary using the OpenAI API.
    """
    ingredients_str = "\n".join([f"- {ing['quantity']} {ing['name']}" for ing in original_recipe['ingredients']])
    original_recipe_str = (
        f"Title: {original_recipe['title']}\n"
        f"Description: {original_recipe['description']}\n"
        f"Ingredients:\n{ingredients_str}\n"
        f"Instructions: {original_recipe['instructions']}"
    )

    prompt = f"""
    You are a helpful cooking assistant. A user wants to modify an existing recipe.
    Your task is to take the original recipe and the user's request, and generate a NEW, complete recipe that incorporates the changes.

    **USER'S REQUEST:** "{modification_prompt}"

    **ORIGINAL RECIPE:**
    ---
    {original_recipe_str}
    ---

    **RESPONSE FORMAT:**
    Generate the modified recipe as a single, valid JSON object. Do NOT include any text or formatting outside of the JSON object.
    The JSON object must have the following keys: "title", "description", "instructions", "ingredients", and "tags".
    The "ingredients" key must be an array of objects, where each object has "name" and "quantity" keys.
    --- FIX: Be explicit about the quantity's data type ---
    The "quantity" key MUST be a string that includes the unit (e.g., "1 cup", "200g", "2 cloves").
    The "tags" key should be an array of strings that describe the new recipe (e.g., "Vegan", "Gluten-Free", "Quick & Easy").
    Ensure the new title reflects the modification (e.g., "Vegan Lentil Bolognese" instead of "Classic Beef Bolognese").
    """

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        response_content = response.choices[0].message.content
        modified_recipe_data = json.loads(response_content)
        return modified_recipe_data
    except Exception as e:
        print(f"An error occurred during AI recipe modification: {e}")
        return {"error": "Could not modify the recipe. Please try again."}