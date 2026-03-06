import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, CheckCircle, Video, BookOpen, MessageSquare, Code, Terminal, ChevronLeft, Loader } from "lucide-react";
import { ROADMAP } from "../data/roadmap";
import { sendGazeEvent, synthesizeSpeech, sessionStart } from "../api/index";
import html2canvas from "html2canvas";
import { GazeTracker } from "../utils/GazeTracker";

const YELLOW = "#FFD700";
const ORANGE = "#FF6A00";

const LANGUAGES = [
    { id: "javascript", label: "JavaScript", ext: "js", color: "#F7DF1E", mono: "#F7DF1E" },
    { id: "python", label: "Python", ext: "py", color: "#3B82F6", mono: "#60A5FA" },
    { id: "java", label: "Java", ext: "java", color: "#F97316", mono: "#FB923C" },
    { id: "cpp", label: "C++", ext: "cpp", color: "#8B5CF6", mono: "#A78BFA" },
    { id: "c", label: "C", ext: "c", color: "#6B7280", mono: "#9CA3AF" },
    { id: "go", label: "Go", ext: "go", color: "#06B6D4", mono: "#22D3EE" },
    { id: "rust", label: "Rust", ext: "rs", color: "#EF4444", mono: "#F87171" },
    { id: "typescript", label: "TypeScript", ext: "ts", color: "#3B82F6", mono: "#60A5FA" },
];

const STARTER_TEMPLATES = {
    javascript: (title) => `/**\n * ${title}\n */\nfunction solution() {\n    \n}`,
    python: (title) => `# ${title}\n\ndef solution():\n    pass`,
    java: (title) => `// ${title}\nimport java.util.*;\n\nclass Solution {\n    public void solve() {\n        \n    }\n}`,
    cpp: (title) => `// ${title}\n#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        \n    }\n};`,
    c: (title) => `// ${title}\n#include <stdio.h>\n#include <stdlib.h>\n\nvoid solution() {\n    \n}`,
    go: (title) => `// ${title}\npackage main\n\nimport "fmt"\n\nfunc solution() {\n    \n}\n\nfunc main() {\n    fmt.Println("Hello")\n}`,
    rust: (title) => `// ${title}\nfn solution() {\n    \n}\n\nfn main() {\n    solution();\n}`,
    typescript: (title) => `// ${title}\n\nfunction solution(): void {\n    \n}`,
};

const DEFAULT_PROBLEM = {
    title: "Problem Not Found",
    difficulty: "Easy",
    description: "Could not load the description for this problem. Please select a problem from the Learning Track.",
    examples: [],
    starterCode: "// Write your code here\n"
};

