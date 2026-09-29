import fs from 'fs';
import path from 'path';

const root = path.resolve('d:/A-Quire');
const problemsDir = path.join(root, 'problems');
const outputDir = path.join(root, 'Frontend', 'src', 'content');
const outputPath = path.join(outputDir, 'dsaProblems.json');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseProblemFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const titleLine = lines.find(line => line.startsWith('# ')) || '';
  const title = titleLine.replace(/^# /, '').trim();
  const metadata = {};

  for (const line of lines) {
    const metaMatch = line.match(/^\s*- \*\*(.+?)\*\*:\s*(.+)$/);
    if (metaMatch) {
      const key = metaMatch[1].trim();
      const value = metaMatch[2].trim();
      metadata[key] = value;
    }
  }

  const statementStart = lines.findIndex(line => line.trim().toLowerCase() === '## problem statement');
  let statement = '';
  if (statementStart !== -1) {
    const block = [];
    for (let i = statementStart + 1; i < lines.length; i += 1) {
      if (/^##\s+/.test(lines[i]) || /^---/.test(lines[i])) break;
      block.push(lines[i]);
    }
    statement = block.join('\n').trim();
  }

  const examples = [];
  let examplesStart = lines.findIndex(line => /^\s*###?\s*Example/i.test(line));
  if (examplesStart !== -1) {
    let current = { input: '', output: '', explanation: '' };
    for (let i = examplesStart + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (/^\s*###?\s*Example/i.test(line)) {
        if (current.input || current.output || current.explanation) {
          examples.push(current);
          current = { input: '', output: '', explanation: '' };
        }
        continue;
      }
      if (/^\s*-\s*\*\*Input\*\*/i.test(line) || /^\s*Input\s*:/i.test(line)) {
        current.input = line.replace(/^\s*-\s*\*\*Input\*\*:\s*/i, '').replace(/^\s*Input\s*:\s*/i, '').trim();
      } else if (/^\s*Output\s*:/i.test(line)) {
        current.output = line.replace(/^\s*Output\s*:\s*/i, '').trim();
      } else if (/^\s*-\s*\*\*Explanation\*\*/i.test(line) || /^\s*Explanation\s*:/i.test(line)) {
        current.explanation = line.replace(/^\s*-\s*\*\*Explanation\*\*:\s*/i, '').replace(/^\s*Explanation\s*:\s*/i, '').trim();
      } else if (/^\s*```/.test(line)) {
        // ignore code fences
      } else if (line.trim()) {
        if (current.explanation) {
          current.explanation += ' ' + line.trim();
        }
      }
    }
    if (current.input || current.output || current.explanation) {
      examples.push(current);
    }
  }

  const relativePath = path.relative(problemsDir, filePath).split(path.sep);
  const category = relativePath.length > 1 ? relativePath[0] : 'General';

  return {
    id: slugify(path.relative(problemsDir, filePath)),
    slug: slugify(path.basename(filePath, path.extname(filePath))),
    category,
    title: title || path.basename(filePath, path.extname(filePath)),
    topic: metadata.Topic || category,
    difficulty: metadata.Difficulty || 'Medium',
    leetcodeLink: metadata['LeetCode Link'] || '',
    tufLink: metadata['TUF+ Link'] || '',
    youtubeVideo: metadata['YouTube Video'] || '',
    articleLink: metadata['Article Link'] || '',
    statement,
    examples,
  };
}

function collectProblemFiles(dir) {
  const results = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const itemPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...collectProblemFiles(itemPath));
    } else if (item.isFile() && item.name.endsWith('.md')) {
      results.push(itemPath);
    }
  }
  return results;
}

const files = collectProblemFiles(problemsDir);
const problems = files.map(parseProblemFile);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(problems, null, 2), 'utf8');
console.log(`Wrote ${problems.length} problems to ${outputPath}`);
