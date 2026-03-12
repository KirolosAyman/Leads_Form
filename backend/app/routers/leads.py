import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
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
    Upload leads from a file. We'll try to read as Excel first, then CSV.
    This endpoint no longer enforces strict column constraints so you can
    upload varied test files; missing columns will be saved as NULLs.
    """
    contents = await file.read()

    # Try reading as Excel first; if that fails, try CSV. If both fail, return error.
    df = None
    read_error = None
    try:
        # try reading Excel; read all sheets so we don't miss data on other sheets
        try:
            xls = pd.read_excel(io.BytesIO(contents), sheet_name=None)
            # xls is a dict of DataFrames; concatenate non-empty sheets
            if isinstance(xls, dict):
                sheets = [df for df in xls.values() if not df.empty]
                if sheets:
                    df = pd.concat(sheets, ignore_index=True)
                else:
                    df = pd.DataFrame()
            else:
                df = xls
        except Exception as e:
            read_error = e
            df = pd.read_csv(io.BytesIO(contents))
    except Exception as e2:
        raise HTTPException(status_code=400, detail=f"Could not read file as Excel or CSV: {read_error}; {e2}")

    # normalize columns to lowercase stripped names for easier mapping
    df.columns = [str(c).strip().lower() for c in df.columns]

    # Process and save leads without strict validation: missing columns become None
    success_count = 0
    errors = []
    duplicates = []

    # target fields we support (will be read if present)
    target_fields = [
        "contact_id","phone","first_name","last_name","title","company",
        "street","city","state","zip","web_site","annual_sales",
        "employee_count","sic_code","industry","recording"
    ]

    for idx, row in df.iterrows():
        try:
            lead_data = {}
            for field in target_fields:
                if field in df.columns:
                    val = row[field]
                    if pd.isna(val):
                        lead_data[field] = None
                    else:
                        lead_data[field] = str(val).strip()
                else:
                    lead_data[field] = None
            # Skip if phone already exists (treat as duplicate)
            phone_val = lead_data.get('phone')
            if phone_val:
                existing = db.query(models.Lead).filter(models.Lead.phone == phone_val).first()
                if existing:
                    duplicates.append(f"Row {idx+2}: duplicate phone={phone_val}")
                    continue

            # create model instance directly (bypass strict pydantic validation for uploads)
            db_lead = models.Lead(**lead_data)
            db.add(db_lead)
            try:
                db.commit()
                db.refresh(db_lead)
                success_count += 1
            except IntegrityError as ie:
                db.rollback()
                errors.append(f"Row {idx+2}: Integrity error - {str(ie)}")
            except Exception as e:
                db.rollback()
                errors.append(f"Row {idx+2}: {str(e)}")
        except Exception as e:
            errors.append(f"Row {idx+2}: {str(e)}")
    
    response = {
        "message": "Upload processed",
        "total_rows": len(df),
        "success_count": success_count,
        "error_count": len(errors),
        "duplicate_count": len(duplicates)
    }

    if errors:
        response["errors"] = errors[:20]
    # If nothing was processed, return some debug info to help identify column/name mismatches
    if success_count == 0 and os.getenv("DEBUG", False):
        response["columns"] = list(df.columns)
        response["sample_rows"] = df.head(3).to_dict(orient="records")
        # include up to 3 sample rows
        #try:
        #    response["sample_rows"] = df.head(3).to_dict(orient="records")
        #except Exception:
        #    response["sample_rows"] = []

    if duplicates:
        response["duplicates"] = duplicates[:50]

    return response


@router.get("/leads", response_model=List[schemas.LeadOut])
async def list_leads(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.require_admin)):
    leads = db.query(models.Lead).all()
    return leads


@router.get("/leads/export")
async def export_leads(format: str = 'csv', db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.require_admin)):
    """Export leads as CSV or Excel. Set ?format=csv or ?format=xlsx"""
    leads = db.query(models.Lead).all()
    # Convert to DataFrame
    rows = []
    for l in leads:
        rows.append({
            'id': l.id,
            'contact_id': l.contact_id,
            'phone': l.phone,
            'first_name': l.first_name,
            'last_name': l.last_name,
            'title': l.title,
            'company': l.company,
            'street': l.street,
            'city': l.city,
            'state': l.state,
            'zip': l.zip,
            'web_site': l.web_site,
            'annual_sales': l.annual_sales,
            'employee_count': l.employee_count,
            'sic_code': l.sic_code,
            'industry': l.industry,
            'recording': l.recording,
            'is_submitted': l.is_submitted,
            'created_at': l.created_at,
            'updated_at': l.updated_at,
        })

    df = pd.DataFrame(rows)

    if format == 'xlsx':
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
        output.seek(0)
        return StreamingResponse(output, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers={"Content-Disposition": "attachment; filename=leads.xlsx"})
    else:
        # default CSV
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        return StreamingResponse(io.BytesIO(output.getvalue().encode('utf-8')), media_type='text/csv', headers={"Content-Disposition": "attachment; filename=leads.csv"})


class DeleteLeadsRequest(BaseModel):
    ids: List[int]


@router.post("/leads/delete")
async def delete_leads(req: DeleteLeadsRequest, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.require_admin)):
    ids = req.ids or []
    if not ids:
        raise HTTPException(status_code=400, detail="No ids provided")

    deleted = 0
    for lid in ids:
        lead = db.query(models.Lead).filter(models.Lead.id == lid).first()
        if lead:
            db.delete(lead)
            deleted += 1

    db.commit()
    return {"deleted": deleted}


@router.get('/leads/submissions')
async def list_submissions(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.require_admin)):
    subs = db.query(models.LeadSubmission).order_by(models.LeadSubmission.submitted_at.desc()).all()
    # return structured list
    out = []
    import json
    for s in subs:
        try:
            details = json.loads(s.details) if s.details else None
        except Exception:
            details = s.details
        out.append({
            'id': s.id,
            'lead_id': s.lead_id,
            'user_id': s.user_id,
            'submitted_at': s.submitted_at,
            'details': details
        })
    return out


@router.get('/leads/submissions/export')
async def export_submissions(format: str = 'csv', db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.require_admin)):
    subs = db.query(models.LeadSubmission).order_by(models.LeadSubmission.submitted_at.desc()).all()
    rows = []
    import json
    for s in subs:
        try:
            details = json.loads(s.details) if s.details else {}
        except Exception:
            details = {}
        rows.append({
            'submission_id': s.id,
            'lead_id': s.lead_id,
            'user_id': s.user_id,
            'submitted_at': s.submitted_at,
            'lead_contact_id': details.get('contact_id'),
            'lead_phone': details.get('phone'),
            'lead_first_name': details.get('first_name'),
            'lead_last_name': details.get('last_name'),
            'submitted_by_email': details.get('submitted_by', {}).get('email') if details else None
        })

    df = pd.DataFrame(rows)
    if format == 'xlsx':
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
        output.seek(0)
        return StreamingResponse(output, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers={"Content-Disposition": "attachment; filename=submissions.xlsx"})
    else:
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        return StreamingResponse(io.BytesIO(output.getvalue().encode('utf-8')), media_type='text/csv', headers={"Content-Disposition": "attachment; filename=submissions.csv"})

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

@router.post("/leads/{lead_id}/submit", response_model=schemas.LeadOut)
async def submit_lead(
    lead_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Toggle the submission status of a lead"""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    # Toggle
    lead.is_submitted = not lead.is_submitted

    # If being marked submitted, create a submission record
    if lead.is_submitted:
        try:
            # create a JSON/text snapshot of relevant lead data and user info
            snapshot = {
                'lead_id': lead.id,
                'contact_id': lead.contact_id,
                'phone': lead.phone,
                'first_name': lead.first_name,
                'last_name': lead.last_name,
                'company': lead.company,
                'title': lead.title,
                'submitted_by': {
                    'id': current_user.id,
                    'email': current_user.email,
                    'first_name': current_user.first_name,
                    'last_name': current_user.last_name,
                }
            }
            import json
            submission = models.LeadSubmission(
                lead_id=lead.id,
                user_id=current_user.id,
                details=json.dumps(snapshot)
            )
            db.add(submission)
        except Exception:
            # don't block submission toggle on snapshot errors
            pass

    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead
