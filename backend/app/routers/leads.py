from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
import pandas as pd
import io
import json
from .. import database, models, schemas, crud, auth

router = APIRouter()

REQUIRED_COLUMNS = [
    "contact_id", "phone", "first_name", "last_name", "title", 
    "company", "street", "city", "state", "zip", "sic_code", "recording"
]

OPTIONAL_COLUMNS = ["web_site", "annual_sales", "employee_count", "industry"]

@router.post("/leads/upload")
async def upload_leads(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    """
    Upload leads from an Excel file (.xlsx).
    Strict validation: rejects files with missing required values or incorrect columns.
    """
    # Validate file extension
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file format. Only .xlsx files are accepted."
        )
    
    contents = await file.read()
    
    # Read Excel file
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Error reading Excel file: {str(e)}"
        )
    
    # Validate columns exist
    all_required_columns = REQUIRED_COLUMNS
    missing_cols = [col for col in all_required_columns if col not in df.columns]
    
    if missing_cols:
        raise HTTPException(
            status_code=400, 
            detail=f"Missing required columns: {', '.join(missing_cols)}"
        )
    
    # Check for extra columns that shouldn't be there
    expected_columns = set(REQUIRED_COLUMNS + OPTIONAL_COLUMNS)
    actual_columns = set(df.columns)
    extra_columns = actual_columns - expected_columns
    
    if extra_columns:
        raise HTTPException(
            status_code=400,
            detail=f"Unexpected columns found: {', '.join(extra_columns)}. Only these columns are allowed: {', '.join(sorted(expected_columns))}"
        )
    
    # Strict validation: Check for missing values in REQUIRED columns
    for col in REQUIRED_COLUMNS:
        null_count = df[col].isna().sum()
        if null_count > 0:
            # Find the row numbers with null values
            null_rows = df[df[col].isna()].index.tolist()
            raise HTTPException(
                status_code=400,
                detail=f"Missing values detected in required column '{col}' at row(s): {', '.join(map(str, [r+2 for r in null_rows]))} (Excel row numbers)"
            )
    
    # Additional validation: Check for empty strings in required columns
    for col in REQUIRED_COLUMNS:
        empty_mask = df[col].astype(str).str.strip() == ''
        empty_count = empty_mask.sum()
        if empty_count > 0:
            empty_rows = df[empty_mask].index.tolist()
            raise HTTPException(
                status_code=400,
                detail=f"Empty values detected in required column '{col}' at row(s): {', '.join(map(str, [r+2 for r in empty_rows]))} (Excel row numbers)"
            )
    
    # Process and save leads
    success_count = 0
    errors = []
    duplicates = []
    
    for idx, row in df.iterrows():
        try:
            # Convert row to dict and handle NULL values for optional fields
            lead_data = {
                "contact_id": str(row["contact_id"]).strip(),
                "phone": str(row["phone"]).strip(),
                "first_name": str(row["first_name"]).strip(),
                "last_name": str(row["last_name"]).strip(),
                "title": str(row["title"]).strip(),
                "company": str(row["company"]).strip(),
                "street": str(row["street"]).strip(),
                "city": str(row["city"]).strip(),
                "state": str(row["state"]).strip(),
                "zip": str(row["zip"]).strip(),
                "sic_code": str(row["sic_code"]).strip(),
                "recording": str(row["recording"]).strip(),
            }
            
            # Handle optional fields - convert NULL/NaN to None
            for opt_col in OPTIONAL_COLUMNS:
                if opt_col in df.columns:
                    val = row[opt_col]
                    if pd.isna(val) or str(val).upper() == 'NULL':
                        lead_data[opt_col] = None
                    else:
                        lead_data[opt_col] = str(val).strip()
                else:
                    lead_data[opt_col] = None
            
            # Check if lead already exists by contact_id or phone
            existing_by_contact = db.query(models.Lead).filter(
                models.Lead.contact_id == lead_data["contact_id"]
            ).first()
            
            existing_by_phone = crud.get_lead_by_phone(db, lead_data["phone"])
            
            if existing_by_contact or existing_by_phone:
                duplicates.append(
                    f"Row {idx+2}: contact_id={lead_data['contact_id']}, phone={lead_data['phone']}"
                )
                continue
            
            # Create and save lead
            lead_in = schemas.LeadCreate(**lead_data)
            crud.create_lead(db, lead_in)
            success_count += 1
            
        except Exception as e:
            errors.append(f"Row {idx+2}: {str(e)}")
    
    response = {
        "message": "Upload processed successfully",
        "total_rows": len(df),
        "success_count": success_count,
        "duplicate_count": len(duplicates),
        "error_count": len(errors)
    }
    
    if duplicates:
        response["duplicates"] = duplicates[:10]  # Show first 10
        if len(duplicates) > 10:
            response["duplicates_note"] = f"Showing first 10 of {len(duplicates)} duplicates"
    
    if errors:
        response["errors"] = errors[:10]  # Show first 10
        if len(errors) > 10:
            response["errors_note"] = f"Showing first 10 of {len(errors)} errors"
    
    return response

@router.get("/leads/search/{phone_number}", response_model=schemas.LeadOut)
async def search_lead(
    phone_number: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    lead = crud.get_lead_by_phone(db, phone_number)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.put("/leads/{lead_id}", response_model=schemas.LeadOut)
async def update_lead(
    lead_id: int,
    lead_update: schemas.LeadUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Agents can update. Admin can too.
    lead = crud.update_lead(db, lead_id, lead_update)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead
