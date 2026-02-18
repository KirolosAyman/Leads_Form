import requests
import os

# Configuration
BASE_URL = "http://localhost:8000"
EMAIL = os.getenv("ADMIN_EMAIL")
PASSWORD = os.getenv("ADMIN_PASSWORD")

if not EMAIL or not PASSWORD:
    print("ERROR: ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set to run this test.")
    print("Set them and re-run, or run 'python seed_db.py' after exporting them to create the admin user.")
    exit(1)

def test_upload():
    print("=" * 60)
    print("Testing Excel Upload Functionality")
    print("=" * 60)
    
    # Step 1: Login
    print("\n1. Logging in as admin...")
    login_data = {
        "username": EMAIL,
        "password": PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/token", data=login_data)
    
    if response.status_code != 200:
        print(f"   [ERROR] Login failed: {response.text}")
        return
    
    token = response.json()["access_token"]
    print(f"   [OK] Login successful")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 2: Upload Excel file
    print("\n2. Uploading sample Excel file...")
    excel_file = "sample_leads.xlsx"
    
    if not os.path.exists(excel_file):
        print(f"   [ERROR] File not found: {excel_file}")
        return
    
    with open(excel_file, "rb") as f:
        files = {"file": (excel_file, f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        response = requests.post(f"{BASE_URL}/api/leads/upload", headers=headers, files=files)
    
    print(f"   Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"   [OK] Upload successful!")
        print(f"   Total rows: {result.get('total_rows')}")
        print(f"   Success count: {result.get('success_count')}")
        print(f"   Duplicate count: {result.get('duplicate_count')}")
        print(f"   Error count: {result.get('error_count')}")
        
        if result.get('duplicates'):
            print(f"\n   Duplicates:")
            for dup in result['duplicates']:
                print(f"     - {dup}")
        
        if result.get('errors'):
            print(f"\n   Errors:")
            for err in result['errors']:
                print(f"     - {err}")
    else:
        print(f"   [ERROR] Upload failed:")
        print(f"   {response.text}")
        return
    
    # Step 3: Search for a lead
    print("\n3. Searching for lead by phone...")
    phone = "15058822424"
    response = requests.get(f"{BASE_URL}/api/leads/search/{phone}", headers=headers)
    
    if response.status_code == 200:
        lead = response.json()
        print(f"   [OK] Lead found!")
        print(f"   Name: {lead['first_name']} {lead['last_name']}")
        print(f"   Company: {lead['company']}")
        print(f"   Title: {lead['title']}")
        print(f"   Phone: {lead['phone']}")
        print(f"   Address: {lead['street']}, {lead['city']}, {lead['state']} {lead['zip']}")
    else:
        print(f"   [ERROR] Search failed: {response.text}")
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)

if __name__ == "__main__":
    test_upload()
