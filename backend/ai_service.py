# backend/ai_service.py

import os
import json
import openai
from dotenv import load_dotenv
from schemas import UserRead, SpecialRead
from typing import List

def generate_recipes_from_specials(specials_list: List[SpecialRead], preferences: UserRead):
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in .env file")

    client = openai.OpenAI(api_key=api_key)
    
    specials_as_dicts = [s.model_dump() for s in specials_list]

    # --- THIS IS THE CHANGE: Combine safety rules ---
    safety_rules = []
    if preferences.allergies:
        safety_rules.append(f"The user has a critical allergy to: {', '.join(preferences.allergies)}. Do not include these ingredients or their derivatives.")
    if preferences.dietary_requirements:
        safety_rules.append(f"The user has a critical dietary requirement for: {', '.join(preferences.dietary_requirements)} recipes.")
    
    if not safety_rules:
        safety_rules.append("The user has specified no allergies or dietary requirements.")

    # Build the rest of the preference text
    preference_text = ""
    if preferences.household_size:
        preference_text += f"The recipes should be suitable for a household of {preferences.household_size} people."

    # Construct the final system prompt
    system_prompt = f"""
    You are a helpful and extremely cautious recipe assistant. Your primary goal is to generate 5 unique dinner recipes based on user preferences and a list of on-special ingredients.

    ---
    **CRITICAL SAFETY & DIETARY RULES:**
    - {" ".join(safety_rules)}
    - YOU MUST NOT include any of the specified allergens or ingredients that violate the dietary requirements.
    - Before providing your final answer, you MUST double-check every ingredient in every generated recipe to ensure it strictly complies with ALL of the above rules. This is the most important instruction.
    ---

    **Other User Preferences:**
    {preference_text if preference_text else "The user has no other specific preferences."}

    **Output Rules:**
    - You must provide the output as a single JSON object with a key named "recipes", which contains an array of recipe objects. Do not include any text, titles, or markdown formatting like ```json before or after the JSON object.
    - Each recipe object must have the keys: "title", "description", "instructions", and "ingredients".
    - The "instructions" must be a single string with steps separated by newline characters (\\n).
    - The "ingredients" must be an array of objects, each with "name" and "quantity" keys.
    """

    user_prompt = f"""
    Here are this week's on-special ingredients:
    {json.dumps(specials_as_dicts, indent=2)}
    Please generate 5 recipes based on these specials and my safety/dietary rules and preferences. Provide them in the specified JSON format.
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