import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Volume2, Maximize, Settings, ArrowLeft, Send, ThumbsUp, ThumbsDown, Sparkles, Code2, MessageSquare, X } from 'lucide-react';
import './VideoPlayer.css';

const VideoPlayer = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [isPlaying, setIsPlaying] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "Hello! I'm Kiro, your AI mentor. I'll be watching along with you. Feel free to ask me any questions if you get stuck!", sender: 'kiro', timestamp: new Date() }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [code, setCode] = useState('// Write your solution here\nfunction sumArray(arr) {\n  let sum = 0;\n  for(let i=0; i < arr.length; i++) {\n    sum += arr[i];\n  }\n  return sum;\n}');
    const videoRef = useRef(null);

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
        // In a real app we'd trigger videoRef.current.play() / .pause() 
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        const newUserMsg = {
            id: Date.now(),
            text: inputMessage,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newUserMsg]);
        setInputMessage('');

        // Simulate AI response
        setTimeout(() => {
            const aiResponse = {
                id: Date.now() + 1,
                text: "That's a great question! Let's break down this concept from the video...",
                sender: 'kiro',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
        }, 1000);
    };

    return (
        <div className="learning-environment">
            {/* Top Navigation Bar */}
            <header className="learning-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={20} />
                        <span>Back to Dashboard</span>
                    </button>
                    <h1 className="course-title">Course {courseId}: Introduction to Data Structures</h1>
                </div>
            </header>

            <main className="learning-main">
                {/* Two-Pane Layout */}
                <div className="learning-content-split">
                    {/* Left Pane: Video Player */}
                    <div className="video-section">
                        <div className="video-container">
                            {/* Fake video placeholder */}
                            <div className="video-placeholder">
                                <span className="placeholder-text">Video Content Area</span>
                                <button className="large-play-btn" onClick={togglePlay}>
                                    {isPlaying ? <Pause size={48} /> : <Play size={48} />}
                                </button>
                            </div>

                            {/* Custom Controls Container */}
                            <div className="video-controls">
                                <div className="timeline-container">
                                    <div className="timeline-bar">
                                        <div className="timeline-progress" style={{ width: '45%' }}></div>
                                        <div className="timeline-thumb" style={{ left: '45%' }}></div>
                                    </div>
                                </div>

                                <div className="controls-row">
                                    <div className="controls-left">
                                        <button className="control-btn" onClick={togglePlay}>
                                            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                                        </button>
                                        <span className="time-display">12:34 / 45:00</span>
                                    </div>
                                    <div className="controls-right">
                                        <button className="control-btn"><Volume2 size={20} /></button>
                                        <button className="control-btn"><Settings size={20} /></button>
                                        <button className="control-btn"><Maximize size={20} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="video-info">
                            <h2>Lesson 4: Arrays & Linked Lists</h2>
                            <p className="lesson-description">
                                In this lesson, we explore the fundamental tradeoffs between contiguous memory allocation (arrays) and node-based structures (linked lists).
                            </p>
                        </div>
                    </div>

                    {/* Right Pane: Code IDE */}
                    <div className="ide-section">
                        <div className="ide-header">
                            <div className="ide-tabs">
                                <div className="ide-tab active">
                                    <Code2 size={16} />
                                    <span>solution.js</span>
                                </div>
                            </div>
                            <button className="run-code-btn">Run Code</button>
                        </div>
                        <div className="ide-editor">
                            <div className="line-numbers">
                                {code.split('\n').map((_, i) => (
                                    <span key={i}>{i + 1}</span>
                                ))}
                            </div>
                            <textarea
                                className="code-textarea"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                spellCheck="false"
                            />
                        </div>
                        <div className="ide-console">
                            <div className="console-header">Console Output</div>
                            <div className="console-body">
                                <span className="console-text text-secondary">&gt; Ready...</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating AI Token Button */}
                {!isChatOpen && (
                    <button className="ghost-ai-trigger" onClick={() => setIsChatOpen(true)}>
                        <div className="trigger-icon pulse-animation">
                            <Sparkles size={24} color="#000" />
                        </div>
                        <span className="trigger-text">Ask Kiro</span>
                    </button>
                )}

                {/* Ghost Overlay: AI Chat Mentor */}
                {isChatOpen && (
                    <div className="ai-chat-ghost-overlay">
                        <div className="chat-header">
                            <div className="chat-header-left">
                                <div className="ai-avatar">
                                    <Sparkles size={16} />
                                </div>
                                <div className="ai-info">
                                    <h3>Kiro AI</h3>
                                    <span className="status">Active & Watching</span>
                                </div>
                            </div>
                            <button className="close-chat-btn" onClick={() => setIsChatOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="chat-messages">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
                                    <div className="message-bubble">
                                        <p>{msg.text}</p>
                                        <span className="timestamp">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {msg.sender === 'kiro' && (
                                        <div className="message-feedback">
                                            <button className="feedback-btn"><ThumbsUp size={14} /></button>
                                            <button className="feedback-btn"><ThumbsDown size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <form className="chat-input-area" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                placeholder="Ask Kiro a question..."
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                            />
                            <button type="submit" className="send-btn" disabled={!inputMessage.trim()}>
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
};

export default VideoPlayer;
