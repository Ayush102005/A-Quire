import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, AlertCircle, Loader2, Eye, EyeOff, ArrowRight,
  GraduationCap, BookOpen, Building2,
} from "lucide-react";
import { api } from "../services/api";

const ROLES = [
  { id: 'student',    label: 'Student',    icon: GraduationCap, demo: { email: 'student@iit.edu',  pw: 'demo1234' } },
  { id: 'instructor', label: 'Instructor', icon: BookOpen,       demo: { email: 'alan@iit.edu',     pw: 'demo1234' } },
  { id: 'admin',      label: 'Admin',      icon: Building2,      demo: { email: 'admin@aquire.io',  pw: 'demo1234' } },
];

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole]           = useState('student');
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const currentRole = ROLES.find(r => r.id === role);

  function switchRole(id) { setRole(id); setEmail(''); setPassword(''); setError(''); }

  const doNavigate = (user) => {
    if (user.role === 'admin') navigate('/admin');
    else if (user.role === 'instructor') navigate('/instructor');
    else navigate('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setSubmitting(true);
    try { doNavigate(await api.login(email, password)); }
    catch (err) { setError(err.message || "Invalid email or password."); }
    finally { setSubmitting(false); }
  };

  const handleDemo = async () => {
    const { email: de, pw: dp } = currentRole.demo;
    setEmail(de); setPassword(dp); setError(''); setSubmitting(true);
    try { doNavigate(await api.login(de, dp)); }
    catch (err) { setError(err.message || "Demo login failed."); }
    finally { setSubmitting(false); }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    setTimeout(() => { setGoogleLoading(false); navigate('/select-role'); }, 1500);
  };

  return (
    <div className="min-h-screen flex bg-[#F0EFEC] font-sans text-stone-900">

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex w-1/2 hero-gradient flex-col justify-between p-16 relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-teal-600/10 rounded-full blur-2xl pointer-events-none" />

        <a href="/" className="inline-flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-teal-900/40">A</div>
          <span className="font-semibold text-xl tracking-tight text-white">A-Quire</span>
        </a>

        <div className="relative z-10 max-w-sm">
          <h1 className="text-4xl font-bold text-white leading-tight mb-5">
            Your AI-powered learning environment.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-8">
            Real-time struggle detection and Socratic AI guidance — designed to ensure no student falls behind silently.
          </p>
          <div className="flex flex-col gap-3">
            {['Personalized AI Mentor for every student', 'Struggle detection with instant interventions', 'FERPA-compliant, on-device processing'].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                </div>
                <span className="text-sm text-slate-300 font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <p className="text-xs text-slate-500 font-medium">Webcam data is never stored or transmitted.</p>
        </div>
      </div>

      {/* ── Right: Auth form ── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-10 bg-[#F0EFEC]">
        {/* Mobile logo */}
        <a href="/" className="inline-flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center font-bold shadow-lg">A</div>
          <span className="font-semibold text-lg text-stone-900">A-Quire</span>
        </a>

        <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-xl shadow-stone-200/80 border border-stone-200/80 p-8">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-stone-900 mb-1">Welcome back</h2>
            <p className="text-stone-500 text-sm">Sign in to your A-Quire account</p>
          </div>

          {/* Role Switcher */}
          <div className="flex gap-1 bg-stone-100 p-1 rounded-xl mb-6">
            {ROLES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchRole(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  role === id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${role === id ? 'text-teal-600' : 'text-stone-400'}`} />
                {label}
              </button>
            ))}
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || submitting}
            className="w-full flex items-center justify-center gap-3 bg-white border border-stone-200 text-stone-700 font-medium py-2.5 rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm mb-5 disabled:opacity-60"
          >
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin text-stone-400" /> : (
              <svg viewBox="0 0 24 24" width="18" height="18"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 41.939 C -8.804 39.869 -11.514 38.739 -14.754 38.739 C -19.444 38.739 -23.494 41.439 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/></g></svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <hr className="flex-1 border-stone-200" />
            <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">or</span>
            <hr className="flex-1 border-stone-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 text-red-800 border border-red-100 p-3 rounded-xl text-sm animate-fade-in-up">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-stone-700" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 hover:border-stone-300 transition-all bg-white text-sm shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-stone-700" htmlFor="login-password">Password</label>
                <a href="/forgot-password" className="text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors">Forgot?</a>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 hover:border-stone-300 transition-all bg-white text-sm shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || googleLoading}
              className="w-full btn-primary justify-center py-3 rounded-xl text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            Don't have an account?{" "}
            <a href="/signup" className="font-semibold text-teal-700 hover:text-teal-800 transition-colors">Sign up</a>
          </p>

          <div className="mt-6 pt-5 border-t border-stone-100 text-center">
            <button
              type="button"
              onClick={handleDemo}
              className="group text-sm font-medium text-stone-400 hover:text-stone-700 transition-colors flex items-center gap-1.5 mx-auto"
            >
              Continue as demo {role}
              <ArrowRight className="w-3.5 h-3.5 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
