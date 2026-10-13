const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

// Helper to get local stored items
export const getAccessToken = () => localStorage.getItem("access_token");
export const getRefreshToken = () => localStorage.getItem("refresh_token");
export const getCurrentUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

// Clear all auth storage
export const clearAuth = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
};

// Decode a JWT's payload without verifying signature (client-side expiry
// check only — the backend is the actual authority). Returns null on any
// malformed input rather than throwing.
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// skewSeconds gives a small buffer so a token doesn't expire mid-handshake.
function isTokenExpired(token, skewSeconds = 10) {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return Date.now() / 1000 >= payload.exp - skewSeconds;
}

// Returns a valid (non-expired) access token, proactively refreshing via
// the refresh token first if the stored one has expired — rather than
// leaving that to happen incidentally as a side effect of some unrelated
// REST call's 401 handling. WebSocket connections in particular have no
// such side effect to piggyback on: a WS handshake sent with an expired
// token gets accepted then immediately closed (policy violation) by the
// backend, which browsers can surface as "can't establish a connection"
// rather than a clean close — this is what callers like connectNotifications
// should call instead of getAccessToken() directly. Returns null if there's
// no way to get a valid token (not logged in, or refresh token also dead).
export async function ensureFreshAccessToken() {
  const token = getAccessToken();
  if (!token) return null;
  if (!isTokenExpired(token)) return token;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      clearAuth();
      return null;
    }
    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

