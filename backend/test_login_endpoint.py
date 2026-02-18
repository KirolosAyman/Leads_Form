import requests
import os

# Test the login endpoint
url = "http://localhost:8000/token"
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

if not ADMIN_EMAIL or not ADMIN_PASSWORD:
    print("ERROR: ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set to run this test.")
    print("Set them and re-run, or run 'python seed_db.py' after exporting them to create the admin user.")
    raise SystemExit(1)

data = {
    "username": ADMIN_EMAIL,
    "password": ADMIN_PASSWORD
}

print(f"Testing login at: {url}")
print(f"Credentials: {data}")
print()

try:
    response = requests.post(url, data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
