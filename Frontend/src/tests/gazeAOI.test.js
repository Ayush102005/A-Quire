import { describe, it, expect } from 'vitest';
import { defineAOIs, assignToAOI, isContentAOI, isBackgroundAOI } from '../utils/gazeAOI';

function fakeContainer(rect) {
  return {
    getBoundingClientRect: () => rect,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

const RECT = { left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 };

describe('gazeAOI — defineAOIs + assignToAOI', () => {
  it('classifies dsa context points into DESCRIPTION / CODE_EDITOR / TEST_OUTPUT', () => {
    const aois = defineAOIs(fakeContainer(RECT), 'dsa');

    const descriptionPoint = assignToAOI({ x: 100, y: 300 }, aois); // left half
    expect(descriptionPoint.aoiId).toBe('DESCRIPTION');

    const editorPoint = assignToAOI({ x: 600, y: 100 }, aois); // right half, top 70%
    expect(editorPoint.aoiId).toBe('CODE_EDITOR');

    const outputPoint = assignToAOI({ x: 600, y: 550 }, aois); // right half, bottom 30%
    expect(outputPoint.aoiId).toBe('TEST_OUTPUT');
  });

  it('classifies video context points into VIDEO_CONTENT / VIDEO_CONTROLS', () => {
    const aois = defineAOIs(fakeContainer(RECT), 'video');

    const contentPoint = assignToAOI({ x: 400, y: 300 }, aois);
    expect(contentPoint.aoiId).toBe('VIDEO_CONTENT');

    const controlsPoint = assignToAOI({ x: 400, y: 590 }, aois); // bottom 80px
    expect(controlsPoint.aoiId).toBe('VIDEO_CONTROLS');
  });

  it('falls back to proportional AOIs for quiz contexts without matching DOM elements', () => {
    const aois = defineAOIs(fakeContainer(RECT), 'jee');

    const questionPoint = assignToAOI({ x: 400, y: 50 }, aois);   // top 30%
    expect(questionPoint.aoiId).toBe('QUESTION');

    const optionsPoint = assignToAOI({ x: 400, y: 300 }, aois);  // middle 50%
    expect(optionsPoint.aoiId).toBe('OPTIONS');

    const submitPoint = assignToAOI({ x: 400, y: 580 }, aois);   // bottom 20%
    expect(submitPoint.aoiId).toBe('SUBMIT_BTN');
  });

  it('returns no AOI (background/off-target) for a point far outside all regions', () => {
    const aois = defineAOIs(fakeContainer(RECT), 'dsa');
    const farPoint = assignToAOI({ x: 5000, y: 5000 }, aois);
    // Gaussian fallback likelihood is negligible this far away — no hit, no fallback match.
    expect(farPoint.aoiId).toBeNull();
    expect(isBackgroundAOI(farPoint.aoiId)).toBe(true);
  });
});

describe('gazeAOI — content/background classification', () => {
  it('treats all defined AOI ids (fixed + fallback + per-element) as content', () => {
    const contentIds = [
      'VIDEO_CONTENT', 'VIDEO_CONTROLS', 'CODE_EDITOR', 'TEST_OUTPUT',
      'DESCRIPTION', 'QUESTION', 'OPTIONS', 'OPTION_0', 'OPTION_7', 'SUBMIT_BTN',
    ];
    for (const id of contentIds) {
      expect(isContentAOI(id)).toBe(true);
      expect(isBackgroundAOI(id)).toBe(false);
    }
  });

  it('treats null / unrecognized ids as background/off-target', () => {
    expect(isContentAOI(null)).toBe(false);
    expect(isBackgroundAOI(null)).toBe(true);
    expect(isBackgroundAOI('SOME_MARGIN_REGION')).toBe(true);
  });
});
