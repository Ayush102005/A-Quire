import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, Check, Loader2, Target, BookOpen,
  Languages, Search, Camera, Sliders, Sparkles, Clock,
  GraduationCap, X, Play, LayoutDashboard, AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';


// ── Data ──────────────────────────────────────────────────────────────────────
const GOALS = [
  { id: 'exam',       label: 'Exam Preparation',        icon: Target },
  { id: 'concepts',  label: 'Conceptual Understanding', icon: BookOpen },
  { id: 'streak',    label: 'Daily Study Consistency',  icon: Clock },
  { id: 'doubts',    label: 'Quick Doubt Resolution',   icon: Sparkles },
];

const LANGUAGES = [
  { id: 'en',       label: 'English',    note: 'Full AI mentor support'         },
  { id: 'hi',       label: 'Hindi',      note: 'हिंदी में मेंटर सहायता'          },
  { id: 'hinglish', label: 'Hinglish',   note: 'Mixed Hindi + English responses' },
];

const SUBJECTS = [
  'Data Structures & Algorithms','DBMS','Operating Systems',
  'AI / Machine Learning','Aptitude & Reasoning','Computer Networks',
  'System Design','Web Development','Mathematics','Physics',
];

const PACE_OPTIONS   = ['Relaxed','Balanced','Intensive'];
const REMINDER_OPTS  = ['None','Daily nudge','Weekly digest'];
const HELP_FREQ      = ['Always ask me','Intervene automatically','Only on long pauses'];

const TOTAL_STEPS = 7;

// ── Sub-components ────────────────────────────────────────────────────────────
function ProgressBar({ step }) {
  return (
    <div className="w-full max-w-xl mx-auto mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
          Step {step} of {TOTAL_STEPS}
        </span>
        <span className="text-xs font-medium text-stone-400">
          {Math.round((step / TOTAL_STEPS) * 100)}% complete
        </span>
      </div>
      <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>
    </div>
  );
}

function StepCard({ children }) {
  return (
    <div className="w-full max-w-xl mx-auto bg-white border border-stone-200/80 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] px-6 sm:px-10 py-8 sm:py-10">
      {children}
    </div>
  );
}

