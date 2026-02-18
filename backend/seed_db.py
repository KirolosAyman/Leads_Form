import sys
import os

# Add the current directory to sys.path so we can import 'app'
# This assumes we are running from 'backend/' directory or we add 'backend/' to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app import models, auth

# Create tables
Base.metadata.create_all(bind=engine)

def create_admin():
    db = SessionLocal()
    # Read admin credentials from environment variables to avoid hardcoding
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")

    if not email or not password:
        print("ERROR: ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set.")
        print("Example (Windows PowerShell):")
        print("  $env:ADMIN_EMAIL='admin@yourdomain.com' ; $env:ADMIN_PASSWORD='StrongP@ssw0rd' ; python seed_db.py")
        print("")
        print("Alternatively, you can run an SQL INSERT into the users table after hashing a password.")
        print("See README or EXCEL_UPLOAD_GUIDE.md for examples.")
        db.close()
        return
    
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        print(f"Admin user {email} already exists.")
        # Reset password just in case
        hashed_password = auth.get_password_hash(password)
        existing_user.hashed_password = hashed_password
        db.commit()
        print(f"Password for {email} has been reset.")
        db.close()
        return

    hashed_password = auth.get_password_hash(password)
    
    admin_user = models.User(
        email=email,
        hashed_password=hashed_password,
        first_name="Super",
        last_name="Admin",
        role=models.UserRole.ADMIN,
        is_active=True
    )
    
    db.add(admin_user)
    db.commit()
    print(f"Admin user created successfully: {email}")
    print("NOTE: Keep ADMIN_EMAIL and ADMIN_PASSWORD set securely (do not commit to source).")
    db.close()

if __name__ == "__main__":
    create_admin()
