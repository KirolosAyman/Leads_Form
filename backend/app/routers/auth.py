from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from .. import database, models, auth, schemas

router = APIRouter()

@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    username = form_data.username.strip().lower()
    password = form_data.password.strip()
    
    print(f"Cleaned Username: '{username}'")
    print(f"Cleaned Password length: {len(password)}")
    
    user = db.query(models.User).filter(models.User.email == username).first()
    if not user:
        print(f"[ERROR] User '{form_data.username}' not found in database")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f"[OK] User found: {user.email}")
    print(f"     Role: {user.role}")
    print(f"     Active: {user.is_active}")
    
    if not auth.verify_password(password, user.hashed_password):
        print(f"[ERROR] Password verification FAILED")
        print(f"        Stored hash: {user.hashed_password[:50]}...")
        print(f"        Input password: '[HIDDEN]'")
        print(f"        Input password length: {len(password)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f"[OK] Password verified successfully")
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    print(f"[OK] Token generated successfully")
    print(f"=== LOGIN SUCCESS ===\n")
    return {"access_token": access_token, "token_type": "bearer"}


