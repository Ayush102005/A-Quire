import psycopg2
conn = psycopg2.connect('postgresql://aquire:aquire@localhost:5432/aquire_db')
cursor = conn.cursor()

print("=== TOPICS ===")
cursor.execute("SELECT id, name, subject FROM topics ORDER BY id;")
for r in cursor.fetchall(): print(r)

print("\n=== COURSES (first 10) ===")
cursor.execute("SELECT id, title FROM courses ORDER BY id LIMIT 10;")
for r in cursor.fetchall(): print(r)

print("\n=== MODULES (first 10) ===")
cursor.execute("SELECT id, title, course_id FROM modules ORDER BY id LIMIT 10;")
for r in cursor.fetchall(): print(r)

print("\n=== LESSONS (first 10) ===")
cursor.execute("SELECT id, title, module_id FROM lessons ORDER BY id LIMIT 10;")
for r in cursor.fetchall(): print(r)
