import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test, describe } from 'vitest';
import { renderLiteMarkdown, renderInline } from '../utils/renderLiteMarkdown';

function Harness({ text }) {
  return <div>{renderLiteMarkdown(text)}</div>;
}

describe('renderLiteMarkdown', () => {
  test('renders bold, bullet, and numbered lists (pre-existing behavior)', () => {
    render(<Harness text={'**bold text**\n\n- item one\n- item two\n\n1. first\n2. second'} />);
    expect(screen.getByText('bold text').tagName).toBe('STRONG');
    expect(screen.getByText('item one').closest('ul')).toBeTruthy();
    expect(screen.getByText('first').closest('ol')).toBeTruthy();
  });

  test('renders #/##/### headings instead of showing literal "#" characters', () => {
    render(<Harness text={'# H1\n## H2\n### H3\nplain paragraph'} />);
    expect(screen.getByText('H1')).toBeTruthy();
    expect(screen.getByText('H2')).toBeTruthy();
    expect(screen.getByText('H3')).toBeTruthy();
    // The literal marker characters must not appear anywhere in the output —
    // this is exactly the bug reported: raw "##"/"```cpp" showing as text.
    expect(screen.queryByText(/#{1,3}\s*H1/)).toBeNull();
  });

  test('renders a fenced code block as <pre><code>, not literal backtick text', () => {
    const text = '## C++ Solution\n\n```cpp\nclass Solution {\npublic:\n};\n```\n\nDone.';
    const { container } = render(<Harness text={text} />);
    const pre = container.querySelector('pre code');
    expect(pre).toBeTruthy();
    expect(pre.textContent).toContain('class Solution {');
    expect(pre.textContent).toContain('public:');
    // The fence markers and language tag are consumed, not printed literally.
    expect(container.textContent).not.toMatch(/```cpp/);
    expect(screen.getByText('Done.')).toBeTruthy();
  });

  test('preserves blank lines and other markdown-looking text inside a code fence verbatim', () => {
    const text = '```python\ndef f():\n    pass\n\n# not a heading, this is a comment\n```';
    const { container } = render(<Harness text={text} />);
    const pre = container.querySelector('pre code');
    expect(pre.textContent).toBe('def f():\n    pass\n\n# not a heading, this is a comment');
  });

  test('an unterminated fence still renders its content instead of dropping it', () => {
    const text = '```js\nconsole.log(1);';
    const { container } = render(<Harness text={text} />);
    const pre = container.querySelector('pre code');
    expect(pre).toBeTruthy();
    expect(pre.textContent).toBe('console.log(1);');
  });

  test('the actual reported repro — a DSA problem description with headings and a code block', () => {
    const text = [
      'Given an array of integers nums and an integer target...',
      '',
      'Approaches:',
      '# Approach: Hash Map',
      '',
      'Store each number and its index in a hash map.',
      '',
      '## C++ Solution',
      '',
      '```cpp',
      'class Solution {',
      'public:',
      '    vector<int> twoSum(vector<int>& nums, int target) {',
      '        return {};',
      '    }',
      '};',
      '```',
      '',
      '### Time Complexity',
      'O(n)',
    ].join('\n');

    const { container } = render(<Harness text={text} />);
    expect(screen.getByText('Approach: Hash Map')).toBeTruthy();
    expect(screen.getByText('C++ Solution')).toBeTruthy();
    expect(screen.getByText('Time Complexity')).toBeTruthy();
    expect(container.querySelector('pre code').textContent).toContain('vector<int> twoSum');
    // None of the raw markdown syntax should leak into the rendered text.
    expect(container.textContent).not.toMatch(/^#|[^\w]#{1,3}[^#]/m);
    expect(container.textContent).not.toContain('```');
  });
});

describe('renderInline (unchanged)', () => {
  test('still renders bold spans for a single line', () => {
    render(<div>{renderInline('a **bold** word', 'k')}</div>);
    expect(screen.getByText('bold').tagName).toBe('STRONG');
  });
});
