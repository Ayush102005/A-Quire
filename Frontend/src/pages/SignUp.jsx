import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ChevronRight, Check, Loader2, GraduationCap, BookOpen, Building2, AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { createUserWithEmailPassword, signInWithGoogle, updateFirebaseProfile, sendEmailVerificationToUser } from '../services/firebase';

// Both catch blocks below previously did `err?.message || fallback` for
// every failure, which dumps the raw Firebase SDK string verbatim (e.g.
// "Firebase: Error (auth/network-request-failed).") for any code with no
// specific case — including network-request-failed, whose most common
// real-world cause is an ad-blocker/privacy extension blocking Google's
// identity endpoints, not a dead connection. Login.jsx has the same
// mapping for its own sign-in/Google flows.
function friendlyFirebaseError(err, fallback) {
  switch (err?.code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists — try signing in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 8 characters.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/network-request-failed':
      return "Couldn't reach the sign-up service. Check your internet connection — an ad-blocker or privacy extension blocking Google's servers is a common cause — then try again.";
    case 'auth/popup-closed-by-user':
      return 'Sign-up cancelled.';
    default:
      return err?.message || fallback;
  }
}

// ── Role config ───────────────────────────────────────────────────────────────
const ROLES = [
  { id: 'student', label: 'Student', icon: GraduationCap, desc: 'I want to learn' },
  { id: 'instructor', label: 'Instructor', icon: BookOpen, desc: 'I teach courses' },
  { id: 'admin', label: 'Institution', icon: Building2, desc: 'I manage an org' },
];

// ── Password strength ─────────────────────────────────────────────────────────
function getStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['', 'bg-red-400', 'bg-amber-400', 'bg-teal-400', 'bg-emerald-500'];
const STRENGTH_TEXT  = ['', 'text-red-600', 'text-amber-600', 'text-teal-700', 'text-emerald-700'];

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, id, error, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-stone-700 leading-none">{label}</label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium" role="alert" aria-live="polite">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </p>
      )}
      {hint && !error && <p className="text-xs text-stone-400 font-medium">{hint}</p>}
    </div>
  );
}

function Input({ id, error, className = '', ...props }) {
  const base = 'w-full bg-white border rounded-xl px-4 py-3 text-sm text-stone-900 placeholder-stone-400 outline-none transition-all duration-150 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500';
  const err  = error ? 'border-red-400 bg-red-50/30 focus:ring-red-400/20 focus:border-red-400' : 'border-stone-200 hover:border-stone-300';
  return <input id={id} className={`${base} ${err} ${className}`} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props} />;
}

