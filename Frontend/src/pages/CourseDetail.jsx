import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PlayCircle, CheckCircle2, Lock, BrainCircuit,
  Clock, ArrowRight, BookOpen, AlertCircle,
  BarChart, Award, ChevronLeft, Lightbulb, Play,
  Home, LineChart, Bell, Settings, User, Video, Sun, Moon, ClipboardCheck, Menu,
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { LoadingState, ErrorState } from '../components/UXStates';
import { lessonPath } from '../utils/navigation';

const NAV_ITEMS = [
  { name: 'Dashboard', icon: Home, href: '/dashboard' },
  { name: 'My Courses', icon: BookOpen, href: '/courses', active: true },
  { name: 'Progress', icon: LineChart, href: '/progress' },
  { name: 'Notifications', icon: Bell, href: '/notifications' },
];

import StudentSidebar from '../components/StudentSidebar';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} className="theme-toggle" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
      {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function getTopicIdForModule(moduleTitle = '', courseTitle = '') {
  const text = `${moduleTitle} ${courseTitle}`.toLowerCase();
  if (/array|string|sliding|two.?pointer/i.test(text)) return 6;
  if (/linked.?list|floyd|cycle/i.test(text)) return 7;
  if (/tree|graph|bfs|dfs|binary/i.test(text)) return 8;
  if (/sort|search|quick.?sort|binary.?search/i.test(text)) return 9;
  if (/python|fundament/i.test(text)) return 10;
  if (/numpy|pandas/i.test(text)) return 11;
  if (/machine.?learn|supervised|regression|classif/i.test(text)) return 12;
  if (/neural|deep.?learn/i.test(text)) return 13;
  if (/intro.*cs|computer.?science/i.test(text)) return 14;
  if (/newton|force|motion|law/i.test(text)) return 3;
  if (/work|energy|power/i.test(text)) return 4;
  if (/thermo|heat|entropy|calorimetry/i.test(text)) return 5;
  if (/kinematic|velocity|accelerat|displacement/i.test(text)) return 1;
  if (/dsa|data.?struct|algorithm/i.test(text)) return 6;
  return 1;
}

export default function CourseDetail() {
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function loadCourse() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const courseId = Number(queryParams.get('id')) || 1;
        const [courseData, progressData] = await Promise.all([
          api.courses.get(courseId),
          api.progress.getCourseProgress(courseId)
        ]);
        setCourse(courseData);
        setProgress(progressData);
        const allLessons = courseData.modules.flatMap(m => m.lessons);
        const lessonProgress = await Promise.all(
          allLessons.map(l => api.progress.get(l.id).catch(() => null))
        );
        const progressByLessonId = new Map(allLessons.map((l, i) => [l.id, lessonProgress[i]]));
        const mergedModules = courseData.modules.map(m => ({
          ...m,
          lessons: m.lessons.map(l => {
            const p = progressByLessonId.get(l.id);
            return {
              ...l,
              state: p?.is_completed ? 'completed' : (p?.watched_seconds > 0 ? 'in-progress' : 'locked'),
              watched_seconds: p?.watched_seconds ?? 0,
              completion_percent: p?.completion_percent ?? 0,
              weakTopic: false,
            };
          }),
        }));
        let prevCompleted = true;
        mergedModules.forEach(m => {
          m.lessons.forEach(l => {
            if (prevCompleted && l.state === 'locked') l.state = 'unlocked';
            prevCompleted = l.state === 'completed';
          });
        });
        setModules(mergedModules);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to load course details.');
        setLoading(false);
      }
    }
    loadCourse();
  }, []);

  const getNextLesson = () => {
    for (const m of modules) {
      for (const l of m.lessons) {
        if (l.state === 'in-progress' || l.state === 'unlocked') return l;
      }
    }
    return modules[0]?.lessons[0] || null;
  };

  const handleLessonClick = (lesson) => {
    if (lesson.state === 'locked') return;
    navigate(lessonPath(lesson.id, course?.id, lesson.lesson_type));
  };

  if (loading) return <LoadingState fullScreen message="Loading course syllabus..." />;
  if (error || !course) return (
    <ErrorState fullScreen title="Error Loading Course" message={error || 'The course could not be found.'} onRetry={() => navigate('/dashboard')} />
  );

  const progressPercent = progress ? Math.round(progress.completion_percent ?? progress.average_completion ?? 0) : 0;
  const completedCount = progress ? progress.completed_lessons ?? 0 : 0;
  const totalCount = progress
    ? progress.total_lessons ?? course.modules.reduce((acc, m) => acc + m.lessons.length, 0)
    : course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const nextLesson = getNextLesson();

  return (
    <div className="page-shell font-sans text-stone-900">
      <StudentSidebar sidebarOpen={true} activeId="/courses" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="page-main">
        {/* Sticky nav */}
        <nav className="app-header sticky top-0 z-40 px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 -ml-2 rounded-lg" style={{ color: 'var(--text-muted)' }} onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 font-medium group text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Dashboard
            </button>
            <span style={{ color: 'var(--border-2)' }}>/</span>
            <span className="text-sm font-medium truncate max-w-xs" style={{ color: 'var(--text)' }}>{course.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href={lessonPath(nextLesson?.id, course?.id, nextLesson?.lesson_type)} className="btn-primary text-xs px-4 py-2">
              <Play className="w-3.5 h-3.5 fill-current" /> Resume
            </a>
          </div>
        </nav>

        {/* Scrollable area below sticky nav */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Hero Banner */}
          <header className="relative hero-gradient px-6 sm:px-10 pt-12 pb-14 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-teal-600/10 rounded-full blur-2xl" />
            </div>
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row justify-between items-start gap-8 relative z-10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-[11px] font-bold uppercase tracking-wider mb-4">
                  {course.exam_category ? `${course.exam_category} Department` : 'General Department'}
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-white leading-tight">{course.title}</h1>
                <p className="text-slate-400 text-base leading-relaxed mb-5">{course.description}</p>
                <div className="flex items-center gap-5 text-sm font-medium text-slate-400">
                  <span className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300">
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                    {course.instructor_name || 'Instructor'}
                  </span>
                  <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> {totalCount} Lessons</span>
                </div>
              </div>
              <div className="w-full lg:w-72 shrink-0 bg-white/10 backdrop-blur border border-white/20 p-6 rounded-2xl flex flex-col">
                <div className="mb-5">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-semibold text-slate-300">Course Progress</span>
                    <span className="text-3xl font-bold text-white">{progressPercent}<span className="text-lg text-slate-400">%</span></span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full progress-bar-fill rounded-full shadow-sm shadow-teal-500/50" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{completedCount} of {totalCount} lessons completed</p>
                </div>
                <a href={lessonPath(nextLesson?.id, course?.id, nextLesson?.lesson_type)}
                  className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-teal-900/40 flex items-center justify-center gap-2 text-sm">
                  <Play className="w-4 h-4 fill-current" /> Resume Learning
                </a>
              </div>
            </div>
          </header>

          {/* Curriculum + sidebar */}
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-10 w-full">
            <div className="flex flex-col lg:flex-row gap-10">

              {/* Left: Curriculum */}
              <div className="w-full lg:w-2/3 space-y-5">
                <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-gradient-to-b from-teal-400 to-teal-600 inline-block" />
                  Curriculum
                </h2>

                {modules.map((mod, mIdx) => (
                  <div key={mod.id} className="premium-card rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: `${mIdx * 60}ms` }}>
                    <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
                      <h3 className="font-semibold text-stone-900 text-sm">{mod.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2.5 py-1 rounded-full">{mod.lessons.length} lessons</span>
                        <Link
                          to={`/adaptive-quiz?module=${mod.id}&course=${course.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full hover:bg-teal-100 transition-colors"
                        >
                          <BrainCircuit className="w-3 h-3" /> Chapter Quiz
                        </Link>
                      </div>
                    </div>
                    <div className="divide-y divide-stone-50">
                      {mod.lessons.map((lesson) => {
                        const isCompleted = lesson.state === 'completed';
                        const isInProgress = lesson.state === 'in-progress';
                        const isLocked = lesson.state === 'locked';
                        return (
                          <div
                            key={lesson.id}
                            onClick={() => handleLessonClick(lesson)}
                            className={`relative flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 transition-all group
                              ${isInProgress ? 'lesson-active' : ''}
                              ${isCompleted ? 'lesson-completed' : ''}
                              ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-stone-50/80'}`}
                          >
                            <div className="shrink-0 flex items-center justify-center w-7 h-7">
                              {isCompleted && <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>}
                              {isInProgress && <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center animate-pulse-teal"><PlayCircle className="w-4 h-4 text-teal-700" /></div>}
                              {isLocked && <Lock className="w-4 h-4 text-stone-400" />}
                              {!isCompleted && !isInProgress && !isLocked && <PlayCircle className="w-4 h-4 text-stone-400 group-hover:text-teal-600 transition-colors" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`font-medium text-sm truncate ${isLocked ? 'text-stone-400' : 'text-stone-800'} ${isInProgress ? 'font-semibold text-teal-900' : ''}`}>
                                  {lesson.title}
                                </h4>
                                {lesson.weakTopic && (
                                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                    <BrainCircuit className="w-2.5 h-2.5" /> Needs Review
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2.5 mt-1">
                                <span className="text-xs text-stone-400 font-medium">
                                  {lesson.video_url ? 'Video Explanation' : (course.title.includes('Data Structures') ? 'Coding Problem' : 'Quiz')}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-stone-200" />
                                <span className="text-xs text-stone-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {Math.round(lesson.duration_seconds / 60)}m
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center justify-end gap-2 sm:w-44">
                              <Link
                                to={`/adaptive-quiz?topic=${getTopicIdForModule(mod.title, course?.title)}&course=${course.id}&lesson=${lesson.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2 py-1 rounded hover:bg-teal-100 transition-colors flex items-center gap-1"
                              >
                                <BrainCircuit className="w-3 h-3" /> Quiz
                              </Link>
                              {isInProgress && (
                                <button className="text-xs font-semibold text-stone-700 bg-white border border-stone-200 px-3.5 py-1.5 rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-1.5">
                                  Resume <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                              {isCompleted && (
                                <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                  Review
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: AI Insights + Summary */}
              <div className="w-full lg:w-1/3 space-y-5">
                <div className="rounded-2xl p-5 relative overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #0F1117 0%, #0D2D2A 100%)' }}>
                  <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                    <BrainCircuit className="w-20 h-20 text-teal-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2 relative z-10">
                    <BrainCircuit className="w-4 h-4 text-teal-400" /> AI Insights
                  </h3>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed relative z-10">
                    Based on your pace and history, here are focuses to improve retention.
                  </p>
                  <div className="bg-white/5 border border-teal-500/20 p-4 rounded-xl relative z-10">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Active Mentoring</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">Your mentor is tracking playback patterns. Concept struggles automatically trigger a custom hint.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="premium-card rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-stone-900 mb-5 flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-gradient-to-b from-teal-400 to-teal-600 inline-block" />
                    Course Summary
                  </h3>
                  <div className="space-y-4">
                    {[
                      { icon: CheckCircle2, iconClass: 'bg-emerald-50 text-emerald-600', label: `${completedCount} of ${totalCount} Lessons`, sub: 'Completed successfully' },
                      { icon: BarChart, iconClass: 'bg-teal-50 text-teal-700', label: course.exam_category ? `${course.exam_category} Core Syllabus` : 'Core Syllabus', sub: 'Registered enrollment' },
                      { icon: Award, iconClass: 'bg-amber-50 text-amber-600', label: 'Certificate of Completion', sub: 'Earned at 100% progress' },
                    ].map(({ icon: Icon, iconClass, label, sub }, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-stone-900">{label}</p>
                          <p className="text-xs text-stone-500">{sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}

const UserIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
