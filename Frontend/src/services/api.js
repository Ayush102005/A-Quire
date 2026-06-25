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

// Generic fetch wrapper with auth header & token refresh
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  // Set default headers
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  let response = await fetch(url, config);

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
        }
      } catch (err) {
        clearAuth();
        window.location.href = "/login";
      }
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

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
      return request("/onboarding/save-profile", {
        method: "POST",
        body: JSON.stringify({ goals, interests }),
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

  // Lessons
  lessons: {
    async get(id) {
      return request(`/content/lessons/${id}`);
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

  // Struggles & AI hints
  struggles: {
    async createEvent({
      lessonId,
      clientEventId,
      struggleScore,
      lessonTimestampMs,
      fixationDurationMs = 0,
      inactivityDurationMs = 0,
      transcriptWindowId = null,
    }) {
      return request("/struggles/events", {
        method: "POST",
        body: JSON.stringify({
          lesson_id: lessonId,
          client_event_id: clientEventId,
          struggle_score: struggleScore,
          lesson_timestamp_ms: lessonTimestampMs,
          fixation_duration_ms: fixationDurationMs,
          inactivity_duration_ms: inactivityDurationMs,
          transcript_window_id: transcriptWindowId,
        }),
      });
    },
    async getHint(eventId, hintLevel = "basic") {
      return request(`/struggles/events/${eventId}/hint`, {
        method: "POST",
        body: JSON.stringify({ hint_level: hintLevel }),
      });
    },
    async list(lessonId = null) {
      const query = lessonId ? `?lesson_id=${lessonId}` : "";
      return request(`/struggles/events${query}`);
    },
  },

  // Quizzes
  quizzes: {
    async get(quizId) {
      return request(`/quizzes/${quizId}`);
    },
    async submit(quizId, responses) {
      return request(`/quizzes/${quizId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          quiz_id: quizId,
          responses: responses.map(r => ({
            question_id: r.questionId,
            answer: r.answer,
          })),
        }),
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
  },
};

// WebSocket connection utility
export function connectNotifications(token, onMessage, onError) {
  const wsUrl = `ws://localhost:8000/ws/notifications?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (err) {
      console.error("Failed to parse WebSocket message", err);
    }
  };

  ws.onerror = (err) => {
    if (onError) onError(err);
  };

  return ws;
}
