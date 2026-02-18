# Leads Management System - Excel Upload Feature

## Overview
The system has been updated to handle Excel (.xlsx) file uploads with strict validation for lead data.

## Changes Made

### 1. Database Schema Update
The Lead model now includes all required fields from your Excel format:

**Required Fields (cannot be NULL or empty):**
- `contact_id` - Unique identifier
- `phone` - Primary search field (indexed)
- `first_name`
- `last_name`
- `title`
- `company`
- `street`
- `city`
- `state`
- `zip`
- `sic_code`
- `recording`

**Optional Fields (can be NULL):**
- `web_site`
- `annual_sales`
- `employee_count`
- `industry`

### 2. Upload Endpoint Features

**Endpoint:** `POST /api/leads/upload`
**Authentication:** Admin only
**File Type:** .xlsx only

**Strict Validation:**
1. ✅ Only accepts `.xlsx` files (rejects CSV, XLS, etc.)
2. ✅ Validates all required columns are present
3. ✅ Rejects files with extra/unexpected columns
4. ✅ Checks for missing values in required columns
5. ✅ Checks for empty strings in required columns
6. ✅ Provides exact row numbers for any validation errors
7. ✅ Prevents duplicate entries (by contact_id or phone)
8. ✅ Handles NULL values properly for optional fields

**Response Format:**
```json
{
  "message": "Upload processed successfully",
  "total_rows": 100,
  "success_count": 95,
  "duplicate_count": 3,
  "error_count": 2,
  "duplicates": ["Row 5: contact_id=123, phone=555-1234", ...],
  "errors": ["Row 10: Invalid data", ...]
}
```

### 3. Search Endpoint

**Endpoint:** `GET /api/leads/search/{phone_number}`
**Authentication:** Any authenticated user (admin or agent)

Search for a lead by phone number and retrieve all associated data.

**Response:** Returns complete lead information including all fields.

### 4. Update Endpoint

**Endpoint:** `PUT /api/leads/{lead_id}`
**Authentication:** Any authenticated user (admin or agent)

Update any field of an existing lead.

## File Format Requirements

Your Excel file MUST have these exact column names (case-sensitive):

```
contact_id, phone, first_name, last_name, title, company, street, 
city, state, zip, sic_code, recording
```

Optional columns:
```
web_site, annual_sales, employee_count, industry
```

### Example Valid Data:
```
contact_id: 76030014
phone: 15058822424
first_name: Jim
last_name: Cravens
title: Owner
company: Gordos Gifts
street: 5818 Dunlin Dr
city: Las Cruces
state: NM
zip: 88013
web_site: NULL (or empty)
annual_sales: NULL (or empty)
employee_count: NULL (or empty)
sic_code: 5947
industry: NULL (or empty)
recording: 1
```

## Error Handling

The system will REJECT the entire upload if:
- File is not .xlsx format
- Any required column is missing
- Any unexpected column is present
- Any required field has NULL/empty values
- Any required field has empty strings (after trimming)

The system will SKIP individual rows if:
- Duplicate contact_id exists
- Duplicate phone number exists

## Testing

A sample Excel file has been created at:
`c:\Work\app\backend\sample_leads.xlsx`

You can use this to test the upload functionality.

## Installation

Required dependencies have been added:
- `openpyxl` - For reading Excel files

Run: `pip install -r requirements.txt`

## Database Migration

The database has been recreated with the new schema.
- All old lead data has been removed
 - Admin user: create securely (see below)

## API Usage Examples

### Upload Leads (Admin only)
```bash
curl -X POST "http://localhost:8000/api/leads/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@leads.xlsx"
```

### Search by Phone (Any user)
```bash
curl -X GET "http://localhost:8000/api/leads/search/15058822424" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Lead (Any user)
```bash
curl -X PUT "http://localhost:8000/api/leads/123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "CEO", "company": "New Company Name"}'
```

## Next Steps

1. Start the backend server:
   ```
   cd c:\Work\app\backend
   python -m uvicorn app.main:app --reload
   ```

2. Test the login with:
  - Create the admin user first. Do NOT store plaintext credentials in source.

    Option A — seed via script (recommended):

    Set environment variables and run the seeder from the `backend` folder:

    ```powershell
    $env:ADMIN_EMAIL='admin@yourdomain.com'
    $env:ADMIN_PASSWORD='StrongP@ssw0rd'
    python seed_db.py
    ```

    Option B — SQL insert (advanced):

    Hash the password using the application's `auth.get_password_hash()` helper, then run an INSERT like:

    ```sql
    INSERT INTO users (email, hashed_password, first_name, last_name, role, is_active)
    VALUES ('admin@yourdomain.com', '<BCRYPT_HASH_HERE>', 'Super', 'Admin', 'admin', 1);
    ```

    Replace `<BCRYPT_HASH_HERE>` with a bcrypt hash produced by the app or other trusted tool.

3. Upload your Excel file through the frontend or API

4. Search for leads by phone number

## Notes

- Phone is the primary search field (indexed for fast lookups)
- Contact_id must be unique across all leads
- Phone numbers must be unique across all leads
- NULL values in optional fields are stored as NULL in the database
- The system converts "NULL" strings to actual NULL values
