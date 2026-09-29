/**
 * gazeLayout.js
 * =============
 * Implements Steps 11–15 of the gaze tracking algorithm:
 *
 *  11. Build line candidates from DOM layout or zone fallback
 *  12. Assign line via Bayesian posterior (likelihood × prior × visibility)
 *  13. ℓ̂_t = argmax(probs)
 *  14. Conf_t = max / sum
 *  15. Downgrade to paragraph / zone when confidence too low
 *
 * Privacy: no raw data — only gaze coordinates (already derived in-browser).
 */

// ── Constants ───────────────────────────────────────────────────────────────
const SIGMA_X = 120; // px — horizontal gaze uncertainty
const SIGMA_Y = 80;  // px — vertical gaze uncertainty
const CONF_LINE_THRESHOLD = 0.45;  // below → paragraph
const CONF_PARA_THRESHOLD = 0.25;  // below → zone
const LINE_GROUP_THRESHOLD = 4;    // px — y-proximity to merge text nodes into a line
const CONTINUATION_BONUS = 1.4;
const SAME_LINE_BONUS = 1.2;
const REGRESSION_PENALTY = 0.8;

// ── Context-specific zone layouts ───────────────────────────────────────────

/**
 * Video player zone candidates (fallback when line-level fails).
 * @param {Element} containerEl
 * @returns {Array<{id: string, cx: number, cy: number, rect: DOMRect}>}
 */
function videoZones(containerEl) {
  const r = containerEl?.getBoundingClientRect?.() ?? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  const h = r.height;
  const w = r.width;
  return [
    { id: 'TOP',      cx: r.left + w / 2, cy: r.top + h * 0.17, rect: { left: r.left, top: r.top,          right: r.right, bottom: r.top + h * 0.33, width: w, height: h * 0.33 } },
    { id: 'MIDDLE',   cx: r.left + w / 2, cy: r.top + h * 0.50, rect: { left: r.left, top: r.top + h * 0.33, right: r.right, bottom: r.top + h * 0.67, width: w, height: h * 0.34 } },
    { id: 'BOTTOM',   cx: r.left + w / 2, cy: r.top + h * 0.83, rect: { left: r.left, top: r.top + h * 0.67, right: r.right, bottom: r.top + h - 80,   width: w, height: h * 0.16 } },
    { id: 'CONTROLS', cx: r.left + w / 2, cy: r.bottom - 40,    rect: { left: r.left, top: r.bottom - 80,   right: r.right, bottom: r.bottom,           width: w, height: 80 } },
  ];
}

/**
 * DSA editor zone candidates.
 * @param {Element} containerEl
 * @returns {Array}
 */
function dsaZones(containerEl) {
  const r = containerEl?.getBoundingClientRect?.() ?? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  const h = r.height;
  const w = r.width;
  const half = w / 2;
  return [
    { id: 'DESCRIPTION',  cx: r.left + half * 0.5, cy: r.top + h * 0.4,  rect: { left: r.left,          top: r.top,          right: r.left + half, bottom: r.bottom,     width: half,       height: h } },
    { id: 'CODE_EDITOR',  cx: r.left + half * 1.5, cy: r.top + h * 0.4,  rect: { left: r.left + half,   top: r.top,          right: r.right,       bottom: r.top + h * 0.7, width: half, height: h * 0.7 } },
    { id: 'TEST_OUTPUT',  cx: r.left + half * 1.5, cy: r.top + h * 0.85, rect: { left: r.left + half,   top: r.top + h * 0.7, right: r.right,      bottom: r.bottom,     width: half,       height: h * 0.3 } },
    { id: 'TOOLBAR',      cx: r.left + w / 2,       cy: r.top + 24,      rect: { left: r.left,          top: r.top,          right: r.right,       bottom: r.top + 48,   width: w,          height: 48 } },
  ];
}

/**
 * Quiz zone candidates.
 * @param {Element} containerEl
 * @returns {Array}
 */
function quizZones(containerEl) {
  const r = containerEl?.getBoundingClientRect?.() ?? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  const h = r.height;
  const w = r.width;
  return [
    { id: 'QUESTION',   cx: r.left + w / 2, cy: r.top + h * 0.15, rect: { left: r.left, top: r.top,          right: r.right, bottom: r.top + h * 0.3,  width: w, height: h * 0.3  } },
    { id: 'OPTION_A',   cx: r.left + w / 2, cy: r.top + h * 0.38, rect: { left: r.left, top: r.top + h * 0.3, right: r.right, bottom: r.top + h * 0.46, width: w, height: h * 0.16 } },
    { id: 'OPTION_B',   cx: r.left + w / 2, cy: r.top + h * 0.54, rect: { left: r.left, top: r.top + h * 0.46, right: r.right, bottom: r.top + h * 0.62, width: w, height: h * 0.16 } },
    { id: 'OPTION_C',   cx: r.left + w / 2, cy: r.top + h * 0.70, rect: { left: r.left, top: r.top + h * 0.62, right: r.right, bottom: r.top + h * 0.78, width: w, height: h * 0.16 } },
    { id: 'OPTION_D',   cx: r.left + w / 2, cy: r.top + h * 0.86, rect: { left: r.left, top: r.top + h * 0.78, right: r.right, bottom: r.top + h * 0.94, width: w, height: h * 0.16 } },
    { id: 'SUBMIT_BTN', cx: r.left + w / 2, cy: r.bottom - 24,    rect: { left: r.left, top: r.bottom - 48,   right: r.right, bottom: r.bottom,           width: w, height: 48 } },
  ];
}

