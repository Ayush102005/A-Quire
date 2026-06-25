import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Pause, SkipBack, Volume2, Maximize, Settings, MessageSquare, 
  ChevronLeft, BrainCircuit, Type, FileText, Bot, Loader2, Sparkles, HelpCircle,
  CheckCircle2, Clock
} from 'lucide-react';
import { api } from '../services/api';

function parseDSAMarkdown(md) {
  if (!md) return null;

  const result = {
    title: "",
    topic: "",
    difficulty: "Medium",
    leetcode: "",
    tuf: "",
    youtube: "",
    article: "",
    problemStatement: "",
    approaches: []
  };

  // Extract Title
  const titleMatch = md.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  }

  // Extract Topic
  const topicMatch = md.match(/-\s+\*\*Topic:\*\*\s*(.+)$/m);
  if (topicMatch) {
    result.topic = topicMatch[1].trim();
  }

  // Extract Difficulty
  const diffMatch = md.match(/-\s+\*\*Difficulty:\*\*\s*(.+)$/m);
  if (diffMatch) {
    result.difficulty = diffMatch[1].trim();
  }

  // Extract LeetCode
  const leetMatch = md.match(/-\s+\*\*LeetCode Link:\*\*\s*\[.+\]\((.+?)\)/m);
  if (leetMatch) {
    result.leetcode = leetMatch[1].trim();
  }

  // Extract TUF+
  const tufMatch = md.match(/-\s+\*\*TUF\+ Link:\*\*\s*\[.+\]\((.+?)\)/m);
  if (tufMatch) {
    result.tuf = tufMatch[1].trim();
  }

  // Extract YouTube
  const ytMatch = md.match(/-\s+\*\*YouTube Video:\*\*\s*\[.+\]\((.+?)\)/m);
  if (ytMatch) {
    result.youtube = ytMatch[1].trim();
  }

  // Extract Article
  const articleMatch = md.match(/-\s+\*\*Article Link:\*\*\s*\[.+\]\((.+?)\)/m);
  if (articleMatch) {
    result.article = articleMatch[1].trim();
  }

  // Extract Problem Statement
  const problemStart = md.indexOf("## Problem Statement");
  if (problemStart !== -1) {
    const searchArea = md.substring(problemStart + "## Problem Statement".length);
    const endIdx = searchArea.search(/(---|\#\#\s+)/);
    if (endIdx !== -1) {
      result.problemStatement = searchArea.substring(0, endIdx).trim();
    } else {
      result.problemStatement = searchArea.trim();
    }
  }

  // Parse Approaches
  const approachesBlockStart = md.indexOf("## Approaches");
  if (approachesBlockStart !== -1) {
    const approachesText = md.substring(approachesBlockStart + "## Approaches".length);
    const approachParts = approachesText.split(/\n###\s+/);
    for (let i = 1; i < approachParts.length; i++) {
      const part = approachParts[i];
      const lines = part.split("\n");
      const approachName = lines[0].trim();
      const approachContent = lines.slice(1).join("\n");

      // Complexity Analysis
      let timeComplexity = "";
      let spaceComplexity = "";
      const tcMatch = approachContent.match(/-\s+\*\*Time Complexity:\*\*\s*(.+)$/m);
      if (tcMatch) timeComplexity = tcMatch[1].trim();
      const scMatch = approachContent.match(/-\s+\*\*Space Complexity:\*\*\s*(.+)$/m);
      if (scMatch) spaceComplexity = scMatch[1].trim();

      // Extract Complexity text
      const complexityStart = approachContent.indexOf("#### Complexity Analysis");
      let complexityText = "";
      if (complexityStart !== -1) {
        const searchArea = approachContent.substring(complexityStart + "#### Complexity Analysis".length);
        const endIdx = searchArea.search(/(####\s+Code\s+Solutions|###|$)/);
        if (endIdx !== -1) {
          complexityText = searchArea.substring(0, endIdx).trim();
        } else {
          complexityText = searchArea.trim();
        }
      }

      // Code solutions
      const codes = {};
      const codeBlockRegex = /#####\s+(CPP|JAVA|PYTHON|JAVASCRIPT)\s*\n\s*```(cpp|java|python|javascript)\n([\s\S]*?)\n```/gi;
      let codeMatch;
      while ((codeMatch = codeBlockRegex.exec(approachContent)) !== null) {
        const lang = codeMatch[1].toUpperCase();
        const code = codeMatch[3];
        codes[lang] = code;
      }

      result.approaches.push({
        name: approachName,
        timeComplexity,
        spaceComplexity,
        complexityText,
        codes
      });
    }
  }

  return result;
}

function getYouTubeEmbedUrl(url) {
  if (!url) return "";
  let videoId = "";
  if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1].split("?")[0];
  } else if (url.includes("youtube.com/watch")) {
    const params = new URLSearchParams(url.split("?")[1]);
    videoId = params.get("v");
  } else if (url.includes("youtube.com/embed/")) {
    return url;
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
}

const renderMarkdownContent = (text) => {
  if (!text) return null;
  
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-stone-300 leading-relaxed font-normal text-sm">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("### ")) {
          return <h3 key={idx} className="text-base font-semibold text-white mt-3 mb-1">{trimmed.substring(4)}</h3>;
        }
        if (trimmed.startsWith("## ")) {
          return <h2 key={idx} className="text-lg font-bold text-white mt-4 mb-2 border-b border-stone-850 pb-1">{trimmed.substring(3)}</h2>;
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const content = trimmed.substring(2);
          return (
            <li key={idx} className="ml-4 list-disc pl-1 text-stone-300">
              {parseBoldText(content)}
            </li>
          );
        }
        if (trimmed === "---") {
          return <hr key={idx} className="border-stone-850 my-3" />;
        }
        if (trimmed) {
          return <p key={idx}>{parseBoldText(trimmed)}</p>;
        }
        return <div key={idx} className="h-1.5" />;
      })}
    </div>
  );
};

