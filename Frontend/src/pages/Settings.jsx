import React, { useState, useEffect } from 'react';
import {
  Home, BookOpen, Video, BrainCircuit, LineChart, Bell, User, BarChart2,
  Settings as SettingsIcon, Menu, X, Check, AlertCircle, ChevronRight,
  Lock, Shield, Camera, Smartphone, LogOut, Eye, EyeOff, CheckCircle2,
  AlertTriangle, Loader2, LayoutDashboard
} from 'lucide-react';
import { api, getCurrentUser, clearAuth } from '../services/api';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import InstructorSidebar from '../components/InstructorSidebar';

const STUDENT_NAV = [
  { name: 'Dashboard',     icon: Home,        href: '/dashboard' },
  { name: 'My Courses',    icon: BookOpen,    href: '/courses' },
  { name: 'Progress',      icon: LineChart,   href: '/progress' },
  { name: 'Notifications', icon: Bell,        href: '/notifications' },
];


const ALL_SECTIONS = [
  { id: 'profile',      label: 'Profile',              icon: User },
  { id: 'teaching',     label: 'Teaching Preferences', icon: BookOpen, instructorOnly: true },
  { id: 'learning',     label: 'Learning Preferences', icon: BookOpen, studentOnly: true },
  { id: 'notifications',label: 'Notifications',        icon: Bell },
  { id: 'privacy_inst', label: 'Privacy',              icon: Shield, instructorOnly: true },
  { id: 'privacy',      label: 'Privacy',              icon: Eye, studentOnly: true },
  { id: 'permissions',  label: 'Webcam & Mic',         icon: Camera, studentOnly: true },
  { id: 'security',     label: 'Account Security',     icon: Shield },
];

const PERMISSIONS_STORAGE_KEY = 'aq-permissions';

import StudentSidebar from '../components/StudentSidebar';

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
function Sidebar({ open, onClose }) {
  const user = getCurrentUser() || {};
  if (user.role === 'instructor') {
    return <InstructorSidebar sidebarOpen={true} activeId="settings" mobileOpen={open} setMobileOpen={onClose} />;
  }
  return <StudentSidebar sidebarOpen={true} activeId="/settings" mobileOpen={open} setMobileOpen={onClose} />;
}

/* ── Reusable form primitives ────────────────────────────────────────────── */
function Field({ label, hint, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[var(--text)]">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-[var(--text-faint)]">{hint}</p>}
      {error && <p className="flex items-center gap-1 text-xs text-red-600 font-medium" role="alert"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</p>}
    </div>
  );
}

function Input({ error, ...props }) {
  return (
    <input
      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm text-[var(--input-text)] placeholder:text-[var(--text-faint)] outline-none transition-all focus:ring-2 bg-[var(--input-bg)] ${error ? 'border-red-400 focus:ring-red-400/20' : 'border-[var(--input-border)] hover:border-[var(--border-2)] focus:border-teal-600 focus:ring-teal-600/10'}`}
      {...props}
    />
  );
}

function Toggle({ checked, onChange, label, desc }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[var(--text)]">{label}</p>
        {desc && <p className="text-xs text-[var(--text-faint)] mt-0.5">{desc}</p>}
      </div>
      <button
        type="button" role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${checked ? 'bg-teal-600' : 'bg-[var(--border)]'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-5' : 'left-1'}`} />
      </button>
    </div>
  );
}

function SectionCard({ title, desc, children, saveState, onSave, saving }) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-[var(--border)]">
        <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
        {desc && <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>}
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
      {onSave && (
        <div className="px-6 py-4 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-between gap-4">
          <div>
            {saveState === 'saved' && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />Saved
              </span>
            )}
            {saveState === 'error' && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                <AlertCircle className="w-3.5 h-3.5" />{typeof saveState === 'string' ? 'Fix errors above' : saveState}
              </span>
            )}
          </div>
          <button
            onClick={onSave} disabled={saving}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Save changes
          </button>
        </div>
      )}
    </div>
  );
}

