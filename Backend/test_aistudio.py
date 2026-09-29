import asyncio
import os
from app.core.config import settings

async def test_aistudio():
    import google.generativeai as genai
    import os
    
    # Need to load the key from .env since config.py doesn't expose it
    from dotenv import load_dotenv
    load_dotenv()
    
    api_key = os.environ.get("GEMINI_API_KEY")
    genai.configure(api_key=api_key)
    
    try:
        model = genai.GenerativeModel("gemini-3.5-flash")
        print("Testing gemini-3.5-flash...")
        response = await model.generate_content_async("Tell me a story about a frog", generation_config={"max_output_tokens": 1024})
        print(f"SUCCESS: {response.text}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_aistudio())
