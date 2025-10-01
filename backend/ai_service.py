# backend/ai_service.py

import os
import json
import openai
from dotenv import load_dotenv

def generate_recipes_from_specials(specials_list):
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in .env file")

    client = openai.OpenAI(api_key=api_key)
    
    specials_as_dicts = [s.model_dump() for s in specials_list]

    system_prompt = f"""
    You are a creative chef who creates simple, delicious recipes for people on a budget.
    Your task is to generate 5 unique dinner recipes based on on-special ingredients provided by the user.

    You must provide the output as a single JSON object with a key named "recipes", which contains an array of recipe objects.
    
    Example of the required JSON output format:
    {{
        "recipes": [
            {{
                "title": "Example Recipe Title",
                "description": "A short, enticing description.",
                "instructions": "1. First step.\\n2. Second step.",
                "ingredients": [
                    {{ "name": "Ingredient 1", "quantity": "1 cup" }}
                ]
            }}
        ]
    }}
    """

    user_prompt = f"""
    Here are this week's on-special ingredients:
    {json.dumps(specials_as_dicts, indent=2)}
    Please generate 5 recipes based on these and provide them in the specified JSON format.
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