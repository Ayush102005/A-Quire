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
 * @param {string} [courseTitle] - Optional course title to determine routing (e.g. DSA courses).
 * @returns {string} The path to navigate to.
 */
export function lessonPath(lessonId, courseId = null, courseTitle = '') {
  const parsedLessonId = parseInt(lessonId, 10);
  
  if (isNaN(parsedLessonId) || parsedLessonId <= 0) {
    console.warn(`[Navigation] Invalid lessonId provided: ${lessonId}. Redirecting to /courses.`);
    return '/courses';
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
