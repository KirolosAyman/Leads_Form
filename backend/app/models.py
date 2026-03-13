from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey
from datetime import datetime
import enum
from .database import Base
from sqlalchemy.orm import relationship

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
    contact_id = Column(String, index=True, nullable=True)
    phone = Column(String, index=True, nullable=True)  # Primary search field
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    title = Column(String, nullable=True)
    company = Column(String, nullable=True)
    street = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip = Column(String, nullable=True)
    web_site = Column(String, nullable=True)  # Can be NULL
    annual_sales = Column(String, nullable=True)  # Can be NULL
    employee_count = Column(String, nullable=True)  # Can be NULL
    sic_code = Column(String, nullable=True)
    industry = Column(String, nullable=True)  # Can be NULL
    recording = Column(String, nullable=True)
    
    # Status tracking
    is_submitted = Column(Boolean, default=False, index=True)
    
    # Tracking
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LeadSubmission(Base):
    __tablename__ = "lead_submissions"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey('leads.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    details = Column(Text, nullable=True)       # JSON snapshot of lead + agent at submission
    api_status_code = Column(Integer, nullable=True)  # HTTP status code from external API
    api_response = Column(Text, nullable=True)  # Raw response body from external API

    lead = relationship('Lead', backref='submissions')
    user = relationship('User')
