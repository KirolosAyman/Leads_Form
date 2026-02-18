import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models, auth

def test_login():
    db = SessionLocal()
    # Read admin credentials from environment variables
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")

    if not email or not password:
        print("ERROR: ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set to run this test.")
        print("Set them and re-run, or run 'python seed_db.py' after exporting them to create the admin user.")
        db.close()
        return
    
    # Get user from database
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user:
        print(f"[X] User {email} not found in database")
        return
    
    print(f"[OK] User found: {email}")
    print(f"  Role: {user.role}")
    print(f"  Active: {user.is_active}")
    print(f"  Stored hash: {user.hashed_password[:50]}...")
    
    # Test password verification
    print(f"\nTesting password: '{password}'")
    is_valid = auth.verify_password(password, user.hashed_password)
    
    if is_valid:
        print(f"[OK] Password verification PASSED")
    else:
        print(f"[X] Password verification FAILED")
        
        # Try to create a new hash and compare
        new_hash = auth.get_password_hash(password)
        print(f"\nNew hash generated: {new_hash[:50]}...")
        print(f"Testing new hash...")
        is_valid_new = auth.verify_password(password, new_hash)
        print(f"New hash verification: {'[OK] PASSED' if is_valid_new else '[X] FAILED'}")
    
    db.close()

if __name__ == "__main__":
    test_login()
