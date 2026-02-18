from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, models, schemas, crud, auth
import secrets
import string

router = APIRouter()

@router.get("/users/me", response_model=schemas.UserOut)
async def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

@router.post("/users/agent", response_model=schemas.UserOut)
async def create_agent(
    user: schemas.UserCreate, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.require_admin)
):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user, password = crud.create_user(db=db, user=user, role=models.UserRole.AGENT)
    # in a real app, send email with password. Here we might just print or return it?
    # returning it in a separate response could be useful for testing, but let's stick to standard UserOut
    # For now, we will assume the Admin sees it in console or we return a custom response.
    # Let's return a custom response including the password for the Admin to see one-time.
    
    return new_user

@router.post("/users/agent/with-password")
async def create_agent_with_password_return(
    user: schemas.UserCreate, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.require_admin)
):
    """
    Creates an agent and returns the generated password. 
    Use this endpoint to see the password for distribution.
    """
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user, password = crud.create_user(db=db, user=user, role=models.UserRole.AGENT)
    return {"user": new_user, "generated_password": password}


@router.get("/users", response_model=List[schemas.UserOut])
async def list_users(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.require_admin)):
    users = db.query(models.User).all()
    return users


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(user_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate a new temporary password
    alphabet = string.ascii_letters + string.digits
    new_password = ''.join(secrets.choice(alphabet) for i in range(10))
    user.hashed_password = auth.get_password_hash(new_password)
    db.add(user)
    db.commit()
    return {"user_id": user.id, "email": user.email, "new_password": new_password}
