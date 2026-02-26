import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Target, CheckSquare, Sparkles, Search, Bell, Menu, Flame, Trophy, TrendingUp, User as UserIcon, Settings as SettingsIcon, CreditCard, LogOut, Play, BookOpen, Clock, Plus, Calendar, ChevronRight } from 'lucide-react';
import '../App.css';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('Overview');

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const toggleAccountMenu = () => {
        setAccountMenuOpen(!accountMenuOpen);
    };

    return (
        <div className="dashboard-container">
            {/* Top Fixed Header */}
            <header className="dashboard-header">
                <div className="header-left">
                    <button className="icon-btn menu-toggle" onClick={toggleSidebar}>
                        <Menu size={24} color="#fff" />
                    </button>
                    <div className="header-logo">
                        <Zap className="logo-icon border-accent" size={28} />
                        <span>A-Quire</span>
                    </div>
                </div>

                <div className="header-right">
                    <div className="search-bar">
                        <Search size={18} color="#888" />
                        <input type="text" placeholder="Search..." />
                    </div>
                    <div className="header-actions">
                        <button className="icon-btn">
                            <Bell size={20} />
                        </button>
                        <div className="user-profile" onClick={toggleAccountMenu}>
                            <div className="avatar">A</div>
                            <div className={`account-dropdown ${accountMenuOpen ? 'open' : ''}`}>
                                <div className="dropdown-header">
                                    <strong>Ayush Kumar</strong>
                                    <span>Student Plan</span>
                                </div>
                                <div className="dropdown-divider"></div>
                                <a href="#" className="dropdown-item">
                                    <UserIcon size={16} /> Profile Settings
                                </a>
                                <a href="#" className="dropdown-item">
                                    <Sparkles size={16} /> Subscription
                                </a>
                                <div className="dropdown-divider"></div>
                                <a href="#" className="dropdown-item logout-item">
                                    <LogOut size={16} /> Sign Out
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Layout Below Header */}
            <div className="dashboard-body">
                {/* Sidebar */}
                <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                    <nav className="sidebar-nav">
                        <button
                            className={`nav-item ${activeTab === 'Overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('Overview')}
                        >
                            <Zap size={20} />
                            Overview
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'Create Goals' ? 'active' : ''}`}
                            onClick={() => setActiveTab('Create Goals')}
                        >
                            <Target size={20} />
                            Create Goals
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'Checklist' ? 'active' : ''}`}
                            onClick={() => setActiveTab('Checklist')}
                        >
                            <CheckSquare size={20} />
                            Checklist
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'AI Suggestion' ? 'active' : ''}`}
                            onClick={() => setActiveTab('AI Suggestion')}
                        >
                            <Sparkles size={20} />
                            AI Suggestion
                        </button>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="dashboard-main">
                    {/* Dashboard Content area */}
                    <div className="dashboard-content">
                        {activeTab === 'Overview' && (
                            <>
                                <h1 className="dashboard-title">Student Overview</h1>
                                <p className="dashboard-subtitle">Welcome back, Ayush.</p>

                                <div className="stats-grid">
                                    {/* Streak Calendar Card */}
                                    <div className="stat-card calendar-card">
                                        <div className="calendar-header">
                                            <h3>Study Streak</h3>
                                            <div className="streak-badge">
                                                <Flame size={16} color="#ffcc3f" fill="#ffcc3f" />
                                                <span>12 Days</span>
                                            </div>
                                        </div>
                                        <div className="mini-calendar">
                                            <div className="calendar-days">
                                                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                                            </div>
                                            <div className="calendar-grid">
                                                {/* Mocking past days as active (green), current day as active with outline, future days as empty */}
                                                <div className="day empty"></div><div className="day empty"></div>
                                                <div className="day active">1</div><div className="day active">2</div><div className="day active">3</div><div className="day active">4</div><div className="day active">5</div>
                                                <div className="day active">6</div><div className="day active">7</div><div className="day active">8</div><div className="day active">9</div><div className="day active">10</div><div className="day active">11</div><div className="day active current">12</div>
                                                <div className="day">13</div><div className="day">14</div><div className="day">15</div><div className="day">16</div><div className="day">17</div><div className="day">18</div><div className="day">19</div>
                                                <div className="day">20</div><div className="day">21</div><div className="day">22</div><div className="day">23</div><div className="day">24</div><div className="day">25</div><div className="day">26</div>
                                                <div className="day">27</div><div className="day">28</div><div className="day">29</div><div className="day">30</div><div className="day">31</div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Ranking & AI Usage Card */}
                                    {/* Ranking & AI Usage Card */}
                                    <div className="stat-card ranking-ai-card">
                                        <div className="card-header-split">
                                            <div className="ranking-section">
                                                <h3>Class Ranking</h3>
                                                <div className="ranking-value">
                                                    <Trophy size={24} color="#ffcc3f" />
                                                    <span>#4</span>
                                                    <span className="ranking-total">/ 120</span>
                                                </div>
                                            </div>
                                            <div className="ai-usage-section">
                                                <h3>AI Hint Usage</h3>
                                                <div className="usage-trend">
                                                    <TrendingUp size={16} color="#00e676" />
                                                    <span>-12% this week</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ai-graph-placeholder">
                                            <div className="graph-bar" style={{ height: '40%' }}><span>Mon</span></div>
                                            <div className="graph-bar" style={{ height: '60%' }}><span>Tue</span></div>
                                            <div className="graph-bar" style={{ height: '30%' }}><span>Wed</span></div>
                                            <div className="graph-bar highlight" style={{ height: '80%' }}><span>Thu</span></div>
                                            <div className="graph-bar" style={{ height: '50%' }}><span>Fri</span></div>
                                            <div className="graph-bar" style={{ height: '20%' }}><span>Sat</span></div>
                                            <div className="graph-bar" style={{ height: '10%' }}><span>Sun</span></div>
                                        </div>
                                    </div>

                                    {/* Learning Hours Card */}
                                    <div className="stat-card learning-hours-card">
                                        <div className="card-header-split" style={{ marginBottom: '1rem' }}>
                                            <div className="ranking-section">
                                                <h3>Hours Learned</h3>
                                                <div className="ranking-value" style={{ marginTop: '0.5rem' }}>
                                                    <Clock size={24} color="#2196f3" />
                                                    <span>24.5</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="learning-goal-section" style={{ marginTop: 'auto' }}>
                                            <div className="card-header-split" style={{ marginBottom: '0.4rem' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Weekly Target</span>
                                                <span style={{ fontSize: '0.8rem', color: '#2196f3', fontWeight: 'bold' }}>82%</span>
                                            </div>
                                            <div className="progress-bar-container">
                                                <div className="progress-bar" style={{ width: '82%', backgroundColor: '#2196f3' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Enrolled Courses Area */}
                                <section className="dashboard-section mt-8">
                                    <div className="section-header">
                                        <h2>My Courses</h2>
                                        <a href="#" className="view-all-link">View All</a>
                                    </div>
                                    <div className="courses-grid">
                                        {/* Course Card 1 */}
                                        <div className="course-card">
                                            <div className="course-icon bg-purple">
                                                <BookOpen size={24} />
                                            </div>
                                            <div className="course-info">
                                                <h3>Introduction to Data Structures</h3>
                                                <p>12/24 Modules Completed</p>
                                                <div className="progress-bar-container">
                                                    <div className="progress-bar" style={{ width: '50%' }}></div>
                                                </div>
                                            </div>
                                            <button className="icon-btn play-btn" title="Continue Learning" onClick={() => navigate('/learning/123')}><Play size={18} fill="currentColor" /></button>
                                        </div>

                                        {/* Course Card 2 */}
                                        <div className="course-card">
                                            <div className="course-icon bg-blue">
                                                <Target size={24} />
                                            </div>
                                            <div className="course-info">
                                                <h3>Advanced React Patterns</h3>
                                                <p>3/10 Modules Completed</p>
                                                <div className="progress-bar-container">
                                                    <div className="progress-bar" style={{ width: '30%' }}></div>
                                                </div>
                                            </div>
                                            <button className="icon-btn play-btn" title="Continue Learning" onClick={() => navigate('/learning/456')}><Play size={18} fill="currentColor" /></button>
                                        </div>

                                        {/* Course Card 3 */}
                                        <div className="course-card">
                                            <div className="course-icon bg-orange">
                                                <Sparkles size={24} />
                                            </div>
                                            <div className="course-info">
                                                <h3>Machine Learning Basics</h3>
                                                <p>2/20 Modules Completed</p>
                                                <div className="progress-bar-container">
                                                    <div className="progress-bar" style={{ width: '10%' }}></div>
                                                </div>
                                            </div>
                                            <button className="icon-btn play-btn" title="Continue Learning" onClick={() => navigate('/learning/789')}><Play size={18} fill="currentColor" /></button>
                                        </div>
                                    </div>
                                </section>
                            </>
                        )}

                        {activeTab === 'Create Goals' && (
                            <div className="goals-view">
                                <div className="goals-header-area">
                                    <Target size={40} color="var(--primary-color)" />
                                    <div>
                                        <h2>Learning Goals</h2>
                                        <p className="dashboard-subtitle">Set clear objectives to keep your AI mentor informed of your targets.</p>
                                    </div>
                                </div>

                                <div className="goals-content-split mt-8">
                                    <div className="create-goal-card">
                                        <h3>Draft a New Goal</h3>
                                        <form className="goal-form mt-4" onSubmit={(e) => e.preventDefault()}>
                                            <div className="form-group">
                                                <label>Goal Title</label>
                                                <input type="text" placeholder="e.g. Master React Hooks" className="goal-input" />
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Category</label>
                                                    <select className="goal-select">
                                                        <option>Frontend Development</option>
                                                        <option>Backend Development</option>
                                                        <option>Data Structures</option>
                                                        <option>System Design</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>Target Date</label>
                                                    <input type="date" className="goal-input" />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Why is this important?</label>
                                                <textarea placeholder="Tell Kiro why you want to learn this..." className="goal-textarea"></textarea>
                                            </div>
                                            <button type="submit" className="primary-btn mt-4 w-full flex-center">
                                                <Plus size={18} className="mr-2" /> Add Goal
                                            </button>
                                        </form>
                                    </div>

                                    <div className="active-goals-list">
                                        <h3>Current Active Goals</h3>
                                        <div className="goal-items-container mt-4">
                                            <div className="active-goal-item">
                                                <div className="goal-item-icon bg-blue">
                                                    <BookOpen size={20} />
                                                </div>
                                                <div className="goal-item-details">
                                                    <h4>Complete Advanced Algorithms</h4>
                                                    <span className="goal-due-date"><Calendar size={12} /> Due Tomorrow</span>
                                                </div>
                                                <button className="icon-btn"><ChevronRight size={20} /></button>
                                            </div>

                                            <div className="active-goal-item">
                                                <div className="goal-item-icon bg-orange">
                                                    <Target size={20} />
                                                </div>
                                                <div className="goal-item-details">
                                                    <h4>Build 3 Full-stack Projects</h4>
                                                    <span className="goal-due-date"><Calendar size={12} /> Due in 2 weeks</span>
                                                </div>
                                                <button className="icon-btn"><ChevronRight size={20} /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Checklist' && (
                            <div className="placeholder-view">
                                <CheckSquare size={48} color="var(--primary-color)" />
                                <h2>Completed Goals</h2>
                                <p className="dashboard-subtitle mt-2">Goals you have successfully achieved.</p>
                                <ul className="todo-mockup mt-6">
                                    <li className="completed"><CheckSquare size={16} color="#00e676" /> <span>Finish Dynamic Programming Lecture #4</span></li>
                                    <li className="completed"><CheckSquare size={16} color="#00e676" /> <span>Implement `findMax` algorithm</span></li>
                                    <li className="completed"><CheckSquare size={16} color="#00e676" /> <span>Review Kiro's feedback on memory optimization</span></li>
                                    <li className="completed"><CheckSquare size={16} color="#00e676" /> <span>Read chapter 5 of clean code</span></li>
                                </ul>
                            </div>
                        )}

                        {activeTab === 'AI Suggestion' && (
                            <div className="ai-insights-view">
                                <div className="goals-header-area">
                                    <Sparkles size={40} color="#ffcc3f" />
                                    <div>
                                        <h2>Kiro's Insights Feed</h2>
                                        <p className="dashboard-subtitle">Personalized learning suggestions based on your recent activity.</p>
                                    </div>
                                </div>

                                <div className="insights-feed mt-8">
                                    {/* Insight Card 1 */}
                                    <div className="insight-card urgent">
                                        <div className="insight-icon-area">
                                            <div className="icon-pulse bg-orange">
                                                <Zap size={20} />
                                            </div>
                                        </div>
                                        <div className="insight-content">
                                            <div className="insight-header">
                                                <h3>Struggle Detected: Array Indexing</h3>
                                                <span className="insight-time">2 hours ago</span>
                                            </div>
                                            <p>I noticed you frequently paused and rewound during the "Linked Lists vs Arrays" video when discussing memory offsets. Would you like to review a quick 3-minute interactive exercise on array indexing?</p>
                                            <div className="insight-actions mt-4">
                                                <button className="primary-btn flex-center py-2 px-4 shadow-btn"><Play size={16} className="mr-2" /> Review Now</button>
                                                <button className="secondary-btn flex-center py-2 px-4">Dismiss</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Insight Card 2 */}
                                    <div className="insight-card">
                                        <div className="insight-icon-area">
                                            <div className="icon-pulse bg-blue">
                                                <Trophy size={20} />
                                            </div>
                                        </div>
                                        <div className="insight-content">
                                            <div className="insight-header">
                                                <h3>Goal Approaching: Build 3 Full-stack Projects</h3>
                                                <span className="insight-time">1 day ago</span>
                                            </div>
                                            <p>You're making great progress! However, you haven't touched backend routing yet. Check out Lesson 7 in "Advanced React Patterns" to get started.</p>
                                            <div className="insight-actions mt-4">
                                                <button className="nav-btn flex-center" onClick={() => navigate('/learning/456')}>Go to Lesson 7 <ChevronRight size={16} /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
