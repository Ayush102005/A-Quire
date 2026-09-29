"""
Seed additional topics for all courses in the DB.
Also seeds a few starter questions per topic.
Run once: python seed_topics.py
"""
import psycopg2, json

conn = psycopg2.connect('postgresql://aquire:aquire@localhost:5432/aquire_db')
cursor = conn.cursor()

# ------------------------------------------------------------------
# 1. Topics to seed (name, subject)
# ------------------------------------------------------------------
TOPICS = [
    # Physics / Mechanics
    ("Kinematics 1D",              "Physics"),   # already id=1, skip if exists
    ("Newton's Laws of Motion",    "Physics"),
    ("Work, Energy & Power",       "Physics"),
    ("Thermodynamics",             "Physics"),
    # Data Structures & Algorithms
    ("Arrays & Strings",           "DSA"),
    ("Linked Lists",               "DSA"),
    ("Trees & Graphs",             "DSA"),
    ("Sorting & Searching",        "DSA"),
    # Python / Machine Learning
    ("Python Fundamentals",        "Python"),
    ("NumPy & Pandas",             "Python"),
    ("Machine Learning Basics",    "ML"),
    ("Neural Networks",            "ML"),
    # Computer Science
    ("Intro to CS",                "CS"),
]

# Insert topics (skip existing by unique name constraint)
topic_ids = {}
for name, subject in TOPICS:
    cursor.execute(
        "INSERT INTO topics (name, subject) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING;",
        (name, subject)
    )
    cursor.execute("SELECT id FROM topics WHERE name = %s;", (name,))
    row = cursor.fetchone()
    if row:
        topic_ids[name] = row[0]

conn.commit()
print("Topics seeded:", topic_ids)

