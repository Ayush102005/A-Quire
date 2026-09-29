import asyncio
import anthropic
import os
import time

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "firebase-credentials.json"
project = "a-quire-27f93"
region = "us-east5"
model = "claude-3-5-sonnet@20240620"

async def test():
    print(f"Waiting for Google Cloud to propagate the API enablement for project {project}...")
    client = anthropic.AnthropicVertex(
        project_id=project,
        region=region,
    )
    
    attempts = 0
    while attempts < 30:
        attempts += 1
        try:
            print(f"Attempt {attempts}: Pinging Vertex AI...")
            resp = await asyncio.to_thread(
                client.messages.create,
                model=model,
                max_tokens=10,
                messages=[{"role": "user", "content": "hello"}]
            )
            print("\n🎉 SUCCESS! The API is now fully enabled and working!")
            print("You can now click the 'Chapter Quiz' button in your app.")
            return
        except Exception as e:
            error_str = str(e)
            if "SERVICE_DISABLED" in error_str or "Agent Platform API has not been used" in error_str:
                print("Still propagating (API disabled error). Waiting 10 seconds...")
            elif "PERMISSION_DENIED" in error_str or "403" in error_str:
                print("Still propagating (IAM Permission denied). Waiting 10 seconds...")
            elif "404" in error_str:
                print("\n❌ ERROR: 404 Not Found.")
                print("The API is enabled, but Claude 3.5 Sonnet is NOT enabled in the Vertex AI Model Garden for this project.")
                return
            else:
                print(f"Unknown error: {e}")
                return
            
            time.sleep(10)
            
    print("Timed out waiting for propagation.")

if __name__ == "__main__":
    asyncio.run(test())
