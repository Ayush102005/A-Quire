import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROADMAP } from "../data/roadmap";
import { saveTracks, fetchTracks, sendMilestoneEmail } from "../api";

const YELLOW = "#FFD700";
const ORANGE = "#FF6A00";
const DIM = "#666";
const DIMMER = "#4A4A4A";
const SIDEBAR_W = 240;

// ── ICONS ──
const icons = {
    dashboard: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
    profile: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
    target: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="6" /></svg>,
    checklist: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3 5-5" /><rect x="3" y="3" width="18" height="18" rx="3" /></svg>,
    ai: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 2-1.5 3.5-3 4.5V17h-2v-6.5C9.5 9.5 8 8 8 6a4 4 0 0 1 4-4z" /><path d="M9 21h6M12 17v4" /></svg>,
    settings: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
    logout: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
};

// ── NAV ITEM ──
function NavItem({ icon, label, active, onClick, danger }) {
    const [hov, setHov] = useState(false);
    return (
        <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.6rem 1rem", borderRadius: 10, cursor: "pointer",
                background: active ? "rgba(255,215,0,0.08)" : hov ? "rgba(255,255,255,0.03)" : "transparent",
                color: danger ? (hov ? "#ef4444" : DIMMER) : active ? YELLOW : hov ? "#C0C0C0" : DIMMER,
                borderLeft: active ? `2px solid ${YELLOW}` : "2px solid transparent",
                marginLeft: -1, transition: "all 0.18s",
            }}>
            <span style={{ flexShrink: 0, opacity: active ? 1 : hov ? 0.8 : 0.5 }}>{icon}</span>
            <span style={{ fontSize: "0.875rem", fontWeight: active ? 600 : 400, fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
        </div>
    );
}

