import requests, json

BASE = "http://localhost:8000/api/v1"

# 1. Login
r = requests.post(f"{BASE}/auth/login", json={"email": "ayush@test.com", "password": "password123"})
print("LOGIN:", r.status_code)
if r.status_code != 200:
    r2 = requests.post(f"{BASE}/auth/login", json={"email": "student@test.com", "password": "password123"})
    print("LOGIN2:", r2.status_code, r2.text[:200])
    token = r2.json().get("access_token")
else:
    token = r.json().get("access_token")

print("token:", token[:20] if token else "NONE")

headers = {"Authorization": f"Bearer {token}"}

# 2. Start session
r = requests.post(f"{BASE}/assessments/start", json={"topic_id": 1}, headers=headers)
print("START:", r.status_code, r.text[:200])
sess = r.json()
session_id = sess["id"]

# 3. Get next question
r = requests.get(f"{BASE}/assessments/{session_id}/next", headers=headers)
print("NEXT:", r.status_code)
data = r.json()
print("NEXT JSON:", json.dumps(data, indent=2))
