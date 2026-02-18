import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'leads_platform.db')

def ensure_column(table, column, column_def):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(f"PRAGMA table_info({table})")
    cols = [row[1] for row in cur.fetchall()]
    if column in cols:
        print(f"Column '{column}' already exists on '{table}'.")
        conn.close()
        return

    print(f"Adding column '{column}' to '{table}'...")
    cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {column_def}")
    conn.commit()
    conn.close()
    print("Done.")

if __name__ == '__main__':
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}. If you want a fresh DB, start the app to create one.")
    else:
        ensure_column('leads', 'is_submitted', 'INTEGER DEFAULT 0')