export default function LearningTrack() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser, userData, loading, signOut } = useAuth();

    const account = userData?.profile || { name: "Student", category: "college" };
    const catLabel = { school: "School", college: "College", fresher: "Fresher", working: "Working" };

    const [track, setTrack] = useState(null);
    const [openSteps, setOpenSteps] = useState({ 0: true });
    const [completedTopicsArr, setCompletedTopicsArr] = useState(() => {
        const uid = window._aquireUid || "guest";
        const key = `aquire_tracks_${uid}`;
        return JSON.parse(localStorage.getItem(key) || "[]");
    });

    useEffect(() => {
        window.scrollTo(0, 0);
        const foundTrack = ROADMAP.find(r => r.id === id);
        if (!foundTrack) {
            navigate("/dashboard");
        } else {
            setTrack(foundTrack);
        }
    }, [id, navigate]);

    // Load saved tracks from localStorage whenever uid becomes available
    useEffect(() => {
        if (currentUser?.uid) {
            const key = `aquire_tracks_${currentUser.uid}`;
            const saved = JSON.parse(localStorage.getItem(key) || "[]");
            setCompletedTopicsArr(saved);
        }
    }, [currentUser?.uid]);

    if (loading || !track) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0A", color: "#F0F0F0", fontFamily: "'DM Sans', sans-serif" }}>
                Loading {track ? track.title : "Track"}...
            </div>
        );
    }

    const completedTopics = new Set(completedTopicsArr);

    // Calculate Progress Percentages across all nested steps
    let totalTrackItems = 0;
    let trackDoneCount = 0;

    track.topics.forEach(step => {
        totalTrackItems += step.items.length;
        step.items.forEach(item => {
            if (completedTopics.has(`${track.title}::${item.title}`)) {
                trackDoneCount++;
            }
        });
    });

    const progressPercent = totalTrackItems ? Math.round((trackDoneCount / totalTrackItems) * 100) : 0;

    const toggleTopic = (topicTitle) => {
        if (!currentUser) return;
        const trackKey = `${track.title}::${topicTitle}`;
        const key = `aquire_tracks_${currentUser.uid}`;
        const current = JSON.parse(localStorage.getItem(key) || "[]");
        const updated = current.includes(trackKey)
            ? current.filter(t => t !== trackKey)
            : [...current, trackKey];
        // Update localStorage immediately (instant UI)
        localStorage.setItem(key, JSON.stringify(updated));
        setCompletedTopicsArr(updated);
        // Persist to DynamoDB (source of truth)
        saveTracks(updated).catch(err => console.warn("[tracks] DynamoDB save failed:", err));
        // SES: fire milestone email if track just hit 100%
        const newDone = track.topics.reduce((acc, step) =>
            acc + step.items.filter(item => updated.includes(`${track.title}::${item.title}`)).length, 0
        );
        const total = track.topics.reduce((acc, step) => acc + step.items.length, 0);
        if (total > 0 && newDone === total) {
            sendMilestoneEmail(track.title);
        }
    };

    const toggleStep = (index) => {
        setOpenSteps(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const getDifficultyColor = (diff) => {
        if (diff === "Easy") return "#22C55E"; // Green
        if (diff === "Medium") return "#F59E0B"; // Yellow/Orange
        if (diff === "Hard") return "#EF4444"; // Red
        return "#888";
    };

    return (
        <>
            <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { min-height: 100%; width: 100%; background: #0A0A0A; font-family: 'DM Sans', sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0A0A0A; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
      `}</style>

            <div style={{ display: "flex", minHeight: "100vh", background: "#0A0A0A" }}>

                {/* ── SIDEBAR ── */}
                <aside style={{
                    position: "fixed", top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
                    background: "#0D0D0D", borderRight: "1px solid #171717",
                    display: "flex", flexDirection: "column", zIndex: 100, overflowY: "auto",
                }}>
                    <div onClick={() => navigate("/dashboard")} style={{ padding: "1.6rem 1.2rem 1.2rem", borderBottom: "1px solid #171717", cursor: "pointer" }}>
                        <span style={{
                            fontFamily: "'Times New Roman', serif", fontSize: "1.55rem", fontWeight: 800, letterSpacing: "0.12em",
                            background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`,
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                        }}>AQUIRE</span>
                        <div style={{ width: 24, height: 2, background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`, marginTop: "0.3rem", borderRadius: 2 }} />
                    </div>

                    <div style={{ padding: "0.9rem 1rem 0.7rem", borderBottom: "1px solid #171717" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                            <div style={{
                                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                                background: `linear-gradient(135deg, ${YELLOW}, ${ORANGE})`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "0.9rem", fontWeight: 900, color: "#0D0D0D", fontFamily: "'Times New Roman', serif",
                            }}>
                                {(account.name || "?")[0].toUpperCase()}
                            </div>
                            <div style={{ overflow: "hidden", flex: 1 }}>
                                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#D0D0D0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {account.name || "Student"}
                                </div>
                                <span style={{
                                    fontSize: "0.6rem", fontWeight: 700, color: YELLOW,
                                    background: "rgba(255,215,0,0.07)", border: "1px solid rgba(255,215,0,0.18)",
                                    padding: "0.08rem 0.45rem", borderRadius: 100, display: "inline-block", marginTop: "0.15rem",
                                }}>{catLabel[account.category] || "Student"} Student</span>
                            </div>
                        </div>
                    </div>

                    <nav style={{ flex: 1, padding: "0.8rem 0.7rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                        <NavItem icon={icons.dashboard} label="Dashboard" onClick={() => navigate("/dashboard")} />
                        <NavItem icon={icons.target} label="Daily Task" onClick={() => navigate("/dashboard")} />
                        <NavItem icon={icons.checklist} label="Daily Checklist" onClick={() => navigate("/dashboard")} />
                        <NavItem icon={icons.ai} label="AI Review" onClick={() => navigate("/dashboard")} />
                    </nav>

                    <div style={{ padding: "0.8rem 0.7rem", borderTop: "1px solid #171717", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                        <NavItem icon={icons.settings} label="Settings" onClick={() => navigate("/dashboard")} />
                        <NavItem icon={icons.logout} label="Log Out" danger onClick={() => { signOut(); navigate("/login"); }} />
                    </div>
                </aside>

                {/* ── MAIN CONTENT ── */}
                <main style={{ marginLeft: SIDEBAR_W, flex: 1, padding: "3rem 4rem 5rem", maxWidth: 1000 }}>
                    <div style={{ animation: "fadeUp 0.5s ease both" }}>

                        {/* ── TRACK HEADER ── */}
                        <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", marginBottom: "3rem" }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: 20, flexShrink: 0,
                                background: `${track.color}15`, border: `1px solid ${track.color}30`,
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.8rem",
                            }}>
                                {typeof track.icon === "string" ? track.icon : track.icon ? (() => { const Icon = track.icon; return <Icon size={40} color={track.color} strokeWidth={1.5} />; })() : null}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "2.6rem", fontWeight: 800, color: "#F0F0F0", lineHeight: 1.1, marginBottom: "0.4rem" }}>
                                    {track.title}
                                </h1>
                                <p style={{ fontSize: "1rem", color: "#A0A0A0", fontWeight: 400, maxWidth: "80%" }}>
                                    {track.subtitle}
                                </p>

                                {/* GLOBAL TRACK PROGRESS BAR */}
                                <div style={{ marginTop: "1.8rem", maxWidth: 400 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
                                        <span style={{ fontSize: "0.75rem", color: "#909090", fontWeight: 500 }}>{trackDoneCount} of {totalTrackItems} problems solved</span>
                                        <span style={{ fontSize: "0.85rem", color: track.color, fontWeight: 700 }}>{progressPercent}%</span>
                                    </div>
                                    <div style={{ height: 8, background: "#181818", borderRadius: 4, overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${progressPercent}%`, borderRadius: 4, background: track.color, transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── SYLLABUS ACCORDIONS (Striver A2Z Style) ── */}
                        <div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                {track.topics.map((step, stepIndex) => {
                                    const isOpen = openSteps[stepIndex];

                                    // Calculate local step progress
                                    const stepTotal = step.items.length;
                                    const stepDone = step.items.filter(item => completedTopics.has(`${track.title}::${item.title}`)).length;
                                    const stepProgress = stepTotal ? Math.round((stepDone / stepTotal) * 100) : 0;
                                    const isAllDone = stepDone === stepTotal && stepTotal > 0;

                                    return (
                                        <div key={step.title} style={{
                                            background: "#111111", border: "1px solid #1A1A1A",
                                            borderRadius: 14, overflow: "hidden", transition: "all 0.3s"
                                        }}>

                                            {/* ACCORDION HEADER */}
                                            <div
                                                onClick={() => toggleStep(stepIndex)}
                                                style={{
                                                    padding: "1.2rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between",
                                                    cursor: "pointer", background: isOpen ? "#161616" : "transparent"
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                                    {/* Step Completion Circle */}
                                                    <div style={{
                                                        width: 32, height: 32, borderRadius: "50%",
                                                        border: `2px solid ${isAllDone ? "#22C55E" : "#2A2A2A"}`,
                                                        background: isAllDone ? "rgba(34,197,94,0.15)" : "transparent",
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        color: isAllDone ? "#22C55E" : DIMMER, fontSize: "0.9rem", fontWeight: 700
                                                    }}>
                                                        {isAllDone ? "✓" : (stepIndex + 1)}
                                                    </div>
                                                    <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#E0E0E0", letterSpacing: "0.01em" }}>
                                                        {step.title}
                                                    </h2>
                                                </div>

                                                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                                                    {/* Local Progress Indicator */}
                                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem", width: 80 }}>
                                                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#909090", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                                            {stepDone} / {stepTotal}
                                                        </span>
                                                        <div style={{ width: "100%", height: 4, background: "#1F1F1F", borderRadius: 2, overflow: "hidden" }}>
                                                            <div style={{ height: "100%", width: `${stepProgress}%`, background: isAllDone ? "#22C55E" : track.color, transition: "width 0.4s ease" }} />
                                                        </div>
                                                    </div>

                                                    {/* Expand Icon */}
                                                    <span style={{
                                                        fontSize: "1rem", color: "#555",
                                                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s"
                                                    }}>
                                                        ▼
                                                    </span>
                                                </div>
                                            </div>

                                            {/* ACCORDION CONTENT (TABLE OF PROBLEMS) */}
                                            {isOpen && (
                                                <div style={{ borderTop: "1px solid #1A1A1A", background: "#0A0A0A" }}>
                                                    {step.items.map((item, itemIndex) => {
                                                        const trackKey = `${track.title}::${item.title}`;
                                                        const isDone = completedTopics.has(trackKey);
                                                        const diffColor = getDifficultyColor(item.difficulty);

                                                        return (
                                                            <div key={itemIndex} style={{
                                                                display: "flex", alignItems: "center", gap: "1.2rem",
                                                                padding: "1.1rem 1.5rem", borderBottom: itemIndex === step.items.length - 1 ? "none" : "1px solid #141414",
                                                                transition: "background 0.2s"
                                                            }}
                                                                onMouseEnter={e => { e.currentTarget.style.background = "#0D0D0D"; }}
                                                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>

                                                                {/* Status Checkbox */}
                                                                <div
                                                                    onClick={() => toggleTopic(item.title)}
                                                                    style={{
                                                                        width: 22, height: 22, borderRadius: 6, cursor: "pointer",
                                                                        border: `2px solid ${isDone ? "#22C55E" : "#333"}`,
                                                                        background: isDone ? "rgba(34,197,94,0.15)" : "#0F0F0F",
                                                                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                                                        transition: "all 0.2s",
                                                                        boxShadow: isDone ? "0 0 10px rgba(34,197,94,0.2)" : "none"
                                                                    }}
                                                                    onMouseEnter={e => { if (!isDone) e.target.style.borderColor = "#555"; }}
                                                                    onMouseLeave={e => { if (!isDone) e.target.style.borderColor = "#333"; }}
                                                                >
                                                                    {isDone && <span style={{ color: "#22C55E", fontSize: "0.8rem", fontWeight: 900 }}>✓</span>}
                                                                </div>

                                                                {/* Problem Title & Badge */}
                                                                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "1rem" }}>
                                                                    <span style={{
                                                                        fontSize: "0.98rem", color: isDone ? "#777" : "#E0E0E0", fontWeight: 500,
                                                                        textDecoration: isDone ? "line-through" : "none", transition: "color 0.2s"
                                                                    }}>
                                                                        {item.title}
                                                                    </span>

                                                                    <span style={{
                                                                        fontSize: "0.6rem", fontWeight: 700, padding: "0.15rem 0.5rem",
                                                                        borderRadius: 100, border: `1px solid ${diffColor}40`, color: diffColor,
                                                                        background: `${diffColor}10`, letterSpacing: "0.05em", textTransform: "uppercase"
                                                                    }}>
                                                                        {item.difficulty}
                                                                    </span>
                                                                </div>

                                                                {/* Action Navigate to Unified Learning Page */}
                                                                <div
                                                                    onClick={() => navigate(`/solve/${track.id}/${encodeURIComponent(item.title)}`)}
                                                                    style={{
                                                                        fontSize: "0.75rem", fontWeight: 700, color: "#3B82F6", cursor: "pointer",
                                                                        padding: "0.4rem 0.8rem", borderRadius: 6, background: "rgba(59,130,246,0.1)",
                                                                        transition: "background 0.2s"
                                                                    }}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.2)"; }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; }}
                                                                >
                                                                    Solve ⬈
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </>
    );
}
