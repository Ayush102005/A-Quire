const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
import { getIdToken } from '../cognito';

// Helper to get auth headers using Cognito ID token
const getAuthHeaders = async (baseHeaders = {}) => {
  const headers = { ...baseHeaders };
  const token = await getIdToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Calculates the personal threshold based on the user's learning pace
 */
export const calculateThreshold = async (learningPace) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/threshold`, {
      method: "POST",
      headers: await getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ learning_pace: learningPace }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error calculating threshold:", error);
    return { base_threshold_ms: 5000 };
  }
};

/**
 * Sends a gaze event to trigger AI reasoning based on confusion/distraction
 */
export const sendGazeEvent = async (courseId, lessonId, gazeState, chatHistory = [], screenshotB64 = null, codeSnapshot = null) => {
  try {
    const body = {
      course_id: courseId,
      lesson_id: lessonId,
      gaze_state: gazeState,
      chat_history: chatHistory,
    };
    if (screenshotB64) body.screenshot_b64 = screenshotB64;
    if (codeSnapshot) body.code_snapshot = codeSnapshot.slice(0, 2000);

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: await getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error("[API] Authentication failed! Token may have expired. Please refresh the page and log in again.");
        throw new Error(`Authentication failed. Please refresh the page and log in again.`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error sending gaze event:", error);
    throw error;
  }
};

/**
 * Synthesizes speech from Kiro's text response using Amazon Polly
 */
export const synthesizeSpeech = async (text, voiceId = "Kajal") => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/speak`, {
      method: "POST",
      headers: await getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ text, voice_id: voiceId, language_code: "hi-IN" }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.blob();
  } catch (error) {
    console.error("Error synthesizing speech:", error);
    throw error;
  }
};

/**
 * Sends voice audio to Amazon Transcribe for student mic input
 */
export const transcribeAudio = async (audioB64, languageCode = "en-IN") => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
      method: "POST",
      headers: await getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ audio_b64: audioB64, language_code: languageCode }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.transcript || "";
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return "";
  }
};

/**
 * Fetches student progress from DynamoDB
 */
export const fetchProgress = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/progress`, {
      headers: await getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching progress:", error);
    return { items: [] };
  }
};

// ── User data (profile, checklist, tracks) ────────────────────────────────────

const _post = async (path, body) => {
  const resp = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: await getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`${path} failed: ${resp.status}`);
  return resp.json();
};

const _get = async (path) => {
  const resp = await fetch(`${API_BASE_URL}${path}`, {
    headers: await getAuthHeaders(),
  });
  if (!resp.ok) throw new Error(`${path} failed: ${resp.status}`);
  return resp.json();
};

export const saveProfile = (profile) => _post("/api/user/profile", profile);
export const fetchProfile = () => _get("/api/user/profile").then(r => r.profile || {});

export const saveChecklist = (checklist) => _post("/api/user/checklist", { checklist });
export const fetchChecklist = () => _get("/api/user/checklist").then(r => r.checklist || []);

export const saveTracks = (tracks) => _post("/api/user/tracks", { tracks });
export const fetchTracks = () => _get("/api/user/tracks").then(r => r.tracks || []);

// ── CloudWatch: session start ──────────────────────────────────────────────
export const sessionStart = (courseId) =>
  _post("/api/session/start", { course_id: courseId }).catch(e => console.warn("[session/start]", e));

// ── SES: milestone email when track hits 100% ─────────────────────────────
export const sendMilestoneEmail = (trackTitle) =>
  _post("/api/user/milestones/email", { track_title: trackTitle }).catch(e => console.warn("[milestone/email]", e));