// Generic fetch wrapper with auth header & token refresh
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  // Set default headers — but never for FormData bodies (file uploads):
  // the browser must set Content-Type itself, including the multipart
  // boundary, which we have no way to reproduce by hand.
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  };

  // Don't inject auth tokens on public auth endpoints — stale tokens cause
  // the 401 auto-refresh loop to swallow real credential errors.
  const AUTH_PUBLIC_PATHS = [
    "/auth/login",
    "/auth/register",
    "/auth/firebase-login",
    "/auth/verify-phone",
    "/auth/refresh",
    "/auth/forgot-password",
    "/auth/reset-password",
  ];
  const isPublicAuth = AUTH_PUBLIC_PATHS.some((p) => endpoint.startsWith(p));
  const token = getAccessToken();
  if (token && !isPublicAuth) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Debug helper: mask token for logs
  function mask(t) {
    if (!t) return null;
    return t.length > 12 ? `${t.slice(0,8)}...${t.slice(-4)}` : t;
  }

  // Debug logging to help diagnose 401s — remove in production
  try {
    // eslint-disable-next-line no-console
    console.debug('[api] Request:', (options.method || 'GET'), url, {
      Authorization: headers.Authorization ? `Bearer ${mask(token)}` : null,
      isPublicAuth,
    });
  } catch (e) {}

  const config = {
    ...options,
    headers,
  };

  let response = await fetch(url, config);
  // Log response status for debugging
  try { console.debug('[api] Response status', response.status, url); } catch (e) {}

  // If 401 (Unauthorized), attempt to refresh token
  if (response.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);

          // Retry the original request with the new token
          headers["Authorization"] = `Bearer ${data.access_token}`;
          response = await fetch(url, config);
        } else {
          // Refresh token expired or invalid, log out
          clearAuth();
          window.location.href = "/login";
          return Promise.reject(new Error("Session expired"));
        }
      } catch (err) {
        clearAuth();
        window.location.href = "/login";
        return Promise.reject(new Error("Session expired"));
      }
    } else {
      clearAuth();
      window.location.href = "/login";
      return Promise.reject(new Error("Session expired"));
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let errorMessage = errorData.detail || `Request failed with status ${response.status}`;
    
    // Handle FastAPI 422 Validation Errors
    if (response.status === 422 && Array.isArray(errorData.detail)) {
      errorMessage = errorData.detail.map(err => {
        const field = err.loc && err.loc.length > 1 ? err.loc[err.loc.length - 1] : 'Field';
        return `${field}: ${err.msg}`;
      }).join(', ');
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

export const isAuthError = (err) => err?.status === 401;
export const isNotFound = (err) => err?.status === 404;

export const api = {
  // Authentication
  async login(email, password) {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    
    // Fetch profile to store user data
    const user = await this.getMe();
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  },

  async firebaseLogin(idToken, metadata = {}) {
    const body = {
      id_token: idToken,
      metadata,
    };
    const data = await request("/auth/firebase-login", {
      method: "POST",
      body: JSON.stringify(body),
    });
    localStorage.setItem("access_token", data.access_token);
    if (data.refresh_token) {
      localStorage.setItem("refresh_token", data.refresh_token);
    } else {
      localStorage.removeItem("refresh_token");
    }

    const user = await this.getMe();
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  },

  async verifyPhone(idToken) {
    return request("/auth/verify-phone", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    });
  },

  async register(email, password, fullName, role = "student") {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        role,
      }),
    });
  },

  logout() {
    clearAuth();
  },

  async getMe() {
    return request("/auth/me");
  },

  async verifyEmail(token) {
    // GET /auth/verify-email?token=<token>
    return request(`/auth/verify-email?token=${encodeURIComponent(token)}`);
  },

  async forgotPassword(email) {
    return request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token, newPassword) {
    return request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  },

  async updateProfile(fields) {
    // fields: { full_name?, language?, timezone?, email_notifications?, reminder_frequency?, preferences? }
    const data = await request("/profile/me", {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
    // Keep localStorage in sync
    const stored = localStorage.getItem("user");
    if (stored) {
      const user = JSON.parse(stored);
      localStorage.setItem("user", JSON.stringify({ ...user, ...data }));
    }
    return data;
  },

  async changePassword(currentPassword, newPassword) {
    return request("/profile/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  },

  // Onboarding
  onboarding: {
    async getStatus() {
      return request("/onboarding/status");
    },
    async setRole(role) {
      return request("/onboarding/set-role", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
    },
    async saveProfile(goals, interests) {
      const goalsStr = Array.isArray(goals) ? goals.join(', ') : goals;
      const interestsStr = Array.isArray(interests) ? interests.join(', ') : interests;
      return request("/onboarding/save-profile", {
        method: "POST",
        body: JSON.stringify({ goals: goalsStr, interests: interestsStr }),
      });
    },
    async savePreferences(language, timezone, emailNotifications, reminderFrequency) {
      return request("/onboarding/save-preferences", {
        method: "POST",
        body: JSON.stringify({
          language,
          timezone,
          email_notifications: emailNotifications,
          reminder_frequency: reminderFrequency,
        }),
      });
    },
    async finalize() {
      return request("/onboarding/finalize", {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
  },

  // Courses
  courses: {
    async list() {
      return request("/courses/");
    },
    async get(id) {
      return request(`/courses/${id}`);
    },
    async enroll(id) {
      return request(`/enrollments/${id}`, {
        method: "POST",
      });
    },
    async unenroll(id) {
      return request(`/enrollments/${id}`, {
        method: "DELETE",
      });
    },
    async listEnrolled() {
      return request("/enrollments/");
    },
  },

  // Analytics
  analytics: {
    // Student analytics
    async studentProgress() {
      return request("/analytics/student/progress");
    },
    async studentSummary() {
      return request("/analytics/student");
    },
    async thetaHistory() {
      return request("/analytics/student/theta-history");
    },
    async misconceptions() {
      return request("/analytics/student/misconceptions");
    },
    // Instructor analytics
    async performStudentOperation(studentId, operationType, content) {
      return request(`/analytics/instructor/students/${studentId}/operation`, {
        method: "POST",
        body: JSON.stringify({ operation_type: operationType, content }),
      });
    },
  },

  // Instructor — course, module, lesson management
  instructor: {
    // Analytics
    async getOverview(params) {
      const q = new URLSearchParams(params).toString();
      return request(`/analytics/instructor/overview?${q}`);
    },
    async getPriorityQueue(params) {
      const q = new URLSearchParams(params).toString();
      return request(`/analytics/instructor/priority-queue?${q}`);
    },
    async getConcepts(params) {
      const q = new URLSearchParams(params).toString();
      return request(`/analytics/instructor/concepts?${q}`);
    },
    async getLearners(params) {
      const q = new URLSearchParams(params).toString();
      return request(`/analytics/instructor/learners?${q}`);
    },
    async getAssessments(params) {
      const q = new URLSearchParams(params).toString();
      return request(`/analytics/instructor/assessments?${q}`);
    },
    async getAttention(params) {
      const q = new URLSearchParams(params).toString();
      return request(`/analytics/instructor/attention?${q}`);
    },
    async getStudents() {
      return request("/analytics/instructor/students");
    },
    // Full detail for one student — courses/progress + struggle/hint
    // history. Used by StudentDrawer, which previously only repeated the
    // same three numbers already visible in the table row.
    async getStudentDetail(studentId) {
      return request(`/analytics/instructor/students/${studentId}`);
    },
    // Platform-wide (no course_id) — used by the dashboard's Overview tab.
    async getSummary() {
      return request("/analytics/instructor/summary");
    },
    async getLessons() {
      return request("/analytics/instructor/lessons");
    },
    async getLessonTimeline(lessonId) {
      return request(`/analytics/instructor/lessons/${lessonId}/timeline`);
    },
    // Courses
    async myCourses() {
      return request("/courses/my-courses");
    },
    async createCourse(title, description = "", examCategory = "Other") {
      return request("/courses", {
        method: "POST",
        body: JSON.stringify({ title, description, exam_category: examCategory }),
      });
    },
    async updateCourse(courseId, fields) {
      return request(`/courses/${courseId}`, {
        method: "PUT",
        body: JSON.stringify(fields),
      });
    },
    async deleteCourse(courseId) {
      return request(`/courses/${courseId}`, { method: "DELETE" });
    },
    async publishCourse(courseId) {
      return request(`/courses/${courseId}/publish`, { method: "POST" });
    },
    async unpublishCourse(courseId) {
      return request(`/courses/${courseId}/unpublish`, { method: "POST" });
    },
    // Modules
    async createModule(courseId, title, description = "", order = 1) {
      return request(`/courses/${courseId}/modules`, {
        method: "POST",
        body: JSON.stringify({ title, description, order }),
      });
    },
    async updateModule(moduleId, fields) {
      return request(`/courses/modules/${moduleId}`, {
        method: "PUT",
        body: JSON.stringify(fields),
      });
    },
    async deleteModule(moduleId) {
      return request(`/courses/modules/${moduleId}`, { method: "DELETE" });
    },
    // Lessons
    async createLesson(moduleId, title, videoUrl = "", description = "", order = 1, durationSeconds = 0, lessonType = "video", dsaPayload = null) {
      const payload = {
        title,
        video_url: videoUrl || null,
        description,
        order,
        duration_seconds: durationSeconds,
        lesson_type: lessonType,
      };
      
      if (lessonType === 'dsa' && dsaPayload) {
        Object.assign(payload, dsaPayload);
      }
      
      return request(`/courses/modules/${moduleId}/lessons`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    async updateLesson(lessonId, fields) {
      return request(`/courses/lessons/${lessonId}`, {
        method: "PUT",
        body: JSON.stringify(fields),
      });
    },
    async deleteLesson(lessonId) {
      return request(`/courses/lessons/${lessonId}`, { method: "DELETE" });
    },
    async fetchTranscript(lessonId) {
      return request(`/courses/lessons/${lessonId}/fetch-transcript`, { method: "POST" });
    },

    // Study material — instructor upload/remove of a lesson's PDF.
    // Instructor-authored notes reuse updateLesson({ notes_content }) above.
    async uploadLessonPdf(lessonId, file) {
      const formData = new FormData();
      formData.append("file", file);
      return request(`/courses/lessons/${lessonId}/pdf`, {
        method: "POST",
        body: formData,
      });
    },
    async deleteLessonPdf(lessonId) {
      return request(`/courses/lessons/${lessonId}/pdf`, { method: "DELETE" });
    },
  },

  // Lessons (student read)
  lessons: {
    async get(id) {
      return request(`/content/lessons/${id}`);
    },
    async fetchTranslatedTranscript(lessonId, lang = "en") {
      return request(`/courses/lessons/${lessonId}/transcript?lang=${lang}`, { method: "GET" });
    },
    // Fetches the lesson's PDF as an authenticated blob and returns an
    // object URL suitable for an <iframe>/<embed> src. Can't just point
    // the iframe at the REST URL directly — it needs a Bearer header,
    // which only a real fetch() call can attach. Returns null if the
    // lesson has no PDF. Caller owns the URL's lifetime: revoke it with
    // URL.revokeObjectURL() when done (e.g. on unmount / lesson change).
    async getPdfBlobUrl(id) {
      const token = await ensureFreshAccessToken();
      if (!token) {
        const err = new Error("Not authenticated");
        err.status = 401;
        throw err;
      }
      const res = await fetch(`${BASE_URL}/content/lessons/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) return null;
      if (!res.ok) {
        const err = new Error(`Failed to load PDF (status ${res.status})`);
        err.status = res.status;
        throw err;
      }
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    },
  },

  // A student's personal notes for a lesson (separate from the
  // instructor-authored notes_content on the lesson itself).
  myNotes: {
    async get(lessonId) {
      return request(`/content/lessons/${lessonId}/my-note`);
    },
    async update(lessonId, content) {
      return request(`/content/lessons/${lessonId}/my-note`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      });
    },
  },

  // Progress
  progress: {
    async update(lessonId, watchedSeconds, completionPercent, isCompleted = null) {
      const payload = {
        watched_seconds: Math.floor(watchedSeconds),
        completion_percent: parseFloat(completionPercent.toFixed(1)),
      };
      if (isCompleted !== null) {
        payload.is_completed = isCompleted;
      }
      return request(`/progress/${lessonId}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    async get(lessonId) {
      return request(`/progress/lesson/${lessonId}`);
    },
    async getCourseProgress(courseId) {
      return request(`/progress/course/${courseId}`);
    },
    async continueLearning(limit = 10) {
      return request(`/progress/continue-learning?limit=${limit}`);
    },
  },

  // Video meetings (JaaS)
  meetings: {
    async getToken(roomId) {
      return request(`/meetings/${encodeURIComponent(roomId)}/token`);
    },
  },

  // Struggles & AI hints
  struggles: {
    async monitor(payload) {
      return request("/struggle/monitor", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    async getHint(eventId, hintLevel = "basic", customMessage = null, language = null, conversationHistory = null) {
      const body = { hint_level: hintLevel };
      if (customMessage) body.custom_message = customMessage;
      if (language) body.language = language;
      if (conversationHistory && conversationHistory.length > 0) {
        body.conversation_history = conversationHistory;
      }
      return request(`/struggle/events/${eventId}/hint`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    async list(lessonId = null, problemId = null) {
      const params = new URLSearchParams();
      if (lessonId) params.set("lesson_id", lessonId);
      if (problemId) params.set("problem_id", problemId);
      const qs = params.toString() ? `?${params.toString()}` : "";
      return request(`/struggle/events${qs}`);
    },
  },

  // Quizzes (topic-based question sets for SelfCheck)
  // GET  /quizzes/{topic_id}   → fetches all questions for a topic as a quiz
  // POST /quizzes/{topic_id}/submit → records responses against a new session
  quizzes: {
    async get(topicId) {
      return request(`/quizzes/${topicId}`);
    },
    // courseId (optional): course this quiz was launched from, if any —
    // enables course-scoped instructor analytics (Analytics > Assessments).
    async submit(topicId, responses, courseId = null) {
      return request(`/quizzes/${topicId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          responses: responses.map(r => ({
            question_id: r.questionId,
            answer: r.answer,
            confidence: r.confidence,
          })),
          course_id: courseId,
        }),
      });
    },
  },

  // Questions (Individual problems/practice)
  questions: {
    async get(questionId) {
      return request(`/questions/${questionId}`);
    },
    async answer(questionId, payload) {
      return request(`/questions/${questionId}/answer`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    async create(payload) {
      return request(`/questions/create`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },

  // Assessments (Adaptive Engine & Diagnostic Loop)
  assessments: {
    // courseId (optional): course this quiz was launched from, if any —
    // enables course-scoped instructor analytics (Analytics > Assessments/
    // Concepts). Not an access-control check, purely analytics attribution.
    // lessonId (optional): lesson (video) this quiz was launched from — its
    // transcript grounds AI-generated questions instead of only the topic name.
    async start(topicId = null, courseId = null, lessonId = null, moduleId = null) {
      return request("/assessments/start", {
        method: "POST",
        body: JSON.stringify({ topic_id: topicId, course_id: courseId, lesson_id: lessonId, module_id: moduleId }),
      });
    },
    async next(sessionId) {
      return request(`/assessments/${sessionId}/next`);
    },
    async submit(sessionId, questionId, selectedOption, confidence) {
      return request(`/assessments/submit`, {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          question_id: questionId,
          selected_option: selectedOption,
          confidence: confidence,
        }),
      });
    },
    async diagnostic(responseId, studentExplanation) {
      return request(`/assessments/responses/${responseId}/diagnostic`, {
        method: "POST",
        body: JSON.stringify({ student_explanation: studentExplanation }),
      });
    },
  },

  // Notifications
  notifications: {
    async list() {
      return request("/notifications/");
    },
    async markRead(id, isRead = true) {
      return request(`/notifications/${id}`, {
        method: "PUT",
        body: JSON.stringify({ is_read: isRead }),
      });
    },
    async markAllRead() {
      return request("/notifications/mark-all-read", {
        method: "POST"
      });
    },
  },

  // DSA Problems (code execution)
  problems: {
    async get(problemId) {
      return request(`/problems/${problemId}`);
    },
    async run(problemId, code, language) {
      return request(`/problems/${problemId}/run`, {
        method: "POST",
        body: JSON.stringify({ code, language }),
      });
    },
    async submit(problemId, code, language) {
      return request(`/problems/${problemId}/submit`, {
        method: "POST",
        body: JSON.stringify({ code, language }),
      });
    },
    // Free-run mode for lesson-authored problems (no structured test cases):
    // executes code with provided stdin and returns raw stdout/stderr.
    async execute(code, language, stdin = "") {
      return request(`/problems/execute`, {
        method: "POST",
        body: JSON.stringify({ code, language, stdin }),
      });
    },
    async contributeTestCase(problemId, { input, expected, explanation }) {
      return request(`/problems/${problemId}/contribute-testcase`, {
        method: "POST",
        body: JSON.stringify({ input, expected_output: expected, explanation }),
      });
    },
  },

  // Admin dashboard
  admin: {
    async getDashboard() {
      return request("/admin/dashboard");
    },
    async addInstitution(data) {
      return request("/admin/institutions", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    async updateUserRole(userId, role) {
      return request(`/admin/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role })
      });
    },
    async updateUserInstitution(userId, institutionId) {
      return request(`/admin/users/${userId}/institution`, {
        method: "PUT",
        body: JSON.stringify({ institution_id: institutionId })
      });
    },
    async updateUserStatus(userId, isActive) {
      return request(`/admin/users/${userId}/status`, {
        method: "PUT",
        body: JSON.stringify({ is_active: isActive })
      });
    },
    async resolveModeration(reportId) {
      return request(`/admin/moderation/${reportId}/resolve`, {
        method: "PUT"
      });
    }
  },

  // Global Mentor Chat
  mentor: {
    async chat(message, history = []) {
      return request("/mentor/chat", {
        method: "POST",
        body: JSON.stringify({ message, history }),
      });
    },
  },
};

// WebSocket connection utility
export function connectNotifications(token, onMessage, onError, onClose) {
  // Was reading VITE_API_BASE_URL — a variable that's never actually set
  // anywhere in this project (only VITE_API_URL is, see BASE_URL at the top
  // of this file) — so this silently fell back to http://127.0.0.1:8000
  // in every environment, dev included, and only "worked" locally by
  // coincidence (dev's real backend also happens to be on 127.0.0.1:8000).
  // In any deployed environment this pointed the browser's own localhost
  // instead of the real backend, breaking every WS-pushed mentor hint and
  // notification for every caller of this function (GlobalToaster.jsx,
  // LessonPlayer.jsx, Notifications.jsx, StudentDashboard.jsx). Now derives
  // from the same BASE_URL/VITE_API_URL the REST client actually uses —
  // matching the (already-correct) derivation in useNotificationsWS.js.
  const wsBase = BASE_URL
    .replace(/\/api\/v1\/?$/, "")
    .replace(/^https:/, "wss:")
    .replace(/^http:/, "ws:");
  const url = `${wsBase}/ws/notifications?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(url);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'ping') return; // keepalive, ignore
      onMessage(data);
    } catch (err) {
      console.error("Failed to parse WebSocket message", err);
    }
  };

  ws.onerror = (err) => {
    if (onError) onError(err);
  };

  ws.onclose = () => {
    if (onClose) onClose();
  };

  return ws;
}
