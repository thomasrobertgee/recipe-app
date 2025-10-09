# backend/check_models.py

import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file")

genai.configure(api_key=api_key)

print("--- Available Models ---")
for m in genai.list_models():
  if 'generateContent' in m.supported_generation_methods:
    print(m.name)
print("------------------------")