export default function UnifiedLearning() {
    const { trackId, topicId } = useParams();
    const navigate = useNavigate();

    // Safely resolve problem info from ROADMAP
    let problemInfo = { ...DEFAULT_PROBLEM, title: topicId ? decodeURIComponent(topicId) : "Unknown Problem" };

    if (trackId && topicId && ROADMAP) {
        const decodedTopic = decodeURIComponent(topicId);
        const track = ROADMAP.find((r) => r.id === trackId);
        if (track && Array.isArray(track.topics)) {
            outer: for (const step of track.topics) {
                if (Array.isArray(step.items)) {
                    for (const item of step.items) {
                        if (item.title === decodedTopic) {
                            problemInfo = {
                                title: item.title || decodedTopic,
                                difficulty: item.difficulty || "Easy",
                                description: item.description || `Implement the solution for "${item.title}". Consider the optimal time and space complexity for your approach.`,
                                examples: Array.isArray(item.examples) ? item.examples : [],
                                starterCode: item.starterCode || `// Write your solution for ${item.title} here\n\nfunction solve() {\n    \n}\n`,
                                youtube: item.youtube || null,
                            };
                            break outer;
                        }
                    }
                }
            }
        }
    }

    // Split description into problem statement and algorithm hints
    const splitDescription = (desc) => {
        const markers = [
            "\n\nAlgorithm:", "\n\nApproach:", "\n\nOptimal Approach:",
            "\n\nOptimal (", "\n\nKey insight:", "\n\nApproach 1",
            "\n\nTopics to cover:", "\n\nKey containers",
        ];
        let splitIdx = desc.length;
        for (const marker of markers) {
            const idx = desc.indexOf(marker);
            if (idx !== -1 && idx < splitIdx) splitIdx = idx;
        }
        return {
            question: desc.slice(0, splitIdx).trim(),
            hint: splitIdx < desc.length ? desc.slice(splitIdx).trim() : "",
        };
    };

    // ── STATE ──
    const [leftTab, setLeftTab] = useState("problem");
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [language, setLanguage] = useState("javascript");
    const [code, setCode] = useState(typeof problemInfo.starterCode === "string" ? problemInfo.starterCode : "");
    const [consoleOutput, setConsoleOutput] = useState("Ready. Run your code to see output here.");
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [langDropdownOpen, setLangDropdownOpen] = useState(false);

    // ── CloudWatch: emit SessionStart on mount ──
    useEffect(() => {
        if (trackId) sessionStart(trackId);
    }, [trackId]);

    // When language changes, inject starter template (preserve existing edits as a user choice)
    const handleLanguageChange = (langId) => {
        setLanguage(langId);
        setLangDropdownOpen(false);
        const template = STARTER_TEMPLATES[langId];
        setCode(template ? template(problemInfo.title) : "");
    };
    const [chatHistory, setChatHistory] = useState([
        {
            id: "msg-0",
            text: `Hello! I am Kiro, your AI Mentor. Let's tackle "${problemInfo.title}" together. I'll guide you with hints when you seem stuck.`,
            sender: "kiro",
            timestamp: new Date().toISOString()
        }
    ]);

    // Gaze state: "focused" | "confused" | "distracted"
    const [gazeState, setGazeState] = useState("focused");
    const [heatmapDots, setHeatmapDots] = useState([]);
    const [ghostMessage, setGhostMessage] = useState(null); // { text, type } | null

    const videoRef = useRef(null);
    const chatHistoryRef = useRef(chatHistory);
    const chatBottomRef = useRef(null);
    const chatInputRef = useRef(null);               // chat input field
    const codeRef = useRef(code);               // always-fresh code for hint
    const lastHintTime = useRef(0);                  // cooldown: epoch ms
    const lastTypedTime = useRef(Date.now());         // idle detection
    const gazeTrackerRef = useRef(null);               // GazeTracker instance
    const HINT_COOLDOWN_MS = 60_000;                     // 60 s between hints
    const IDLE_TIMEOUT_MS = 5 * 60_000;                 // 5 min idle → confused hint
    const TYPING_GRACE_MS = 15_000;                      // 15 s after last keystroke → no confused hint

    // Keep refs in sync
    useEffect(() => { chatHistoryRef.current = chatHistory; }, [chatHistory]);
    useEffect(() => { codeRef.current = code; }, [code]);

    // Auto-scroll chat
    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);


    // Play Polly audio
    const playAudioResponse = async (text) => {
        try {
            const audioBlob = await synthesizeSpeech(text);
            const audioUrl = URL.createObjectURL(audioBlob);
            new Audio(audioUrl).play();
        } catch (e) {
            console.warn("Audio synthesis skipped:", e);
        }
    };

    // Capture screen as base64 JPEG (skips <video> elements)
    const captureScreen = useCallback(async () => {
        try {
            const canvas = await html2canvas(document.body, {
                scale: 0.5, useCORS: true, logging: false,
                ignoreElements: (el) => el.tagName === "VIDEO",
            });
            return canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
        } catch (e) {
            console.warn("[Kiro] Screen capture failed:", e);
            return null;
        }
    }, []);

    // Central function that fires a Kiro hint (with cooldown guard)
    const fireKiroHint = useCallback(async (state) => {
        const now = Date.now();

        // Don't fire "confused" while user is actively typing (fixation is expected)
        if (state === "confused" && now - lastTypedTime.current < TYPING_GRACE_MS) {
            return;
        }

        const timeSinceLastHint = now - lastHintTime.current;
        if (timeSinceLastHint < HINT_COOLDOWN_MS && lastHintTime.current > 0) {
            return; // cooldown
        }
        lastHintTime.current = now;

        setIsAiThinking(true);
        const [screenshot, currentCode] = await Promise.all([
            captureScreen(),
            Promise.resolve(codeRef.current),
        ]);

        try {
            const res = await sendGazeEvent(
                trackId,
                problemInfo.title,
                state,
                chatHistoryRef.current,
                screenshot,
                currentCode
            );
            if (res?.ai_response) {
                const emoji = state === "confused" ? "🤔" : "🖱️";
                const msg = res.ai_response;
                setChatHistory(prev => [...prev, {
                    id: `msg-${Date.now()}`,
                    text: `${emoji} ${msg}`,
                    sender: "kiro",
                    timestamp: new Date().toISOString()
                }]);
                // Show AI ghost
                setGhostMessage({ text: msg, type: state });
                setTimeout(() => setGhostMessage(null), 8000);
                playAudioResponse(msg);
            }
        } catch (e) {
            console.error("[Kiro] API call failed:", e);
            const fallbackText = state === "confused"
                ? "Yaar, ek baar socho — is problem ka sabse chhota part kya hai jo tum solve kar sakte ho?"
                : "Wapas aa gaye! Chalo phir shuru karte hain — kahan atke the?";
            const emoji = state === "confused" ? "🤔" : "🖱️";
            
            // Check if authentication error
            if (e.message && e.message.includes("Authentication failed")) {
                console.error("[Kiro] Authentication error - session may have expired");
                setChatHistory(prev => [...prev, {
                    id: `msg-${Date.now()}`,
                    text: `⚠️ Your session has expired. Please refresh the page and log in again.`,
                    sender: "kiro",
                    timestamp: new Date().toISOString()
                }]);
            } else {
                setChatHistory(prev => [...prev, {
                    id: `msg-${Date.now()}`,
                    text: `${emoji} ${fallbackText}`,
                    sender: "kiro",
                    timestamp: new Date().toISOString()
                }]);
                setGhostMessage({ text: fallbackText, type: state });
                setTimeout(() => setGhostMessage(null), 8000);
            }
        } finally {
            setIsAiThinking(false);
        }
    }, [captureScreen, trackId, problemInfo.title]); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle regular chat messages from user
    const handleSendMessage = useCallback(async (userMessage) => {
        if (!userMessage.trim()) return;
        
        // Add user message to chat
        const userMsg = { 
            id: `msg-${Date.now()}`, 
            text: userMessage, 
            sender: "student", 
            timestamp: new Date().toISOString() 
        };
        setChatHistory(prev => [...prev, userMsg]);
        
        // Call AI backend
        setIsAiThinking(true);
        try {
            const [screenshot, currentCode] = await Promise.all([
                captureScreen(),
                Promise.resolve(codeRef.current),
            ]);
            
            const updatedHistory = [...chatHistoryRef.current, userMsg];
            
            const res = await sendGazeEvent(
                trackId,
                problemInfo.title,
                "chat_message",  // Special state for regular chat
                updatedHistory,
                screenshot,
                currentCode
            );
            
            if (res?.ai_response) {
                const aiMsg = {
                    id: `msg-${Date.now()}`,
                    text: res.ai_response,
                    sender: "kiro",
                    timestamp: new Date().toISOString()
                };
                setChatHistory(prev => [...prev, aiMsg]);
                playAudioResponse(res.ai_response);
            }
        } catch (e) {
            console.error("[Chat] API call failed:", e);
            
            // Check if authentication error
            if (e.message && e.message.includes("Authentication failed")) {
                const authErrorMsg = {
                    id: `msg-${Date.now()}`,
                    text: "⚠️ Your session has expired. Please refresh the page and log in again.",
                    sender: "kiro",
                    timestamp: new Date().toISOString()
                };
                setChatHistory(prev => [...prev, authErrorMsg]);
            } else {
                const fallbackMsg = {
                    id: `msg-${Date.now()}`,
                    text: "Sorry, I encountered an error. Please try again.",
                    sender: "kiro",
                    timestamp: new Date().toISOString()
                };
                setChatHistory(prev => [...prev, fallbackMsg]);
            }
        } finally {
            setIsAiThinking(false);
        }
    }, [captureScreen, trackId, problemInfo.title]); // eslint-disable-line react-hooks/exhaustive-deps

    // Idle typing detection — fire confused hint if no typing for 5 min
    // Must come AFTER fireKiroHint is defined to avoid temporal dead zone
    const fireKiroHintRef = useRef(null);
    fireKiroHintRef.current = fireKiroHint; // always-fresh without re-creating interval
    useEffect(() => {
        const tick = setInterval(() => {
            if (Date.now() - lastTypedTime.current > IDLE_TIMEOUT_MS) {
                fireKiroHintRef.current?.("confused");
                lastTypedTime.current = Date.now();
            }
        }, 30_000);
        return () => clearInterval(tick);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── CAMERA + GAZE TRACKER + MOUSE FALLBACK ──
    useEffect(() => {
        let stream = null;
        let mouseLeaveTimer = null;
        const tracker = new GazeTracker();
        gazeTrackerRef.current = tracker;
        let gazeTrackerRunning = false;

        // ── MediaPipe iris tracking ──
        tracker.onStateChange((newState) => {
            setGazeState(newState);
            if (newState === "confused" || newState === "distracted") {
                // Use ref to ensure we call the latest version of fireKiroHint
                if (fireKiroHintRef.current) {
                    fireKiroHintRef.current(newState);
                }
            }
        });

        async function startCamera() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = async () => {
                        await tracker.start(videoRef.current);
                        gazeTrackerRunning = tracker._running;
                    };
                }
            } catch (err) {
                console.warn("[Kiro] Camera denied — using mouse fallback only:", err);
            }
        }

        // ── Mouse-leave fallback (always active regardless of MediaPipe) ──
        // This drives state when MediaPipe hasn't loaded or camera is denied.
        const handleMouseLeave = () => {
            mouseLeaveTimer = setTimeout(() => {
                // Only override if MediaPipe isn't tracking (avoids conflict)
                if (!gazeTrackerRunning) {
                    setGazeState("distracted");
                    if (fireKiroHintRef.current) {
                        fireKiroHintRef.current("distracted");
                    }
                }
            }, 3000);
        };

        const handleMouseEnter = () => {
            if (mouseLeaveTimer) {
                clearTimeout(mouseLeaveTimer);
                mouseLeaveTimer = null;
            }
            if (!gazeTrackerRunning) {
                setGazeState("focused");
            }
        };

        // ── Click heatmap ──
        const handleClick = (e) => {
            const dot = { id: Date.now(), x: e.clientX, y: e.clientY };
            setHeatmapDots(prev => [...prev.slice(-49), dot]);
            setTimeout(() => setHeatmapDots(prev => prev.filter(d => d.id !== dot.id)), 3000);
        };

        document.addEventListener("mouseleave", handleMouseLeave);
        document.addEventListener("mouseenter", handleMouseEnter);
        document.addEventListener("click", handleClick);
        startCamera();

        return () => {
            tracker.stop();
            stream?.getTracks().forEach(t => t.stop());
            if (mouseLeaveTimer) clearTimeout(mouseLeaveTimer);
            document.removeEventListener("mouseleave", handleMouseLeave);
            document.removeEventListener("mouseenter", handleMouseEnter);
            document.removeEventListener("click", handleClick);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    const diffColor = problemInfo.difficulty === "Easy" ? "#22C55E" : problemInfo.difficulty === "Medium" ? "#F59E0B" : "#EF4444";
    const safeCode = typeof code === "string" ? code : "";

    // ── RENDER ──
    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: "#0A0A0A", color: "#F0F0F0", fontFamily: "'DM Sans', 'Inter', sans-serif", overflow: "hidden" }}>
            <style>{`
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; background: #0A0A0A; overflow: hidden; }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 4px; }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes heatDot { 0% { transform: scale(0) translate(-50%,-50%); opacity: 0.8; } 40% { transform: scale(1) translate(-50%,-50%); opacity: 0.55; } 100% { transform: scale(1.4) translate(-50%,-50%); opacity: 0; } }
                @keyframes gazeGlow { 0%,100% { box-shadow: 0 0 0 0 var(--gaze-color,transparent); } 50% { box-shadow: 0 0 0 6px transparent; } }
            `}</style>

            {/* ── HEATMAP OVERLAY ── */}
            <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
                {heatmapDots.map(dot => (
                    <div key={dot.id} style={{
                        position: "absolute",
                        left: dot.x,
                        top: dot.y,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(251,191,36,0.8) 0%, rgba(251,191,36,0) 70%)",
                        animation: "heatDot 3s ease-out forwards",
                        transformOrigin: "top left",
                    }} />
                ))}
            </div>

            {/* ── TOPBAR ── */}
            <header style={{
                height: 56, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 1.25rem", background: "#0D0D0D", borderBottom: "1px solid #1A1A1A"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#A0A0A0", display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.88rem" }}>
                        <ChevronLeft size={16} /> Back
                    </button>
                    <div style={{ width: 1, height: 20, background: "#222" }} />
                    <span style={{ fontWeight: 700, fontSize: "1rem", maxWidth: 380, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {problemInfo.title}
                    </span>
                    <span style={{
                        fontSize: "0.6rem", fontWeight: 700, padding: "0.14rem 0.5rem", borderRadius: 100,
                        background: `${diffColor}15`, border: `1px solid ${diffColor}40`, color: diffColor,
                        textTransform: "uppercase", letterSpacing: "0.05em"
                    }}>
                        {problemInfo.difficulty}
                    </span>
                </div>

                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                    {/* Language Selector */}
                    <div style={{ position: "relative" }}>
                        <button
                            onClick={() => setLangDropdownOpen(o => !o)}
                            style={{
                                background: "rgba(255,255,255,0.06)", border: "1px solid #2A2A2A", color: "#E0E0E0",
                                padding: "0.4rem 0.8rem", borderRadius: 6, display: "flex", alignItems: "center", gap: "0.5rem",
                                fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", minWidth: 120
                            }}
                        >
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: LANGUAGES.find(l => l.id === language)?.color, flexShrink: 0 }} />
                            {LANGUAGES.find(l => l.id === language)?.label}
                            <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "#888" }}>▾</span>
                        </button>
                        {langDropdownOpen && (
                            <div style={{
                                position: "absolute", top: "calc(100% + 4px)", right: 0,
                                background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 8,
                                zIndex: 200, minWidth: 150, overflow: "hidden",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.6)"
                            }}>
                                {LANGUAGES.map(lang => (
                                    <div
                                        key={lang.id}
                                        onClick={() => handleLanguageChange(lang.id)}
                                        style={{
                                            padding: "0.55rem 0.9rem", display: "flex", alignItems: "center", gap: "0.6rem",
                                            fontSize: "0.82rem", cursor: "pointer", color: language === lang.id ? lang.color : "#C0C0C0",
                                            background: language === lang.id ? `${lang.color}15` : "transparent",
                                            fontWeight: language === lang.id ? 700 : 400,
                                            transition: "background 0.15s"
                                        }}
                                        onMouseEnter={e => { if (language !== lang.id) e.currentTarget.style.background = "#252525"; }}
                                        onMouseLeave={e => { if (language !== lang.id) e.currentTarget.style.background = "transparent"; }}
                                    >
                                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: lang.color, flexShrink: 0 }} />
                                        {lang.label}
                                        <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#555" }}>.{lang.ext}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button onClick={() => setConsoleOutput("Running...\nExecution successful.\nOutput: [0, 1]")} style={{
                        background: "rgba(255,255,255,0.05)", border: "1px solid #2A2A2A", color: "#E0E0E0",
                        padding: "0.4rem 0.9rem", borderRadius: 6, display: "flex", alignItems: "center", gap: "0.4rem",
                        fontSize: "0.82rem", fontWeight: 600, cursor: "pointer"
                    }}>
                        <Play size={13} /> Run
                    </button>
                    <button style={{
                        background: `linear-gradient(135deg, ${YELLOW}, ${ORANGE})`, border: "none", color: "#0D0D0D",
                        padding: "0.4rem 1rem", borderRadius: 6, display: "flex", alignItems: "center", gap: "0.4rem",
                        fontSize: "0.82rem", fontWeight: 700, cursor: "pointer"
                    }}>
                        <CheckCircle size={13} strokeWidth={2.5} /> Submit
                    </button>
                </div>
            </header>

            {/* ── MAIN ── */}
            <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}>

                {/* Floating Kiro AI Camera Widget */}
                {(() => {
                    const gazeMeta = {
                        focused: { label: "FOCUSED", bg: "#22C55E", fg: "#000", border: YELLOW, shadow: "0 8px 30px rgba(0,0,0,0.8)" },
                        confused: { label: "CONFUSED", bg: "#F59E0B", fg: "#000", border: "#F59E0B", shadow: "0 0 18px rgba(245,158,11,0.45), 0 8px 30px rgba(0,0,0,0.8)" },
                        distracted: { label: "DISTRACTED", bg: "#EF4444", fg: "#fff", border: "#EF4444", shadow: "0 0 18px rgba(239,68,68,0.45), 0 8px 30px rgba(0,0,0,0.8)" },
                    };
                    const meta = gazeMeta[gazeState] || gazeMeta.focused;
                    return (
                        <div style={{
                            position: "fixed", bottom: 20, right: 20, width: 148, height: 106,
                            borderRadius: 12, overflow: "hidden",
                            border: `1.5px solid ${meta.border}`,
                            boxShadow: meta.shadow,
                            zIndex: 9998, background: "#000",
                            transition: "border-color 0.5s, box-shadow 0.5s"
                        }}>
                            <video ref={videoRef} autoPlay playsInline muted
                                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                            <div style={{
                                position: "absolute", top: 6, left: 6, display: "flex", alignItems: "center", gap: 3,
                                fontSize: "0.55rem", fontWeight: 800,
                                color: meta.fg, background: meta.bg,
                                padding: "2px 6px", borderRadius: 10, letterSpacing: "0.06em",
                                transition: "background 0.4s, color 0.4s"
                            }}>
                                <div style={{ width: 4, height: 4, borderRadius: "50%", background: meta.fg, animation: "pulse 1.5s infinite" }} />
                                {meta.label}
                            </div>
                        </div>
                    );
                })()}

                {/* ── LEFT PANEL ── */}
                <div style={{ flex: "0 0 40%", minWidth: 380, borderRight: "1px solid #1A1A1A", display: "flex", flexDirection: "column", background: "#0D0D0D" }}>
                    {/* Tabs */}
                    <div style={{ display: "flex", borderBottom: "1px solid #1A1A1A", flexShrink: 0 }}>
                        {[
                            { id: "problem", label: "Description", icon: <BookOpen size={13} /> },
                            { id: "video", label: "YouTube", icon: <Video size={13} /> },
                            { id: "chat", label: "Discussion", icon: <MessageSquare size={13} /> },
                        ].map(tab => (
                            <div key={tab.id} onClick={() => setLeftTab(tab.id)} style={{
                                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                                padding: "0.75rem 0", cursor: "pointer", fontSize: "0.82rem",
                                fontWeight: leftTab === tab.id ? 700 : 500,
                                color: leftTab === tab.id ? YELLOW : "#777",
                                borderBottom: leftTab === tab.id ? `2px solid ${YELLOW}` : "2px solid transparent",
                                transition: "all 0.2s"
                            }}>
                                {tab.icon} {tab.label}
                            </div>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>

                        {/* DESCRIPTION */}
                        {leftTab === "problem" && (
                            <div style={{ animation: "fadeUp 0.3s ease both" }}>

                                {/* Title */}
                                <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#fff", marginBottom: "0.6rem", lineHeight: 1.3 }}>
                                    {problemInfo.title}
                                </h1>

                                {/* Difficulty badge */}
                                <span style={{
                                    display: "inline-block", padding: "2px 12px", borderRadius: 20,
                                    fontSize: "0.75rem", fontWeight: 700, marginBottom: "1.25rem",
                                    background: problemInfo.difficulty === "Easy" ? "rgba(34,197,94,0.15)" : problemInfo.difficulty === "Hard" ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.15)",
                                    color: problemInfo.difficulty === "Easy" ? "#22c55e" : problemInfo.difficulty === "Hard" ? "#ef4444" : "#eab308",
                                    border: `1px solid ${problemInfo.difficulty === "Easy" ? "#22c55e44" : problemInfo.difficulty === "Hard" ? "#ef444444" : "#eab30844"}`
                                }}>{problemInfo.difficulty}</span>

                                {/* Problem Description — rendered as paragraphs */}
                                <div style={{ marginBottom: "1.5rem" }}>
                                    {splitDescription(problemInfo.description).question
                                        .split("\n\n")
                                        .map((para, i) => (
                                            <p key={i} style={{ fontSize: "0.9rem", color: "#d1d5db", lineHeight: 1.85, margin: "0 0 0.75rem" }}>
                                                {para}
                                            </p>
                                        ))}
                                </div>

                                {/* Examples */}
                                {problemInfo.examples.filter(ex => !ex.testCase).length > 0 && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.75rem" }}>
                                        {problemInfo.examples.filter(ex => !ex.testCase).map((ex, i) => (
                                            <div key={i}>
                                                <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fff", marginBottom: "0.55rem" }}>
                                                    Example {i + 1}
                                                </p>
                                                <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, padding: "0.9rem 1.1rem", fontSize: "0.85rem", lineHeight: 1.9 }}>
                                                    <div>
                                                        <span style={{ color: "#9ca3af", fontWeight: 700 }}>Input: </span>
                                                        <span style={{ color: "#e5e7eb", fontFamily: "monospace" }}>{ex.input}</span>
                                                    </div>
                                                    {ex.output && (
                                                        <div>
                                                            <span style={{ color: "#9ca3af", fontWeight: 700 }}>Output: </span>
                                                            <span style={{ color: "#e5e7eb", fontFamily: "monospace" }}>{ex.output}</span>
                                                        </div>
                                                    )}
                                                    {ex.explanation && (
                                                        <div style={{ marginTop: "0.4rem", paddingTop: "0.4rem", borderTop: "1px solid #1f2937" }}>
                                                            <span style={{ color: "#9ca3af", fontWeight: 700 }}>Explanation: </span>
                                                            <span style={{ color: "#9ca3af" }}>{ex.explanation}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Now Your Turn */}
                                {(() => {
                                    const testEntry = problemInfo.examples.find(ex => ex.testCase);
                                    if (!testEntry) return null;
                                    const choices = testEntry.choices || [];
                                    return (
                                        <div style={{ marginBottom: "1rem" }}>
                                            <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fff", marginBottom: "0.55rem" }}>
                                                Now your turn!
                                            </p>
                                            <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, padding: "0.9rem 1.1rem", fontSize: "0.85rem", lineHeight: 1.9, marginBottom: choices.length ? "0.75rem" : 0 }}>
                                                <div>
                                                    <span style={{ color: "#9ca3af", fontWeight: 700 }}>Input: </span>
                                                    <span style={{ color: "#e5e7eb", fontFamily: "monospace" }}>{testEntry.testCase}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: "#9ca3af", fontWeight: 700 }}>Output: </span>
                                                    {selectedAnswer ? (
                                                        <span style={{ fontFamily: "monospace", color: selectedAnswer === testEntry.answer ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                                                            {selectedAnswer} {selectedAnswer === testEntry.answer ? "✓ Correct!" : `✗ Expected: ${testEntry.answer}`}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: ORANGE, fontStyle: "italic" }}>Pick your answer</span>
                                                    )}
                                                </div>
                                            </div>
                                            {choices.length > 0 && (
                                                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                                                    {choices.map((c, i) => (
                                                        <button key={i} onClick={() => setSelectedAnswer(c)} style={{
                                                            background: selectedAnswer === c
                                                                ? (c === testEntry.answer ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)")
                                                                : "#1f2937",
                                                            border: `1px solid ${selectedAnswer === c ? (c === testEntry.answer ? "#22c55e" : "#ef4444") : "#374151"}`,
                                                            color: selectedAnswer === c ? (c === testEntry.answer ? "#22c55e" : "#ef4444") : "#e5e7eb",
                                                            borderRadius: 8, padding: "0.45rem 1rem", cursor: "pointer",
                                                            fontFamily: "monospace", fontSize: "0.83rem", fontWeight: 500,
                                                        }}>
                                                            {c}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                            </div>
                        )}


                        {/* YOUTUBE / AI MENTOR */}
                        {leftTab === "video" && (
                            <div style={{ animation: "fadeUp 0.3s ease both", display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div style={{ aspectRatio: "16/9", background: "#050505", borderRadius: 10, overflow: "hidden", position: "relative" }}>
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={problemInfo.youtube || "https://www.youtube.com/embed/UXDSeD9mN-k"}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                                    />
                                </div>
                                <div style={{ background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 8, padding: "0.9rem", display: "flex", gap: "0.8rem" }}>
                                    <div style={{ fontSize: "1.3rem" }}>🤖</div>
                                    <div>
                                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: YELLOW, marginBottom: "0.2rem" }}>Kiro AI is actively monitoring</div>
                                        <div style={{ fontSize: "0.78rem", color: "#888", lineHeight: 1.5 }}>
                                            I'm tracking your gaze and coding patterns. If you appear confused or stuck, I'll proactively send a hint to the Discussion tab.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* DISCUSSION / CHAT */}
                        {leftTab === "chat" && (
                            <div style={{ animation: "fadeUp 0.3s ease both", display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
                                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingBottom: "0.5rem" }}>
                                    {chatHistory.map(msg => (
                                        <div key={msg.id} style={{
                                            alignSelf: msg.sender === "kiro" ? "flex-start" : "flex-end",
                                            background: msg.sender === "kiro" ? "#1A1A1A" : `linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,106,0,0.1))`,
                                            border: msg.sender === "kiro" ? "none" : `1px solid rgba(255,215,0,0.2)`,
                                            padding: "0.75rem 0.9rem",
                                            borderRadius: msg.sender === "kiro" ? "10px 10px 10px 0" : "10px 10px 0 10px",
                                            maxWidth: "88%", fontSize: "0.88rem", color: "#E0E0E0", lineHeight: 1.6
                                        }}>
                                            {msg.text}
                                        </div>
                                    ))}
                                    {isAiThinking && (
                                        <div style={{ alignSelf: "flex-start", background: "#1A1A1A", padding: "0.7rem 1rem", borderRadius: "10px 10px 10px 0", display: "flex", alignItems: "center", gap: "0.5rem", color: YELLOW, fontSize: "0.82rem" }}>
                                            <Loader size={13} style={{ animation: "spin 1s linear infinite" }} /> Kiro is typing...
                                        </div>
                                    )}
                                    <div ref={chatBottomRef} />
                                </div>
                                <div style={{ position: "relative", marginTop: "0.5rem", flexShrink: 0 }}>
                                    <input
                                        ref={chatInputRef}
                                        type="text"
                                        placeholder="Ask Kiro AI anything..."
                                        onKeyDown={(e) => {
                                            lastTypedTime.current = Date.now();
                                            gazeTrackerRef.current?.resetFixation();
                                            if (e.key === "Enter" && e.target.value.trim()) {
                                                handleSendMessage(e.target.value.trim());
                                                e.target.value = "";
                                            }
                                        }}
                                        style={{
                                            width: "100%", background: "#131313", border: "1px solid #2A2A2A",
                                            borderRadius: 8, padding: "0.8rem 3.5rem 0.8rem 1rem",
                                            color: "#F0F0F0", outline: "none", fontSize: "0.88rem"
                                        }}
                                    />
                                    <button 
                                        onClick={() => {
                                            const input = chatInputRef.current;
                                            if (input && input.value.trim()) {
                                                handleSendMessage(input.value.trim());
                                                input.value = "";
                                            }
                                        }}
                                        style={{
                                            position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                                            background: YELLOW, color: "#000", border: "none", borderRadius: 6,
                                            padding: "0.3rem 0.8rem", fontWeight: 700, cursor: "pointer", fontSize: "0.78rem"
                                        }}
                                    >Send</button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* ── RIGHT PANEL (IDE) ── */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#1E1E1E", minWidth: 0 }}>
                    {/* File Tab Bar */}
                    {(() => {
                        const lang = LANGUAGES.find(l => l.id === language) || LANGUAGES[0]; return (
                            <div style={{ height: 38, borderBottom: "1px solid #2A2A2A", display: "flex", alignItems: "flex-end", padding: "0 0.75rem", background: "#181818", flexShrink: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#1E1E1E", padding: "0.35rem 0.8rem", borderRadius: "6px 6px 0 0", borderTop: `2px solid ${lang.color}`, fontSize: "0.78rem", color: "#E0E0E0" }}>
                                    <Code size={13} color={lang.color} /> solution.{lang.ext}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Editor */}
                    <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
                        <div style={{
                            width: 38, background: "#181818", borderRight: "1px solid #2A2A2A",
                            display: "flex", flexDirection: "column", alignItems: "center",
                            paddingTop: "1rem", color: "#444", fontSize: "0.78rem",
                            fontFamily: "'Fira Code', monospace", lineHeight: "1.5rem", userSelect: "none", flexShrink: 0
                        }}>
                            {safeCode.split("\n").map((_, i) => <div key={i}>{i + 1}</div>)}
                        </div>
                        <textarea
                            value={safeCode}
                            onChange={(e) => setCode(e.target.value)}
                            onKeyDown={() => {
                                lastTypedTime.current = Date.now();
                                gazeTrackerRef.current?.resetFixation();
                            }}
                            spellCheck="false"
                            style={{
                                flex: 1, background: "transparent", border: "none", resize: "none",
                                padding: "1rem", color: "#D4D4D4", fontSize: "0.9rem",
                                fontFamily: "'Fira Code', 'Courier New', monospace",
                                lineHeight: "1.5rem", outline: "none", whiteSpace: "pre", overflowX: "auto"
                            }}
                        />
                    </div>

                    {/* Console */}
                    <div style={{ height: "28%", minHeight: 160, borderTop: "1px solid #2A2A2A", background: "#0D0D0D", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                        <div style={{ height: 34, display: "flex", alignItems: "center", padding: "0 0.9rem", borderBottom: "1px solid #1A1A1A", background: "#111", flexShrink: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                <Terminal size={13} /> Output Console
                            </div>
                        </div>
                        <div style={{ flex: 1, padding: "0.75rem 1rem", overflowY: "auto", fontFamily: "monospace", fontSize: "0.82rem", color: "#888", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                            {consoleOutput}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
