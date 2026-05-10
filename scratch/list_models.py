import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY not found in environment")
    exit(1)

client = genai.Client(api_key=api_key)

print("--- AVAILABLE GOOGLE MODELS (New SDK) ---")
for m in client.models.list():
    # In the new SDK, supported_generation_methods has changed to supported_methods
    if m.supported_actions and 'generateContent' in m.supported_actions:
        print(f"ID: {m.name} | Display: {m.display_name}")
