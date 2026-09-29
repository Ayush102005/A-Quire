import asyncio
import anthropic
import os

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "firebase-credentials.json"
project = "a-quire"
region = "us-east5"

models = [
    "claude-3-5-sonnet-v2@20241022",
    "claude-3-5-sonnet@20240620",
    "claude-3-sonnet@20240229",
    "claude-3-5-haiku@20241022",
    "claude-3-haiku@20240307"
]

async def test():
    client = anthropic.AnthropicVertex(
        project_id=project,
        region=region,
    )
    for m in models:
        try:
            print(f"Testing {m}...")
            resp = await asyncio.to_thread(
                client.messages.create,
                model=m,
                max_tokens=10,
                messages=[{"role": "user", "content": "hello"}]
            )
            print(f"Success with {m}!")
            return
        except Exception as e:
            print(f"Failed {m}: {e}")

if __name__ == "__main__":
    asyncio.run(test())
