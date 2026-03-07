path = 'frontend/src/data/roadmap.js'
with open(path, encoding='utf-8') as f:
    content = f.read()

before = content.count('\u00e2\u0080')
replacements = [
    ('\u00e2\u0080\u00a2', '\u2022'),
    ('\u00e2\u0080\u0094', '\u2014'),
    ('\u00e2\u0080\u0099', '\u2019'),
    ('\u00e2\u0080\u0098', '\u2018'),
    ('\u00e2\u0080\u009c', '\u201c'),
    ('\u00e2\u0080\u009d', '\u201d'),
]
for bad, good in replacements:
    content = content.replace(bad, good)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

after = content.count('\u00e2\u0080')
print(f'Fixed. Before: {before} mojibake sequences, After: {after} remaining')
