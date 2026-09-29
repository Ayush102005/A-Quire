import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PROBLEMS_DIR = os.path.join(ROOT, 'problems')

REQUIRED_FIELDS = [
    r"- \*\*Topic:\*\*",
    r"- \*\*Difficulty:\*\*",
    r"- \*\*LeetCode Link:\*\*",
]

OPTIONAL_FIELDS = [
    r"- \*\*YouTube Video:\*\*",
    r"- \*\*Article Link:\*\*",
]

md_files = []
for root, dirs, files in os.walk(PROBLEMS_DIR):
    for f in files:
        if f.lower().endswith('.md'):
            md_files.append(os.path.join(root, f))

missing_report = {}

for path in md_files:
    with open(path, 'r', encoding='utf-8') as fh:
        head_lines = []
        try:
            for _ in range(40):
                head_lines.append(next(fh))
        except StopIteration:
            pass
        head = ''.join(head_lines)
    missing = []
    for pat in REQUIRED_FIELDS:
        if not re.search(pat, head):
            missing.append(pat)
    if missing:
        missing_report[path] = missing

if not missing_report:
    print('All checked problem files include required fields (Topic, Difficulty, LeetCode Link).')
else:
    print('Files missing required metadata:')
    for p, missing in missing_report.items():
        rel = os.path.relpath(p, ROOT)
        friendly = [m.replace('\\', '') for m in missing]
        print(f'- {rel}')
        for m in missing:
            print(f'  - missing: {m}')

# Exit code 0 even if missing to avoid CI hard-fail; adjust as needed.
