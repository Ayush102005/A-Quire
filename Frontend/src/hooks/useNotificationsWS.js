import { useEffect, useRef } from 'react';
import { useSession } from '../contexts/SessionContext';

/**
 * Custom hook to manage the WebSocket connection for AMATTA assessments.
 * @param {string|null} token - JWT token for authentication
 */
export const useNotificationsWS = (token) => {
  const { setQuestion, setHint, setStatus } = useSession();
  const wsRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    // Derive WebSocket base URL from the same env var used by the REST client.
    // e.g. VITE_API_URL=https://api.a-quire.com/api/v1
    //   → wss://api.a-quire.com/ws/notifications
    const restBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const wsBase = restBase
      .replace(/\/api\/v1\/?$/, '')   // strip /api/v1
      .replace(/^http/, 'ws');        // http → ws, https → wss
    const wsUrl = `${wsBase}/ws/notifications?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // WebSocket connected — real-time hints are active
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        switch (payload.type) {
          case 'next_question':
            setQuestion(payload.data);
            setStatus('active');
            break;
          case 'hint':
            setHint({
              question_id: payload.question_id,
              message: payload.message,
            });
            break;
          case 'session_complete':
            setStatus('complete');
            break;
          default:
            console.warn("Unknown WS message type:", payload.type);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
      // WebSocket closed — will reconnect on next token change if needed
    };

    return () => {
      // Close in both CONNECTING (0) and OPEN (1) states to prevent leaks
      // on fast unmounts (e.g. navigating away before handshake completes).
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [token, setQuestion, setHint, setStatus]);

  return wsRef;
};
