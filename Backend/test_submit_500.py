import asyncio
import httpx

async def test_submit():
    async with httpx.AsyncClient(base_url="http://localhost:8000/api/v1") as client:
        # First login to get a token
        login_resp = await client.post("/auth/login", json={"email": "student1@example.com", "password": "password123"})
        if login_resp.status_code != 200:
            print("Login failed:", login_resp.text)
            return
            
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Now hit submit with dummy data
        submit_resp = await client.post(
            "/assessments/submit", 
            json={
                "session_id": 1,
                "question_id": 1,
                "selected_option": "C",
                "confidence": 3
            },
            headers=headers
        )
        
        print(f"Status: {submit_resp.status_code}")
        print(f"Response: {submit_resp.text}")

if __name__ == "__main__":
    asyncio.run(test_submit())
