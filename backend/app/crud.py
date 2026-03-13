from sqlalchemy.orm import Session
from . import models, schemas, auth
import secrets
import string

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate, role: models.UserRole):
    # Auto-generate password
    alphabet = string.ascii_letters + string.digits
    password = ''.join(secrets.choice(alphabet) for i in range(10))
    hashed_password = auth.get_password_hash(password)
    
    db_user = models.User(
        email=user.email, 
        hashed_password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        role=role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user, password

def create_user_with_optional_password(db: Session, user: schemas.UserCreateWithPassword, role: models.UserRole):
    """Create user with optional custom password or auto-generated password"""
    if user.password:
        password = user.password
    else:
        # Auto-generate password
        alphabet = string.ascii_letters + string.digits
        password = ''.join(secrets.choice(alphabet) for i in range(10))
    
    hashed_password = auth.get_password_hash(password)
    
    db_user = models.User(
        email=user.email, 
        hashed_password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        role=role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user, password

def get_lead_by_phone(db: Session, phone: str):
    return db.query(models.Lead).filter(models.Lead.phone == phone).first()

def create_lead(db: Session, lead: schemas.LeadCreate):
    db_lead = models.Lead(**lead.dict())
    db.add(db_lead)
    db.commit()
    return db_lead

def update_lead(db: Session, lead_id: int, lead_update: schemas.LeadUpdate):
    db_lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not db_lead:
        return None
    
    update_data = lead_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_lead, key, value)
    
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead
