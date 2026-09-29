import asyncio
from app.core.config import settings

async def test_vertex():
    print(f"Testing Vertex AI with project={settings.GCP_PROJECT_ID}, region={settings.GCP_REGION}, model={settings.VERTEX_MODEL_ID}")
    try:
        import vertexai
        from vertexai.generative_models import GenerativeModel
        vertexai.init(project=settings.GCP_PROJECT_ID, location=settings.GCP_REGION)
        
        client = GenerativeModel(settings.VERTEX_MODEL_ID)
        response = await asyncio.to_thread(
            client.generate_content,
            "hello",
            generation_config={"max_output_tokens": 10, "temperature": 0.5}
        )
        print(f"SUCCESS: {response.text}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_vertex())
