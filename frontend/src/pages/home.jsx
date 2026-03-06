import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

const YELLOW = "#FFD700";
const ORANGE = "#FF6A00";

function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.unobserve(el);
      }
    }, { threshold: 0.1, ...options });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, inView];
}

function useCounter(target, duration = 1800, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    const isDecimal = target % 1 !== 0;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const v = target * ease;
      setVal(isDecimal ? parseFloat(v.toFixed(1)) : Math.round(v));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [active, target, duration]);
  return val;
}

// ── COMPONENTS ──

function Nav({ onSignup }) {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = ["features", "why", "testimonials", "contact"];

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 5%", height: 70,
        background: scrolled ? "rgba(13,13,13,0.95)" : "rgba(13,13,13,0.88)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid #222",
        transition: "background 0.3s",
      }}>
        <a href="#" style={{
          fontFamily: "'Times New Roman', serif", fontSize: "1.6rem", fontWeight: 800,
          letterSpacing: "0.08em",
          background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text", textDecoration: "none",
        }}>AQUIRE</a>

        <ul style={{ display: "flex", gap: "2.5rem", listStyle: "none", margin: 0, padding: 0 }}
          className="nav-links-desktop">
          {links.map(l => (
            <li key={l}><a href={`#${l}`} style={{
              color: "#888", textDecoration: "none", fontSize: "0.9rem",
              fontWeight: 500, letterSpacing: "0.03em", transition: "color 0.2s",
            }}
              onMouseEnter={e => e.target.style.color = "#F0F0F0"}
              onMouseLeave={e => e.target.style.color = "#888"}
            >{l.charAt(0).toUpperCase() + l.slice(1)}</a></li>
          ))}
        </ul>

        <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
          <GhostBtn onClick={() => navigate('/login')}>Log In</GhostBtn>
          <GradBtn onClick={onSignup}>Sign Up Free</GradBtn>
        </div>
      </nav>

      <style>{`
        .nav-links-desktop { display: flex; }
        @media (max-width: 768px) { .nav-links-desktop { display: none !important; } }
      `}</style>
    </>
  );
}

function GradBtn({ children, onClick, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: `linear-gradient(135deg, ${YELLOW}, ${ORANGE})`,
        color: "#0D0D0D", fontWeight: 700, border: "none", cursor: "pointer",
        padding: "0.5rem 1.3rem", borderRadius: 6,
        fontFamily: "DM Sans, sans-serif", fontSize: "0.9rem",
        transform: hov ? "translateY(-2px) scale(1.03)" : "none",
        boxShadow: hov ? "0 8px 40px rgba(255,180,0,0.35)" : "none",
        transition: "transform 0.2s, box-shadow 0.2s",
        ...style,
      }}>{children}</button>
  );
}

function GhostBtn({ children, onClick, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "transparent", color: hov ? YELLOW : "#F0F0F0",
        border: `1px solid ${hov ? YELLOW : "#444"}`, cursor: "pointer",
        padding: "0.5rem 1.3rem", borderRadius: 6,
        fontFamily: "DM Sans, sans-serif", fontSize: "0.9rem", fontWeight: 600,
        transform: hov ? "translateY(-2px)" : "none",
        transition: "all 0.2s", ...style,
      }}>{children}</button>
  );
}

function OutlinedBtn({ children, onClick, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "rgba(255,215,0,0.08)" : "transparent",
        color: YELLOW, border: "1px solid rgba(255,215,0,0.4)", cursor: "pointer",
        padding: "0.5rem 1.3rem", borderRadius: 6,
        fontFamily: "DM Sans, sans-serif", fontSize: "0.9rem", fontWeight: 600,
        boxShadow: hov ? "0 0 20px rgba(255,215,0,0.2)" : "none",
        transform: hov ? "translateY(-1px)" : "none",
        transition: "all 0.2s", ...style,
      }}>{children}</button>
  );
}

function Reveal({ children, direction = "up", delay = 0, style = {} }) {
  const [ref, inView] = useInView();
  const transforms = { up: "translateY(32px)", left: "translateX(-40px)", right: "translateX(40px)" };
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "none" : transforms[direction],
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      ...style,
    }}>{children}</div>
  );
}