const parseBoldText = (text) => {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => (
    i % 2 === 1 ? <strong key={i} className="text-teal-400 font-semibold">{part}</strong> : part
  ));
};

export default function LessonPlayer() {
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Video state
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // DSA States
  const [dsaData, setDsaData] = useState(null);
  const [activeApproachIdx, setActiveApproachIdx] = useState(0);
  const [activeLanguage, setActiveLanguage] = useState("PYTHON");
  const [activeDsaTab, setActiveDsaTab] = useState("problem");
  const [studyTimerActive, setStudyTimerActive] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Struggle state
  const [interventionActive, setInterventionActive] = useState(false);
  const [currentStruggleId, setCurrentStruggleId] = useState(null);
  const [mentorHint, setMentorHint] = useState("");
  const [hintLevel, setHintLevel] = useState("basic");
  const [isHintLoading, setIsHintLoading] = useState(false);

  // Chat conversation
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: "Hello! I am your AI Mentor. I will track your playback and step in if you experience any confusion. Feel free to ask questions here!" }
  ]);
  const [userInput, setUserInput] = useState("");

  // Layout state
  const [showMentor, setShowMentor] = useState(true);
  const [activeTab, setActiveTab] = useState('transcript'); // transcript, notes
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadLesson() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const lessonId = Number(queryParams.get('id')) || 3; // Default to seeded Heat Capacity lesson
        
        const data = await api.lessons.get(lessonId);
        setLesson(data);
        setDuration(data.duration_seconds || 60);

        // Check if this is a DSA lesson
        if (data.description && (data.description.trim().startsWith("#") || data.video_url === null || data.video_url.includes("youtu"))) {
          const parsed = parseDSAMarkdown(data.description);
          if (parsed && parsed.title) {
            setDsaData(parsed);
            setStudyTimerActive(true);
          }
        }

        // Fetch user's current progress for this lesson
        const prog = await api.progress.get(lessonId);
        if (prog && prog.watched_seconds > 0) {
          setCurrentTime(prog.watched_seconds);
          if (videoRef.current) {
            videoRef.current.currentTime = prog.watched_seconds;
          }
        }
        setLoading(false);
      } catch (err) {
        setError(err.message || "Failed to load lesson details.");
        setLoading(false);
      }
    }
    loadLesson();
  }, []);

  // Periodic progress reporting (every 5 seconds)
  useEffect(() => {
    if (!lesson) return;

    if (dsaData) {
      if (!studyTimerActive) return;
      
      const interval = setInterval(async () => {
        setCurrentTime(prev => {
          const newTime = prev + 5;
          const pct = Math.min((newTime / duration) * 100, 105);
          
          api.progress.update(lesson.id, newTime, Math.min(pct, 100), pct >= 90).catch(err => {
            console.error("DSA Progress save failed:", err);
          });
          
          return newTime;
        });
      }, 5000);
      
      return () => clearInterval(interval);
    } else {
      if (!isPlaying) return;

      const interval = setInterval(async () => {
        if (videoRef.current) {
          const time = videoRef.current.currentTime;
          const pct = (time / duration) * 100;
          try {
            await api.progress.update(lesson.id, time, pct);
          } catch (err) {
            console.error("Progress save failed:", err);
          }
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [lesson, isPlaying, studyTimerActive, dsaData, duration]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoEnded = async () => {
    setIsPlaying(false);
    if (lesson) {
      try {
        await api.progress.update(lesson.id, duration, 100, true);
        alert("Lesson completed successfully!");
      } catch (err) {
        console.error("End progress update failed:", err);
      }
    }
  };

  const handleTimelineChange = (e) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleCopyCode = (codeText) => {
    if (!codeText) return;
    navigator.clipboard.writeText(codeText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Simulate a student struggle event
  const triggerStruggle = async () => {
    if (!lesson) return;
    
    // Pause video / study timer
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setStudyTimerActive(false);

    setInterventionActive(true);
    setIsHintLoading(true);

    try {
      const clientEventId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Ingest struggle event to backend
      const struggle = await api.struggles.createEvent({
        lessonId: lesson.id,
        clientEventId,
        struggle_score: 0.85,
        lessonTimestampMs: Math.floor(currentTime * 1000),
        fixationDurationMs: 1200,
        inactivityDurationMs: 5000,
        transcriptWindowId: "wnd-001"
      });

      setCurrentStruggleId(struggle.id);

      // Fetch AI hint from backend
      const hintData = await api.struggles.getHint(struggle.id, hintLevel);
      setMentorHint(hintData.hint);
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', text: `[Intervention at ${formatTime(currentTime)}] ${hintData.hint}` }
      ]);
      setIsHintLoading(false);
    } catch (err) {
      console.error(err);
      if (dsaData) {
        setMentorHint(`Struggling with ${dsaData.title}? Pay close attention to the Space and Time complexities of the Optimal approach compared to the Brute Force strategy.`);
      } else {
        setMentorHint("The concept of heat capacity and thermal entropy can be complex. Remember, heat capacity is the amount of heat energy needed to raise the temperature of a substance by one degree.");
      }
      setIsHintLoading(false);
    }
  };

  const handleHintRequest = async (level) => {
    if (!currentStruggleId) return;
    setHintLevel(level);
    setIsHintLoading(true);
    try {
      const hintData = await api.struggles.getHint(currentStruggleId, level);
      setMentorHint(hintData.hint);
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', text: `[${level.toUpperCase()} HINT] ${hintData.hint}` }
      ]);
      setIsHintLoading(false);
    } catch (err) {
      console.error(err);
      setIsHintLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userText = userInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setUserInput("");

    // Simulate AI response
    setTimeout(() => {
      let reply = "";
      if (dsaData) {
        reply = `I see you are asking about ${dsaData.title}. For this problem, the optimal time complexity is usually achievable by using key DSA patterns like two-pointers, hash maps, or dynamic programming. Check the Approaches tab for detailed complexity breakdowns!`;
        if (userText.toLowerCase().includes("optimal") || userText.toLowerCase().includes("time")) {
          const opt = dsaData.approaches.find(a => a.name.toLowerCase().includes("optimal"));
          if (opt) {
            reply = `The optimal approach for this problem has a Time Complexity of ${opt.timeComplexity} and Space Complexity of ${opt.spaceComplexity}. It is highly recommended to study the code implementation provided.`;
          }
        }
      } else {
        reply = "I understand you are asking about this concept. In thermodynamics, entropy represents the molecular disorder of a system. As thermal energy transfers, entropy increases.";
        if (userText.toLowerCase().includes("capacity")) {
          reply = "Specific heat capacity is the heat energy required to raise the temperature of 1 kg of a substance by 1 Kelvin. Water has a very high specific heat capacity, which is why it heats up slowly.";
        }
      }
      setChatMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    }, 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          <p className="text-stone-400 font-medium">Connecting video streaming feeds...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-100 p-4">
        <div className="max-w-md bg-stone-900 border border-stone-800 p-8 rounded-2xl text-center shadow-lg">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Lesson</h3>
          <p className="text-stone-400 mb-6">{error || "Requested lesson could not be loaded."}</p>
          <button onClick={() => navigate('/dashboard')} className="px-5 py-2.5 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const defaultVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col font-sans text-stone-100 h-screen overflow-hidden">
      
      {/* Top Bar */}
      <header className="h-14 bg-stone-900 border-b border-stone-800 flex items-center justify-between px-4 shrink-0 shadow-sm relative z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors outline-none">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-widest mb-0.5">
              {dsaData ? "Data Structures & Algorithms" : "Thermodynamics Syllabus"}
            </div>
            <h1 className="text-sm font-medium text-stone-100 flex items-center gap-2">
              {lesson.title}
              <span className="text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">Order {lesson.order}</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={triggerStruggle} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md transition-colors focus:outline-none"
          >
            <BrainCircuit className="w-3.5 h-3.5" /> Simulate Struggle
          </button>
          <div className="text-[11px] font-medium text-stone-400 mr-2 items-center hidden sm:flex bg-stone-800/50 pl-2 pr-3 py-1 rounded-full border border-stone-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mr-2 animate-pulse"></span>
            Monitoring Active
          </div>
          <button 
            onClick={() => setShowMentor(!showMentor)}
            aria-expanded={showMentor}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all border outline-none focus:ring-2 focus:ring-teal-500 ${
              showMentor ? 'bg-teal-900/30 text-teal-400 border-teal-800/50 shadow-inner' : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
            }`}
          >
            <BrainCircuit className={`w-4 h-4 ${showMentor ? 'text-teal-400' : 'text-stone-400'}`} /> Mentor
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Learning Region */}
        <div className="flex-1 flex flex-col bg-stone-950 relative overflow-hidden">
          
          {/* Struggle Intervention Overlay */}
          {interventionActive && (
            <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
              <div className="bg-stone-50 text-stone-900 p-8 rounded-2xl max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-stone-200/50 animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center shrink-0 shadow-inner border border-teal-200/50">
                    <BrainCircuit className="w-6 h-6 text-teal-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-stone-900 leading-tight">Paused for Clarity</h3>
                    <p className="text-sm text-stone-500 font-medium">Concept struggle detected</p>
                  </div>
                </div>

                {isHintLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-8 h-8 text-teal-700 animate-spin" />
                  </div>
                ) : (
                  <>
                    <p className="text-stone-700 leading-relaxed mb-6 text-[15px]">
                      {mentorHint || "Would you like a simpler breakdown before we continue?"}
                    </p>
                    <div className="space-y-2.5">
                      <button 
                        onClick={() => {
                          setInterventionActive(false);
                          if (dsaData) {
                            setStudyTimerActive(true);
                          } else {
                            if (videoRef.current) {
                              videoRef.current.play().catch(() => {});
                              setIsPlaying(true);
                            }
                          }
                        }} 
                        className="w-full py-3 rounded-xl border border-stone-200 text-stone-700 font-semibold text-sm hover:bg-stone-100 transition-colors flex items-center justify-center gap-2 outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                      >
                         Resume Lesson <Play className="w-4 h-4 text-stone-500 fill-current" />
                      </button>
                      
                      <div className="grid grid-cols-2 gap-2.5">
                         <button onClick={() => handleHintRequest('analogy')} className="w-full py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 font-medium text-xs hover:bg-stone-50 transition-colors shadow-sm outline-none">
                           Use Analogy
                         </button>
                         <button onClick={() => handleHintRequest('hinglish')} className="w-full py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 font-medium text-xs hover:bg-stone-50 transition-colors shadow-sm outline-none">
                           Explain in Hinglish
                         </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {dsaData ? (
            /* DSA Question practice workspace layout */
            <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-6">
              {/* Optional embedded YouTube video */}
              {lesson.video_url && getYouTubeEmbedUrl(lesson.video_url) ? (
                <div className="w-full max-w-4xl mx-auto aspect-video bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xl shrink-0">
                  <iframe
                    src={`${getYouTubeEmbedUrl(lesson.video_url)}?enablejsapi=1`}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={lesson.title}
                  ></iframe>
                </div>
              ) : null}

              {/* Course navigation and main DSA metadata */}
              <div className="max-w-4xl w-full mx-auto bg-stone-900/45 border border-stone-850 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-stone-850 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-stone-850 text-stone-300 text-xs px-2.5 py-1 rounded font-medium border border-stone-800">
                      {dsaData.topic || "DSA"}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded font-bold uppercase tracking-wider ${
                      dsaData.difficulty.toLowerCase() === 'easy' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/50' :
                      dsaData.difficulty.toLowerCase() === 'hard' ? 'bg-rose-950/40 text-rose-400 border border-rose-800/50' :
                      'bg-amber-950/40 text-amber-400 border border-amber-800/50'
                    }`}>
                      {dsaData.difficulty}
                    </span>
                  </div>
                  
                  {/* Timer & Mark as Completed */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-stone-400 font-medium bg-stone-800/50 px-3 py-1.5 rounded-lg border border-stone-750">
                      <Clock className="w-3.5 h-3.5 text-teal-400" />
                      <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                    </div>
                    {currentTime >= duration ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-900/50">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    ) : (
                      <button 
                        onClick={async () => {
                          try {
                            await api.progress.update(lesson.id, duration, 100, true);
                            setCurrentTime(duration);
                            setStudyTimerActive(false);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow transition-colors"
                      >
                        Mark as Completed
                      </button>
                    )}
                  </div>
                </div>

                {/* Helpful resources Links */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-stone-400 font-medium mb-6">
                  {dsaData.leetcode && (
                    <a href={dsaData.leetcode} target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-stone-500" /> LeetCode
                    </a>
                  )}
                  {dsaData.tuf && (
                    <a href={dsaData.tuf} target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-stone-500" /> TUF+ Editorial
                    </a>
                  )}
                  {dsaData.article && (
                    <a href={dsaData.article} target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-stone-500" /> Full Editorial
                    </a>
                  )}
                </div>

                {/* Dynamic Tab Toggle (Problem vs Solutions) */}
                <div className="flex border-b border-stone-850 mb-6 bg-stone-900/80 p-1 rounded-lg">
                  <button 
                    onClick={() => setActiveDsaTab("problem")}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                      activeDsaTab === 'problem' 
                        ? 'bg-stone-850 text-white shadow' 
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Problem Statement
                  </button>
                  <button 
                    onClick={() => setActiveDsaTab("approaches")}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                      activeDsaTab === 'approaches' 
                        ? 'bg-stone-850 text-white shadow' 
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Approaches & Solutions ({dsaData.approaches.length})
                  </button>
                </div>

                {/* Tab Contents */}
                {activeDsaTab === 'problem' ? (
                  <div className="text-stone-300 font-normal leading-relaxed p-2 bg-stone-900/10 rounded-xl max-h-[500px] overflow-y-auto">
                    {renderMarkdownContent(dsaData.problemStatement)}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Approach Horizontal Tabs */}
                    <div className="flex flex-wrap gap-2">
                      {dsaData.approaches.map((app, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveApproachIdx(idx);
                            const availableLangs = Object.keys(app.codes);
                            if (availableLangs.length > 0 && !availableLangs.includes(activeLanguage)) {
                              setActiveLanguage(availableLangs[0]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            activeApproachIdx === idx
                              ? 'bg-teal-950 text-teal-400 border-teal-850'
                              : 'bg-stone-850 hover:bg-stone-800 text-stone-400 border-stone-800'
                          }`}
                        >
                          {app.name}
                        </button>
                      ))}
                    </div>

                    {/* Active Approach Content */}
                    {dsaData.approaches[activeApproachIdx] && (
                      <div className="space-y-4">
                        {/* Time & Space Complexity Badges */}
                        <div className="flex flex-wrap gap-3">
                          {dsaData.approaches[activeApproachIdx].timeComplexity && (
                            <div className="bg-teal-950/20 border border-teal-900 rounded-xl px-3 py-1.5 flex items-center gap-2">
                              <span className="text-[10px] font-bold text-teal-500 uppercase tracking-wider">Time</span>
                              <span className="text-xs font-semibold text-teal-300 font-mono">
                                {dsaData.approaches[activeApproachIdx].timeComplexity}
                              </span>
                            </div>
                          )}
                          {dsaData.approaches[activeApproachIdx].spaceComplexity && (
                            <div className="bg-indigo-950/20 border border-indigo-900 rounded-xl px-3 py-1.5 flex items-center gap-2">
                              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Space</span>
                              <span className="text-xs font-semibold text-indigo-300 font-mono">
                                {dsaData.approaches[activeApproachIdx].spaceComplexity}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Extra complexity detail texts if present */}
                        {dsaData.approaches[activeApproachIdx].complexityText && (
                          <div className="text-xs text-stone-400 leading-relaxed font-normal bg-stone-950/40 p-3 rounded-lg border border-stone-850/50">
                            {renderMarkdownContent(dsaData.approaches[activeApproachIdx].complexityText)}
                          </div>
                        )}

                        {/* Code editor view tab selector */}
                        {Object.keys(dsaData.approaches[activeApproachIdx].codes).length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between border-b border-stone-850 pb-2">
                              <div className="flex gap-2">
                                {Object.keys(dsaData.approaches[activeApproachIdx].codes).map((lang) => (
                                  <button
                                    key={lang}
                                    onClick={() => setActiveLanguage(lang)}
                                    className={`px-2.5 py-1 text-xs rounded font-semibold transition-all ${
                                      activeLanguage === lang
                                        ? 'bg-stone-850 text-teal-400'
                                        : 'text-stone-500 hover:text-stone-300'
                                    }`}
                                  >
                                    {lang}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Code Container */}
                            <div className="relative rounded-xl overflow-hidden border border-stone-800 bg-stone-900 shadow-lg">
                              <div className="flex items-center justify-between px-4 py-2 bg-stone-950 border-b border-stone-850 text-xs text-stone-400">
                                <span className="font-mono text-teal-400 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                                  solution.{activeLanguage.toLowerCase() === 'javascript' ? 'js' : activeLanguage.toLowerCase() === 'python' ? 'py' : activeLanguage.toLowerCase()}
                                </span>
                                <button 
                                  onClick={() => handleCopyCode(dsaData.approaches[activeApproachIdx].codes[activeLanguage])} 
                                  className="hover:text-white transition-colors flex items-center gap-1 bg-stone-850 hover:bg-stone-800 px-2 py-1 rounded"
                                >
                                  {copySuccess ? "Copied!" : "Copy Code"}
                                </button>
                              </div>
                              <div className="overflow-x-auto p-4 font-mono text-xs text-stone-200 leading-relaxed max-h-[300px] overflow-y-auto select-text bg-stone-950/20">
                                <pre className="whitespace-pre">
                                  {dsaData.approaches[activeApproachIdx].codes[activeLanguage]}
                                </pre>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-stone-500 italic">No code solutions found for this approach.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Traditional Video Player Layout */
            <div className="flex-1 relative flex items-center justify-center p-4 sm:p-8 bg-black">
              <div className="w-full max-w-5xl aspect-video bg-stone-900 border border-stone-800 rounded-xl overflow-hidden relative shadow-2xl transition-all duration-300 ring-1 ring-white/5">
                
                {lesson.video_url || defaultVideoUrl ? (
                  <video
                    ref={videoRef}
                    src={lesson.video_url || defaultVideoUrl}
                    className="w-full h-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onDurationChange={(e) => setDuration(e.target.duration)}
                    onEnded={handleVideoEnded}
                    onClick={handlePlayPause}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                    <span className="text-stone-600 tracking-widest text-xs font-semibold uppercase">LECTURE STREAMING</span>
                  </div>
                )}

                {/* Video Controls Footer */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-16 pb-5 px-6 z-10 flex flex-col pointer-events-auto">
                  <input 
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleTimelineChange}
                    className="w-full h-[5px] bg-stone-700/50 rounded-full mb-5 cursor-pointer accent-teal-500 hover:h-2 transition-all"
                  />
                  
                  <div className="flex items-center justify-between text-stone-300">
                    <div className="flex items-center gap-5">
                      <button onClick={handlePlayPause} className="hover:text-teal-400 transition-colors outline-none">
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                      </button>
                      <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 10) }} className="hover:text-white transition-colors outline-none">
                        <SkipBack className="w-5 h-5 fill-current" />
                      </button>
                      <div className="flex items-center gap-1.5 text-sm font-medium tracking-wide">
                        <span className="text-white">{formatTime(currentTime)}</span>
                        <span className="text-stone-500">/</span>
                        <span className="text-stone-400">{formatTime(duration)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <button className="hover:text-white transition-colors outline-none"><Volume2 className="w-5 h-5" /></button>
                      <button className="hover:text-white transition-colors outline-none"><Maximize className="w-5 h-5" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Stack: Mentor & Transcripts */}
        <div 
           className={`bg-white text-stone-900 border-l border-stone-200 flex flex-col shrink-0 transition-all duration-300 shadow-[-10px_0_30px_rgba(0,0,0,0.3)] z-30
           ${showMentor ? 'w-80 md:w-96 translate-x-0' : 'w-0 translate-x-full border-none'}`}
        >
          {/* AI Mentor Persistent Header Panel */}
          <div className={`bg-stone-50 border-b border-stone-200 shrink-0 flex flex-col h-3/5 overflow-hidden`}>
            
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-stone-100 bg-white shadow-sm z-10 shrink-0">
               <div className="flex items-center gap-2">
                 <div className="w-7 h-7 rounded bg-teal-100 flex items-center justify-center border border-teal-200/50">
                    <Bot className="w-4 h-4 text-teal-700" />
                 </div>
                 <span className="text-sm font-semibold text-stone-800 tracking-tight">AI Mentor Feed</span>
               </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden bg-stone-50/50">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar text-sm">
                 {chatMessages.map((msg, i) => (
                   <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                     <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-stone-200' : 'bg-teal-100'}`}>
                       {msg.role === 'user' ? (
                         <span className="text-[10px] font-bold text-stone-500">ME</span>
                       ) : (
                         <Bot className="w-3.5 h-3.5 text-teal-700" />
                       )}
                     </div>
                     <div className={`p-3 rounded-2xl shadow-sm text-stone-700 leading-relaxed font-medium ${msg.role === 'user' ? 'bg-teal-700 text-white rounded-tr-none' : 'bg-white rounded-tl-none border border-stone-200'}`}>
                       {msg.text}
                     </div>
                   </div>
                 ))}
              </div>
              
              {/* Input Area */}
              <form onSubmit={handleSendMessage} className="mt-4 pt-3 border-t border-stone-200 bg-stone-50 shrink-0">
                <div className="flex gap-2 relative">
                  <input 
                    type="text" 
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ask the mentor..." 
                    className="flex-1 bg-white border border-stone-300 rounded-lg pl-3 pr-10 py-2.5 text-sm font-medium focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-sm placeholder:font-normal placeholder:text-stone-400" 
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-teal-700 text-white rounded-md flex items-center justify-center hover:bg-teal-800 transition-colors shadow-sm">
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Tertiary View: Transcript/Notes */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="flex items-center border-b border-stone-100 bg-stone-50/50 shrink-0 px-2 pt-2">
              <button 
                onClick={() => setActiveTab('transcript')}
                className={`px-4 py-2.5 text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${activeTab === 'transcript' ? 'border-teal-700 text-teal-800' : 'border-transparent text-stone-500'}`}
              >
                <FileText className="w-3.5 h-3.5" /> Transcript
              </button>
              <button 
                onClick={() => setActiveTab('notes')}
                className={`px-4 py-2.5 text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${activeTab === 'notes' ? 'border-teal-700 text-teal-800' : 'border-transparent text-stone-500'}`}
              >
                <Type className="w-3.5 h-3.5" /> Notes
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {activeTab === 'transcript' && (
                <div className="space-y-1">
                  <p className="text-[13px] text-stone-600 leading-relaxed hover:bg-stone-50 p-2.5 rounded-lg cursor-pointer transition-colors group">
                    <span className="font-bold text-teal-700/60 group-hover:text-teal-700 w-10 inline-block">00:15</span>
                    Welcome to the syllabus. Today we cover fundamental thermodynamic laws.
                  </p>
                  <p className="text-[13px] text-stone-900 leading-relaxed bg-teal-50/50 p-2.5 rounded-r-lg font-medium border-l-[3px] border-teal-500 shadow-sm relative">
                    <span className="font-bold text-teal-800 w-10 inline-block">01:30</span>
                    Let's review energy distributions and particle arrangements in a closed container.
                  </p>
                  <p className="text-[13px] text-stone-600 leading-relaxed hover:bg-stone-50 p-2.5 rounded-lg cursor-pointer transition-colors group">
                    <span className="font-bold text-stone-400 w-10 inline-block">05:45</span>
                    Observe heat capacity capacity variations under constant volume vs constant pressure.
                  </p>
                </div>
              )}
              {activeTab === 'notes' && (
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-full resize-none border px-3 py-3 rounded-lg border-stone-200 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-[13px] text-stone-700 leading-relaxed bg-stone-50/30 placeholder:text-stone-400" 
                  placeholder="Take notes here. They will be automatically timestamped..."
                ></textarea>
              )}
            </div>
          </div>

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
      .custom-scrollbar::-webkit-scrollbar { width: 5px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #e7e5e4; border-radius: 10px; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d6d3d1; }
      `}} />
    </div>
  );
}
