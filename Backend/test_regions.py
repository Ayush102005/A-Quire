import asyncio
import anthropic
import os

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "firebase-credentials.json"
project = "a-quire"
model = "claude-sonnet-5@default"

async def test_region(region):
    print(f"Testing Vertex AI on project {project} in region {region}...")
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
        print(f"[{region}] SUCCESS! The API is enabled and working!")
        return True
    except Exception as e:
        print(f"[{region}] ERROR: {e}")
        return False

async def main():
    regions = ["us-central1", "us-east5", "europe-west1", "europe-west4"]
    for r in regions:
        if await test_region(r):
            print(f"\n=> We should use region: {r}")
            return
        await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())
