import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

/**
 * VerifyEmail — handles the /verify-email?token=... link from registration emails.
 * States: 'loading' | 'success' | 'error'
 */
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setErrorMsg('No verification token found in the URL. Please use the link from your email.');
      setStatus('error');
      return;
    }

    api.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setErrorMsg(err.message || 'Invalid or expired verification link.');
        setStatus('error');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center px-4 py-12 font-sans">

      {/* Background blobs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-50 opacity-60 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-stone-100 opacity-80 blur-3xl" />
      </div>

      {/* Logo */}
      <a
        href="/"
        className="relative z-10 flex items-center gap-2.5 mb-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg"
        aria-label="A-Quire home"
      >
        <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
          A
        </div>
        <span className="font-semibold text-stone-800 text-xl tracking-tight">A-Quire</span>
      </a>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-[420px] bg-white border border-stone-200/80 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden"
        role="main"
      >
        <div className="px-8 py-10 flex flex-col items-center text-center gap-6" aria-live="polite">

          {/* Loading */}
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-teal-600 animate-spin" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Verifying your email…</h1>
                <p className="text-sm text-stone-500 leading-relaxed">Just a moment while we confirm your address.</p>
              </div>
            </>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-teal-600" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Email verified!</h1>
                <p className="text-sm text-stone-500 leading-relaxed max-w-[300px] mx-auto">
                  Your A-Quire account is now active. Sign in to start learning.
                </p>
              </div>
              <button
                id="go-to-login-btn"
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/20 focus-visible:ring-offset-2"
              >
                Sign in to A-Quire
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </>
          )}

          {/* Error */}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Verification failed</h1>
                <p className="text-sm text-stone-500 leading-relaxed max-w-[300px] mx-auto">
                  {errorMsg}
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 w-full">
                <button
                  id="try-login-btn"
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/20 focus-visible:ring-offset-2"
                >
                  Go to sign in
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <p className="text-xs text-stone-400">
                  Need help?{' '}
                  <a href="mailto:support@aquire.in" className="text-teal-700 hover:underline font-semibold">
                    Contact support
                  </a>
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
