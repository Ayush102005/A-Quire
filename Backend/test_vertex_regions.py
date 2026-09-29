import asyncio
import anthropic
import os

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "firebase-credentials.json"
project = "a-quire"

regions = ["us-east5", "us-central1", "us-east1", "europe-west1"]
model = "claude-3-5-sonnet-v2@20241022"

async def test():
    for r in regions:
        client = anthropic.AnthropicVertex(
            project_id=project,
            region=r,
        )
        try:
            print(f"Testing {model} in {r}...")
            resp = await asyncio.to_thread(
                client.messages.create,
                model=model,
                max_tokens=10,
                messages=[{"role": "user", "content": "hello"}]
            )
            print(f"Success in {r}!")
            return
        except Exception as e:
            print(f"Failed in {r}: {e}")

if __name__ == "__main__":
    asyncio.run(test())
