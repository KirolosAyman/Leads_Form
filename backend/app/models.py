from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text
from datetime import datetime
import enum
from .database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    AGENT = "agent"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.AGENT)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    
    # Required fields from Excel
    contact_id = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, index=True, nullable=False)  # Primary search field
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    street = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    zip = Column(String, nullable=False)
    web_site = Column(String, nullable=True)  # Can be NULL
    annual_sales = Column(String, nullable=True)  # Can be NULL
    employee_count = Column(String, nullable=True)  # Can be NULL
    sic_code = Column(String, nullable=False)
    industry = Column(String, nullable=True)  # Can be NULL
    recording = Column(String, nullable=False)
    
    # Tracking
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