# ------------------------------------------------------------------
# 2. Seed starter questions for each new topic
# ------------------------------------------------------------------
STARTER_QUESTIONS = {
    "Newton's Laws of Motion": [
        {
            "content": "A 5 kg object experiences a net force of 20 N. What is its acceleration?",
            "options": {"A": "2 m/s²", "B": "4 m/s²", "C": "10 m/s²", "D": "100 m/s²"},
            "correct_option": "B",
            "difficulty_b": 0.0,
        },
        {
            "content": "According to Newton's Third Law, when you push a wall, the wall:",
            "options": {"A": "Does nothing", "B": "Pushes back with equal force", "C": "Pushes back with less force", "D": "Absorbs the force"},
            "correct_option": "B",
            "difficulty_b": -1.0,
        },
    ],
    "Work, Energy & Power": [
        {
            "content": "A 10 N force moves an object 5 m in the direction of the force. How much work is done?",
            "options": {"A": "2 J", "B": "15 J", "C": "50 J", "D": "500 J"},
            "correct_option": "C",
            "difficulty_b": -0.5,
        },
    ],
    "Thermodynamics": [
        {
            "content": "Which thermodynamic law states that energy cannot be created or destroyed?",
            "options": {"A": "Zeroth Law", "B": "First Law", "C": "Second Law", "D": "Third Law"},
            "correct_option": "B",
            "difficulty_b": -1.0,
        },
        {
            "content": "Entropy of an isolated system always:",
            "options": {"A": "Decreases", "B": "Stays constant", "C": "Increases or stays constant", "D": "Decreases then increases"},
            "correct_option": "C",
            "difficulty_b": 0.5,
        },
    ],
    "Arrays & Strings": [
        {
            "content": "What is the time complexity of accessing an element by index in an array?",
            "options": {"A": "O(n)", "B": "O(log n)", "C": "O(1)", "D": "O(n²)"},
            "correct_option": "C",
            "difficulty_b": -1.5,
        },
        {
            "content": "The Two Pointer technique is most useful for problems involving:",
            "options": {"A": "Trees", "B": "Sorted arrays or strings", "C": "Hash maps", "D": "Graphs"},
            "correct_option": "B",
            "difficulty_b": 0.0,
        },
        {
            "content": "What does the Sliding Window technique reduce compared to brute force?",
            "options": {"A": "Space complexity", "B": "Number of comparisons", "C": "Repeated work by reusing overlap", "D": "Recursion depth"},
            "correct_option": "C",
            "difficulty_b": 0.5,
        },
    ],
    "Linked Lists": [
        {
            "content": "What is the time complexity of inserting at the head of a singly linked list?",
            "options": {"A": "O(n)", "B": "O(log n)", "C": "O(1)", "D": "O(n²)"},
            "correct_option": "C",
            "difficulty_b": -1.0,
        },
        {
            "content": "Floyd's Cycle Detection algorithm uses:",
            "options": {"A": "A stack", "B": "A hash set", "C": "Two pointers at different speeds", "D": "Recursion only"},
            "correct_option": "C",
            "difficulty_b": 0.5,
        },
    ],
    "Trees & Graphs": [
        {
            "content": "In BFS, which data structure is used?",
            "options": {"A": "Stack", "B": "Queue", "C": "Heap", "D": "Array"},
            "correct_option": "B",
            "difficulty_b": -0.5,
        },
        {
            "content": "In DFS, which data structure is used (implicit or explicit)?",
            "options": {"A": "Queue", "B": "Heap", "C": "Stack", "D": "Linked List"},
            "correct_option": "C",
            "difficulty_b": -0.5,
        },
    ],
    "Python Fundamentals": [
        {
            "content": "Which of the following is mutable in Python?",
            "options": {"A": "tuple", "B": "str", "C": "list", "D": "frozenset"},
            "correct_option": "C",
            "difficulty_b": -1.0,
        },
    ],
    "NumPy & Pandas": [
        {
            "content": "What does np.zeros((3, 4)) create?",
            "options": {"A": "A 3-element array of zeros", "B": "A 4-element array of zeros", "C": "A 3×4 matrix of zeros", "D": "A 4×3 matrix of zeros"},
            "correct_option": "C",
            "difficulty_b": -0.5,
        },
    ],
    "Machine Learning Basics": [
        {
            "content": "Which algorithm is used for classification in supervised learning?",
            "options": {"A": "K-Means", "B": "Logistic Regression", "C": "PCA", "D": "DBSCAN"},
            "correct_option": "B",
            "difficulty_b": -0.5,
        },
    ],
    "Neural Networks": [
        {
            "content": "The activation function ReLU outputs:",
            "options": {"A": "Always between 0 and 1", "B": "Always negative", "C": "max(0, x)", "D": "min(0, x)"},
            "correct_option": "C",
            "difficulty_b": 0.0,
        },
    ],
    "Sorting & Searching": [
        {
            "content": "What is the average time complexity of Quick Sort?",
            "options": {"A": "O(n²)", "B": "O(n log n)", "C": "O(n)", "D": "O(log n)"},
            "correct_option": "B",
            "difficulty_b": 0.0,
        },
        {
            "content": "Binary Search requires the array to be:",
            "options": {"A": "Shuffled", "B": "Sorted", "C": "Reversed", "D": "Unique"},
            "correct_option": "B",
            "difficulty_b": -1.0,
        },
    ],
    "Intro to CS": [
        {
            "content": "Which data type stores True/False values in most programming languages?",
            "options": {"A": "int", "B": "string", "C": "boolean", "D": "float"},
            "correct_option": "C",
            "difficulty_b": -2.0,
        },
    ],
}

for topic_name, questions in STARTER_QUESTIONS.items():
    tid = topic_ids.get(topic_name)
    if not tid:
        print(f"  SKIP {topic_name} — no id found")
        continue
    for q in questions:
        cursor.execute("""
            INSERT INTO questions (topic_id, content, options, correct_option, difficulty_b, discrimination_a, guessing_c,
                                   response_count, correct_count, skip_count, avg_response_time_ms, is_flagged, is_provisional)
            VALUES (%s, %s, %s, %s, %s, 1.0, 0.25, 0, 0, 0, 0, FALSE, TRUE)
            ON CONFLICT DO NOTHING;
        """, (tid, q["content"], json.dumps(q["options"]), q["correct_option"], q["difficulty_b"]))

conn.commit()
print("\nDone! Questions seeded.")

cursor.execute("SELECT t.name, COUNT(q.id) as qcount FROM topics t LEFT JOIN questions q ON q.topic_id=t.id GROUP BY t.id, t.name ORDER BY t.id;")
print("\nFinal question counts per topic:")
for r in cursor.fetchall():
    print(f"  {r[0]}: {r[1]} questions")

conn.close()
