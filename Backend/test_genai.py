import asyncio
import os
from dotenv import load_dotenv

async def test_genai():
    load_dotenv()
    api_key = os.environ.get("GEMINI_API_KEY")
    from google import genai
    from google.genai import types
    
    client = genai.Client(api_key=api_key)
    
    try:
        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents='Tell me a story about a frog',
            config=types.GenerateContentConfig(
                max_output_tokens=8192,
                response_mime_type="application/json"
            )
        )
        print(f"SUCCESS: {response.text}")
        if response.candidates:
            print(f"FINISH REASON: {response.candidates[0].finish_reason}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_genai())
