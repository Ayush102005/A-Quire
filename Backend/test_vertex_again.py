import asyncio
import anthropic
import os

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "firebase-credentials.json"
project = "a-quire"
region = "us-east5"
model = "claude-sonnet-5@default"

async def test():
    print(f"Testing Vertex AI on project {project}...")
    client = anthropic.AnthropicVertex(
        project_id=project,
        region=region,
    )
    
    try:
        resp = await asyncio.to_thread(
            client.messages.create,
            model=model,
            max_tokens=10,
            messages=[{"role": "user", "content": "hello"}]
        )
        print("\nSUCCESS! The API is enabled and working!")
    except Exception as e:
        print(f"\nERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test())
