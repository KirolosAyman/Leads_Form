import requests

# Test the login endpoint
url = "http://localhost:8000/token"
data = {
    "username": "admin@inno.com",
    "password": "admin!nno"
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
