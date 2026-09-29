import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentUser, api } from '../services/api';
import { ArrowLeft } from 'lucide-react';

export default function MeetingRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const displayName = user?.full_name || 'Guest';
  const [error, setError] = useState(null);

  useEffect(() => {
    let script = null;
    let cancelled = false;
    let jitsiApi = null;

    // JaaS rejects every join with no signed token at all ("Sorry, you're
    // not allowed to join this call") — this used to call Jitsi with none,
    // so it never actually worked. The token is minted server-side (needs
    // the JaaS private key, never exposed to the browser) — see
    // app/api/v1/meetings.py.
    (async () => {
      let tokenData;
      try {
        tokenData = await api.meetings.getToken(roomId);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not start this meeting.');
        return;
      }
      if (cancelled) return;

      script = document.createElement('script');
      script.src = 'https://8x8.vc/external_api.js';
      script.async = true;
      script.onload = () => {
        if (cancelled || !window.JitsiMeetExternalAPI) return;
        const domain = '8x8.vc';
        const options = {
          roomName: `${tokenData.app_id}/${roomId}`,
          jwt: tokenData.token,
          width: '100%',
          height: '100%',
          parentNode: document.getElementById('jitsi-container'),
          userInfo: {
            displayName: displayName
          },
          configOverwrite: {
            doNotFlipLocalVideo: false,
            enableLocalVideoFlip: true,
            prejoinPageEnabled: false
          }
        };
        jitsiApi = new window.JitsiMeetExternalAPI(domain, options);
        // The in-call red hangup button fires this event and otherwise does
        // nothing on its own — Jitsi hands control back to the parent page
        // rather than navigating anywhere itself, so without this listener
        // the iframe just sits there post-hangup with no way back to the app.
        jitsiApi.addEventListener('readyToClose', () => {
          if (!cancelled) navigate(-1);
        });
      };
      document.body.appendChild(script);
    })();

    return () => {
      cancelled = true;
      if (script) document.body.removeChild(script);
      // dispose() is Jitsi's documented teardown — it releases the
      // camera/mic and closes the connection; the previous
      // container.innerHTML='' only removed the DOM node, leaving the
      // underlying call (and device access) running in the background
      // after navigating away.
      if (jitsiApi) jitsiApi.dispose();
      const container = document.getElementById('jitsi-container');
      if (container) container.innerHTML = '';
    };
  }, [roomId, displayName, navigate]);

  return (
    <div className="flex flex-col h-screen w-full bg-stone-950">
      <div className="h-14 bg-stone-900 border-b border-stone-800 flex items-center px-4 shrink-0">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Leave Meeting</span>
        </button>
        <div className="mx-auto text-stone-200 text-sm font-semibold truncate px-4">
          A-Quire Meeting Room
        </div>
      </div>
      
      <div className="flex-1 w-full relative bg-black" id="jitsi-container">
        {/* The Jitsi External API will inject the iframe here */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p className="text-stone-300 text-sm text-center max-w-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
