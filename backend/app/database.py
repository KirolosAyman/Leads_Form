from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Use absolute path to ensure DB is always found
#BASE_DIR = os.path.dirname(os.path.abspath(__file__))
#DB_PATH = os.path.join(BASE_DIR, "leads_platform.db")
#SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# MariaDB connection (replace with your details)
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://fastapi_user:!nno-adminDB@localhost/webapp_db"


print(f"Database URL: {SQLALCHEMY_DATABASE_URL}")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
