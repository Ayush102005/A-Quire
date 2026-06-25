import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  Building2,
  Check,
  ChevronRight,
  Loader2,
  AlertCircle,
  Lock,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Role definitions
// ─────────────────────────────────────────────────────────────────────────────
const ROLES = [
  {
    id: 'student',
    label: 'Student',
    Icon: GraduationCap,
    tagline: 'I want to learn',
    description:
      'Access AI-guided lessons, adaptive quizzes, and a personal mentor that meets you where you are.',
    accent: {
      ring:   'ring-teal-600',
      border: 'border-teal-600',
      bg:     'bg-teal-50',
      iconBg: 'bg-teal-100',
      icon:   'text-teal-700',
      check:  'bg-teal-600',
      label:  'text-teal-800',
      tag:    'text-teal-600',
    },
  },
  {
    id: 'instructor',
    label: 'Instructor',
    Icon: BookOpen,
    tagline: 'I teach courses',
    description:
      'Build courses, monitor class-level engagement, and receive real-time alerts when students struggle.',
    accent: {
      ring:   'ring-violet-500',
      border: 'border-violet-500',
      bg:     'bg-violet-50',
      iconBg: 'bg-violet-100',
      icon:   'text-violet-700',
      check:  'bg-violet-600',
      label:  'text-violet-900',
      tag:    'text-violet-600',
    },
  },
  {
    id: 'admin',
    label: 'Admin',
    Icon: Building2,
    tagline: 'I manage an org',
    description:
      'Oversee institution-wide analytics, manage cohorts, and configure platform settings for your teams.',
    accent: {
      ring:   'ring-amber-500',
      border: 'border-amber-500',
      bg:     'bg-amber-50',
      iconBg: 'bg-amber-100',
      icon:   'text-amber-700',
      check:  'bg-amber-500',
      label:  'text-amber-900',
      tag:    'text-amber-600',
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Role Card
// ─────────────────────────────────────────────────────────────────────────────
function RoleCard({ role, selected, onSelect }) {
  const { id, label, Icon, tagline, description, accent } = role;
  const isActive = selected === id;

  return (
    <button
      type="button"
      id={`role-card-${id}`}
      role="radio"
      aria-checked={isActive}
      onClick={() => onSelect(id)}
      className={[
        // Base
        'group relative flex flex-col items-start gap-4 w-full text-left',
        'px-6 py-6 rounded-2xl border-2 transition-all duration-200 outline-none',
        'focus-visible:ring-4 focus-visible:ring-offset-2',
        // Focus ring color
        `focus-visible:${accent.ring}`,
        // Selected vs idle
        isActive
          ? `${accent.border} ${accent.bg} shadow-md`
          : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm',
      ].join(' ')}
    >
      {/* Selected checkmark badge — top right */}
      <div
        aria-hidden="true"
        className={[
          'absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center',
          'transition-all duration-200',
          isActive
            ? `${accent.check} scale-100 opacity-100`
            : 'bg-stone-200 scale-90 opacity-0',
        ].join(' ')}
      >
        <Check className="w-3 h-3 text-white" strokeWidth={3} aria-hidden="true" />
      </div>

      {/* Icon badge */}
      <div
        className={[
          'w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200',
          isActive ? accent.iconBg : 'bg-stone-100 group-hover:bg-stone-200',
        ].join(' ')}
        aria-hidden="true"
      >
        <Icon
          className={[
            'w-6 h-6 transition-colors duration-200',
            isActive ? accent.icon : 'text-stone-500 group-hover:text-stone-700',
          ].join(' ')}
          strokeWidth={1.75}
        />
      </div>

      {/* Text */}
      <div className="space-y-1 pr-6">
        <div className="flex items-center gap-2">
          <span
            className={[
              'text-base font-semibold tracking-tight transition-colors duration-200',
              isActive ? accent.label : 'text-stone-900',
            ].join(' ')}
          >
            {label}
          </span>
          <span
            className={[
              'text-xs font-medium px-2 py-0.5 rounded-full transition-colors duration-200',
              isActive
                ? `${accent.bg} ${accent.tag}`
                : 'bg-stone-100 text-stone-500',
            ].join(' ')}
          >
            {tagline}
          </span>
        </div>
        <p
          className={[
            'text-sm leading-relaxed transition-colors duration-200',
            isActive ? 'text-stone-600' : 'text-stone-500',
          ].join(' ')}
        >
          {description}
        </p>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function RoleSelection() {
  const [selected, setSelected] = useState(null);   // null | 'student' | 'instructor' | 'admin'
  const [attempted, setAttempted] = useState(false); // shows hint if user clicks Continue with no selection
  const [status, setStatus]     = useState('idle');  // idle | loading | done

  function handleContinue() {
    if (!selected) {
      setAttempted(true);
      return;
    }
    setAttempted(false);
    setStatus('loading');
    // Simulate API role-setting call
    setTimeout(() => setStatus('done'), 1800);
  }

  // ── Route after success ──────────────────────────────────────────────────
  const navigate = useNavigate();
  if (status === 'done') {
    const destination =
      selected === 'student'    ? '/onboarding' :
      selected === 'instructor' ? '/instructor'  : '/admin';
    navigate(destination);
    return null;
  }

  const isLoading = status === 'loading';

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center px-4 py-12 sm:py-16 font-sans">

      {/* ── Decorative blobs ── */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 w-[500px] h-[500px] rounded-full bg-teal-50  opacity-70 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-violet-50 opacity-60 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-amber-50 opacity-40 blur-3xl" />
      </div>

      {/* ── Content block ── */}
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-10">

        {/* ── Logo ── */}
        <a
          href="/"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg"
          aria-label="A-Quire home"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            A
          </div>
          <span className="font-semibold text-stone-800 text-xl tracking-tight">A-Quire</span>
        </a>

        {/* ── Heading block ── */}
        <div className="text-center space-y-3 max-w-md">
          <h1 className="text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight leading-tight">
            Choose your role
          </h1>
          <p className="text-stone-500 text-base leading-relaxed">
            Your role shapes everything — the tools you see, the data you access,
            and how A-Quire supports you. Take a moment to pick the right one.
          </p>
        </div>

        {/* ── Role cards ── */}
        <div
          className="w-full flex flex-col sm:grid sm:grid-cols-3 gap-4"
          role="radiogroup"
          aria-label="Select your account role"
          aria-required="true"
        >
          {ROLES.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              selected={selected}
              onSelect={(id) => {
                setSelected(id);
                setAttempted(false);
              }}
            />
          ))}
        </div>

        {/* ── Validation hint ── */}
        <div
          role="alert"
          aria-live="polite"
          className={[
            'flex items-center gap-2 text-sm text-red-600 font-medium transition-all duration-200',
            attempted && !selected ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none',
          ].join(' ')}
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          Please select a role before continuing.
        </div>

        {/* ── Continue CTA + lock note ── */}
        <div className="w-full max-w-sm flex flex-col items-center gap-4">
          <button
            type="button"
            id="continue-btn"
            onClick={handleContinue}
            disabled={isLoading}
            aria-disabled={!selected || isLoading}
            aria-label={
              isLoading
                ? 'Setting up your account'
                : !selected
                ? 'Select a role first to continue'
                : `Continue as ${selected}`
            }
            className={[
              'w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-semibold',
              'transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2',
              selected && !isLoading
                ? 'bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white shadow-sm hover:shadow-md focus-visible:ring-teal-600/30 cursor-pointer'
                : isLoading
                ? 'bg-teal-700 text-white opacity-75 cursor-not-allowed focus-visible:ring-teal-600/30'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed focus-visible:ring-stone-400/20',
            ].join(' ')}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Setting up your workspace…
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>

          {/* Permanence notice */}
          <div className="flex items-start sm:items-center justify-center gap-1.5 text-center">
            <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            <p className="text-xs text-stone-400 leading-relaxed">
              Your role is permanent after selection and cannot be changed from settings.
              Contact{' '}
              <a
                href="mailto:support@aquire.in"
                className="text-teal-700 hover:underline font-semibold"
              >
                support
              </a>{' '}
              if you need to switch.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
