import psycopg2, json
conn = psycopg2.connect('postgresql://aquire:aquire@localhost:5432/aquire_db')
cursor = conn.cursor()
cursor.execute("SELECT id, content, options FROM questions ORDER BY id DESC LIMIT 5;")
rows = cursor.fetchall()
for r in rows:
    print(f"id={r[0]}, options_type={type(r[2])}, options={r[2]}")
    print(f"  content: {r[1][:80]}")
