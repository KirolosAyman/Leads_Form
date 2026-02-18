"""
Script to recreate the database with the new Lead schema.
WARNING: This will delete all existing leads data!
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from app import models

def recreate_database():
    print("WARNING: This will delete all existing data!")
    response = input("Are you sure you want to continue? (yes/no): ")
    
    if response.lower() != 'yes':
        print("Operation cancelled.")
        return
    
    print("\nDropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating new tables with updated schema...")
    Base.metadata.create_all(bind=engine)
    
    print("\n[OK] Database recreated successfully!")
    print("\nNext steps:")
    print("1. Run 'python seed_db.py' to create the admin user (set ADMIN_EMAIL and ADMIN_PASSWORD env vars before running)")
    print("2. Upload your Excel file with leads data")

if __name__ == "__main__":
    recreate_database()
