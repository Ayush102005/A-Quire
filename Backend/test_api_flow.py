import asyncio
import httpx

async def run():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000") as client:
        # 1. Register a test user
        user_data = {
            "email": "testinst@example.com",
            "username": "testinst",
            "password": "password123",
            "role": "instructor"
        }
        await client.post("/api/v1/auth/register", json=user_data)
        
        # 2. Login
        resp = await client.post("/api/v1/auth/login", data={"username": "testinst@example.com", "password": "password123"})
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Create course
        c_resp = await client.post("/api/v1/courses", json={
            "title": "API Test Course",
            "description": "Desc",
            "exam_category": "Test"
        }, headers=headers)
        course_id = c_resp.json()["id"]
        
        # 4. Add module
        await client.post(f"/api/v1/courses/{course_id}/modules", json={
            "title": "Module 1",
            "description": "Desc",
            "order": 1
        }, headers=headers)
        
        # 5. Publish
        p_resp = await client.post(f"/api/v1/courses/{course_id}/publish", headers=headers)
        print("Publish Response:", p_resp.json())

if __name__ == "__main__":
    asyncio.run(run())
