"""
One-shot migration: adds api_status_code (INTEGER) and api_response (TEXT)
columns to the lead_submissions table if they don't already exist.

Run once from the backend/ directory:
    python migrate_submission_columns.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "app", "leads_platform.db")

def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())

def main():
    print(f"Connecting to: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    added = []

    if not column_exists(cur, "lead_submissions", "api_status_code"):
        cur.execute("ALTER TABLE lead_submissions ADD COLUMN api_status_code INTEGER")
        added.append("api_status_code")

    if not column_exists(cur, "lead_submissions", "api_response"):
        cur.execute("ALTER TABLE lead_submissions ADD COLUMN api_response TEXT")
        added.append("api_response")

    if added:
        conn.commit()
        print(f"✅  Added columns: {', '.join(added)}")
    else:
        print("✅  All columns already exist – nothing to do.")

    conn.close()

if __name__ == "__main__":
    main()
