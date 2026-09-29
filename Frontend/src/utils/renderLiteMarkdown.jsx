import React from 'react';

/**
 * renderLiteMarkdown.jsx
 * =======================
 * Renders **bold**, bullet lists (-/*), numbered lists (1.), #/##/###
 * headings, and ```fenced code blocks``` as real React elements — no
 * dangerouslySetInnerHTML, so there's no HTML-injection surface. Not a full
 * markdown parser (no links, tables, nested blockquotes, etc.) — this
 * covers what actually shows up in AI mentor hints (bold + lists +
 * paragraphs) and instructor-authored DSA lesson content (headings + code
 * blocks on top of that, e.g. problem_statement/approaches/code_solutions
 * — see DsaProblemPage.tsx), without pulling in react-markdown for it.
 */

// Exported separately for contexts that need a single inline flow of
// content (e.g. a line-clamped preview in a notification list) rather than
// full block structure — **bold** and `code` still render, list/paragraph
// breaks don't apply since block elements can't nest inside a <p>.
export function renderInline(text, keyPrefix) {
  // Split on **bold** OR `inline code` — handles both in one pass.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter((p) => p.length > 0);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={`${keyPrefix}-${i}`}
          className="bg-[var(--surface-2)] border border-[var(--border)] rounded px-1 py-0.5 text-[0.8em] font-mono text-teal-500 dark:text-teal-400"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
}

const HEADING_CLASSES = {
  1: 'text-xl font-bold mt-4 mb-2',
  2: 'text-lg font-bold mt-4 mb-2',
  3: 'text-base font-bold mt-3 mb-1.5',
  // #### / ##### / ###### — used in problem descriptions for sub-sections
  4: 'text-sm font-semibold mt-3 mb-1 text-[var(--text)]',
  5: 'text-xs font-semibold mt-2 mb-1 text-[var(--text)]',
  6: 'text-xs font-semibold mt-2 mb-1 text-[var(--text-muted)]',
};

export function renderLiteMarkdown(text) {
  if (!text) return null;

  const blocks = [];
  let listItems = null;
  let listOrdered = false;
  // Fenced code blocks (```lang ... ```) span multiple lines, so this needs
  // to track state across the split('\n') loop rather than match per-line
  // like everything else here.
  let codeLines = null;

  const flushList = () => {
    if (listItems && listItems.length) {
      const Tag = listOrdered ? 'ol' : 'ul';
      blocks.push(
        <Tag
          key={`list-${blocks.length}`}
          className={listOrdered ? 'list-decimal pl-5 space-y-1' : 'list-disc pl-5 space-y-1'}
        >
          {listItems}
        </Tag>
      );
    }
    listItems = null;
  };

  const lines = text.split('\n');
  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    if (codeLines !== null) {
      if (line.startsWith('```')) {
        blocks.push(
          <pre key={`code-${idx}`} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-3 overflow-x-auto text-xs my-2">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = null;
      } else {
        codeLines.push(rawLine);
      }
      return;
    }

    if (line.startsWith('```')) {
      flushList();
      codeLines = [];
      return;
    }

    if (!line) {
      flushList();
      return;
    }

    // Match up to 6 heading levels (was capped at 3, missing #### in problems)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      flushList();
      const level = Math.min(headingMatch[1].length, 6);
      blocks.push(
        <p key={`h-${idx}`} className={HEADING_CLASSES[level]}>
          {renderInline(headingMatch[2], `h-${idx}`)}
        </p>
      );
      return;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)/);
    const numberedMatch = line.match(/^\d+\.\s+(.*)/);

    if (bulletMatch || numberedMatch) {
      const isOrdered = !!numberedMatch;
      if (listItems && listOrdered !== isOrdered) flushList();
      listOrdered = isOrdered;
      if (!listItems) listItems = [];
      listItems.push(
        <li key={`li-${idx}`}>{renderInline((bulletMatch || numberedMatch)[1], `li-${idx}`)}</li>
      );
      return;
    }

    flushList();
    blocks.push(<p key={`p-${idx}`}>{renderInline(line, `p-${idx}`)}</p>);
  });
  flushList();
  // An unterminated fence (no closing ```) still renders what was
  // collected rather than silently dropping it.
  if (codeLines !== null && codeLines.length) {
    blocks.push(
      <pre key="code-eof" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-3 overflow-x-auto text-xs my-2">
        <code>{codeLines.join('\n')}</code>
      </pre>
    );
  }

  return blocks;
}
