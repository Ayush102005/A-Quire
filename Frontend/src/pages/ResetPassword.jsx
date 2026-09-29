import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, XCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

function PasswordInput({ id, label, value, onChange, onBlur, error, touched, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-stone-700 leading-none">
        {label}
      </label>
      <div className="relative">
        <Lock
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${
            error && touched ? 'text-red-400' : 'text-stone-400'
          }`}
          aria-hidden="true"
        />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          autoComplete="new-password"
          placeholder="••••••••"
          className={[
            'w-full pl-10 pr-10 py-3.5 rounded-xl border text-sm text-stone-900',
            'placeholder-stone-400 outline-none bg-white transition-all duration-200 focus:ring-4',
            error && touched
              ? 'border-red-400 bg-red-50/40 focus:ring-red-400/20 focus:border-red-500'
              : 'border-stone-200 hover:border-stone-300 focus:ring-teal-600/10 focus:border-teal-600',
          ].join(' ')}
          aria-invalid={!!(error && touched)}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors focus-visible:outline-none"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && touched && (
        <p className="text-xs text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [serverError, setServerError] = useState('');

  const passwordError = password.length > 0 && password.length < 8
    ? 'Password must be at least 8 characters.'
    : '';
  const confirmError = confirm.length > 0 && confirm !== password
    ? 'Passwords do not match.'
    : '';

  const noToken = !token;

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ password: true, confirm: true });
    if (passwordError || confirmError || !password || !confirm) return;
    setStatus('loading');
    setServerError('');
    try {
      await api.resetPassword(token, password);
      setStatus('success');
    } catch (err) {
      setServerError(err.message || 'Failed to reset password. The link may have expired.');
      setStatus('error');
    }
  }

  // ── No token in URL ────────────────────────────────────────────────────────
  if (noToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 font-sans" style={{backgroundColor:'var(--bg)'}}>
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-50 opacity-60 blur-3xl" />
        </div>
        <a href="/" className="relative z-10 flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">A</div>
          <span className="font-semibold text-stone-800 text-xl tracking-tight">A-Quire</span>
        </a>
        <div className="relative z-10 w-full max-w-[420px] bg-white border border-stone-200/80 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] px-8 py-10 flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-500" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Invalid reset link</h1>
            <p className="text-sm text-stone-500 leading-relaxed">No reset token found. Please use the link from your email or request a new one.</p>
          </div>
          <button
            onClick={() => navigate('/forgot-password')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold shadow-sm transition-all"
          >
            Request new link <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 font-sans" style={{backgroundColor:'var(--bg)'}}>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-50 opacity-60 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-stone-100 opacity-80 blur-3xl" />
      </div>

      <a
        href="/"
        className="relative z-10 flex items-center gap-2.5 mb-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg"
        aria-label="A-Quire home"
      >
        <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">A</div>
        <span className="font-semibold text-stone-800 text-xl tracking-tight">A-Quire</span>
      </a>

      <div
        className="relative z-10 w-full max-w-[420px] bg-white border border-stone-200/80 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden"
        role="main"
      >

        {/* SUCCESS */}
        {status === 'success' && (
          <div className="px-8 py-10 flex flex-col items-center text-center gap-6" aria-live="polite">
            <div className="w-16 h-16 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-teal-600" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Password reset!</h1>
              <p className="text-sm text-stone-500 leading-relaxed">
                Your password has been updated. You can now sign in with your new password.
              </p>
            </div>
            <button
              id="go-to-login-after-reset-btn"
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/20 focus-visible:ring-offset-2"
            >
              Sign in to A-Quire <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* FORM */}
        {status !== 'success' && (
          <div className="px-8 py-10">
            <div className="mb-8">
              <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-5">
                <Lock className="w-5 h-5 text-teal-600" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-semibold text-stone-900 mb-2 leading-tight tracking-tight">
                Choose a new password
              </h1>
              <p className="text-sm text-stone-500 leading-relaxed">
                Must be at least 8 characters. Choose something strong.
              </p>
            </div>

            {/* Server error banner */}
            {status === 'error' && serverError && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5" role="alert">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-red-700">{serverError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-label="Reset password form">
              <PasswordInput
                id="new-password"
                label="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                error={passwordError}
                touched={touched.password}
                disabled={status === 'loading'}
              />
              <PasswordInput
                id="confirm-password"
                label="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                error={confirmError}
                touched={touched.confirm}
                disabled={status === 'loading'}
              />

              <button
                id="reset-password-submit-btn"
                type="submit"
                disabled={status === 'loading'}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/20 focus-visible:ring-offset-2"
                aria-label={status === 'loading' ? 'Resetting password' : 'Reset password'}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Resetting…</span>
                  </>
                ) : (
                  'Reset password'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <a
                href="/login"
                className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
              >
                Back to sign in
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