// ── Left panel trust content ──────────────────────────────────────────────────
const BULLETS = [
  'Personalized AI mentor that adapts to how you learn',
  'Struggle detection that pauses and guides — never interrupts',
  'Progress analytics visible to you, shared only with consent',
  'Webcam access requested only during live sessions, never stored',
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SignUp() {
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', institution: '' });
  const [show, setShow] = useState({ password: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success

  const strength = getStrength(form.password);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const clearErr = k => () => setErrors(er => ({ ...er, [k]: '' }));

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required.';
    if (!form.email.includes('@')) e.email = 'Enter a valid email address.';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match.';
    if ((role === 'instructor' || role === 'admin') && !form.institution.trim()) e.institution = 'Institution is required for your role.';
    if (!agreed) e.agreed = 'Please accept the terms to continue.';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setErrors({});
    setSubmitError('');
    setStatus('loading');

    try {
      const firebaseUser = await createUserWithEmailPassword(form.email, form.password);
      await updateFirebaseProfile(firebaseUser, { displayName: form.name });
      await sendEmailVerificationToUser(firebaseUser);

      const token = await firebaseUser.getIdToken(/* forceRefresh */ true);
      await api.firebaseLogin(token, { role, full_name: form.name });

      setStatus('success');
    } catch (err) {
      setSubmitError(friendlyFirebaseError(err, 'Unable to create account.'));
      setStatus('idle');
    }
  }

  async function handleGoogle() {
    setErrors({});
    setSubmitError('');
    setStatus('loading');

    try {
      const user = await signInWithGoogle();
      const token = await user.getIdToken();
      await api.firebaseLogin(token, { role, full_name: user.displayName || '' });
      setStatus('success');
    } catch (err) {
      setSubmitError(friendlyFirebaseError(err, 'Google signup failed.'));
      setStatus('idle');
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (status === 'success') {
    const destination =
      role === 'student'    ? '/onboarding' :
      role === 'instructor' ? '/instructor' :
      role === 'admin'      ? '/admin' : '/dashboard';
    
    return (
      <div className="min-h-screen app-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-stone-200 rounded-2xl shadow-sm p-10 flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
            <Check className="w-8 h-8 text-emerald-600" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">Account created!</h2>
            <p className="text-sm text-stone-500 leading-relaxed">Check your email to verify your address, then we'll set up your personalized learning space.</p>
          </div>
          <button onClick={() => navigate(destination)} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
            Continue to setup <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg flex">

      {/* ── Left panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] bg-[#1C1917] flex-col justify-between p-10 xl:p-14 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-white text-base">A</div>
          <span className="text-white font-bold text-lg tracking-tight">A-Quire</span>
        </div>

        {/* Body */}
        <div className="space-y-10">
          <div>
            <h2 className="text-3xl font-bold text-white leading-snug mb-4">
              Learning that adapts<br />
              <span className="text-teal-400">to you.</span>
            </h2>
            <p className="text-stone-400 text-sm leading-relaxed max-w-xs">
              Set up your account to begin AI-supported learning that understands where you're stuck — and guides you forward.
            </p>
          </div>

          <ul className="space-y-4">
            {BULLETS.map(b => (
              <li key={b} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-teal-400" strokeWidth={2.5} />
                </div>
                <p className="text-stone-400 text-sm leading-relaxed">{b}</p>
              </li>
            ))}
          </ul>

          {/* Social proof */}
          <div className="border-t border-stone-800 pt-8">
            <div className="flex items-center gap-3 mb-2">
              {['AS', 'RK', 'PM', 'DV'].map(a => (
                <div key={a} className="w-7 h-7 rounded-full bg-stone-700 border-2 border-stone-800 text-stone-300 text-[10px] font-bold flex items-center justify-center -ml-2 first:ml-0">{a}</div>
              ))}
              <span className="text-stone-500 text-xs font-medium ml-1">+2,400 students</span>
            </div>
            <p className="text-stone-500 text-xs leading-relaxed">"The AI mentor felt like having a tutor explain things a second time, patiently."</p>
          </div>
        </div>

        <p className="text-stone-600 text-xs">© 2026 A-Quire Technologies. All rights reserved.</p>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto px-4 py-8 sm:py-12">

        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8 self-start">
          <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white text-sm">A</div>
          <span className="font-bold text-stone-900">A-Quire</span>
        </div>

        <div className="w-full max-w-md">

          {/* Back link */}
          <a href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-400 hover:text-stone-600 transition-colors mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </a>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-stone-900 mb-1.5 leading-tight">Create your A-Quire account</h1>
            <p className="text-sm text-stone-500 leading-relaxed">Your role helps tailor the experience from day one.</p>
          </div>

          {submitError && (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
              {submitError}
            </div>
          )}

          {/* Google CTA */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={status === 'loading'}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all shadow-sm mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{backgroundColor:'var(--surface)',borderColor:'var(--border)',color:'var(--text)'}}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{backgroundColor:'var(--border)'}} />
            <span className="text-xs font-medium" style={{color:'var(--text-muted)'}}>or create with email</span>
            <div className="flex-1 h-px" style={{backgroundColor:'var(--border)'}} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Role selector */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold" style={{color:'var(--text-muted)'}}>I am a</span>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Account role">
                {ROLES.map(r => {
                  const active = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setRole(r.id)}
                      className="flex flex-col items-center gap-1.5 px-3 py-3.5 rounded-xl border-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                      style={active
                        ? {borderColor:'#0D9488',backgroundColor:'rgba(20,184,166,0.12)',color:'#5EEAD4'}
                        : {borderColor:'var(--border)',backgroundColor:'var(--surface)',color:'var(--text-muted)'}
                      }
                    >
                      <r.icon className={`w-5 h-5 ${active ? 'text-teal-400' : ''}`} style={active ? {} : {color:'var(--text-faint)'}} strokeWidth={1.75} />
                      <span className="text-xs font-semibold leading-none">{r.label}</span>
                      <span className="text-[10px] leading-none" style={{color: active ? '#5EEAD4' : 'var(--text-faint)'}}>{r.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name */}
            <Field label="Full name" id="name" error={errors.name}>
              <Input
                id="name" type="text" placeholder="e.g. Aarav Mehta"
                value={form.name} onChange={set('name')} onFocus={clearErr('name')}
                error={errors.name} autoComplete="name"
              />
            </Field>

            {/* Email */}
            <Field label="Email address" id="email" error={errors.email}>
              <Input
                id="email" type="email" placeholder="you@institution.edu"
                value={form.email} onChange={set('email')} onFocus={clearErr('email')}
                error={errors.email} autoComplete="email"
              />
            </Field>

            {/* Password */}
            <Field label="Password" id="password" error={errors.password}>
              <div className="relative">
                <Input
                  id="password" type={show.password ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={form.password} onChange={set('password')} onFocus={clearErr('password')}
                  error={errors.password} autoComplete="new-password" className="pr-11"
                />
                <button
                  type="button" onClick={() => setShow(s => ({ ...s, password: !s.password }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
                  aria-label={show.password ? 'Hide password' : 'Show password'}
                >
                  {show.password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength meter */}
              {form.password && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${i <= strength ? STRENGTH_COLOR[strength] : 'bg-stone-200'}`} />
                    ))}
                  </div>
                  <p className={`text-xs font-semibold ${STRENGTH_TEXT[strength]}`}>{STRENGTH_LABEL[strength]}</p>
                </div>
              )}
            </Field>

            {/* Confirm password */}
            <Field label="Confirm password" id="confirm" error={errors.confirm}>
              <div className="relative">
                <Input
                  id="confirm" type={show.confirm ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={form.confirm} onChange={set('confirm')} onFocus={clearErr('confirm')}
                  error={errors.confirm} autoComplete="new-password" className="pr-11"
                />
                <button
                  type="button" onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
                  aria-label={show.confirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {show.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Match indicator */}
              {form.confirm && form.password && !errors.confirm && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1">
                  <Check className="w-3.5 h-3.5" /> Passwords match
                </p>
              )}
            </Field>

            {/* Institution (conditional) */}
            {(role === 'instructor' || role === 'admin') && (
              <Field
                label={role === 'admin' ? 'Organization name' : 'Institution'}
                id="institution"
                error={errors.institution}
                hint={role === 'admin' ? 'The institution or company you manage.' : 'Where you teach — can be updated later.'}
              >
                <Input
                  id="institution" type="text"
                  placeholder={role === 'admin' ? 'e.g. Delhi University' : 'e.g. IIT Bombay'}
                  value={form.institution} onChange={set('institution')} onFocus={clearErr('institution')}
                  error={errors.institution} autoComplete="organization"
                />
              </Field>
            )}

            {/* Terms */}
            <div>
              <label className={`flex items-start gap-3 cursor-pointer group ${errors.agreed ? 'text-red-600' : ''}`}>
                <div className="relative shrink-0 mt-0.5">
                  <input
                    type="checkbox" checked={agreed}
                    onChange={e => { setAgreed(e.target.checked); setErrors(er => ({ ...er, agreed: '' })); }}
                    className="sr-only"
                    aria-label="Accept terms and privacy policy"
                  />
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${agreed ? 'bg-teal-600 border-teal-600' : errors.agreed ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white group-hover:border-stone-400'}`}>
                    {agreed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  I agree to A-Quire's{' '}
                  <a href="/terms" className="text-teal-700 underline hover:text-teal-800 font-semibold">Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" className="text-teal-700 underline hover:text-teal-800 font-semibold">Privacy Policy</a>.
                  Webcam access is only requested during live learning sessions and is never stored.
                </p>
              </label>
              {errors.agreed && (
                <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium mt-2 ml-8" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{errors.agreed}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
              aria-live="polite"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
              ) : (
                <>Create account <ChevronRight className="w-4 h-4" /></>
              )}
            </button>

            {/* Login link */}
            <p className="text-center text-sm text-stone-500">
              Already have an account?{' '}
              <a href="/login" className="font-semibold text-teal-700 hover:text-teal-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded">
                Sign in
              </a>
            </p>
          </form>

          {/* Privacy note */}
          <div className="mt-8 pt-6 border-t border-stone-200">
            <p className="text-xs text-stone-400 text-center leading-relaxed">
              🔒 Your data is encrypted and never sold. We comply with FERPA and GDPR standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
