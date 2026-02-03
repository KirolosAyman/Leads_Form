from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .models import UserRole

# Tokens
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None

# Users
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str

class UserCreate(UserBase):
    pass # Password is auto-generated or passed by admin

class UserLogin(BaseModel):
    username: str # OAuth2PasswordRequestForm uses 'username' for email
    password: str

class UserOut(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Leads
class LeadBase(BaseModel):
    contact_id: str
    phone: str
    first_name: str
    last_name: str
    title: str
    company: str
    street: str
    city: str
    state: str
    zip: str
    web_site: Optional[str] = None
    annual_sales: Optional[str] = None
    employee_count: Optional[str] = None
    sic_code: str
    industry: Optional[str] = None
    recording: str

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    web_site: Optional[str] = None
    annual_sales: Optional[str] = None
    employee_count: Optional[str] = None
    sic_code: Optional[str] = None
    industry: Optional[str] = None
    recording: Optional[str] = None

class LeadOut(LeadBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

