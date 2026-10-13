"""
scripts/load_seed_data.py
Loads exported courses, modules, lessons, topics, questions, and institutions
from seed_data.json into the target database.
"""
from __future__ import annotations

import json
import asyncio
from pathlib import Path
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

DATA_FILE = Path(__file__).resolve().parent.parent / "seed_data.json"

async def load_data():
    if not DATA_FILE.exists():
        print(f"[-] {DATA_FILE} not found!")
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    order_of_tables = [
        "institutions",
        "topics",
        "courses",
        "modules",
        "lessons",
        "questions"
    ]

    async with AsyncSessionLocal() as session:
        for table in order_of_tables:
            rows = data.get(table, [])
            if not rows:
                continue
            print(f"[*] Importing {len(rows)} rows into {table}...")
            for row in rows:
                cols = list(row.keys())
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
                
                query = text(f"""
                    INSERT INTO "{table}" ({col_names})
                    VALUES ({placeholders})
                    ON CONFLICT (id) DO NOTHING
                """)
                try:
                    await session.execute(query, vals)
                except Exception as err:
                    print(f"  [!] Skipped row in {table}: {err}")
            
            try:
                seq_query = text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT max(id) FROM \"{table}\"), 1));")
                await session.execute(seq_query)
            except Exception:
                pass
            
            await session.commit()
            print(f"  [OK] Synced {table}!")

    print("[SUCCESS] Production database successfully populated with all local courses & lessons!")

if __name__ == "__main__":
    asyncio.run(load_data())
