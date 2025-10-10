# backend/ai_service.py

import os
import json
import openai
from dotenv import load_dotenv
from typing import List
from schemas import UserRead, PriceHistoryRead, PantryItem
import google.generativeai as genai
import PIL.Image

load_dotenv()

def get_specials_from_image(image_path: str):
    """
    Uses a multimodal AI to extract specials from an image.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file")

    genai.configure(api_key=api_key)

    model = genai.GenerativeModel('models/gemini-2.5-flash-image-preview')
    image = PIL.Image.open(image_path)

    prompt = """
    Analyze the provided screenshot of a supermarket's specials page.
    Extract all product names and their corresponding prices.
    Provide the output as a single, valid JSON object. This object must have a key named "specials", which contains an array of objects.
    Each object in the "specials" array should have two keys: "ingredient_name" (a string) and "price" (a string).
    Do not include any text, titles, markdown formatting like ```json, or any other characters before or after the JSON object.
    Your entire response must be only the JSON object itself.
    """

    try:
        response = model.generate_content([prompt, image])
        
        print("--- Raw AI Response ---")
        print(response.text)
        print("-----------------------")
        
        cleaned_response = response.text.strip().replace("```json", "").replace("```", "")
        
        if not cleaned_response:
            print("AI returned an empty response.")
            return []

        specials_data = json.loads(cleaned_response)

        if "specials" in specials_data and isinstance(specials_data["specials"], list):
            return specials_data["specials"]
        else:
            print("AI response did not contain a 'specials' key with a list.")
            return []

    except json.JSONDecodeError:
        print("Failed to decode JSON from the AI's response. The response may not be in the correct format.")
        return []
    except Exception as e:
        print(f"An error occurred while communicating with the AI: {e}")
        return []

def generate_recipes_from_specials(specials_list: List[PriceHistoryRead], preferences: UserRead, pantry_items: List[PantryItem]):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in .env file")

    client = openai.OpenAI(api_key=api_key)

    # --- THIS IS THE FIX: Use model_dump(mode='json') to handle date objects ---
    specials_as_dicts = [s.model_dump(mode='json') for s in specials_list]
    
    pantry_as_dicts = [p.model_dump() for p in pantry_items]

    safety_rules = ""
    if preferences.dietary_restrictions:
        safety_rules = f"The user has critical dietary restrictions: {', '.join(preferences.dietary_restrictions)}. Do not include these ingredients or their derivatives."
    else:
        safety_rules = "The user has specified no dietary restrictions."

    preference_text = ""
    if preferences.household_size:
        preference_text += f"The recipes should be suitable for a household of {preferences.household_size} people."

    pantry_text = "The user has no items in their pantry."
    if pantry_items:
        pantry_list_str = ", ".join([item.name for item in pantry_items])
        pantry_text = f"The user has the following items in their pantry: {pantry_list_str}. You should prioritize creating recipes that use these ingredients to help reduce food waste."


    system_prompt = f"""
    You are a helpful and extremely cautious recipe assistant. Your primary goal is to generate 5 unique dinner recipes based on user preferences, a list of on-special ingredients, and a list of ingredients the user already has in their pantry.

    ---
    **CRITICAL DIETARY RULES:**
    - {safety_rules}
    - You MUST also add any applicable dietary restrictions (e.g., "Vegan", "Gluten-Free") to the "tags" array for each recipe.
    - YOU MUST NOT include any ingredients that violate the user's dietary restrictions.
    - Before providing your final answer, you MUST double-check every ingredient and tag in every generated recipe to ensure it strictly complies with ALL of the above rules. This is the most important instruction.
    ---

    **PANTRY INGREDIENTS:**
    {pantry_text}

    **Other User Preferences:**
    {preference_text if preference_text else "The user has no other specific preferences."}

    **Output Rules:**
    - You must provide the output as a single JSON object with a key named "recipes", which contains an array of recipe objects. Do not include any text, titles, or markdown formatting like ```json before or after the JSON object.
    - Each recipe object must have the keys: "title", "description", "instructions", "ingredients", and "tags".
    - The "instructions" must be a single string with steps separated by newline characters (\\n).
    - The "ingredients" must be an array of objects, each with "name" and "quantity" keys.
    - The "tags" must be an array of 3-5 strings. These tags should be descriptive and helpful for filtering, for example: "Quick & Easy", "Family Friendly", "Under 30 Minutes", "Spicy", "Healthy", "Comfort Food". YOU MUST also include any relevant dietary tags from the user's restrictions list.
    """

    user_prompt = f"""
    Here are this week's on-special ingredients:
    {json.dumps(specials_as_dicts, indent=2)}

    Please generate 5 recipes based on these specials, my pantry items, and my safety/dietary rules and preferences. Provide them in the specified JSON format.
    """

    try:
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )

        response_content = completion.choices[0].message.content
        response_data = json.loads(response_content)

        if "recipes" in response_data and isinstance(response_data["recipes"], list):
            return response_data["recipes"]
        else:
            print("AI response did not contain a 'recipes' key with a list.")
            return []

    except Exception as e:
        print(f"An error occurred while communicating with OpenAI: {e}")
        return []