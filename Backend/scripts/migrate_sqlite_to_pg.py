"""
scripts/migrate_sqlite_to_pg.py
Exports courses, modules, lessons, topics, quizzes, and questions
from local.db (SQLite) into the target PostgreSQL database.
"""
import sqlite3
import json
import asyncio
from pathlib import Path
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

LOCAL_DB = Path(__file__).resolve().parent.parent / "local.db"

TABLES_TO_MIGRATE = [
    "institutions",
    "topics",
    "courses",
    "modules",
    "lessons",
    "quizzes",
    "questions",
    "quiz_questions",
    "student_notes"
]

def get_sqlite_data():
    if not LOCAL_DB.exists():
        print(f"[-] {LOCAL_DB} not found!")
        return {}
    
    con = sqlite3.connect(LOCAL_DB)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    
    # Check which tables exist in SQLite
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    existing_tables = set(r[0] for r in cur.fetchall())
    
    data = {}
    for table in TABLES_TO_MIGRATE:
        if table in existing_tables:
            cur.execute(f'SELECT * FROM "{table}"')
            rows = [dict(r) for r in cur.fetchall()]
            data[table] = rows
            print(f"[+] Loaded {len(rows)} rows from {table}")
        else:
            print(f"[-] Table {table} does not exist in SQLite")
    con.close()
    return data

async def migrate():
    data = get_sqlite_data()
    if not data:
        print("[-] No data found to migrate.")
        return

    async with AsyncSessionLocal() as session:
        for table, rows in data.items():
            if not rows:
                continue
            print(f"[*] Migrating {len(rows)} rows into {table}...")
            for row in rows:
                cols = list(row.keys())
                # Handle json fields if stored as string
                vals = {}
                for k, v in row.items():
                    if isinstance(v, str) and (v.startswith("[") or v.startswith("{")):
                        try:
                            vals[k] = json.loads(v)
                        except Exception:
                            vals[k] = v
                    else:
                        vals[k] = v
                
                placeholders = ", ".join(f":{k}" for k in cols)
                col_names = ", ".join(f'"{k}"' for k in cols)
                
                # PostgreSQL ON CONFLICT DO NOTHING
                query = text(f"""
                    INSERT INTO "{table}" ({col_names})
                    VALUES ({placeholders})
                    ON CONFLICT (id) DO NOTHING
                """)
                try:
                    await session.execute(query, vals)
                except Exception as err:
                    print(f"  [!] Skipped row {row.get('id')} in {table}: {err}")
            
            # Reset sequence if table has id
            try:
                seq_query = text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(max(id), 1)) FROM \"{table}\";")
                await session.execute(seq_query)
            except Exception:
                pass
            
            await session.commit()
            print(f"  [OK] Successfully synced {table}!")

    print("[SUCCESS] Local SQLite data successfully migrated to PostgreSQL!")

if __name__ == "__main__":
    asyncio.run(migrate())
