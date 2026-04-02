import os
import re

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import date, datetime, timedelta
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
    Properly handles mixed data types and empty rows.
    """
    contents = await file.read()

    # Try reading as Excel first; if that fails, try CSV.
    df = None
    read_error = None
    try:
        # Try reading Excel
        try:
            # Read all sheets and preserve data types as much as possible
            xls = pd.read_excel(io.BytesIO(contents), sheet_name=None, dtype=str)
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
            # Try CSV with string dtype to avoid float conversion
            df = pd.read_csv(io.BytesIO(contents), dtype=str, keep_default_na=False)
    except Exception as e2:
        raise HTTPException(status_code=400, detail=f"Could not read file as Excel or CSV: {read_error}; {e2}")

    # Normalize columns to lowercase stripped names
    df.columns = [str(c).strip().lower() for c in df.columns]

    # Clean the data: replace empty strings with None and handle NaN/empty values
    df = df.replace({pd.NA: None, float('nan'): None, 'nan': None, '': None})
    
    # For any numeric columns that got converted, remove .0 if present
    # Phone column is our primary concern
    target_fields = [
        "contact_id","phone","first_name","last_name","title","company",
        "street","city","state","zip","web_site","annual_sales",
        "employee_count","sic_code","industry","recording"
    ]
    
    # Clean each field to handle float conversion properly
    for field in target_fields:
        if field in df.columns:
            # Convert to string, handle None, and remove .0 suffix
            def clean_value(val):
                if val is None or pd.isna(val):
                    return None
                str_val = str(val).strip()
                # Remove .0 if it's at the end (from float conversion)
                if str_val.endswith('.0'):
                    str_val = str_val[:-2]
                # Return None if empty after cleaning
                return str_val if str_val else None
            
            df[field] = df[field].apply(clean_value)

    # Phone pattern: NXXNXXXXXX or +1NXXNXXXXXX (N = digit 2-9)
    PHONE_PATTERN = re.compile(r'^\+?1?[2-9]\d{2}[2-9]\d{6}$')

    # Process and save leads
    success_count = 0
    errors = []
    duplicates = []
    skipped = []

    for idx, row in df.iterrows():
        try:
            lead_data = {}
            for field in target_fields:
                lead_data[field] = row.get(field) if field in df.columns else None

            # ── Guard 1: skip completely empty rows ──────────────────────
            # Check if all fields are None or empty
            non_empty_fields = [v for v in lead_data.values() if v is not None and str(v).strip()]
            if not non_empty_fields:
                skipped.append(f"Row {idx+2}: empty row skipped")
                continue

            # ── Guard 2: validate phone number pattern ───────────────────
            phone_val = lead_data.get('phone')
            if phone_val is None or not str(phone_val).strip():
                errors.append(f"Row {idx+2}: Cannot save this Lead — phone number is missing")
                continue
            
            # Clean phone number (remove spaces, dashes, parentheses)
            phone_clean = re.sub(r'[\s\-\(\)]', '', str(phone_val))
            
            # Validate phone pattern
            if not PHONE_PATTERN.match(phone_clean):
                errors.append(
                    f"Row {idx+2}: Cannot save this Lead (contact_id={lead_data.get('contact_id') or 'N/A'}) — "
                    f"phone '{phone_val}' does not match required format NXXNXXXXXX or +1NXXNXXXXXX "
                    f"(first digit and 4th digit must each be 2-9)"
                )
                continue

            # ── Guard 3: skip duplicate phone ────────────────────────────
            existing = db.query(models.Lead).filter(models.Lead.phone == phone_clean).first()
            if existing:
                duplicates.append(f"Row {idx+2}: duplicate phone={phone_val}")
                continue

            # Create model instance
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
        "skipped_count": len(skipped),
        "duplicate_count": len(duplicates)
    }

    if errors:
        response["errors"] = errors[:50]
    if skipped:
        response["skipped"] = skipped[:50]
    if duplicates:
        response["duplicates"] = duplicates[:50]

    # Debug info if needed
    if success_count == 0 and os.getenv("DEBUG", False):
        response["columns"] = list(df.columns)
        response["sample_rows"] = df.head(3).to_dict(orient="records")

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
async def list_submissions(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_admin),
    agent_name: Optional[str] = Query(None, description="Filter by agent name (partial match)"),
    date_from: Optional[date] = Query(None, description="Filter submissions on or after this date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Filter submissions on or before this date (YYYY-MM-DD)"),
):
    import json

    query = db.query(models.LeadSubmission)

    # ── Date filters (applied at the DB level) ───────────────────────────────
    if date_from:
        dt_from = datetime.combine(date_from, datetime.min.time())
        query = query.filter(models.LeadSubmission.submitted_at >= dt_from)
    if date_to:
        dt_to = datetime.combine(date_to + timedelta(days=1), datetime.min.time())
        query = query.filter(models.LeadSubmission.submitted_at < dt_to)

    subs = query.order_by(models.LeadSubmission.submitted_at.desc()).all()

    out = []
    for s in subs:
        try:
            details = json.loads(s.details) if s.details else None
        except Exception:
            details = s.details

        # ── Agent name filter (applied after JSON parse) ─────────────────────
        if agent_name:
            # 1) agent_name field stored directly in snapshot
            name_in_details = ''
            if isinstance(details, dict):
                name_in_details = (details.get('agent_name') or '').strip()

            # 2) submitted_by block inside snapshot
            sby_name = ''
            if isinstance(details, dict):
                sby = details.get('submitted_by') or {}
                sby_first = (sby.get('first_name') or '').strip()
                sby_last  = (sby.get('last_name')  or '').strip()
                sby_name  = f"{sby_first} {sby_last}".strip()

            # 3) Live User row — ultimate fallback for old records
            live_name = ''
            if s.user_id:
                live_user = db.query(models.User).filter(models.User.id == s.user_id).first()
                if live_user:
                    lf = (live_user.first_name or '').strip()
                    ll = (live_user.last_name  or '').strip()
                    live_name = f"{lf} {ll}".strip()

            # Combine all sources, normalise whitespace, case-insensitive match
            combined_parts = ' '.join(filter(None, [name_in_details, sby_name, live_name]))
            combined = ' '.join(combined_parts.lower().split())   # collapse spaces
            needle   = ' '.join(agent_name.lower().split())       # collapse spaces in query too
            if needle not in combined:
                continue

        # Always pull the live phone from the Lead table so old snapshots show phone correctly
        lead = db.query(models.Lead).filter(models.Lead.id == s.lead_id).first()
        out.append({
            'id': s.id,
            'lead_id': s.lead_id,
            'user_id': s.user_id,
            'submitted_at': s.submitted_at,
            'details': details,
            'lead_phone': lead.phone if lead else None,
            'api_status_code': s.api_status_code,
            'api_response': s.api_response,
        })
    return out


@router.delete('/leads/submissions/{submission_id}')
async def delete_submission(
    submission_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    """
    Delete a submission record and unlock the lead so an agent can resubmit it.
    Admin only.
    """
    submission = db.query(models.LeadSubmission).filter(models.LeadSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    lead_id = submission.lead_id

    # Remove the submission record
    db.delete(submission)

    # Reset the lead's submitted flag so agents can resubmit
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if lead:
        lead.is_submitted = False
        db.add(lead)

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(exc)}")

    return {"message": "Submission deleted and lead unlocked for resubmission", "submission_id": submission_id, "lead_id": lead_id}


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


@router.get("/leads/{lead_id}", response_model=schemas.LeadOut)
async def get_lead_by_id(
    lead_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    """Get a single lead by ID — admin only (used by submissions Lead Details modal)"""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
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


# ---------------------------------------------------------------------------
# External API configuration
# Replace EXTERNAL_API_URL with the real production endpoint when ready.
# ---------------------------------------------------------------------------
EXTERNAL_API_URL = "https://httpbin.org/post"


@router.post("/leads/{lead_id}/submit", response_model=schemas.LeadOut)
async def submit_lead(
    lead_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Submit a lead to the external sales API.

    Rules:
    - If the lead is already submitted (by anyone), return 409 – locked for everyone.
    - Build the form-encoded payload from the lead's current data.
    - POST to EXTERNAL_API_URL.
    - Only mark the lead as submitted if the API returns a 2xx status.
    - On failure the lead stays unlocked and the error is surfaced to the agent.
    """
    import json
    import requests as ext_requests

    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # ── Guard: already submitted by someone ──────────────────────────────────
    if lead.is_submitted:
        raise HTTPException(
            status_code=409,
            detail="This lead has already been submitted and is locked."
        )

    # ── Build the form payload ───────────────────────────────────────────────
    agent_name = f"{current_user.first_name} {current_user.last_name}".strip()

    payload = {
        "title":          lead.title          or "",
        "first_name":     lead.first_name     or "",
        "last_name":      lead.last_name      or "",
        "company":        lead.company        or "",
        "phone1":         lead.phone          or "",
        "street":         lead.street         or "",
        "city":           lead.city           or "",
        "state":          lead.state          or "",
        "zip":            lead.zip            or "",
        "web_site":       lead.web_site       or "",
        "annual_sales":   lead.annual_sales   or "",
        "employee_count": lead.employee_count or "",
        "industry":       lead.industry       or "",
        "sic_code":       lead.sic_code       or "",
        "disposition":    "Warm Transfer",          # constant – never changes
        "agent_name":     agent_name,
    }

    # ── Validate required fields before hitting the API ──────────────────────
    required = {
        "first_name": payload["first_name"],
        "last_name":  payload["last_name"],
        "company":    payload["company"],
        "phone1":     payload["phone1"],
        "street":     payload["street"],
        "city":       payload["city"],
        "state":      payload["state"],
        "zip":        payload["zip"],
        "agent_name": payload["agent_name"],
    }
    missing = [k for k, v in required.items() if not v]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required fields: {', '.join(missing)}"
        )

    # ── Call the external API ────────────────────────────────────────────────
    api_status_code = None
    api_response_text = None
    try:
        resp = ext_requests.post(
            EXTERNAL_API_URL,
            data=payload,                                     # form-encoded
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
        api_status_code = resp.status_code
        api_response_text = resp.text

        if not resp.ok:                                       # non-2xx → fail
            raise HTTPException(
                status_code=502,
                detail=f"External API returned {resp.status_code}: {resp.text[:300]}"
            )

    except HTTPException:
        raise                                                 # re-raise our 502
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to reach the external API: {str(exc)}"
        )

    # ── API succeeded → lock the lead and record the submission ──────────────
    lead.is_submitted = True
    db.add(lead)

    # Rich snapshot stored in lead_submissions for the Submissions report
    snapshot = {
        "lead_id":    lead.id,
        "contact_id": lead.contact_id,
        "phone1":     lead.phone,
        "first_name": lead.first_name,
        "last_name":  lead.last_name,
        "company":    lead.company,
        "title":      lead.title,
        "street":     lead.street,
        "city":       lead.city,
        "state":      lead.state,
        "zip":        lead.zip,
        "web_site":   lead.web_site,
        "annual_sales":   lead.annual_sales,
        "employee_count": lead.employee_count,
        "industry":   lead.industry,
        "sic_code":   lead.sic_code,
        "disposition": "Warm Transfer",
        "agent_name": agent_name,
        "submitted_by": {
            "id":         current_user.id,
            "email":      current_user.email,
            "first_name": current_user.first_name,
            "last_name":  current_user.last_name,
        },
    }

    submission = models.LeadSubmission(
        lead_id=lead.id,
        user_id=current_user.id,
        details=json.dumps(snapshot),
        api_status_code=api_status_code,
        api_response=api_response_text,
    )
    db.add(submission)

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(exc)}")

    db.refresh(lead)
    return lead