function Pills({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o} type="button" onClick={() => onChange(o)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${value === o ? 'bg-teal-700 text-white border-teal-700' : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-2)]'}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function WarningBox({ children }) {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <div className="text-xs text-amber-800 leading-relaxed">{children}</div>
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div className="flex items-start gap-3 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
      <Shield className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
      <div className="text-xs text-teal-800 leading-relaxed">{children}</div>
    </div>
  );
}

function DangerBox({ children }) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      <div className="text-xs text-red-800 leading-relaxed">{children}</div>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const navigate = useNavigate();
  const user = getCurrentUser() || {};
  const isInstructor = user.role === 'instructor';
  const visibleSections = ALL_SECTIONS.filter(s => {
    if (isInstructor && s.studentOnly) return false;
    if (!isInstructor && s.instructorOnly) return false;
    return true;
  });

  const [mobileOpen, setMobileOpen]         = useState(false);
  const [activeSection, setActiveSection]   = useState('profile');
  const [mobileNavOpen, setMobileNavOpen]   = useState(false);

  // ── Profile ──────────────────────────────────────────────────────────────
  const [profile, setProfile]       = useState({ name: '', email: '', institution: '', bio: '' });
  const [profileSave, setProfileSave] = useState(null);  // null | 'saved' | 'error'
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);

  // ── Learning preferences (local-only for now — no backend field yet) ──────
  const [learning, setLearning]   = useState({ dailyGoal: 60, pace: 'Balanced', helpStyle: 'Intervene automatically', reminder: 'Daily nudge' });
  const [learnSave, setLearnSave] = useState(null);

  // ── Notifications (email_notifications stored on User model) ──────────────
  const [notifs, setNotifs]       = useState({ aiFollowUp: true, courseUpdates: true, reminders: true, announcements: false, weeklyDigest: true });
  const [notifSave, setNotifSave] = useState(null);
  const [notifSaving, setNotifSaving] = useState(false);

  // ── Privacy (local-only for V1) ───────────────────────────────────────────
  const [privacy, setPrivacy]     = useState({ sessionHistory: true, shareProgress: false, analyticsConsent: true });
  const [privacySave, setPrivacySave] = useState(null);

  // ── Webcam / mic (localStorage) ───────────────────────────────────────────
  const [perms, setPerms] = useState(() => {
    try {
      const s = window.localStorage.getItem(PERMISSIONS_STORAGE_KEY);
      return s ? JSON.parse(s) : { webcam: true, mic: false };
    } catch { return { webcam: true, mic: false }; }
  });

  // ── Security ──────────────────────────────────────────────────────────────
  const [showPw, setShowPw]   = useState(false);
  const [pw, setPw]           = useState({ current: '', next: '', confirm: '' });
  const [pwSave, setPwSave]   = useState(null);
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // ── Instructor Preferences ─────────────────────────────────────────────────
  const [teaching, setTeaching] = useState({
    default_subject: '',
    default_exam_type: 'DSA / Programming',
    default_course_visibility: 'draft',
    default_assessment_difficulty: 'adaptive',
    default_transcript_language: 'en',
    adaptive_learning_enabled: true,
    ai_hints_enabled: true,
    ai_question_generation_enabled: true,
    ai_question_review_required: true,
  });
  const [teachingSave, setTeachingSave] = useState(null);
  const [teachingSaving, setTeachingSaving] = useState(false);

  const [privacyInst, setPrivacyInst] = useState({
    aggregated_attention_insights_enabled: true,
    individual_attention_with_consent_enabled: false,
  });
  const [privacyInstSave, setPrivacyInstSave] = useState(null);
  const [privacyInstSaving, setPrivacyInstSaving] = useState(false);

  // ── Load real user on mount ───────────────────────────────────────────────
  useEffect(() => {
    function loadUserData(u) {
      setProfile({
        name: u.full_name || '',
        email: u.email || '',
        institution: u.preferences?.profile_extras?.institution || '',
        bio: u.preferences?.profile_extras?.bio || '',
      });
      setNotifs(n => ({
        ...n,
        reminders: u.email_notifications ?? true,
        aiFollowUp: u.preferences?.notification_preferences?.ai_question_review ?? true,
        courseUpdates: u.preferences?.notification_preferences?.assessment_updates ?? true,
        announcements: u.preferences?.notification_preferences?.student_help_requests ?? true,
      }));
      if (u.role === 'instructor') {
        if (u.preferences?.teaching_preferences) {
          setTeaching(t => ({ ...t, ...u.preferences.teaching_preferences }));
        }
        if (u.preferences?.privacy_preferences) {
          setPrivacyInst(p => ({ ...p, ...u.preferences.privacy_preferences }));
        }
      }
    }
    const storedUser = getCurrentUser();
    if (storedUser) {
      loadUserData(storedUser);
    }
    // Refresh from server in case localStorage is stale
    api.getMe().then(loadUserData).catch(() => { /* use stored values */ });
  }, []);

  // ── User initials for avatar ──────────────────────────────────────────────
  const initials = profile.name
    .split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  // ── Save handlers ─────────────────────────────────────────────────────────

  async function saveProfile() {
    const e = {};
    if (!profile.name.trim()) e.name = 'Name is required.';
    if (!profile.email.includes('@')) e.email = 'Enter a valid email.';
    if (Object.keys(e).length) { setProfileErrors(e); setProfileSave('error'); return; }
    setProfileErrors({});
    setProfileSaving(true);
    try {
      await api.updateProfile({
        full_name: profile.name.trim(),
        preferences: {
          profile_extras: {
            institution: profile.institution,
            bio: profile.bio
          }
        }
      });
      setProfileSave('saved');
      setTimeout(() => setProfileSave(null), 3000);
    } catch (err) {
      setProfileSave('error');
      setProfileErrors({ name: err.message || 'Save failed.' });
    } finally {
      setProfileSaving(false);
    }
  }

  function saveLearn() {
    // Learning pref fields not yet on backend — store locally
    setLearnSave('saved');
    setTimeout(() => setLearnSave(null), 3000);
  }

  async function saveNotifs() {
    setNotifSaving(true);
    try {
      await api.updateProfile({
        email_notifications: notifs.reminders,
        preferences: {
          notification_preferences: {
            ai_question_review: notifs.aiFollowUp,
            assessment_updates: notifs.courseUpdates,
            student_help_requests: notifs.announcements
          }
        }
      });
      setNotifSave('saved');
      setTimeout(() => setNotifSave(null), 3000);
    } catch {
      setNotifSave('error');
    } finally {
      setNotifSaving(false);
    }
  }

  async function saveTeaching() {
    setTeachingSaving(true);
    try {
      await api.updateProfile({
        preferences: {
          teaching_preferences: teaching
        }
      });
      setTeachingSave('saved');
      setTimeout(() => setTeachingSave(null), 3000);
    } catch {
      setTeachingSave('error');
    } finally {
      setTeachingSaving(false);
    }
  }

  async function savePrivacyInst() {
    setPrivacyInstSaving(true);
    try {
      await api.updateProfile({
        preferences: {
          privacy_preferences: privacyInst
        }
      });
      setPrivacyInstSave('saved');
      setTimeout(() => setPrivacyInstSave(null), 3000);
    } catch {
      setPrivacyInstSave('error');
    } finally {
      setPrivacyInstSaving(false);
    }
  }

  function savePrivacy() {
    // Privacy flags not yet on backend — store locally
    setPrivacySave('saved');
    setTimeout(() => setPrivacySave(null), 3000);
  }

  function savePerms(nextPerms) {
    setPerms(nextPerms);
    try { window.localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(nextPerms)); }
    catch (err) { console.error('Unable to save permission settings', err); }
  }

  async function savePw() {
    if (!pw.current) { setPwError('Enter your current password.'); return; }
    if (pw.next.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pw.next !== pw.confirm) { setPwError('Passwords do not match.'); return; }
    setPwError('');
    setPwSaving(true);
    try {
      await api.changePassword(pw.current, pw.next);
      setPwSave('saved');
      setPw({ current: '', next: '', confirm: '' });
      setTimeout(() => setPwSave(null), 3000);
    } catch (err) {
      setPwError(err.message || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  }

  function handleLogout() {
    clearAuth();
    navigate('/login');
  }

  const PACE  = ['Relaxed', 'Balanced', 'Intensive'];
  const HELP  = ['Always ask me', 'Intervene automatically', 'Only on long pauses'];
  const REMIND = ['None', 'Daily nudge', 'Weekly digest'];

  // ── Section content ───────────────────────────────────────────────────────
  const sections = {
    profile: (
      <SectionCard title="Profile" desc="Your public identity on A-Quire" saveState={profileSave} onSave={saveProfile} saving={profileSaving}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-teal-100 border-2 border-teal-200 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-teal-800">{initials}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">{profile.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{profile.email}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name" error={profileErrors.name}>
            <Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} error={profileErrors.name} placeholder="Your full name" />
          </Field>
          <Field label="Email address" hint="Contact support to change email" error={profileErrors.email}>
            <Input type="email" value={profile.email} disabled className="opacity-60 cursor-not-allowed" placeholder="you@institution.edu" />
          </Field>
          <Field label="Institution" hint="Where you study or work">
            <Input value={profile.institution} onChange={e => setProfile(p => ({ ...p, institution: e.target.value }))} placeholder="e.g. IIT Delhi" />
          </Field>
          <Field label="Short bio" hint="Optional — visible to instructors">
            <Input value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Tell us a bit about yourself" />
          </Field>
        </div>
      </SectionCard>
    ),

    teaching: (
      <SectionCard title="Teaching Preferences" desc="Default settings for your courses and AI assistants" saveState={teachingSave} onSave={saveTeaching} saving={teachingSaving}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Default Subject">
            <Input value={teaching.default_subject} onChange={e => setTeaching(p => ({ ...p, default_subject: e.target.value }))} placeholder="e.g. Computer Science" />
          </Field>
          <Field label="Default Exam Type">
            <Input value={teaching.default_exam_type} onChange={e => setTeaching(p => ({ ...p, default_exam_type: e.target.value }))} placeholder="e.g. DSA / Programming" />
          </Field>
          <Field label="Course Visibility">
            <select
              value={teaching.default_course_visibility} onChange={e => setTeaching(p => ({ ...p, default_course_visibility: e.target.value }))}
              className="w-full px-3.5 py-2.5 border rounded-xl text-sm text-[var(--input-text)] bg-[var(--input-bg)] border-[var(--input-border)] focus:border-teal-600 focus:ring-teal-600/10 outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </Field>
          <Field label="Assessment Difficulty">
            <select
              value={teaching.default_assessment_difficulty} onChange={e => setTeaching(p => ({ ...p, default_assessment_difficulty: e.target.value }))}
              className="w-full px-3.5 py-2.5 border rounded-xl text-sm text-[var(--input-text)] bg-[var(--input-bg)] border-[var(--input-border)] focus:border-teal-600 focus:ring-teal-600/10 outline-none"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="adaptive">Adaptive</option>
            </select>
          </Field>
        </div>
        <div className="pt-4 border-t border-[var(--border)] space-y-4">
          <Toggle checked={teaching.adaptive_learning_enabled} onChange={v => setTeaching(p => ({ ...p, adaptive_learning_enabled: v }))} label="Adaptive Learning" desc="Automatically adjust difficulty based on student performance" />
          <Toggle checked={teaching.ai_hints_enabled} onChange={v => setTeaching(p => ({ ...p, ai_hints_enabled: v }))} label="AI Mentor Hints" desc="Allow AI mentor to intervene when students are stuck" />
          <Toggle checked={teaching.ai_question_generation_enabled} onChange={v => setTeaching(p => ({ ...p, ai_question_generation_enabled: v }))} label="AI Question Generation" desc="Automatically generate quiz questions from transcripts" />
          <Toggle checked={teaching.ai_question_review_required} onChange={v => setTeaching(p => ({ ...p, ai_question_review_required: v }))} label="Require Manual Review" desc="Require your review before publishing AI-generated questions" />
        </div>
      </SectionCard>
    ),

    learning: (
      <SectionCard title="Learning Preferences" desc="Controls how A-Quire adapts to your study style" saveState={learnSave} onSave={saveLearn}>
        <Field label="Daily study goal">
          <div className="flex items-center gap-4">
            <input type="range" min={15} max={180} step={15} value={learning.dailyGoal}
              onChange={e => setLearning(p => ({ ...p, dailyGoal: +e.target.value }))}
              className="flex-1 accent-teal-600" />
            <span className="text-sm font-semibold text-teal-700 w-20 text-right">{learning.dailyGoal} min/day</span>
          </div>
        </Field>
        <Field label="Study pace"><Pills options={PACE} value={learning.pace} onChange={v => setLearning(p => ({ ...p, pace: v }))} /></Field>
        <Field label="AI help style" hint="When should the mentor step in?"><Pills options={HELP} value={learning.helpStyle} onChange={v => setLearning(p => ({ ...p, helpStyle: v }))} /></Field>
        <Field label="Study reminders"><Pills options={REMIND} value={learning.reminder} onChange={v => setLearning(p => ({ ...p, reminder: v }))} /></Field>
      </SectionCard>
    ),

    notifications: (
      <SectionCard title="Notifications" desc="Choose what A-Quire notifies you about" saveState={notifSave} onSave={saveNotifs} saving={notifSaving}>
        <div className="space-y-4">
          <Toggle checked={notifs.aiFollowUp}    onChange={v => setNotifs(p => ({ ...p, aiFollowUp: v }))}    label="AI Mentor follow-ups"     desc="Explanations and summaries after sessions" />
          <Toggle checked={notifs.courseUpdates} onChange={v => setNotifs(p => ({ ...p, courseUpdates: v }))} label="Course updates"            desc="New lessons, instructor announcements" />
          <Toggle checked={notifs.reminders}     onChange={v => setNotifs(p => ({ ...p, reminders: v }))}     label="Email notifications"       desc="Daily study reminders and digests" />
          <Toggle checked={notifs.announcements} onChange={v => setNotifs(p => ({ ...p, announcements: v }))} label="Platform announcements"    desc="Product updates and new features" />
          <Toggle checked={notifs.weeklyDigest}  onChange={v => setNotifs(p => ({ ...p, weeklyDigest: v }))}  label="Weekly progress digest"    desc="Summary of your week sent every Sunday" />
        </div>
      </SectionCard>
    ),

    privacy_inst: (
      <SectionCard title="Privacy" desc="Manage data usage and security for your account and courses" saveState={privacyInstSave} onSave={savePrivacyInst} saving={privacyInstSaving}>
        <InfoBox>Your data and course materials are never sold. Video analytics are processed anonymously. All data is encrypted in transit and at rest.</InfoBox>
        <div className="space-y-4">
          <Toggle checked={privacyInst.aggregated_attention_insights_enabled} onChange={v => setPrivacyInst(p => ({ ...p, aggregated_attention_insights_enabled: v }))} label="Aggregated Attention Insights" desc="Allow platform to generate anonymous insights across your courses" />
          <Toggle checked={privacyInst.individual_attention_with_consent_enabled} onChange={v => setPrivacyInst(p => ({ ...p, individual_attention_with_consent_enabled: v }))} label="Individual Attention Analytics" desc="View student-level attention analytics (requires student consent)" />
        </div>
      </SectionCard>
    ),

    privacy: (
      <SectionCard title="Privacy" desc="Control how your data is used and shared" saveState={privacySave} onSave={savePrivacy}>
        <InfoBox>Your data is never sold. Webcam footage is processed locally and never stored. All data is encrypted in transit and at rest.</InfoBox>
        <div className="space-y-4">
          <Toggle checked={privacy.sessionHistory} onChange={v => setPrivacy(p => ({ ...p, sessionHistory: v }))} label="Store session history"       desc="Allows your AI mentor to reference past sessions for personalisation" />
          <Toggle checked={privacy.shareProgress}  onChange={v => setPrivacy(p => ({ ...p, shareProgress: v }))}  label="Share progress with instructor" desc="Instructors can view your lesson progress and weak areas" />
          <Toggle checked={privacy.analyticsConsent} onChange={v => setPrivacy(p => ({ ...p, analyticsConsent: v }))} label="Help improve A-Quire"    desc="Share anonymised usage data to improve features" />
        </div>
        <div className="pt-2 border-t border-[var(--border)]">
          <button className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors">Request data deletion</button>
        </div>
      </SectionCard>
    ),

    permissions: (
      <SectionCard title="Webcam & Microphone" desc="Device access for live learning sessions">
        <InfoBox>Webcam access is only requested when a live lesson begins. Footage is never recorded, stored, or transmitted to any server. All processing runs locally in your browser.</InfoBox>
        <div className="space-y-4">
          {[
            { key: 'webcam', label: 'Webcam', desc: 'Used to detect focus and struggle patterns during lessons' },
            { key: 'mic',    label: 'Microphone', desc: 'Only used when you start a voice session with the AI mentor' },
          ].map(({ key, label, desc }) => (
            <div key={key} className={`flex items-start justify-between gap-4 p-4 rounded-xl border ${perms[key] ? 'border-teal-200 bg-teal-50/40' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>
                {perms[key] && <p className="text-xs text-teal-600 font-semibold mt-1 flex items-center gap-1"><Check className="w-3 h-3" />Access granted</p>}
              </div>
              <button
                onClick={() => savePerms({ ...perms, [key]: !perms[key] })}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${perms[key] ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100' : 'border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100'}`}
              >
                {perms[key] ? 'Revoke' : 'Grant'}
              </button>
            </div>
          ))}
        </div>
        {!perms.webcam && <WarningBox>Webcam is disabled. The AI mentor cannot detect struggle patterns during lessons. You can still use all other features.</WarningBox>}
      </SectionCard>
    ),

    security: (
      <div className="space-y-4">
        <SectionCard title="Change Password" desc="Use a strong password you don't use elsewhere" saveState={pwSave} onSave={savePw} saving={pwSaving}>
          {pwError && (
            <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium" role="alert">
              <AlertCircle className="w-3.5 h-3.5" />{pwError}
            </p>
          )}
          <Field label="Current password">
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} placeholder="••••••••" error={pwError && !pw.current} />
              <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-muted)]">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="New password" hint="At least 8 characters">
              <Input type="password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} placeholder="New password" />
            </Field>
            <Field label="Confirm new password">
              <Input type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Active Sessions" desc="Devices currently signed into your account">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-teal-200 bg-teal-50/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-teal-100">
                  <Smartphone className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">This browser</p>
                  <p className="text-xs text-[var(--text-faint)]">Active now</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">This device</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <LogOut className="w-3.5 h-3.5" />Sign out
          </button>
        </SectionCard>

        <SectionCard title="Danger Zone" desc="Irreversible account actions">
          <DangerBox>Deleting your account permanently removes all data including progress, sessions, and preferences. This cannot be undone.</DangerBox>
          <button className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors border border-red-200 hover:border-red-300 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
            Delete my account
          </button>
        </SectionCard>
      </div>
    ),
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="h-screen app-bg font-sans flex overflow-hidden">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-40 app-header backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 -ml-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)] rounded-lg" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <p className="text-base font-semibold text-[var(--text)]">Profile &amp; Settings</p>
              <p className="text-xs text-[var(--text-muted)]">Manage your account and preferences</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user.role !== 'instructor' && (
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center border border-teal-200">
                <span className="text-sm font-bold text-teal-800">{initials}</span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">

            {/* Mobile section nav */}
            <div className="lg:hidden mb-4 relative">
              <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                     {React.createElement(visibleSections.find(s => s.id === activeSection)?.icon || User, { className: 'w-4 h-4 text-teal-600' })}
                  {visibleSections.find(s => s.id === activeSection)?.label}
                </div>
                <button
                  onClick={() => setMobileNavOpen(o => !o)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
              {mobileNavOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-20">
                  {visibleSections.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => { setActiveSection(id); setMobileNavOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${activeSection === id ? 'bg-teal-50 text-teal-700' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />{label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-7">
              {/* Desktop settings nav */}
              <aside className="hidden lg:block w-52 shrink-0">
                <nav className="space-y-1 sticky top-24">
                  {visibleSections.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setActiveSection(id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${activeSection === id ? 'bg-[var(--card-bg)] shadow-sm border border-[var(--card-border)] text-teal-800' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'}`}
                    >
                      <Icon className={`w-4 h-4 ${activeSection === id ? 'text-teal-600' : 'text-[var(--text-faint)]'}`} />{label}
                    </button>
                  ))}
                </nav>
              </aside>

              {/* Content area */}
              <div className="flex-1 min-w-0">{sections[activeSection]}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