function SectionLabel({ children, style = {} }) {
  return (
    <div style={{
      fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em",
      textTransform: "uppercase", color: ORANGE,
      marginBottom: "0.8rem",
      display: "flex", alignItems: "center", gap: "0.5rem", ...style,
    }}>
      <span style={{ display: "block", width: 24, height: 1, background: ORANGE }} />
      {children}
    </div>
  );
}

// ── HERO ──
function Hero({ onSignup }) {
  return (
    <section id="hero" style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      padding: "120px 5% 80px", position: "relative", overflow: "hidden",
      background: "#0D0D0D",
    }}>
      {/* Blobs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", width: 520, height: 520, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,215,0,0.12), transparent 70%)",
          filter: "blur(80px)", top: -100, right: -60,
          animation: "float 9s ease-in-out infinite alternate",
        }} />
        <div style={{
          position: "absolute", width: 380, height: 380, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,106,0,0.1), transparent 70%)",
          filter: "blur(80px)", bottom: -60, left: "10%",
          animation: "float 11s ease-in-out infinite alternate",
          animationDelay: "-3s",
        }} />
        <div style={{
          position: "absolute", width: 260, height: 260, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,193,7,0.08), transparent 70%)",
          filter: "blur(80px)", top: "40%", left: "40%",
          animation: "float 13s ease-in-out infinite alternate",
          animationDelay: "-6s",
        }} />
      </div>

      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", maxWidth: 860, margin: "0 auto", width: "100%",
        animation: "fadeUp 0.9s ease both",
      }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.2)",
          padding: "0.35rem 1rem", borderRadius: 100,
          fontSize: "0.82rem", fontWeight: 600, letterSpacing: "0.08em",
          color: YELLOW, textTransform: "uppercase", marginBottom: "1.5rem",
        }}>
          <span style={{ width: 6, height: 6, background: YELLOW, borderRadius: "50%", animation: "pulse 2s infinite" }} />
          Powered by Advanced AI
        </div>

        <h1 style={{
          fontFamily: "'Times New Roman', serif",
          fontSize: "clamp(2.8rem, 5vw, 4.2rem)",
          fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em",
          marginBottom: "1.5rem", color: "#F0F0F0",
        }}>
          AI-Powered<br />Structured Learning.<br />
          <span style={{
            background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>Built for Serious Growth.</span>
        </h1>

        <p style={{ color: "#888", fontSize: "1.1rem", maxWidth: 480, marginBottom: "2.5rem", lineHeight: 1.8 }}>
          AQUIRE delivers intelligent personalization, adaptive roadmaps, and mentorship-grade accountability — engineered for engineers who don't settle.
        </p>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          <GradBtn onClick={onSignup} style={{ padding: "0.9rem 2rem", fontSize: "1rem", borderRadius: 8 }}>
            Start Learning →
          </GradBtn>
          <GhostBtn style={{ padding: "0.9rem 2rem", fontSize: "1rem", borderRadius: 8 }}>
            Explore Features
          </GhostBtn>
        </div>
      </div>

      <style>{`
        @keyframes float { from { transform: translate(0,0) scale(1); } to { transform: translate(30px,-30px) scale(1.08); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes expandLine { from { transform:scaleX(0); } to { transform:scaleX(1); } }
      `}</style>
    </section>
  );
}

// ── MISSION ──
function Mission() {
  const pillars = [
    { icon: "🧠", title: "AI Mentor", desc: "Real-time guidance tuned to your gaps and goals." },
    { icon: "👁️", title: "Smart Gaze Tracking", desc: "AI monitors focus and attention in real time — detecting drift, flagging disengagement, and keeping you locked in." },
    { icon: "🏛️", title: "Socratic Learning", desc: "AI never just hands you answers — it asks targeted questions that guide you to build deep understanding yourself." },
    { icon: "📈", title: "Analytics", desc: "Visualize momentum and compound your strengths." },
  ];
  return (
    <section id="mission" style={{ padding: "100px 5%", background: "#111" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "start" }}>
        <Reveal direction="left">
          <SectionLabel>Our Mission</SectionLabel>
          <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: 800, lineHeight: 1.15, marginBottom: "1rem", color: "#F0F0F0" }}>
            Built Around<br />How You Actually Grow
          </h2>
          <p style={{ color: "#888", marginBottom: 0, lineHeight: 1.8 }}>
            AQUIRE was built because random practice doesn't build engineers. Structured intelligence does.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "2rem" }}>
            {pillars.map((p, i) => <PillarCard key={i} {...p} delay={i * 0.1} />)}
          </div>
        </Reveal>

        <Reveal direction="right">
          <p style={{ fontFamily: "'Times New Roman', serif", fontSize: "clamp(1.5rem,2.5vw,2rem)", fontWeight: 700, lineHeight: 1.4, marginBottom: "1.5rem", color: "#F0F0F0" }}>
            We replace{" "}
            <span style={{ background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              scattered effort
            </span>{" "}
            with structured, AI-driven mastery — measured every step of the way.
          </p>
          <p style={{ color: "#888", lineHeight: 1.8, marginBottom: "1.5rem" }}>
            AQUIRE combines mentorship-grade accountability with intelligent adaptive systems — so every hour you invest translates directly into measurable skill progression.
          </p>
          <p style={{ color: "#888", lineHeight: 1.8 }}>
            Whether you're targeting FAANG, competitive programming, or your first engineering role, AQUIRE calibrates your path, tracks your velocity, and keeps you on course.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function PillarCard({ icon, title, desc, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <Reveal delay={delay} style={{ height: "100%" }}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          background: "#1A1A1A", border: `1px solid ${hov ? "rgba(255,215,0,0.3)" : "#222"}`,
          borderRadius: 12, padding: "1.2rem 1.4rem",
          boxShadow: hov ? "0 0 40px rgba(255,215,0,0.15)" : "none",
          transition: "border-color 0.3s, box-shadow 0.3s",
          height: "100%", boxSizing: "border-box",
        }}>
        <div style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>{icon}</div>
        <div style={{ fontFamily: "'Times New Roman', serif", fontWeight: 700, marginBottom: "0.25rem", color: "#F0F0F0" }}>{title}</div>
        <div style={{ fontSize: "0.82rem", color: "#888", lineHeight: 1.6 }}>{desc}</div>
      </div>
    </Reveal>
  );
}

// ── FEATURES ──
const features = [
  { icon: "🤖", title: "AI Mentor", desc: "Real-time intelligent guidance that understands your weaknesses, adjusts explanations to your pace, and surfaces the right problems at the right time.", tag: "AI-Powered" },
  { icon: "🏛️", title: "Socratic Learning", desc: "AQUIRE's AI never just hands you answers — it asks targeted questions that guide you to construct understanding yourself, building deep reasoning skills and lasting retention.", tag: "Deep Thinking" },
  { icon: "📓", title: "Structured Learning Notes by AI", desc: "AI-generated, personalized study notes that distill exactly what you need to know — structured around your roadmap and automatically updated as you progress.", tag: "AI-Generated" },
  { icon: "📝", title: "Personalized Quizzes", desc: "Adaptive testing that evolves with your performance — targeting gaps intelligently, reinforcing strengths, and surfacing blindspots before interviews.", tag: "Adaptive" },
  { icon: "📊", title: "Assignments & Evaluations", desc: "AI-graded performance insights with detailed rubrics, comparative scoring, and specific recommendations to close gaps faster.", tag: "AI Graded" },
  { icon: "🗺️", title: "Roadmaps", desc: "Goal-based structured paths that adapt to your timeline and current level — ensuring you always know exactly what to tackle next.", tag: "Goal-Based" },
  { icon: "📈", title: "Personal Intelligence Dashboard", desc: "Data visualization analytics that turn your practice history into actionable insight — streak tracking, velocity graphs, and domain mastery heatmaps.", tag: "Analytics" },
  { icon: "🎯", title: "Self Grinding Sessions", desc: "Deep-focus tracked practice environments with session scoring, distraction detection, and personalized difficulty calibration.", tag: "Tracked" },
  { icon: "💻", title: "DSA Practice Sessions", desc: "A curated, sequenced coding roadmap spanning 800+ problems across all critical DSA domains — from fundamentals to advanced system design.", tag: "Curated" },
  { icon: "⌨️", title: "Integrated IDE", desc: "A full in-browser code editor embedded alongside video lessons — write, run, and test code in real time without ever leaving the learning session.", tag: "Built-In" },
  { icon: "🤝", title: "Collaborative Learning", desc: "Structured peer-based sessions that mirror how top engineers collaborate — with accountability, shared goals, and competitive momentum.", tag: "Peer-Based" },
  { icon: "✨", title: "More Incoming", desc: "AQUIRE is actively expanding — mock interview simulation, company-specific preparation modules, and more arriving soon.", tag: "Coming Soon", special: true },
];

function FeatureCard({ icon, title, desc, tag, special, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <Reveal delay={delay}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          background: special ? "linear-gradient(135deg, rgba(255,215,0,0.06), rgba(255,106,0,0.04))" : "#1A1A1A",
          border: `1px solid ${hov ? "rgba(255,180,0,0.3)" : special ? "rgba(255,180,0,0.2)" : "#222"}`,
          borderRadius: 16, padding: "2rem", position: "relative", overflow: "hidden",
          cursor: "default",
          transform: hov ? "translateY(-6px)" : "none",
          boxShadow: hov ? "0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(255,215,0,0.15)" : "none",
          transition: "transform 0.3s, border-color 0.3s, box-shadow 0.3s",
        }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: special ? "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,106,0,0.15))" : "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,106,0,0.08))",
          border: "1px solid rgba(255,215,0,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.4rem", marginBottom: "1.2rem",
          boxShadow: hov ? "0 0 20px rgba(255,200,0,0.2)" : "none",
          transition: "box-shadow 0.3s",
        }}>{icon}</div>
        <div style={{ fontFamily: "'Times New Roman', serif", fontWeight: 700, marginBottom: "0.6rem", fontSize: "1.05rem", color: special ? YELLOW : "#F0F0F0" }}>{title}</div>
        <div style={{ fontSize: "0.88rem", color: "#888", lineHeight: 1.7 }}>{desc}</div>
        <span style={{
          display: "inline-block", marginTop: "1rem",
          fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          color: special ? YELLOW : ORANGE,
          background: special ? "rgba(255,215,0,0.08)" : "rgba(255,106,0,0.08)",
          border: `1px solid ${special ? "rgba(255,215,0,0.2)" : "rgba(255,106,0,0.2)"}`,
          padding: "0.2rem 0.7rem", borderRadius: 100,
        }}>{tag}</span>
      </div>
    </Reveal>
  );
}

function Features() {
  return (
    <section id="features" style={{ padding: "100px 5%", background: "#0D0D0D", width: "100%", boxSizing: "border-box" }}>
      <Reveal>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <SectionLabel style={{ justifyContent: "center" }}>Core Features</SectionLabel>
          <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: 800, color: "#F0F0F0", marginBottom: "1rem" }}>
            Everything You Need.<br />
            <span style={{ background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Nothing You Don't.
            </span>
          </h2>
          <p style={{ color: "#888", fontSize: "1.05rem", maxWidth: 560, margin: "0 auto", lineHeight: 1.8 }}>
            Eleven precision-crafted systems working in sync to eliminate wasted effort.
          </p>
        </div>
      </Reveal>
      <div className="feat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
        {features.map((f, i) => <FeatureCard key={i} {...f} delay={i * 0.07} />)}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .feat-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 640px) {
          .feat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

// ── WHY AQUIRE ──
function WhyBlock1() {
  const [ref, inView] = useInView({ threshold: 0.3 });
  const c1 = useCounter(3.2, 1800, inView);
  const c2 = useCounter(96, 1800, inView);

  const bars = [
    { label: "AI Personalization Score", val: 98, pct: "98%", color: `linear-gradient(90deg,${YELLOW},${ORANGE})` },
    { label: "Learner Retention Rate", val: 91, pct: "91%", color: `linear-gradient(90deg,#FFC107,${ORANGE})` },
    { label: "Roadmap Completion Rate", val: 84, pct: "84%", color: `linear-gradient(90deg,${ORANGE},#FF3D00)` },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center", marginBottom: "6rem" }}>
      <Reveal direction="left">
        <div ref={ref} style={{ background: "#1A1A1A", border: "1px solid #222", borderRadius: 20, padding: "2.5rem", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})` }} />
          <div style={{ display: "flex", gap: "2rem", marginBottom: "1.5rem" }}>
            {[{ val: c1, suffix: "×", label: "Faster Progress" }, { val: c2, suffix: "%", label: "Interview Success Rate" }].map((s, i) => (
              <div key={i}>
                <div style={{ fontFamily: "'Times New Roman', serif", fontSize: "2.5rem", fontWeight: 800, lineHeight: 1, background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {s.val}{s.suffix}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#888", marginTop: "0.3rem" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {bars.map((b, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 500, color: "#F0F0F0" }}>
                  <span>{b.label}</span>
                  <span style={{ color: YELLOW }}>{b.pct}</span>
                </div>
                <div style={{ height: 6, background: "#222", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: b.color, width: inView ? b.val + "%" : "0%", transition: "width 1.5s ease 0.3s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal direction="right">
        <SectionLabel>Adaptive Intelligence</SectionLabel>
        <h3 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.8rem", fontWeight: 800, color: "#F0F0F0", marginBottom: "1rem", lineHeight: 1.3 }}>
          Your progress shapes<br />your path. Constantly.
        </h3>
        <p style={{ color: "#888", lineHeight: 1.8, marginBottom: "1.5rem" }}>
          Most platforms dump content at you. AQUIRE builds a living model of your ability, tracks your velocity across domains, and continuously recalibrates what you should tackle next.
        </p>
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {[
            "AI analyzes every session in real-time for gap detection",
            "Difficulty auto-adjusts based on accuracy and speed",
            "Roadmaps restructure dynamically with your timeline",
            "Weak spots are targeted before they become blindspots",
          ].map((item, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.8rem", fontSize: "0.95rem", color: "#F0F0F0" }}>
              <span style={{ color: YELLOW, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>✓</span>
              {item}
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}

function WhyBlock2() {
  const comparisons = [
    ["Random problem picking", "Curated structured paths"],
    ["No progress visibility", "Real-time analytics"],
    ["Self-driven, no accountability", "AI + peer accountability"],
    ["Generic one-size content", "Personalized AI curriculum"],
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }}>
      <Reveal direction="right">
        <div style={{ background: "#1A1A1A", border: "1px solid #222", borderRadius: 20, padding: "2.5rem", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})` }} />
          <div style={{ fontFamily: "'Times New Roman', serif", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase", marginBottom: "1.2rem" }}>
            AQUIRE vs. Random Practice
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", paddingBottom: "0.5rem", borderBottom: "1px solid #222" }}>
              <span>Without AQUIRE</span>
              <span style={{ color: YELLOW }}>With AQUIRE</span>
            </div>
            {comparisons.map(([bad, good], i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div style={{ background: "rgba(255,50,50,0.06)", border: "1px solid rgba(255,50,50,0.15)", borderRadius: 8, padding: "0.8rem", fontSize: "0.82rem", color: "#888" }}>❌ {bad}</div>
                <div style={{ background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 8, padding: "0.8rem", fontSize: "0.82rem", color: "#F0F0F0" }}>✓ {good}</div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal direction="left">
        <SectionLabel>Structured Accountability</SectionLabel>
        <h3 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.8rem", fontWeight: 800, color: "#F0F0F0", marginBottom: "1rem", lineHeight: 1.3 }}>
          Accountability is a<br />system, not willpower.
        </h3>
        <p style={{ color: "#888", lineHeight: 1.8, marginBottom: "1.5rem" }}>
          AQUIRE doesn't rely on your motivation. It builds structured systems of commitment — with integrated mentorship, session scoring, and peer-based checkpoints.
        </p>
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {[
            "Mentor check-ins woven into your practice cadence",
            "Peer sessions with structured collaborative accountability",
            "Assignment deadlines managed by AI scheduling",
            "Progress reports that keep you honest with yourself",
          ].map((item, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.8rem", fontSize: "0.95rem", color: "#F0F0F0" }}>
              <span style={{ color: YELLOW, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>✓</span>
              {item}
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}

function Why() {
  return (
    <section id="why" style={{ padding: "100px 5%", background: "#111" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: "5rem" }}>
            <SectionLabel style={{ justifyContent: "center" }}>The AQUIRE Difference</SectionLabel>
            <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: 800, color: "#F0F0F0", marginBottom: "1rem" }}>
              Why{" "}
              <span style={{ background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                AQUIRE
              </span>{" "}is Different
            </h2>
            <p style={{ color: "#888", fontSize: "1.05rem", maxWidth: 560, margin: "0 auto", lineHeight: 1.8 }}>
              Structured intelligence over random grinding. Accountability over motivation. Measurable growth over vague progress.
            </p>
          </div>
        </Reveal>
        <WhyBlock1 />
        <WhyBlock2 />
      </div>
    </section>
  );
}

// ── TESTIMONIALS ──
const testimonials = [
  [
    { initials: "AR", name: "Arjun Reddy", role: "SWE @ Google • Ex-Wipro", text: "AQUIRE completely changed how I approach DSA. The AI Mentor catches exactly where I'm struggling and gives targeted problems — not random ones. Landed my Google offer in 4 months." },
    { initials: "PM", name: "Priya Mehta", role: "Backend Engineer @ Amazon", text: "The Progress Dashboard alone is worth it. I could finally see exactly which topics I was weak in, and the roadmap adjusted automatically. No more guessing what to study." },
    { initials: "KS", name: "Kiran Sharma", role: "SWE @ Microsoft • IIT Bombay", text: "The collaborative sessions kept me accountable in ways I couldn't manage solo. Having peers on the same roadmap with shared goals made the difference between giving up and pushing through." },
  ],
  [
    { initials: "SV", name: "Siddharth Verma", role: "SWE @ Atlassian", text: "I tried four other platforms before AQUIRE. The structured roadmap and AI evaluations are on another level. The assignments actually simulate interview pressure — nothing else does this." },
    { initials: "RT", name: "Riya Thakur", role: "SWE @ Meta • NIT Graduate", text: "The personalized quiz system is eerily accurate. It knew I was weak in segment trees before I did. Three weeks of targeted practice and I cleared a FAANG round that previously stumped me." },
    { initials: "AN", name: "Aditya Nair", role: "Staff Engineer @ Stripe", text: "AQUIRE treats you like a serious engineer from day one. No gamification gimmicks — just structured, purposeful practice with AI that actually understands what FAANG interviews demand." },
  ],
];

function TestiCard({ initials, name, role, text }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "#1A1A1A", border: `1px solid ${hov ? "rgba(255,215,0,0.2)" : "#222"}`, borderRadius: 16,
        padding: "2rem", position: "relative", overflow: "hidden",
        transition: "border-color 0.3s",
      }}>
      <div style={{ position: "absolute", top: "0.5rem", right: "1.5rem", fontSize: "6rem", color: "rgba(255,215,0,0.07)", fontFamily: "Georgia, serif", lineHeight: 1 }}>"</div>
      <div style={{ color: YELLOW, fontSize: "0.9rem", marginBottom: "1rem", letterSpacing: "0.1em" }}>★★★★★</div>
      <p style={{ fontSize: "0.9rem", color: "#888", lineHeight: 1.7, marginBottom: "1.5rem" }}>"{text}"</p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: `linear-gradient(135deg, ${YELLOW}, ${ORANGE})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: "0.9rem", color: "#0D0D0D", flexShrink: 0,
        }}>{initials}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#F0F0F0" }}>{name}</div>
          <div style={{ fontSize: "0.78rem", color: "#888" }}>{role}</div>
        </div>
      </div>
    </div>
  );
}

function Testimonials() {
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % 2), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="testimonials" style={{ padding: "100px 5%", background: "#0D0D0D" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <SectionLabel style={{ justifyContent: "center" }}>Testimonials</SectionLabel>
            <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: 800, color: "#F0F0F0" }}>
              What{" "}
              <span style={{ background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Learners Say
              </span>
            </h2>
            <p style={{ color: "#888", fontSize: "1.05rem", maxWidth: 560, margin: "0 auto", lineHeight: 1.8 }}>
              Engineers who chose structure over randomness — and landed where they aimed.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div style={{ overflow: "hidden" }}>
            <div style={{
              display: "flex", transition: "transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94)",
              transform: `translateX(-${slide * 100}%)`,
            }}>
              {testimonials.map((group, gi) => (
                <div key={gi} style={{ flexShrink: 0, width: "100%", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.5rem" }}>
                  {group.map((t, i) => <TestiCard key={i} {...t} />)}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "2rem" }}>
            {[0, 1].map(i => (
              <button key={i} onClick={() => setSlide(i)}
                style={{
                  width: 6, height: 6, borderRadius: "50%", border: "none", cursor: "pointer",
                  padding: 0, margin: 0, flexShrink: 0,
                  background: slide === i ? YELLOW : "#333",
                  transform: slide === i ? "scale(1.3)" : "none",
                  transition: "background 0.3s, transform 0.3s",
                }} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── CONTACT ──
function Contact({ onSignup }) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const socials = [
    { icon: "▶", name: "YouTube" },
    { icon: "📸", name: "Instagram" },
    { icon: "💼", name: "LinkedIn" },
    { icon: "𝕏", name: "Twitter" },
  ];

  return (
    <section id="contact" style={{ padding: "100px 5%", background: "#111" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "start" }}>
        <Reveal direction="left">
          <SectionLabel>Get In Touch</SectionLabel>
          <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: 800, color: "#F0F0F0", marginBottom: "0.8rem" }}>
            Start Your<br />
            <span style={{ background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Journey Today
            </span>
          </h2>
          <p style={{ color: "#888", marginBottom: "2rem", lineHeight: 1.8 }}>
            Have questions, partnership inquiries, or want to see AQUIRE in action? Reach out — we respond within 24 hours.
          </p>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            {[
              { label: "Full Name", type: "text", placeholder: "Your name" },
              { label: "Email Address", type: "email", placeholder: "you@example.com" },
            ].map((f) => (
              <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#888", letterSpacing: "0.04em" }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} required
                  style={{
                    background: "#1A1A1A", border: "1px solid #222", borderRadius: 8,
                    padding: "0.85rem 1.1rem", color: "#F0F0F0",
                    fontFamily: "DM Sans, sans-serif", fontSize: "0.95rem", outline: "none", width: "100%",
                  }} />
              </div>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#888", letterSpacing: "0.04em" }}>Message</label>
              <textarea placeholder="Tell us what you're looking for..." required rows={5}
                style={{
                  background: "#1A1A1A", border: "1px solid #222", borderRadius: 8,
                  padding: "0.85rem 1.1rem", color: "#F0F0F0",
                  fontFamily: "DM Sans, sans-serif", fontSize: "0.95rem", outline: "none",
                  width: "100%", resize: "vertical",
                }} />
            </div>
            <button type="submit" style={{
              background: submitted ? "linear-gradient(135deg,#22c55e,#16a34a)" : `linear-gradient(135deg, ${YELLOW}, ${ORANGE})`,
              color: "#0D0D0D", fontWeight: 700, border: "none", cursor: "pointer",
              padding: "0.9rem 2rem", borderRadius: 8,
              fontFamily: "DM Sans, sans-serif", fontSize: "1rem", alignSelf: "flex-start",
              transition: "background 0.3s",
            }}>
              {submitted ? "✓ Message Sent!" : "Send Message →"}
            </button>
          </form>
        </Reveal>

        <Reveal direction="right">
          <SectionLabel>Connect With Us</SectionLabel>
          <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: 800, color: "#F0F0F0", marginBottom: "0.8rem" }}>
            Follow the<br />
            <span style={{ background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              AQUIRE Journey
            </span>
          </h2>
          <p style={{ color: "#888", marginBottom: "1.5rem", lineHeight: 1.8 }}>
            Stay updated on feature releases, learning resources, coding challenges, and community highlights.
          </p>

          <a href="mailto:hello@aquire.dev" style={{
            display: "flex", alignItems: "center", gap: "0.8rem",
            background: "#1A1A1A", border: "1px solid #222", borderRadius: 10,
            padding: "1rem 1.4rem", marginBottom: "1.5rem",
            fontWeight: 600, color: YELLOW, textDecoration: "none", fontSize: "0.95rem",
          }}>
            <span>✉️</span> hello@aquire.dev
          </a>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.8rem" }}>
            {socials.map(s => (
              <SocialBtn key={s.name} {...s} />
            ))}
          </div>

          <div style={{
            marginTop: "2.5rem", background: "#1A1A1A", border: "1px solid rgba(255,215,0,0.15)",
            borderRadius: 16, padding: "1.8rem", position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})` }} />
            <div style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.5rem", color: "#F0F0F0" }}>
              Ready to level up?
            </div>
            <p style={{ color: "#888", fontSize: "0.88rem", lineHeight: 1.7, marginBottom: "1.2rem" }}>
              Join 2,400+ engineers who chose structure over luck.
            </p>
            <GradBtn onClick={onSignup} style={{ padding: "0.75rem 1.8rem", borderRadius: 8, fontSize: "0.95rem", width: "100%" }}>
              Create Free Account →
            </GradBtn>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function SocialBtn({ icon, name }) {
  const [hov, setHov] = useState(false);
  return (
    <a href="#" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "#1A1A1A", border: `1px solid ${hov ? "rgba(255,215,0,0.3)" : "#222"}`, borderRadius: 10,
        padding: "0.9rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem",
        cursor: "pointer", textDecoration: "none",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? "0 8px 24px rgba(0,0,0,0.3)" : "none",
        transition: "all 0.2s",
      }}>
      <span style={{ fontSize: "1.3rem" }}>{icon}</span>
      <span style={{ fontSize: "0.7rem", color: "#888", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{name}</span>
    </a>
  );
}

// ── FOOTER ──
function Footer() {
  return (
    <footer style={{
      background: "#0D0D0D",
      borderTop: "1px solid transparent",
      borderImage: `linear-gradient(90deg, transparent, ${YELLOW}, ${ORANGE}, transparent) 1`,
      padding: "2.5rem 5%",
    }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "1rem",
      }}>
        <div style={{
          fontFamily: "'Times New Roman', serif", fontWeight: 800, fontSize: "1.2rem",
          letterSpacing: "0.08em",
          background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>AQUIRE</div>
        <div style={{ display: "flex", gap: "2rem" }}>
          {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(l => (
            <a key={l} href="#" style={{ color: "#888", textDecoration: "none", fontSize: "0.85rem", transition: "color 0.2s" }}
              onMouseEnter={e => e.target.style.color = YELLOW}
              onMouseLeave={e => e.target.style.color = "#888"}>{l}</a>
          ))}
        </div>
        <div style={{ color: "#444", fontSize: "0.82rem" }}>© 2025 AQUIRE. All rights reserved.</div>
      </div>
    </footer>
  );
}

// ── MODAL ──
function Modal({ show, onClose }) {
  const navigate = useNavigate();
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity: show ? 1 : 0, pointerEvents: show ? "all" : "none",
      transition: "opacity 0.4s",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#1A1A1A", border: "1px solid rgba(255,215,0,0.2)",
        borderRadius: 20, padding: "3rem",
        maxWidth: 480, width: "90%", position: "relative",
        transform: show ? "scale(1)" : "scale(0.9)",
        transition: "transform 0.4s",
        textAlign: "center",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: "1rem", right: "1.2rem",
          background: "none", border: "none", color: "#888",
          fontSize: "1.5rem", cursor: "pointer", lineHeight: 1,
        }}>×</button>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚡</div>
        <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.8rem", color: "#F0F0F0" }}>
          You're 1 Step Away
        </h2>
        <p style={{ color: "#888", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "2rem" }}>
          Join AQUIRE free and get your personalized AI roadmap in under 2 minutes. No credit card required.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <GradBtn onClick={() => navigate('/signup')} style={{ padding: "0.75rem 1.8rem", borderRadius: 8, fontSize: "0.95rem" }}>Start Free →</GradBtn>
          <GhostBtn onClick={onClose} style={{ padding: "0.75rem 1.8rem", borderRadius: 8, fontSize: "0.95rem" }}>Maybe Later</GhostBtn>
        </div>
      </div>
    </div>
  );
}

// ── APP ──
export default function App() {
  const navigate = useNavigate();
  const [modalShow, setModalShow] = useState(false);
  const [modalTriggered, setModalTriggered] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (modalTriggered) return;
      const depth = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (depth > 0.45) {
        setModalTriggered(true);
        setTimeout(() => setModalShow(true), 800);
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [modalTriggered]);

  return (
    <div style={{ background: "#0D0D0D", color: "#F0F0F0", fontFamily: "DM Sans, sans-serif", fontSize: 17, lineHeight: 1.7, overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <Nav onSignup={() => navigate('/signup')} />
      <Hero onSignup={() => navigate('/signup')} />
      <Mission />
      <Features />
      <Why />
      <Testimonials />
      <Contact onSignup={() => navigate('/signup')} />
      <Footer />
      <Modal show={modalShow} onClose={() => setModalShow(false)} />
    </div>
  );
}