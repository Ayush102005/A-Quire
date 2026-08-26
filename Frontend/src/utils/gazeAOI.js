/**
 * Gaze Area of Interest (AOI) utility.
 * Classifies a raw gaze coordinate (x, y) into logical areas of the page.
 */

export const AOI_TYPES = {
  VIDEO: 'video',
  TRANSCRIPT: 'transcript',
  MENTOR: 'mentor',
  LESSON_CONTROLS: 'lesson_controls',
  ACTIVE_CONTENT: 'active_content',
  OTHER_PAGE_AREA: 'other_page_area',
  OUTSIDE_VIEWPORT: 'outside_viewport'
};

const AOI_SELECTORS = {
  [AOI_TYPES.VIDEO]: '#video-player-container, .video-player-wrapper',
  [AOI_TYPES.TRANSCRIPT]: '#transcript-panel, .transcript-container',
  [AOI_TYPES.MENTOR]: '#mentor-panel, .mentor-chat',
  [AOI_TYPES.LESSON_CONTROLS]: '.lesson-controls, .tabs-container',
  [AOI_TYPES.ACTIVE_CONTENT]: '.active-quiz, .dsa-problem-content, .assessment-content'
};

export class GazeAOI {
  constructor() {
    this.boundsCache = new Map();
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    
    // Bind resize handler
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('scroll', this.handleResize, true);
  }

  handleResize() {
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.boundsCache.clear();
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('scroll', this.handleResize, true);
  }

  getBoundsForAOI(aoiType) {
    if (this.boundsCache.has(aoiType)) {
      return this.boundsCache.get(aoiType);
    }
    
    const selector = AOI_SELECTORS[aoiType];
    if (!selector) return null;

    const el = document.querySelector(selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      const bounds = {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom
      };
      this.boundsCache.set(aoiType, bounds);
      return bounds;
    }
    return null;
  }

  /**
   * Classifies raw X and Y gaze coordinates.
   * Note: rawX, rawY must NOT be clamped to the screen beforehand.
   */
  classifyGaze(rawX, rawY) {
    // 1. Check if outside viewport
    if (rawX < 0 || rawX > this.viewportWidth || rawY < 0 || rawY > this.viewportHeight) {
      return AOI_TYPES.OUTSIDE_VIEWPORT;
    }

    // 2. Check active lesson AOIs in order of priority
    const prioritizedAOIs = [
      AOI_TYPES.VIDEO,
      AOI_TYPES.MENTOR,
      AOI_TYPES.TRANSCRIPT,
      AOI_TYPES.ACTIVE_CONTENT,
      AOI_TYPES.LESSON_CONTROLS
    ];

    for (const aoiType of prioritizedAOIs) {
      const bounds = this.getBoundsForAOI(aoiType);
      if (bounds) {
        if (rawX >= bounds.left && rawX <= bounds.right && 
            rawY >= bounds.top && rawY <= bounds.bottom) {
          return aoiType;
        }
      }
    }

    // 3. Fallback
    return AOI_TYPES.OTHER_PAGE_AREA;
  }
}
