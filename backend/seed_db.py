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
    
    email = "admin@inno.com"
    password = "admin!nno"
    
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        print(f"Admin user {email} already exists.")
        # Reset password just in case
        hashed_password = auth.get_password_hash(password)
        existing_user.hashed_password = hashed_password
        db.commit()
        print(f"Password reset to: {password}")
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
    print(f"Admin user created successfully.")
    print(f"Email: {email}")
    print(f"Password: {password}")
    
    db.close()

if __name__ == "__main__":
    create_admin()