// ── Step 11: Build line candidates ──────────────────────────────────────────

/**
 * Collect logical text lines from DOM text nodes inside containerEl.
 * Groups by y-proximity (±LINE_GROUP_THRESHOLD px).
 *
 * @param {Element} containerEl
 * @returns {Array<{id: string, cx: number, cy: number, rect: object, index: number}>}
 */
function buildDomLines(containerEl) {
  if (!containerEl) return [];
  const lines = [];

  // Walk text nodes using TreeWalker
  const walker = document.createTreeWalker(containerEl, NodeFilter.SHOW_TEXT, null);
  const range = document.createRange();
  let node;

  while ((node = walker.nextNode())) {
    if (!node.textContent.trim()) continue;
    range.selectNodeContents(node);
    const rects = Array.from(range.getClientRects());

    for (const rect of rects) {
      if (rect.width < 4 || rect.height < 4) continue;
      // Check if within viewport (≥50%)
      const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      if (visibleHeight / rect.height < 0.5) continue;

      // Group into existing line by y-proximity
      const cy = rect.top + rect.height / 2;
      const existing = lines.find(l => Math.abs(l.cy - cy) <= LINE_GROUP_THRESHOLD);
      if (existing) {
        existing.rect.left  = Math.min(existing.rect.left, rect.left);
        existing.rect.right = Math.max(existing.rect.right, rect.right);
        existing.cx = (existing.rect.left + existing.rect.right) / 2;
      } else {
        lines.push({
          id: `line-${lines.length}`,
          index: lines.length,
          cx: rect.left + rect.width / 2,
          cy,
          rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
        });
      }
    }
  }

  return lines.sort((a, b) => a.cy - b.cy).map((l, i) => ({ ...l, index: i }));
}

/**
 * Step 11 — build candidates depending on context.
 *
 * @param {Element|null} containerEl   — The scrollable content container
 * @param {'video'|'dsa'|'jee'|'neet'} context
 * @returns {Array<{id: string, cx: number, cy: number, rect: object, index: number}>}
 */
export function buildLineCandidates(containerEl, context) {
  // Try DOM-level lines first
  const domLines = buildDomLines(containerEl);

  if (domLines.length >= 3) {
    return domLines;
  }

  // Fallback to zone layout by context
  if (context === 'dsa') return dsaZones(containerEl);
  if (context === 'jee' || context === 'neet') return quizZones(containerEl);
  return videoZones(containerEl);
}

// ── Step 12–15: Assign gaze to line ─────────────────────────────────────────

/**
 * Compute visibility mask for a candidate.
 * Returns 1.0 if ≥50% of the candidate rect is in the viewport, else 0.1.
 */
function visibilityMask(rect) {
  const visTop    = Math.max(rect.top, 0);
  const visBottom = Math.min(rect.bottom, window.innerHeight);
  const visH = visBottom - visTop;
  if (visH <= 0) return 0.1;
  const visible = visH / (rect.height || 1);
  return visible >= 0.5 ? 1.0 : 0.1;
}

/**
 * Gaussian likelihood of gaze point (gx, gy) given candidate center (cx, cy).
 */
function gazeLikelihood(gx, gy, cx, cy) {
  const dx = gx - cx;
  const dy = gy - cy;
  return Math.exp(-(dx * dx) / (2 * SIGMA_X * SIGMA_X) - (dy * dy) / (2 * SIGMA_Y * SIGMA_Y));
}

/**
 * Step 12–15: Assign gaze to a line/zone.
 *
 * @param {{ x: number, y: number }} gazePoint  — G̃_t screen coordinates
 * @param {Array} candidates                   — from buildLineCandidates
 * @param {{ lastLineIndex: number|null }}  history
 * @returns {{ lineId: string, lineIndex: number, confidence: number, level: 'line'|'paragraph'|'zone' }}
 */
export function assignGaze(gazePoint, candidates, history) {
  if (!gazePoint || !candidates || candidates.length === 0) {
    return { lineId: null, lineIndex: null, confidence: 0, level: 'zone' };
  }

  const { x: gx, y: gy } = gazePoint;
  const lastIdx = history?.lastLineIndex ?? null;

  // Compute raw scores
  const scores = candidates.map((cand, i) => {
    // Step 12a: likelihood
    let score = gazeLikelihood(gx, gy, cand.cx, cand.cy);

    // Step 12b: reading prior
    if (lastIdx !== null) {
      if (i === lastIdx + 1) score *= CONTINUATION_BONUS;
      else if (i === lastIdx) score *= SAME_LINE_BONUS;
      else if (i < lastIdx) score *= REGRESSION_PENALTY;
    }

    // Step 12c: visibility mask
    score *= visibilityMask(cand.rect);

    return score;
  });

  // Step 13: argmax
  const maxIdx   = scores.reduce((mi, s, i) => (s > scores[mi] ? i : mi), 0);
  const total    = scores.reduce((s, v) => s + v, 0);
  const maxScore = scores[maxIdx];

  // Step 14: confidence
  const confidence = total > 0 ? maxScore / total : 0;

  // Step 15: downgrade level
  let level;
  if (confidence >= CONF_LINE_THRESHOLD) {
    level = 'line';
  } else if (confidence >= CONF_PARA_THRESHOLD) {
    level = 'paragraph';
  } else {
    level = 'zone';
  }

  return {
    lineId: candidates[maxIdx].id,
    lineIndex: maxIdx,
    confidence,
    level,
  };
}