function StepHeading({ icon: Icon, label, desc }) {
  return (
    <div className="mb-6">
      {Icon && (
        <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-teal-600" strokeWidth={1.75} />
        </div>
      )}
      <h2 className="text-xl font-semibold text-stone-900 tracking-tight mb-1.5">{label}</h2>
      <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function NavRow({ onBack, onNext, nextLabel = 'Continue', nextDisabled = false, loading = false, showBack = true }) {
  return (
    <div className={`flex items-center mt-8 ${showBack ? 'justify-between' : 'justify-end'}`}>
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-stone-400 hover:text-stone-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || loading}
        className={[
          'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-teal-600/25',
          nextDisabled && !loading
            ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
            : 'bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white shadow-sm hover:shadow-md cursor-pointer',
        ].join(' ')}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {nextLabel}
        {!loading && <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── Step 1: Welcome ───────────────────────────────────────────────────────────
function Step1Welcome({ onNext, onSkip }) {
  return (
    <StepCard>
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-bold text-2xl mx-auto mb-6 shadow-sm">
          A
        </div>
        <h2 className="text-2xl font-semibold text-stone-900 tracking-tight mb-3">
          Welcome to A-Quire
        </h2>
        <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto mb-2">
          Your AI mentor watches as you learn — pausing to explain when you slow down, re-read, or skip ahead. It's like a tutor sitting right beside you.
        </p>
        <p className="text-stone-400 text-xs leading-relaxed max-w-xs mx-auto mb-8">
          This quick setup takes under 2 minutes and personalizes your entire experience.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onNext}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/25"
          >
            Get Started <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onSkip}
            className="text-sm text-stone-400 hover:text-stone-600 transition-colors focus-visible:outline-none focus-visible:underline"
          >
            Skip setup for now
          </button>
        </div>
      </div>
    </StepCard>
  );
}

// ── Step 2: Learning Goals ────────────────────────────────────────────────────
function Step2Goals({ goals, setGoals, onNext, onBack, attempted }) {
  const toggle = (id) =>
    setGoals((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);

  return (
    <StepCard>
      <StepHeading
        icon={Target}
        label="What are your learning goals?"
        desc="Select everything that applies — your mentor will adapt its focus accordingly."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Learning goals">
        {GOALS.map(({ id, label, icon: Icon }) => {
          const active = goals.includes(id);
          return (
            <button
              key={id}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => toggle(id)}
              className={[
                'flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
                active ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white hover:border-stone-300',
              ].join(' ')}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${active ? 'bg-teal-100' : 'bg-stone-100'}`}>
                <Icon className={`w-4 h-4 ${active ? 'text-teal-600' : 'text-stone-400'}`} strokeWidth={1.75} />
              </div>
              <span className={`text-sm font-medium ${active ? 'text-teal-800' : 'text-stone-700'}`}>{label}</span>
              {active && <Check className="w-4 h-4 text-teal-600 ml-auto shrink-0" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
      {attempted && goals.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium mt-3" role="alert">
          <X className="w-3.5 h-3.5" /> Please select at least one goal.
        </p>
      )}
      <NavRow onBack={onBack} onNext={onNext} nextDisabled={false} />
    </StepCard>
  );
}

// ── Step 3: Language ──────────────────────────────────────────────────────────
function Step3Language({ language, setLanguage, onNext, onBack }) {
  return (
    <StepCard>
      <StepHeading
        icon={Languages}
        label="Preferred language for your mentor"
        desc="This affects how your AI mentor explains concepts, answers doubts, and supports you during voice sessions."
      />
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Preferred language">
        {LANGUAGES.map(({ id, label, note }) => {
          const active = language === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setLanguage(id)}
              className={[
                'flex items-center justify-between px-5 py-4 rounded-xl border-2 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
                active ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white hover:border-stone-300',
              ].join(' ')}
            >
              <div>
                <p className={`text-sm font-semibold ${active ? 'text-teal-800' : 'text-stone-800'}`}>{label}</p>
                <p className={`text-xs mt-0.5 ${active ? 'text-teal-600' : 'text-stone-400'}`}>{note}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'border-teal-600 bg-teal-600' : 'border-stone-300'}`}>
                {active && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>
      <NavRow onBack={onBack} onNext={onNext} nextDisabled={!language} />
    </StepCard>
  );
}

// ── Step 4: Subjects ──────────────────────────────────────────────────────────
function Step4Subjects({ subjects, setSubjects, onNext, onBack, attempted }) {
  const [query, setQuery] = useState('');
  const filtered = SUBJECTS.filter((s) => s.toLowerCase().includes(query.toLowerCase()));
  const toggle = (s) =>
    setSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  return (
    <StepCard>
      <StepHeading
        icon={BookOpen}
        label="Which subjects are you studying?"
        desc="Select all that apply. We'll prioritise these in your mentor and course recommendations."
      />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          placeholder="Search subjects…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 bg-white placeholder:text-stone-400 transition-all"
        />
      </div>
      <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1" role="group" aria-label="Subjects">
        {filtered.map((s) => {
          const active = subjects.includes(s);
          return (
            <button
              key={s}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => toggle(s)}
              className={[
                'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
                active ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:text-stone-900',
              ].join(' ')}
            >
              {active && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
              {s}
            </button>
          );
        })}
      </div>
      {subjects.length > 0 && (
        <p className="text-xs text-teal-600 font-medium mt-3">{subjects.length} selected</p>
      )}
      {attempted && subjects.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium mt-3" role="alert">
          <X className="w-3.5 h-3.5" /> Select at least one subject.
        </p>
      )}
      <NavRow onBack={onBack} onNext={onNext} nextDisabled={false} />
    </StepCard>
  );
}

// ── Step 5: Permissions ───────────────────────────────────────────────────────
function Step5Permissions({ onNext, onBack }) {
  return (
    <StepCard>
      <StepHeading
        icon={Camera}
        label="A quick word on webcam & microphone"
        desc="A-Quire uses your camera and mic to understand when you're struggling — so it can step in at the right moment."
      />
      <div className="space-y-3 mb-2">
        {[
          {
            title: 'What we use it for',
            body: 'Detecting focus loss, re-reading patterns, and facial cues that signal confusion — to trigger AI mentor support at the right time.',
            accent: 'bg-teal-50 border-teal-100',
          },
          {
            title: 'What we never do',
            body: 'We do not record, store, or transmit your webcam footage. All processing happens locally and in real-time only.',
            accent: 'bg-emerald-50 border-emerald-100',
          },
          {
            title: 'You stay in control',
            body: 'You can disable webcam at any time from the lesson toolbar. Microphone is only used if you start a voice session.',
            accent: 'bg-stone-50 border-stone-200',
          },
        ].map(({ title, body, accent }) => (
          <div key={title} className={`rounded-xl border px-4 py-3.5 ${accent}`}>
            <p className="text-sm font-semibold text-stone-800 mb-1">{title}</p>
            <p className="text-sm text-stone-500 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
      <NavRow onBack={onBack} onNext={onNext} nextLabel="Understood, Continue" />
    </StepCard>
  );
}

// ── Step 6: Personalization ───────────────────────────────────────────────────
function SegGroup({ label, options, value, onChange }) {
  return (
    <div>
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={[
              'px-3.5 py-2 rounded-lg text-sm font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
              value === o ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300',
            ].join(' ')}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step6Prefs({ prefs, setPrefs, onNext, onBack }) {
  const set = (key, val) => setPrefs((p) => ({ ...p, [key]: val }));

  return (
    <StepCard>
      <StepHeading
        icon={Sliders}
        label="Tailor your experience"
        desc="These preferences shape how A-Quire interacts with you during study sessions."
      />
      <div className="space-y-5">
        <SegGroup label="Study pace" options={PACE_OPTIONS} value={prefs.pace} onChange={(v) => set('pace', v)} />
        <SegGroup label="Reminders" options={REMINDER_OPTS} value={prefs.reminder} onChange={(v) => set('reminder', v)} />
        <SegGroup label="AI intervention style" options={HELP_FREQ} value={prefs.helpFreq} onChange={(v) => set('helpFreq', v)} />

        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Daily study goal</p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={15}
              max={180}
              step={15}
              value={prefs.dailyGoal}
              onChange={(e) => set('dailyGoal', Number(e.target.value))}
              className="flex-1 accent-teal-600"
            />
            <span className="text-sm font-semibold text-teal-700 w-16 text-right">{prefs.dailyGoal} min</span>
          </div>
        </div>
      </div>
      <NavRow onBack={onBack} onNext={onNext} />
    </StepCard>
  );
}

// ── Step 7: Finish ────────────────────────────────────────────────────────────
function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-stone-100 last:border-0 gap-4">
      <span className="text-xs font-medium text-stone-400 uppercase tracking-wider shrink-0">{label}</span>
      <span className="text-sm font-medium text-stone-700 text-right">{value}</span>
    </div>
  );
}

function Step7Finish({ goals, language, subjects, prefs, onStart, onDashboard, loading }) {
  const langMap = { en: 'English', hi: 'Hindi', hinglish: 'Hinglish' };

  return (
    <StepCard>
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center mb-4">
          <GraduationCap className="w-7 h-7 text-teal-600" strokeWidth={1.75} />
        </div>
        <h2 className="text-xl font-semibold text-stone-900 tracking-tight mb-1.5">You're all set!</h2>
        <p className="text-sm text-stone-500 leading-relaxed max-w-sm">
          Your learning space is personalized. Here's a quick summary of your preferences before you start.
        </p>
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded-xl px-5 py-1 mb-6">
        <SummaryRow label="Goals" value={goals.length ? goals.map(g => GOALS.find(x => x.id === g)?.label).join(', ') : '—'} />
        <SummaryRow label="Language" value={langMap[language] || '—'} />
        <SummaryRow label="Subjects" value={subjects.length ? `${subjects.slice(0, 3).join(', ')}${subjects.length > 3 ? ` +${subjects.length - 3}` : ''}` : '—'} />
        <SummaryRow label="Study pace" value={prefs.pace} />
        <SummaryRow label="Daily goal" value={`${prefs.dailyGoal} min / day`} />
        <SummaryRow label="AI support" value={prefs.helpFreq} />
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onStart}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/25"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Start Learning
        </button>
        <button
          onClick={onDashboard}
          className="flex items-center justify-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors focus-visible:outline-none focus-visible:underline"
        >
          <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
        </button>
      </div>
    </StepCard>
  );
}

// ── Main Controller ───────────────────────────────────────────────────────────
export default function StudentOnboarding() {
  const navigate = useNavigate();
  const [step, setStep]         = useState(1);
  const [goals, setGoals]       = useState([]);
  const [language, setLanguage] = useState('en');
  const [subjects, setSubjects] = useState([]);
  const [prefs, setPrefs]       = useState({ pace: 'Balanced', reminder: 'Daily nudge', helpFreq: 'Intervene automatically', dailyGoal: 60 });
  const [attempted, setAttempted] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [apiError, setApiError] = useState('');

  const next = () => { setAttempted(false); setStep((s) => Math.min(s + 1, TOTAL_STEPS)); };
  const back = () => { setAttempted(false); setStep((s) => Math.max(s - 1, 1)); };

  function handleGoalsNext() {
    if (goals.length === 0) { setAttempted(true); return; }
    next();
  }
  function handleSubjectsNext() {
    if (subjects.length === 0) { setAttempted(true); return; }
    next();
  }

  async function runOnboardingApi() {
    // 1. Set role to student
    await api.onboarding.setRole('student');
    // 2. Save goals (as goal IDs) and subjects as interests
    await api.onboarding.saveProfile(goals, subjects);
    // 3. Save learning preferences
    const emailNotifications = prefs.reminder !== 'None';
    await api.onboarding.savePreferences(language, 'UTC', emailNotifications, prefs.reminder);
    // 4. Mark onboarding as complete
    await api.onboarding.finalize();
    // 5. Refresh user in localStorage so downstream components see onboarding_complete=true
    const updatedUser = await api.getMe();
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }

  async function handleStart() {
    setLoading(true);
    setApiError('');
    try {
      await runOnboardingApi();
      navigate('/dashboard');
    } catch (err) {
      setApiError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  async function handleGoToDashboard() {
    // Also finalize in case the user skips via this button
    setLoading(true);
    setApiError('');
    try {
      await runOnboardingApi();
    } catch (_) {
      // Best-effort — still navigate even if API fails
    } finally {
      setLoading(false);
      navigate('/dashboard');
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 font-sans" style={{backgroundColor:'var(--bg)'}}>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full bg-teal-50 opacity-60 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[350px] h-[350px] rounded-full bg-stone-100 opacity-80 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm">A</div>
          <span className="font-semibold text-stone-800 text-lg tracking-tight">A-Quire</span>
        </div>

        {/* Progress (hidden on step 1) */}
        {step > 1 && <ProgressBar step={step} />}

        {/* API error banner */}
        {apiError && (
          <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Steps */}
        {step === 1 && <Step1Welcome onNext={next} onSkip={() => navigate('/dashboard')} />}
        {step === 2 && <Step2Goals goals={goals} setGoals={setGoals} onNext={handleGoalsNext} onBack={back} attempted={attempted} />}
        {step === 3 && <Step3Language language={language} setLanguage={setLanguage} onNext={next} onBack={back} />}
        {step === 4 && <Step4Subjects subjects={subjects} setSubjects={setSubjects} onNext={handleSubjectsNext} onBack={back} attempted={attempted} />}
        {step === 5 && <Step5Permissions onNext={next} onBack={back} />}
        {step === 6 && <Step6Prefs prefs={prefs} setPrefs={setPrefs} onNext={next} onBack={back} />}
        {step === 7 && (
          <Step7Finish
            goals={goals} language={language} subjects={subjects} prefs={prefs}
            onStart={handleStart} onDashboard={handleGoToDashboard} loading={loading}
          />
        )}
      </div>
    </div>
  );
}

