/**
 * navigation.js
 * =============
 * Centralized navigation helpers to ensure consistent URL generation.
 */

/**
 * Generates a valid lesson URL with optional course context.
 * Ensures the lessonId is valid, otherwise returns a safe fallback.
 *
 * @param {number|string} lessonId - The ID of the lesson.
 * @param {number|string} [courseId] - Optional course ID context.
 * @param {string} [lessonType] - The lesson's own lesson_type ('video' | 'dsa' | 'jee' | 'neet').
 *   DSA lessons route to the dedicated /dsa/:id problem page (no video, no
 *   transcript — LessonPlayer showed "No video source" and even ran gaze
 *   calibration over a coding problem when DSA lessons were sent there).
 *   Previously this 3rd param was named `courseTitle` and the function's
 *   own doc comment claimed it was "to determine routing (e.g. DSA
 *   courses)" — but nothing in the implementation ever actually read it,
 *   so every lesson, DSA or not, always went to /lesson regardless. A
 *   course title was always going to be the wrong signal anyway: a single
 *   course/module here can (and does) mix video and DSA lessons, so
 *   routing needs to be per-lesson, not per-course.
 * @returns {string} The path to navigate to.
 */
export function lessonPath(lessonId, courseId = null, lessonType = '') {
  const parsedLessonId = parseInt(lessonId, 10);

  if (isNaN(parsedLessonId) || parsedLessonId <= 0) {
    console.warn(`[Navigation] Invalid lessonId provided: ${lessonId}. Redirecting to /courses.`);
    return '/courses';
  }

  if (lessonType === 'dsa') {
    return `/dsa/${parsedLessonId}`;
  }

  const url = new URLSearchParams();
  url.append('id', parsedLessonId.toString());

  if (courseId) {
    const parsedCourseId = parseInt(courseId, 10);
    if (!isNaN(parsedCourseId) && parsedCourseId > 0) {
      url.append('course_id', parsedCourseId.toString());
    }
  }

  return `/lesson?${url.toString()}`;
}
