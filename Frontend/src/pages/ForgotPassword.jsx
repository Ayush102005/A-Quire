import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { api } from '../services/api';

// ─────────────────────────────────────────────
// States: 'idle' | 'loading' | 'success' | 'resend'
// ─────────────────────────────────────────────

function validateEmail(value) {
  if (!value.trim()) return 'Please enter your email address.';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(value)) return 'Enter a valid email address (e.g. you@university.edu).';
  return '';
}

// ── Animated Checkmark SVG ─────────────────────
function AnimatedCheck() {
  return (
    <svg
      className="w-9 h-9 text-teal-600"
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="26"
        cy="26"
        r="24"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        className="animate-[dash_0.5s_ease-in-out_forwards]"
        style={{
          strokeDasharray: 150.8,
          strokeDashoffset: 150.8,
          animation: 'stroke-draw 0.6s ease-out forwards',
        }}
      />
      <style>{`
        @keyframes stroke-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes check-draw {
          0%   { stroke-dashoffset: 50; opacity: 0; }
          30%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
      `}</style>
      <path
        d="M14 26l9 9 16-18"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 50,
          strokeDashoffset: 50,
          animation: 'check-draw 0.5s ease-out 0.5s forwards',
        }}
      />
    </svg>
  );
}

// ── Progress dots for loading ──────────────────
function LoadingDots() {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/80"
          style={{
            animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40%            { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function ForgotPassword() {
  const [email, setEmail]       = useState('');
  const [touched, setTouched]   = useState(false);
  const [error, setError]       = useState('');
  const [status, setStatus]     = useState('idle');   // idle | loading | success | resend
  const [cooldown, setCooldown] = useState(0);
  const inputRef                = useRef(null);
  const cooldownRef             = useRef(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    return () => clearInterval(cooldownRef.current);
  }, []);

  function startCooldown(secs = 60) {
    setCooldown(secs);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(cooldownRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  function handleChange(e) {
    setEmail(e.target.value);
    if (touched) setError(validateEmail(e.target.value));
  }

  function handleBlur() {
    setTouched(true);
    setError(validateEmail(email));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    const err = validateEmail(email);
    if (err) { setError(err); inputRef.current?.focus(); return; }
    setError('');
    setStatus('loading');
    try {
      await api.forgotPassword(email);
    } catch {
      // Always show success regardless of outcome — backend deliberately returns
      // 200 even for unknown emails to prevent user enumeration.
      // Only a network error would reach here; still show success per UX spec.
    }
    setStatus('success');
    startCooldown();
  }

  async function handleResend() {
    if (cooldown > 0 || status === 'resend') return;
    setStatus('resend');
    try {
      await api.forgotPassword(email);
    } catch {
      // Same anti-enumeration rationale — always show success
    }
    setStatus('success');
    startCooldown();
  }

  const isLoading = status === 'loading' || status === 'resend';
  const isSuccess = status === 'success' || status === 'resend';

  // ── Input ring classes ──────────────────────
  const inputClass = [
    'w-full pl-10 pr-4 py-3.5 rounded-xl border text-sm text-stone-900',
    'placeholder-stone-400 outline-none bg-white',
    'transition-all duration-200 focus:ring-4',
    error && touched
      ? 'border-red-400 bg-red-50/40 focus:ring-red-400/20 focus:border-red-500'
      : 'border-stone-200 hover:border-stone-300 focus:ring-teal-600/10 focus:border-teal-600',
  ].join(' ');

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center px-4 py-12 font-sans">

      {/* ── Background texture layer ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-50 opacity-60 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-stone-100 opacity-80 blur-3xl" />
      </div>

      {/* ── Logo ── */}
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

      {/* ── Card ── */}
      <div
        className="relative z-10 w-full max-w-[420px] bg-white border border-stone-200/80 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden"
        role="main"
      >

        {/* ════════════════════════════════════
            SUCCESS / RESEND STATE
            ════════════════════════════════════ */}
        {isSuccess && (
          <div
            className="px-8 py-10 flex flex-col items-center text-center gap-6"
            role="status"
            aria-live="polite"
            aria-label="Reset link sent"
          >
            {/* Animated icon */}
            <div className="w-16 h-16 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center">
              {status === 'resend' ? (
                <Loader2 className="w-7 h-7 text-teal-600 animate-spin" />
              ) : (
                <AnimatedCheck />
              )}
            </div>

            {/* Heading + email echo */}
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-stone-900 tracking-tight">
                {status === 'resend' ? 'Resending link…' : 'Check your inbox'}
              </h1>
              <p className="text-sm text-stone-500 leading-relaxed max-w-[300px] mx-auto">
                We've sent a reset link to{' '}
                <span className="font-semibold text-stone-700 break-all">{email}</span>.
                {' '}It expires in{' '}
                <span className="font-medium text-stone-600">15 minutes</span>.
              </p>
            </div>

            {/* Spam hint callout */}
            <div className="w-full bg-amber-50 border border-amber-100/80 rounded-xl px-4 py-3 flex items-start gap-2.5 text-left">
              <Mail className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-amber-800 leading-relaxed">
                Can't find it? Check your <strong>spam or junk folder</strong> — it sometimes lands there.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-center gap-3 w-full">
              <button
                onClick={handleResend}
                disabled={cooldown > 0 || status === 'resend'}
                className="flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                aria-live="polite"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${status === 'resend' ? 'animate-spin' : ''}`} aria-hidden="true" />
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend reset link'}
              </button>

              <a
                href="/login"
                className="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                Back to sign in
              </a>
            </div>

            {/* Support note */}
            <p className="text-xs text-stone-400 leading-relaxed border-t border-stone-100 pt-5 w-full text-center">
              Still stuck?{' '}
              <a
                href="mailto:support@aquire.in"
                className="text-teal-700 hover:underline font-semibold"
              >
                Contact support
              </a>{' '}
              — we respond within 24 hours.
            </p>
          </div>
        )}

        {/* ════════════════════════════════════
            DEFAULT / LOADING STATE
            ════════════════════════════════════ */}
        {!isSuccess && (
          <div className="px-8 py-10">

            {/* Back link */}
            <a
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Back to sign in
            </a>

            {/* Icon + Heading */}
            <div className="mb-8">
              <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-5">
                <Mail className="w-5 h-5 text-teal-600" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-semibold text-stone-900 mb-2 leading-tight tracking-tight">
                Reset your password
              </h1>
              <p className="text-sm text-stone-500 leading-relaxed">
                Enter the email linked to your account and we'll send you a reset link right away.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="Password reset form">

              {/* Email field */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="reset-email"
                  className="text-sm font-medium text-stone-700 leading-none"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${
                      error && touched ? 'text-red-400' : 'text-stone-400'
                    }`}
                    aria-hidden="true"
                  />
                  <input
                    ref={inputRef}
                    id="reset-email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="you@institution.edu"
                    autoComplete="email"
                    aria-invalid={!!(error && touched)}
                    aria-describedby={error && touched ? 'reset-email-error' : 'reset-email-hint'}
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                {/* Inline error */}
                {error && touched ? (
                  <p
                    id="reset-email-error"
                    role="alert"
                    aria-live="polite"
                    className="flex items-center gap-1.5 text-xs text-red-600 font-medium"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {error}
                  </p>
                ) : (
                  <p id="reset-email-hint" className="text-xs text-stone-400 leading-relaxed">
                    Use the email address associated with your A-Quire account.
                  </p>
                )}
              </div>

              {/* CTA Button */}
              <button
                type="submit"
                id="send-reset-btn"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/20 focus-visible:ring-offset-2"
                aria-live="polite"
                aria-label={isLoading ? 'Sending reset link' : 'Send reset link'}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Sending link</span>
                    <LoadingDots />
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" aria-hidden="true" />
                    Send reset link
                  </>
                )}
              </button>
            </form>

            {/* Footer links + support note */}
            <div className="mt-8 pt-6 border-t border-stone-100 space-y-3">
              <p className="text-xs text-stone-400 leading-relaxed text-center">
                The link expires in{' '}
                <span className="font-semibold text-stone-500">15 minutes</span>{' '}
                and can only be used once.
              </p>
              <p className="text-xs text-stone-400 text-center">
                Don't have an account?{' '}
                <a
                  href="/signup"
                  className="text-teal-700 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                >
                  Sign up free
                </a>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Support footer (below card) ── */}
      {!isSuccess && (
        <div className="relative z-10 mt-8 flex items-center justify-center gap-1.5 text-xs text-stone-400">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" aria-hidden="true" />
          <span>
            Need help?{' '}
            <a
              href="mailto:support@aquire.in"
              className="text-teal-700 hover:underline font-semibold"
            >
              support@aquire.in
            </a>
          </span>
        </div>
      )}
    </div>
  );
}
