import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart2, Users, FileText, CheckCircle2, AlertTriangle, 
  ChevronRight, Brain, Activity, Clock, Shield, Search, X, Loader2,
  BookOpen, LayoutDashboard
} from 'lucide-react';
import { api, getCurrentUser } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import { LoadingState, EmptyState } from '../components/UXStates';
import InstructorSidebar from '../components/InstructorSidebar';

const ANALYTICS_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'concepts', label: 'Concepts' },
  { id: 'learners', label: 'Learners' },
  { id: 'assessments', label: 'Assessments' },
  { id: 'attention', label: 'Attention Insights' }
];

function MetricCard({ label, value, sub }) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col gap-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)]">{label}</p>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-[var(--text)] tabular-nums">{value ?? '—'}</span>
      </div>
      {sub && <p className="text-[10px] text-[var(--text-faint)] font-medium">{sub}</p>}
    </div>
  );
}

function OverviewTab({ courseId, dateRange }) {
  const [data, setData] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!courseId) return;
    let isSubscribed = true;
    
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const params = { course_id: courseId };
        if (dateRange !== 'all') {
            const d = new Date();
            d.setDate(d.getDate() - parseInt(dateRange));
            params.start_date = d.toISOString();
        }

        const [overviewRes, queueRes] = await Promise.all([
          api.instructor.getOverview(params),
          api.instructor.getPriorityQueue(params)
        ]);
        if (isSubscribed) {
          setData(overviewRes);
          setQueue(queueRes);
        }
      } catch (err) {
        if (isSubscribed) setError(err.message);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }
    fetchData();
    return () => { isSubscribed = false; };
  }, [courseId, dateRange]);

  if (loading) return <LoadingState message="Loading overview..." />;
  if (error) return <EmptyState title="Error" message={error} icon={AlertTriangle} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard label="Active Learners" value={data.active_learners} sub="In selected period" />
        <MetricCard label="Completion Rate" value={data.completion_rate !== null ? `${(data.completion_rate * 100).toFixed(1)}%` : null} sub="Avg progress" />
        <MetricCard label="Avg Accuracy" value={data.avg_accuracy !== null ? `${(data.avg_accuracy * 100).toFixed(1)}%` : null} sub="Quiz performance" />
        <MetricCard label="At Risk" value={data.at_risk_learners} sub=">2 struggles & low acc" />
        <MetricCard label="Q's Attempted" value={data.questions_attempted} sub="Total responses" />
        <MetricCard label="Hint Rate" value={data.intervention_rate !== null ? `${(data.intervention_rate * 100).toFixed(1)}%` : null} sub="Struggles with hints" />
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="font-bold text-[var(--text)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Priority Action Queue
          </h3>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {queue.length === 0 ? (
             <div className="p-8 text-center text-[var(--text-faint)] text-sm">No priority items right now.</div>
          ) : queue.map((item, i) => (
            <div key={i} className="p-4 flex items-center gap-4 hover:bg-[var(--surface-2)] transition-colors">
              <div className={`w-2 h-2 rounded-full ${item.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[var(--text)]">{item.title}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{item.reason}</p>
              </div>
              <button 
                onClick={() => {
                   if (item.action.tab === 'learners') {
                       navigate(`/analytics?tab=learners&course=${item.course_id}&search=${item.action.user_id}`);
                   } else if (item.action.tab === 'concepts') {
                       navigate(`/analytics?tab=concepts&course=${item.course_id}`);
                   }
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
              >
                Review
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConceptsTab({ courseId, dateRange }) {
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!courseId) return;
    let isSubscribed = true;
    async function fetchData() {
      setLoading(true);
      try {
        const params = { course_id: courseId };
        if (dateRange !== 'all') {
            const d = new Date();
            d.setDate(d.getDate() - parseInt(dateRange));
            params.start_date = d.toISOString();
        }
        const data = await api.instructor.getConcepts(params);
        if (isSubscribed) setConcepts(data);
      } catch (err) {
        if (isSubscribed) setError(err.message);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }
    fetchData();
    return () => { isSubscribed = false; };
  }, [courseId, dateRange]);

  if (loading) return <LoadingState message="Loading concepts..." />;
  if (error) return <EmptyState title="Error" message={error} icon={AlertTriangle} />;

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[var(--surface-2)] text-[var(--text-faint)] text-[10px] uppercase tracking-wider font-semibold border-b border-[var(--border)]">
            <tr>
              <th className="px-6 py-3">Topic / Concept</th>
              <th className="px-6 py-3 text-right">Learners</th>
              <th className="px-6 py-3 text-right">Attempts</th>
              <th className="px-6 py-3 text-right">Accuracy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {concepts.length === 0 ? (
               <tr><td colSpan={4} className="p-8 text-center text-xs text-[var(--text-muted)]">No concept data available.</td></tr>
            ) : concepts.map((c, i) => (
              <tr key={i} className="hover:bg-[var(--surface-2)] transition-colors">
                <td className="px-6 py-4 font-medium text-[var(--text)]">{c.topic}</td>
                <td className="px-6 py-4 text-right tabular-nums">{c.learner_count}</td>
                <td className="px-6 py-4 text-right tabular-nums">{c.attempt_count}</td>
                <td className="px-6 py-4 text-right tabular-nums">
                   {c.accuracy !== null ? (
                      <span className={c.accuracy < 0.6 ? 'text-red-500 font-semibold' : 'text-emerald-600'}>
                         {(c.accuracy * 100).toFixed(1)}%
                      </span>
                   ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LearnersTab({ courseId }) {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  
  const [learners, setLearners] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!courseId) return;
    let isSubscribed = true;
    async function fetchData() {
      setLoading(true);
      try {
        const data = await api.instructor.getLearners({ 
            course_id: courseId, 
            page, 
            page_size: 20, 
            search: debouncedSearch 
        });
        if (isSubscribed) {
           setLearners(data.data);
           setTotal(data.total);
        }
      } catch (err) {
        if (isSubscribed) setError(err.message);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }
    fetchData();
    return () => { isSubscribed = false; };
  }, [courseId, page, debouncedSearch]);

  if (error) return <EmptyState title="Error" message={error} icon={AlertTriangle} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-faint)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search learners by name or email..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        {loading && learners.length === 0 ? (
           <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[var(--surface-2)] text-[var(--text-faint)] text-[10px] uppercase tracking-wider font-semibold border-b border-[var(--border)]">
                <tr>
                  <th className="px-6 py-3">Learner</th>
                  <th className="px-6 py-3 text-right">Progress</th>
                  <th className="px-6 py-3 text-right">Accuracy</th>
                  <th className="px-6 py-3 text-right">Struggles</th>
                  <th className="px-6 py-3">Risk Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {learners.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-xs text-[var(--text-muted)]">No learners found.</td></tr>
                ) : learners.map(l => (
                  <tr key={l.id} className="hover:bg-[var(--surface-2)] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-[var(--text)]">{l.name}</p>
                      <p className="text-xs text-[var(--text-faint)]">{l.email}</p>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums">{(l.progress_percent || 0).toFixed(0)}%</td>
                    <td className="px-6 py-4 text-right tabular-nums">{l.accuracy !== null ? `${(l.accuracy * 100).toFixed(1)}%` : '—'}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{l.struggle_count}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        l.risk_tier === 'high' ? 'bg-red-50 text-red-700' :
                        l.risk_tier === 'medium' ? 'bg-amber-50 text-amber-700' :
                        'bg-emerald-50 text-emerald-700'
                      }`}>
                        {l.risk_tier}
                      </span>
                      {l.risk_reasons?.length > 0 && (
                         <p className="text-[10px] text-[var(--text-muted)] mt-1">{l.risk_reasons[0]}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>Showing {learners.length} of {total}</span>
        <div className="flex gap-2">
           <button 
             disabled={page === 1} 
             onClick={() => setPage(p => p - 1)}
             className="px-3 py-1 bg-[var(--surface-2)] rounded disabled:opacity-50"
           >Prev</button>
           <button 
             disabled={learners.length < 20} 
             onClick={() => setPage(p => p + 1)}
             className="px-3 py-1 bg-[var(--surface-2)] rounded disabled:opacity-50"
           >Next</button>
        </div>
      </div>
    </div>
  );
}

function AssessmentsTab({ courseId }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!courseId) return;
    let isSubscribed = true;
    async function fetchData() {
      setLoading(true);
      try {
        const data = await api.instructor.getAssessments({ course_id: courseId });
        if (isSubscribed) setQuestions(data);
      } catch (err) {
        if (isSubscribed) setError(err.message);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }
    fetchData();
    return () => { isSubscribed = false; };
  }, [courseId]);

  if (loading) return <LoadingState message="Loading assessments..." />;
  if (error) return <EmptyState title="Error" message={error} icon={AlertTriangle} />;

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[var(--surface-2)] text-[var(--text-faint)] text-[10px] uppercase tracking-wider font-semibold border-b border-[var(--border)]">
            <tr>
              <th className="px-6 py-3">Question Stem</th>
              <th className="px-6 py-3">Topic</th>
              <th className="px-6 py-3">Difficulty</th>
              <th className="px-6 py-3 text-right">Attempts</th>
              <th className="px-6 py-3 text-right">Accuracy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {questions.length === 0 ? (
               <tr><td colSpan={5} className="p-8 text-center text-xs text-[var(--text-muted)]">No assessment data.</td></tr>
            ) : questions.map(q => (
              <tr key={q.id} className="hover:bg-[var(--surface-2)] transition-colors">
                <td className="px-6 py-4 text-[var(--text)] max-w-xs truncate" title={q.stem}>{q.stem}</td>
                <td className="px-6 py-4 text-[var(--text-muted)]">{q.topic}</td>
                <td className="px-6 py-4 text-[var(--text-muted)]">{q.difficulty}</td>
                <td className="px-6 py-4 text-right tabular-nums">{q.attempts}</td>
                <td className="px-6 py-4 text-right tabular-nums">
                  {q.accuracy !== null ? `${(q.accuracy * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttentionTab({ courseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!courseId) return;
    let isSubscribed = true;
    async function fetchData() {
      setLoading(true);
      try {
        const res = await api.instructor.getAttention({ course_id: courseId });
        if (isSubscribed) setData(res);
      } catch (err) {
        if (isSubscribed) setError(err.message);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }
    fetchData();
    return () => { isSubscribed = false; };
  }, [courseId]);

  if (loading) return <LoadingState message="Loading attention insights..." />;
  if (error) return <EmptyState title="Error" message={error} icon={AlertTriangle} />;
  
  if (!data?.available) {
    return (
      <EmptyState 
        title="Data Unavailable" 
        message={data?.reason || "Attention data is not available."} 
        icon={Shield} 
      />
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 flex gap-4 text-blue-800 dark:text-blue-300">
        <Shield className="w-6 h-6 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-sm">Privacy Statement</h4>
          <p className="text-xs leading-relaxed opacity-90">
            Attention insights are optional, consent-based, and aggregated. 
            Raw learner camera video and raw gaze coordinates are <strong>never</strong> available to instructors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Avg Fixation" value={`${(data.avg_fixation_ms / 1000).toFixed(1)}s`} sub="Before intervention" />
        <MetricCard label="Avg Inactivity" value={`${(data.avg_inactivity_ms / 1000).toFixed(1)}s`} sub="Before intervention" />
        <MetricCard label="Total Struggle Events" value={data.total_events} sub="Analyzed" />
      </div>
    </div>
  );
}

export default function InstructorAnalytics() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(searchParams.get('course') || '');
  const [dateRange, setDateRange] = useState(searchParams.get('range') || '30'); // 'all', '7', '30'
  const [loadingCourses, setLoadingCourses] = useState(true);
  
  const user = getCurrentUser() || { full_name: 'Instructor', role: 'instructor' };
  const initials = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'I';

  useEffect(() => {
    api.instructor.myCourses().then(data => {
      setCourses(data);
      if (data.length > 0 && !selectedCourse) {
         setSelectedCourse(data[0].id.toString());
      }
      setLoadingCourses(false);
    }).catch(err => {
      console.error(err);
      setLoadingCourses(false);
    });
  }, []);

  const updateURLParams = (courseId, range, tab) => {
    setSearchParams({ course: courseId, range, tab }, { replace: true });
  };

  const handleTabChange = (tabId) => {
    updateURLParams(selectedCourse, dateRange, tabId);
  };
  
  const handleCourseChange = (e) => {
    const val = e.target.value;
    setSelectedCourse(val);
    updateURLParams(val, dateRange, activeTab);
  };

  const handleRangeChange = (e) => {
    const val = e.target.value;
    setDateRange(val);
    updateURLParams(selectedCourse, val, activeTab);
  };

  return (
    <div className="flex h-screen app-bg font-sans overflow-hidden">
      {/* Sidebar */}
      <InstructorSidebar activeId="analytics" />

      <main className="flex-1 flex flex-col min-w-0 bg-[var(--bg)] h-full overflow-hidden relative">
        <header className="h-14 shrink-0 bg-[var(--surface)] border-b border-[var(--border)] px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
             <h1 className="text-sm font-bold text-[var(--text)]">Analytics</h1>
             <div className="h-4 w-px bg-[var(--border)]" />
             {loadingCourses ? (
                <div className="h-8 w-48 bg-[var(--surface-2)] animate-pulse rounded-md" />
             ) : (
               <select 
                 value={selectedCourse} 
                 onChange={handleCourseChange}
                 className="text-sm bg-transparent border-none text-[var(--text)] font-medium focus:ring-0 cursor-pointer"
               >
                 {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
               </select>
             )}
          </div>
          <div className="flex items-center gap-4">
             <select 
                 value={dateRange} 
                 onChange={handleRangeChange}
                 className="text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1 text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-teal-500"
             >
                 <option value="7">Last 7 days</option>
                 <option value="30">Last 30 days</option>
                 <option value="all">All time</option>
             </select>
             <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
           {courses.length === 0 && !loadingCourses ? (
              <div className="p-8">
                 <EmptyState title="No courses yet" message="Create a course in your dashboard to see analytics." icon={BookOpen} />
              </div>
           ) : selectedCourse ? (
             <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto">
                <div className="flex border-b border-[var(--border)] gap-6 text-sm font-medium">
                   {ANALYTICS_TABS.map(tab => (
                     <button 
                       key={tab.id}
                       onClick={() => handleTabChange(tab.id)}
                       className={`pb-3 border-b-2 transition-colors ${activeTab === tab.id ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                     >
                       {tab.label}
                     </button>
                   ))}
                </div>

                <div className="mt-6">
                   {activeTab === 'overview' && <OverviewTab courseId={selectedCourse} dateRange={dateRange} />}
                   {activeTab === 'concepts' && <ConceptsTab courseId={selectedCourse} dateRange={dateRange} />}
                   {activeTab === 'learners' && <LearnersTab courseId={selectedCourse} />}
                   {activeTab === 'assessments' && <AssessmentsTab courseId={selectedCourse} />}
                   {activeTab === 'attention' && <AttentionTab courseId={selectedCourse} />}
                </div>
             </div>
           ) : null}
        </div>
      </main>
    </div>
  );
}
