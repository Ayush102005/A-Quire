import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const YELLOW = "#FFD700";
const ORANGE = "#FF6A00";
const SIDEBAR_W = 240;
const DIM = "#666";
const DIMMER = "#4A4A4A";

// ── ICONS ──
const icons = {
  dashboard: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  profile:   <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
  account:   <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></svg>,
  goals:     <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></svg>,
  target:    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="6" /></svg>,
  checklist: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3 5-5" /><rect x="3" y="3" width="18" height="18" rx="3" /></svg>,
  ai:        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 2-1.5 3.5-3 4.5V17h-2v-6.5C9.5 9.5 8 8 8 6a4 4 0 0 1 4-4z" /><path d="M9 21h6M12 17v4" /></svg>,
  space:     <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>,
  settings:  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  logout:    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
};

function SectionLabel({ children }) {
  return <div style={{ fontSize: "0.7rem", fontWeight: 700, color: DIM, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.55rem" }}>{children}</div>;
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#0F0F0F", border: "1px solid #1A1A1A", borderRadius: 16,
      padding: "1.1rem", position: "relative", overflow: "hidden", ...style,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})` }} />
      {children}
    </div>
  );
}

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

// ── MONTH CALENDAR ──
function MonthCalendar({ streak }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString("default", { month: "long" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun

  // Active dates in this month: today and last `streak` days
  const activeDates = new Set();
  const todayIsThisMonth = today.getMonth() === month && today.getFullYear() === year;
  for (let i = 0; i < streak * 2; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (d.getMonth() === month && d.getFullYear() === year) activeDates.add(d.getDate());
  }

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Card style={{ padding: "0.9rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.45rem" }}>
        <div>
          <SectionLabel>Activity Calendar</SectionLabel>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.95rem", animation: "pulse 2s ease-in-out infinite" }}>🔥</span>
            <span style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.1rem", fontWeight: 800, color: YELLOW }}>{streak}</span>
            <span style={{ fontSize: "0.68rem", color: DIM }}>day streak</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <button onClick={prevMonth} style={{
            background: "transparent", border: "1px solid #222", borderRadius: 5,
            width: 20, height: 20, cursor: "pointer", color: DIM, fontSize: "0.65rem",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>‹</button>
          <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "#C0C0C0", minWidth: 76, textAlign: "center" }}>
            {monthName} {year}
          </span>
          <button onClick={nextMonth} style={{
            background: "transparent", border: "1px solid #222", borderRadius: 5,
            width: 20, height: 20, cursor: "pointer", color: DIM, fontSize: "0.65rem",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>›</button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.12rem", marginBottom: "0.15rem" }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: "0.52rem", fontWeight: 600, color: DIM, padding: "0.05rem 0" }}>{d}</div>
        ))}
      </div>

      {/* Date grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.12rem" }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} />;
          const isToday = isCurrentMonth && d === today.getDate();
          const isActive = activeDates.has(d);
          const isFuture = isCurrentMonth && d > today.getDate();

          return (
            <div key={d} style={{
              aspectRatio: "1", borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.72rem", fontWeight: isToday ? 800 : isActive ? 600 : 400,
              background: isToday
                ? `linear-gradient(135deg, ${YELLOW}, ${ORANGE})`
                : isActive
                  ? "rgba(255,215,0,0.1)"
                  : "transparent",
              color: isToday ? "#0D0D0D" : isActive ? YELLOW : isFuture ? "#2E2E2E" : DIM,
              border: isActive && !isToday ? `1px solid rgba(255,215,0,0.25)` : "1px solid transparent",
              cursor: "default",
            }}>{d}</div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid #181818" }}>
        {[
          { label: "Active this month", val: `${activeDates.size}d` },
          { label: "Best Streak",       val: "14d" },
          { label: "Current Streak",    val: `${streak}d`, highlight: true },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.04rem" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: s.highlight ? YELLOW : "#E0E0E0", fontFamily: "'Times New Roman', serif" }}>{s.val}</span>
            <span style={{ fontSize: "0.48rem", color: DIM, letterSpacing: "0.04em", textTransform: "uppercase" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── INTELLIGENCE PROGRESS GRAPH ──
function IntelligenceGraph() {
  const kpis = [
    { label: "Problems Solved", value: "847" },
    { label: "Accuracy %", value: "92" },
    { label: "Day Streak", value: "38" },
  ];

  const tracks = [
    { label: "Trees & Graphs", progress: 87 },
    { label: "Dynamic Programming", progress: 64 },
    { label: "System Design", progress: 51 },
  ];

  const roadmap = 68;

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.8rem" }}>
        <SectionLabel>Progress Intelligence</SectionLabel>
        <span style={{
          fontSize: "0.62rem", fontWeight: 700, color: "#22c55e",
          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.28)",
          borderRadius: 999, padding: "0.15rem 0.55rem",
        }}>• Live</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem", marginBottom: "0.85rem" }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            background: "#121212", border: "1px solid #222", borderRadius: 12,
            padding: "0.8rem 0.65rem", textAlign: "center",
          }}>
            <div style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.8rem", lineHeight: 1, fontWeight: 800, color: YELLOW }}>{k.value}</div>
            <div style={{ fontSize: "0.62rem", color: "#C0C0C0", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "0.28rem", fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {tracks.map(track => (
          <div key={track.label}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.22rem" }}>
              <span style={{ fontSize: "0.76rem", color: "#E6E6E6", fontWeight: 600 }}>{track.label}</span>
              <span style={{ fontSize: "0.74rem", color: "#BDBDBD", fontWeight: 700 }}>{track.progress}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "#1B1B1B", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${track.progress}%`, borderRadius: 999,
                background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: "0.75rem", width: "fit-content",
        background: "#0E141E", border: "1px solid #233047", borderRadius: 999,
        padding: "0.22rem 0.72rem", color: "#D8E7FF",
        fontSize: "0.68rem", fontWeight: 700,
      }}>
        🎯 Roadmap {roadmap}% Complete
      </div>
    </Card>
  );
}

// ── STATS ──
function StatsSection() {
  const stats = [
    { emoji: "📚", label: "Topics Covered",   value: "24",  sub: "across all tracks",   color: YELLOW },
    { emoji: "💡", label: "Problems Solved",  value: "138", sub: "LeetCode + practice",  color: "#3B82F6" },
    { emoji: "⏱️", label: "Hours Logged",     value: "61",  sub: "total study time",     color: "#10B981" },
    { emoji: "🏆", label: "Assessments Done", value: "9",   sub: "AI reviews completed", color: ORANGE },
  ];
  return (
    <Card>
      <SectionLabel>Stats</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem" }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 10,
            padding: "0.65rem", display: "flex", flexDirection: "column", gap: "0.3rem",
          }}>
            <span style={{ fontSize: "0.95rem" }}>{s.emoji}</span>
            <span style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.15rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</span>
            <div>
              <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "#C0C0C0" }}>{s.label}</div>
              <div style={{ fontSize: "0.58rem", color: DIM }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── DAILY CHECKLIST ──
function DailyChecklist({ checks, onToggle }) {
  const done = checks.filter(c => c.done).length;
  const pct = Math.round((done / checks.length) * 100);
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
        <SectionLabel>Daily Checklist</SectionLabel>
        <span style={{
          fontSize: "0.68rem", fontWeight: 700,
          color: pct === 100 ? "#22c55e" : YELLOW,
          background: pct === 100 ? "rgba(34,197,94,0.08)" : "rgba(255,215,0,0.07)",
          border: `1px solid ${pct === 100 ? "rgba(34,197,94,0.22)" : "rgba(255,215,0,0.18)"}`,
          padding: "0.15rem 0.55rem", borderRadius: 100,
        }}>{done}/{checks.length}</span>
      </div>

      <div style={{ fontSize: "0.72rem", color: DIM, marginBottom: "0.5rem" }}>
        {done === checks.length ? "🎉 All done for today!" : `${checks.length - done} task${checks.length - done !== 1 ? "s" : ""} remaining`}
      </div>

      <div style={{ height: 4, background: "#181818", borderRadius: 3, overflow: "hidden", marginBottom: "0.65rem" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 3,
          background: pct === 100 ? "#22c55e" : `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`,
          transition: "width 0.4s ease",
        }} />
      </div>

      {checks.map((c, i) => (
        <div key={c.id} onClick={() => onToggle(c.id)}
          style={{
            display: "flex", alignItems: "center", gap: "0.55rem",
            padding: "0.4rem 0", cursor: "pointer",
            borderBottom: i < checks.length - 1 ? "1px solid #161616" : "none",
          }}>
          <div style={{
            width: 14, height: 14, borderRadius: 4, flexShrink: 0,
            border: `1.5px solid ${c.done ? "transparent" : "#2E2E2E"}`,
            background: c.done ? `linear-gradient(135deg, ${YELLOW}, ${ORANGE})` : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s",
          }}>
            {c.done && <span style={{ color: "#0D0D0D", fontSize: "0.5rem", fontWeight: 900 }}>✓</span>}
          </div>
          <span style={{
            fontSize: "0.78rem", fontFamily: "'DM Sans', sans-serif",
            color: c.done ? DIMMER : "#A0A0A0",
            textDecoration: c.done ? "line-through" : "none",
            transition: "all 0.18s",
          }}>{c.text}</span>
        </div>
      ))}
    </Card>
  );
}

// ── SUBJECT CARD ──
function SubjectCard({ icon, title, subtitle, progress, color, doneCount, totalTopics }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "#141414" : "#0F0F0F",
        border: `1px solid ${hov ? "#252525" : "#191919"}`,
        borderRadius: 14, padding: "1.2rem",
        cursor: "pointer", transition: "all 0.2s",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? "0 14px 36px rgba(0,0,0,0.45)" : "none",
        display: "flex", flexDirection: "column", gap: "0.85rem",
        position: "relative", overflow: "hidden",
      }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, opacity: hov ? 1 : 0.35, transition: "opacity 0.2s" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: `${color}12`, border: `1px solid ${color}25`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem",
        }}>{icon}</div>
        <span style={{
          fontSize: "0.63rem", fontWeight: 700, color: DIM,
          background: "#131313", border: "1px solid #222", borderRadius: 100,
          padding: "0.16rem 0.5rem", letterSpacing: "0.06em", textTransform: "uppercase",
        }}>{progress}%</span>
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#D0D0D0", marginBottom: "0.18rem", fontFamily: "'DM Sans', sans-serif" }}>{title}</div>
        <div style={{ fontSize: "0.72rem", color: DIM, lineHeight: 1.45 }}>{subtitle}</div>
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.3rem" }}>
          <span style={{ fontSize: "0.6rem", color: "#909090", fontWeight: 500 }}>{doneCount} / {totalTopics} topics</span>
          <span style={{ fontSize: "0.6rem", color: color, fontWeight: 700 }}>{progress}%</span>
        </div>
        <div style={{ height: 5, background: "#181818", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, borderRadius: 3, background: color, transition: "width 0.6s ease" }} />
        </div>
      </div>
    </div>
  );
}

// ── NAV GROUP (expandable sidebar section) ──
function NavGroup({ icon, label, open, onToggle, children, active }) {
  const [hov, setHov] = useState(false);
  return (
    <div>
      <div onClick={onToggle} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.6rem 1rem", borderRadius: 10, cursor: "pointer",
          background: active ? "rgba(255,215,0,0.08)" : hov ? "rgba(255,255,255,0.03)" : "transparent",
          color: active ? YELLOW : hov ? "#C0C0C0" : DIMMER,
          borderLeft: active ? `2px solid ${YELLOW}` : "2px solid transparent",
          marginLeft: -1, transition: "all 0.18s",
        }}>
        <span style={{ flexShrink: 0, opacity: active ? 1 : hov ? 0.8 : 0.5 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: "0.875rem", fontWeight: active ? 600 : 400, fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
        <span style={{ fontSize: "0.55rem", color: DIMMER, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(90deg)" : "none" }}>▸</span>
      </div>
      {open && <div style={{ paddingLeft: "0.5rem", marginTop: "0.05rem" }}>{children}</div>}
    </div>
  );
}

// ── DETAIL ROW (hides when empty) ──
function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.18rem" }}>
      <span style={{ fontSize: "0.63rem", fontWeight: 700, color: DIM, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: "0.9rem", color: "#C0C0C0", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>{value}</span>
    </div>
  );
}

// ── DISPLAY ROW (always shows, "—" when empty) ──
function DisplayRow({ label, value, fullWidth = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.22rem", gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <span style={{ fontSize: "0.63rem", fontWeight: 700, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: "0.92rem", color: value ? "#C0C0C0" : "#333", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{value || "—"}</span>
    </div>
  );
}

// ── VIEW SECTION DIVIDER ──
function ViewSection({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.2rem 0 0.9rem" }}>
      <div style={{ flex: 1, height: 1, background: "#1A1A1A" }} />
      <span style={{ fontSize: "0.63rem", fontWeight: 700, letterSpacing: "0.14em", color: ORANGE, textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: "#1A1A1A" }} />
    </div>
  );
}

// ── PERSONAL DETAILS VIEW ──
function PersonalDetails({ account }) {
  const catLabel = { school: "School Student", college: "College Student", fresher: "Fresher / Just Graduated", working: "Working Professional" };
  const p = account.profileExtra || {};
  const personal = account.personal || {};
  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }}>
      <div style={{ marginBottom: "1.6rem" }}>
        <p style={{ fontSize: "0.72rem", color: DIM, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.25rem" }}>Profile</p>
        <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.7rem", fontWeight: 800, color: "#F0F0F0" }}>Personal Details</h1>
        <p style={{ fontSize: "0.85rem", color: DIM, marginTop: "0.2rem" }}>Your personal information and profile.</p>
      </div>
      <Card>
        {/* Profile header */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.4rem", paddingBottom: "1.2rem", borderBottom: "1px solid #1A1A1A" }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
            background: `linear-gradient(135deg, ${YELLOW}, ${ORANGE})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.3rem", fontWeight: 900, color: "#0D0D0D", fontFamily: "'Times New Roman', serif",
          }}>{(account.name || "?")[0].toUpperCase()}</div>
          <div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#F0F0F0", fontFamily: "'Times New Roman', serif" }}>{account.name || "—"}</div>
            <div style={{ fontSize: "0.73rem", color: DIM, marginTop: "0.08rem" }}>@{account.username || "—"}</div>
            <span style={{
              display: "inline-block", marginTop: "0.3rem",
              fontSize: "0.62rem", fontWeight: 700, color: YELLOW,
              background: "rgba(255,215,0,0.07)", border: "1px solid rgba(255,215,0,0.2)",
              padding: "0.13rem 0.5rem", borderRadius: 100,
            }}>{catLabel[account.category] || account.category || "Student"}</span>
          </div>
        </div>

        <ViewSection>Personal Information</ViewSection>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <DisplayRow label="Full Name"          value={account.name} />
          <DisplayRow label="Username"           value={account.username ? `@${account.username}` : null} />
          <DisplayRow label="Date of Birth"      value={p.dob} />
          <DisplayRow label="Email Address"      value={account.email} />
          <DisplayRow label="Phone Number"       value={account.phone ? `+91 ${account.phone}` : null} />
          <DisplayRow label="Interests"          value={personal.interests} />
          <DisplayRow label="Hobbies"            value={personal.hobbies} />
          <DisplayRow label="Current Address"    value={p.currentAddress} />
          <DisplayRow label="Permanent Address"  value={p.permanentAddress || p.currentAddress} />
        </div>
      </Card>
    </div>
  );
}

// ── ACADEMIC DETAILS VIEW ──
function AcademicDetails({ account }) {
  const isSchool  = account.category === "school";
  const isCollege = account.category === "college";
  const isWorking = account.category === "working";
  const isFresher = account.category === "fresher";
  const sec   = account.sec   || {};
  const sen   = account.sen   || {};
  const col   = account.col   || {};
  const sch   = account.sch   || {};
  const sch10 = account.sch10 || {};
  const sch12 = account.sch12 || {};
  const work  = account.work  || {};
  const intern = account.intern || {};
  const links  = account.links  || {};
  const boardLabel  = { cbse: "CBSE", icse: "ICSE", state: "State Board", ib: "IB", other: "Other" };
  const streamLabel = { science_pcm: "Science (PCM)", science_pcb: "Science (PCB)", commerce: "Commerce", arts: "Arts / Humanities", other: "Other" };
  const degreeLabel = { btech: "B.Tech / B.E.", bsc: "B.Sc", bca: "BCA", bcom: "B.Com", ba: "BA", mtech: "M.Tech / M.E.", msc: "M.Sc", mca: "MCA", mba: "MBA", other: "Other" };
  const expLabel    = { "0": "Less than 1 year", "1": "1–2 years", "3": "3–5 years", "5": "5+ years" };
  const cls = parseInt(sch.currentClass) || 0;
  const hasProfessional = intern.company || links.linkedin || links.github || (isWorking && work.company);

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }}>
      <div style={{ marginBottom: "1.6rem" }}>
        <p style={{ fontSize: "0.72rem", color: DIM, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.25rem" }}>Profile</p>
        <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.7rem", fontWeight: 800, color: "#F0F0F0" }}>Academic Details</h1>
        <p style={{ fontSize: "0.85rem", color: DIM, marginTop: "0.2rem" }}>Your complete academic history.</p>
      </div>

      {/* ── SCHOOL ── */}
      {isSchool && (
        <Card style={{ marginBottom: "1rem" }}>
          {/* Class 6–9 */}
          {cls >= 6 && cls <= 9 && (<>
            <ViewSection>Current School</ViewSection>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <DisplayRow label="Current Class"                  value={`Class ${sch.currentClass}`} />
              <DisplayRow label="Board"                          value={boardLabel[sch.board] || sch.board} />
              <DisplayRow label="Last Class Percentage / CGPA"   value={sch.percentage} />
              <DisplayRow label="Institution Name"               value={sch.institution} />
              <DisplayRow label="Institution Address"            value={sch.address} />
            </div>
          </>)}

          {/* Class 10 */}
          {cls === 10 && (<>
            <ViewSection>Current School (Class 10)</ViewSection>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <DisplayRow label="Expected Year of Passing"                  value={sch.yearOfPassing} />
              <DisplayRow label="Board"                                      value={boardLabel[sch.board] || sch.board} />
              <DisplayRow label="Previous Class (Class 9) Percentage / CGPA" value={sch.prevPercentage} />
              <DisplayRow label="Institution Name"                           value={sch.institution} />
              <DisplayRow label="Institution Address"                        value={sch.address} />
            </div>
          </>)}

          {/* Class 11 */}
          {cls === 11 && (<>
            <ViewSection>Secondary (Class 10)</ViewSection>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <DisplayRow label="Year of Passing"   value={sch10.yearOfPassing} />
              <DisplayRow label="Board"             value={boardLabel[sch10.board] || sch10.board} />
              <DisplayRow label="Percentage / CGPA" value={sch10.percentage} />
              <DisplayRow label="Institution Name"  value={sch10.institution} />
              <DisplayRow label="Institution Address" value={sch10.address} />
            </div>
            <ViewSection>Senior Secondary (Class 11)</ViewSection>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <DisplayRow label="Stream"            value={streamLabel[sch.stream] || sch.stream} />
              <DisplayRow label="Board"             value={boardLabel[sch.board] || sch.board} />
              <DisplayRow label="Institution Name"  value={sch.institution} />
              <DisplayRow label="Institution Address" value={sch.address} />
            </div>
          </>)}

          {/* Class 12 */}
          {cls === 12 && (<>
            <ViewSection>Secondary (Class 10)</ViewSection>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <DisplayRow label="Year of Passing"   value={sch10.yearOfPassing} />
              <DisplayRow label="Board"             value={boardLabel[sch10.board] || sch10.board} />
              <DisplayRow label="Institution Name"  value={sch10.institution} />
              <DisplayRow label="Institution Address" value={sch10.address} />
            </div>
            <ViewSection>Senior Secondary (Class 12)</ViewSection>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <DisplayRow label="Expected Year of Passing"                   value={sch12.yearOfPassing} />
              <DisplayRow label="Board"                                       value={boardLabel[sch12.board] || sch12.board} />
              <DisplayRow label="Stream"                                      value={streamLabel[sch12.stream] || sch12.stream} />
              <DisplayRow label="Previous Class (Class 11) Percentage / CGPA" value={sch12.prevPercentage} />
              <DisplayRow label="Institution Name"                            value={sch12.institution} />
              <DisplayRow label="Institution Address"                         value={sch12.address} />
            </div>
          </>)}
        </Card>
      )}

      {/* ── COLLEGE / FRESHER / WORKING ── */}
      {!isSchool && (
        <Card style={{ marginBottom: "1rem" }}>
          <ViewSection>Secondary (Class 10)</ViewSection>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <DisplayRow label="Year of Passing"   value={sec.yearOfPassing} />
            <DisplayRow label="Board"             value={boardLabel[sec.board] || sec.board} />
            <DisplayRow label="Percentage / CGPA" value={sec.percentage} />
            <DisplayRow label="Institution Name"  value={sec.institution} />
            <DisplayRow label="Institution Address" value={sec.address} />
          </div>

          <ViewSection>Senior Secondary (Class 12)</ViewSection>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <DisplayRow label="Year of Passing"   value={sen.yearOfPassing} />
            <DisplayRow label="Board"             value={boardLabel[sen.board] || sen.board} />
            <DisplayRow label="Stream"            value={streamLabel[sen.stream] || sen.stream} />
            <DisplayRow label="Percentage / CGPA" value={sen.percentage} />
            <DisplayRow label="Institution Name"  value={sen.institution} />
            <DisplayRow label="Institution Address" value={sen.address} />
          </div>

          {(isFresher || isWorking) && (<>
          <ViewSection>College / University</ViewSection>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <DisplayRow label="Branch / Specialisation" value={col.branch} />
            <DisplayRow label="Degree"                  value={degreeLabel[col.degree] || col.degree} />
            <DisplayRow label="Final CGPA"              value={col.cgpa} />
            <DisplayRow label="Year of Joining"         value={col.yearOfJoining} />
            <DisplayRow label="Graduation Year"         value={col.graduationYear} />
            <DisplayRow label="University"              value={col.university} />
            <DisplayRow label="Institution Name"        value={col.institution} />
            <DisplayRow label="Institution Address"     value={col.address} />
          </div>
          </>)}
        </Card>
      )}

      {/* ── PROFESSIONAL DETAILS ── */}
      {hasProfessional && (
        <Card>
          <div style={{ marginBottom: "0.6rem" }}>
            <SectionLabel>Professional Details</SectionLabel>
          </div>

          {isWorking && work.company && (<>
            <ViewSection>Current Employment</ViewSection>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <DisplayRow label="Company"            value={work.company} />
              <DisplayRow label="Role / Designation" value={work.role} />
              <DisplayRow label="City / Location"    value={work.city} />
              <DisplayRow label="Year of Joining"    value={work.yearOfJoining} />
              <DisplayRow label="Experience"         value={expLabel[work.experience] || work.experience} />
            </div>
          </>)}

          {intern.company && (<>
            <ViewSection>Internship / Experience</ViewSection>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <DisplayRow label="Company"  value={intern.company} />
              <DisplayRow label="Role"     value={intern.role} />
              <DisplayRow label="Duration" value={intern.duration} />
              <DisplayRow label="Type"     value={intern.type} />
            </div>
          </>)}

          {(links.linkedin || links.github) && (<>
            <ViewSection>Links & Profiles</ViewSection>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <DisplayRow label="LinkedIn Profile" value={links.linkedin} />
              <DisplayRow label="GitHub Profile"   value={links.github} />
            </div>
          </>)}
        </Card>
      )}
    </div>
  );
}

// ── GOALS VIEW ──
function GoalsView({ account }) {
  const p = account.personal || {};
  const textBlock = (value) => (
    <p style={{ fontSize: "0.92rem", color: value ? "#C0C0C0" : "#333", lineHeight: 1.75, fontFamily: "'DM Sans', sans-serif", whiteSpace: "pre-wrap" }}>
      {value || "—"}
    </p>
  );
  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }}>
      <div style={{ marginBottom: "1.6rem" }}>
        <p style={{ fontSize: "0.72rem", color: DIM, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.25rem" }}>Profile</p>
        <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.7rem", fontWeight: 800, color: "#F0F0F0" }}>Goals</h1>
        <p style={{ fontSize: "0.85rem", color: DIM, marginTop: "0.2rem" }}>Your aim and motivation.</p>
      </div>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.63rem", fontWeight: 700, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase" }}>Your Aim</span>
          {textBlock(p.aim)}
        </div>
      </Card>
    </div>
  );
}

// ── ACCOUNT SETTINGS VIEW ──
function AccountSettings({ section }) {
  const [show, setShow] = useState({ current: false, newp: false, confirm: false });
  const [twoFA, setTwoFA] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [font, setFont] = useState("dm");

  const titles = { password: "Change Password", "2fa": "Two-Factor Authentication", theme: "Theme", font: "Font" };
  const subtitles = { password: "Update your account password.", "2fa": "Add an extra layer of security.", theme: "Choose your preferred appearance.", font: "Choose your preferred reading font." };

  const ToggleSwitch = ({ on, onToggle }) => (
    <div onClick={onToggle} style={{
      width: 44, height: 24, borderRadius: 12, cursor: "pointer",
      background: on ? `linear-gradient(135deg, ${YELLOW}, ${ORANGE})` : "#222",
      position: "relative", transition: "background 0.2s", flexShrink: 0,
    }}>
      <div style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: on ? "#0D0D0D" : "#555", transition: "left 0.2s" }} />
    </div>
  );

  const PwField = ({ label, k }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
      <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input type={show[k] ? "text" : "password"} placeholder="••••••••" style={{
          background: "#131313", border: "1px solid #202020", borderRadius: 8,
          padding: "0.75rem 3.5rem 0.75rem 1rem", color: "#F0F0F0",
          fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", outline: "none", width: "100%",
        }} />
        <button type="button" onClick={() => setShow(s => ({ ...s, [k]: !s[k] }))} style={{
          position: "absolute", right: "0.7rem", top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer", color: "#555",
          fontSize: "0.65rem", fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
        }}>{show[k] ? "HIDE" : "SHOW"}</button>
      </div>
    </div>
  );

  const RadioOption = ({ options, value, onChange }) => options.map(o => (
    <div key={o.value} onClick={() => onChange(o.value)} style={{
      display: "flex", alignItems: "center", gap: "1rem", padding: "0.9rem 1.1rem",
      background: value === o.value ? "rgba(255,215,0,0.06)" : "#0A0A0A",
      border: `1.5px solid ${value === o.value ? YELLOW : "#1A1A1A"}`,
      borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
    }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, border: `2px solid ${value === o.value ? YELLOW : "#333"}`, background: value === o.value ? YELLOW : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {value === o.value && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#0D0D0D" }} />}
      </div>
      <div>
        <div style={{ fontSize: "0.88rem", fontWeight: 600, color: value === o.value ? "#F0F0F0" : "#888" }}>{o.label}</div>
        <div style={{ fontSize: "0.7rem", color: DIM }}>{o.sub}</div>
      </div>
    </div>
  ));

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }}>
      <div style={{ marginBottom: "1.6rem" }}>
        <p style={{ fontSize: "0.72rem", color: DIM, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.25rem" }}>Account</p>
        <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.7rem", fontWeight: 800, color: "#F0F0F0" }}>{titles[section] || "Account"}</h1>
        <p style={{ fontSize: "0.85rem", color: DIM, marginTop: "0.2rem" }}>{subtitles[section]}</p>
      </div>
      <Card>
        {section === "password" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 420 }}>
            <PwField label="Current Password" k="current" />
            <PwField label="New Password" k="newp" />
            <PwField label="Confirm New Password" k="confirm" />
            <button style={{
              marginTop: "0.4rem", background: `linear-gradient(135deg, ${YELLOW}, ${ORANGE})`,
              color: "#0D0D0D", fontWeight: 700, border: "none", cursor: "pointer",
              padding: "0.82rem 2rem", borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: "0.95rem",
            }}>Update Password</button>
          </div>
        )}
        {section === "2fa" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 12 }}>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#D0D0D0" }}>Authenticator App</div>
                <div style={{ fontSize: "0.72rem", color: DIM, marginTop: "0.2rem" }}>Use Google Authenticator or Authy</div>
              </div>
              <ToggleSwitch on={twoFA} onToggle={() => setTwoFA(v => !v)} />
            </div>
            {twoFA && (
              <div style={{ padding: "0.9rem 1rem", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10 }}>
                <span style={{ fontSize: "0.82rem", color: "#22c55e" }}>✓ Two-factor authentication is enabled.</span>
              </div>
            )}
          </div>
        )}
        {section === "theme" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <RadioOption value={theme} onChange={setTheme} options={[
              { value: "dark", label: "Dark", sub: "Easy on the eyes — recommended" },
              { value: "light", label: "Light", sub: "Bright interface" },
              { value: "system", label: "System", sub: "Match OS preference" },
            ]} />
          </div>
        )}
        {section === "font" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <RadioOption value={font} onChange={setFont} options={[
              { value: "dm", label: "DM Sans", sub: "Clean & modern (default)" },
              { value: "inter", label: "Inter", sub: "Neutral & versatile" },
              { value: "system", label: "System Default", sub: "OS native font" },
            ]} />
          </div>
        )}
      </Card>
    </div>
  );
}

// ── DAILY TASK VIEW ──
function DailyTaskView({ checks, onToggle, onAdd, onDelete }) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleAdd();
  };

  const done = checks.filter(c => c.done).length;
  const pct  = checks.length ? Math.round((done / checks.length) * 100) : 0;

  return (
    <div style={{ animation: "fadeUp 0.4s ease both", maxWidth: 600 }}>
      <div style={{ marginBottom: "1.6rem" }}>
        <p style={{ fontSize: "0.72rem", color: DIM, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.25rem" }}>Today</p>
        <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.7rem", fontWeight: 800, color: "#F0F0F0" }}>Daily Task</h1>
        <p style={{ fontSize: "0.85rem", color: DIM, marginTop: "0.2rem" }}>Create and manage your tasks for today.</p>
      </div>

      {/* ── ADD TASK ── */}
      <Card style={{ marginBottom: "1rem" }}>
        <SectionLabel>Add New Task</SectionLabel>
        <div style={{ display: "flex", gap: "0.65rem" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="What do you need to do today?"
            style={{
              flex: 1, background: "#161616", border: "1px solid #2A2A2A", borderRadius: 10,
              padding: "0.65rem 0.9rem", fontSize: "0.85rem", color: "#D0D0D0",
              fontFamily: "'DM Sans', sans-serif", outline: "none",
            }}
          />
          <button
            onClick={handleAdd}
            style={{
              padding: "0.65rem 1.2rem", borderRadius: 10, border: "none", cursor: "pointer",
              background: `linear-gradient(135deg, ${YELLOW}, ${ORANGE})`,
              color: "#0D0D0D", fontSize: "0.82rem", fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            + Add
          </button>
        </div>
      </Card>

      {/* ── TASK LIST ── */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
          <SectionLabel>Tasks</SectionLabel>
          <span style={{
            fontSize: "0.68rem", fontWeight: 700,
            color: pct === 100 ? "#22c55e" : YELLOW,
            background: pct === 100 ? "rgba(34,197,94,0.08)" : "rgba(255,215,0,0.07)",
            border: `1px solid ${pct === 100 ? "rgba(34,197,94,0.22)" : "rgba(255,215,0,0.18)"}`,
            padding: "0.15rem 0.55rem", borderRadius: 100,
          }}>{done}/{checks.length}</span>
        </div>

        {checks.length === 0 ? (
          <p style={{ fontSize: "0.82rem", color: DIMMER, textAlign: "center", padding: "2rem 0" }}>No tasks yet. Add one above.</p>
        ) : (<>
          <div style={{ height: 4, background: "#181818", borderRadius: 3, overflow: "hidden", marginBottom: "0.8rem" }}>
            <div style={{
              height: "100%", width: `${pct}%`, borderRadius: 3,
              background: pct === 100 ? "#22c55e" : `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`,
              transition: "width 0.4s ease",
            }} />
          </div>

          {checks.map((c, i) => (
            <div key={c.id}
              style={{
                display: "flex", alignItems: "center", gap: "0.6rem",
                padding: "0.5rem 0", cursor: "pointer",
                borderBottom: i < checks.length - 1 ? "1px solid #161616" : "none",
              }}>
              {/* Checkbox */}
              <div onClick={() => onToggle(c.id)} style={{
                width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                border: `1.5px solid ${c.done ? "transparent" : "#2E2E2E"}`,
                background: c.done ? `linear-gradient(135deg, ${YELLOW}, ${ORANGE})` : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s",
              }}>
                {c.done && <span style={{ color: "#0D0D0D", fontSize: "0.55rem", fontWeight: 900 }}>✓</span>}
              </div>

              {/* Task text */}
              <span onClick={() => onToggle(c.id)} style={{
                flex: 1, fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif",
                color: c.done ? DIMMER : "#A0A0A0",
                textDecoration: c.done ? "line-through" : "none",
                transition: "all 0.18s",
              }}>{c.text}</span>

              {/* Delete button */}
              <button onClick={() => onDelete(c.id)} style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "#333", padding: "0.2rem 0.35rem", borderRadius: 6,
                fontSize: "0.75rem", lineHeight: 1, transition: "color 0.15s",
                flexShrink: 0,
              }}
                onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                onMouseLeave={e => e.currentTarget.style.color = "#333"}
              >✕</button>
            </div>
          ))}
        </>)}
      </Card>
    </div>
  );
}

// ── PLACEHOLDER VIEW ──
function PlaceholderView({ label }) {
  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }}>
      <div style={{ marginBottom: "1.6rem" }}>
        <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.7rem", fontWeight: 800, color: "#F0F0F0" }}>{label}</h1>
        <p style={{ fontSize: "0.85rem", color: DIM, marginTop: "0.2rem" }}>This section is coming soon.</p>
      </div>
      <Card>
        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🚧</div>
          <p style={{ color: DIM, fontSize: "0.9rem" }}>Under construction</p>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════
// ── ROADMAP DATA ──
// ══════════════════════════════════════════
const ROADMAP = [
  { icon: "🧮", title: "Data Structures & Algorithms", subtitle: "Arrays, Trees, Graphs, Dynamic Programming", color: YELLOW,
    topics: ["Arrays & Strings", "Linked Lists", "Stacks & Queues", "Trees & BST", "Graphs", "Hashing", "Dynamic Programming", "Sorting & Searching", "Recursion", "Bit Manipulation"] },
  { icon: "💾", title: "Operating Systems", subtitle: "Processes, Threads, Memory, File Systems", color: "#EC4899",
    topics: ["Processes & Threads", "CPU Scheduling", "Memory Management", "Virtual Memory", "File Systems", "Deadlocks", "Synchronisation"] },
  { icon: "🔗", title: "Computer Networks", subtitle: "TCP/IP, DNS, HTTP, OSI Model, Security", color: "#06B6D4",
    topics: ["OSI Model", "TCP/IP", "DNS & HTTP", "Routing", "Subnetting", "Network Security", "Socket Programming", "Wireless & Mobile"] },
  { icon: "🗄️", title: "DBMS", subtitle: "SQL, Normalisation, Indexing, Transactions", color: "#10B981",
    topics: ["ER Diagrams", "SQL Basics", "Joins & Subqueries", "Normalisation", "Indexing", "Transactions & ACID", "NoSQL Intro", "Stored Procedures"] },
  { icon: "🌐", title: "Web Development", subtitle: "HTML, CSS, JavaScript, React, Node.js", color: "#3B82F6",
    topics: ["HTML & CSS", "JavaScript Basics", "DOM & Events", "React Fundamentals", "React Advanced", "Node.js", "REST APIs", "MongoDB", "Git", "Deployment"] },
  { icon: "📱", title: "App Development", subtitle: "React Native, Flutter, Mobile UI/UX", color: "#8B5CF6",
    topics: ["React Native Basics", "Flutter Basics", "Mobile UI/UX", "State Management", "Device APIs", "App Deployment"] },
  { icon: "⚙️", title: "DevOps", subtitle: "Docker, CI/CD, Kubernetes, Cloud, Linux", color: ORANGE,
    topics: ["Linux Basics", "Git Advanced", "Docker", "CI/CD Pipelines", "Kubernetes", "Cloud (AWS/GCP)", "Monitoring", "Security DevOps"] },
  { icon: "🤖", title: "AI / ML", subtitle: "Regression, Neural Networks, NLP, CV", color: "#F59E0B",
    topics: ["Python for ML", "Linear & Logistic Regression", "Decision Trees", "Neural Networks", "CNN", "RNN & LSTM", "NLP", "Computer Vision", "Model Deployment"] },
  { icon: "📊", title: "Data Science", subtitle: "Pandas, NumPy, Matplotlib, Statistics", color: "#A78BFA",
    topics: ["Python Basics", "Pandas", "NumPy", "Matplotlib & Seaborn", "Statistics", "EDA", "Feature Engineering", "ML Basics"] },
  { icon: "📈", title: "Data Analysis", subtitle: "EDA, SQL Analytics, Tableau, Power BI", color: "#34D399",
    topics: ["SQL Analytics", "Excel", "Power BI", "Tableau", "Statistics", "EDA Techniques", "Python Analytics", "Data Storytelling"] },
  { icon: "🏗️", title: "System Design", subtitle: "HLD, LLD, Scalability, CAP, Caching", color: "#F97316",
    topics: ["HLD Concepts", "LLD Patterns", "Scalability", "Load Balancing", "Caching", "CAP Theorem", "Microservices", "Message Queues", "Database Design", "API Design"] },
  { icon: "🛠️", title: "Other Tech Stacks", subtitle: "Git, REST APIs, GraphQL, Open Source", color: "#60A5FA",
    topics: ["Git Mastery", "REST APIs", "GraphQL", "WebSockets", "Testing", "Open Source", "Documentation", "gRPC"] },
];

// ══════════════════════════════════════════
// ── MAIN DASHBOARD ──
// ══════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const account = state || { name: "Student", category: "college" };

  const [activeNav, setActiveNav] = useState("dashboard");
  const [profileOpen, setProfileOpen] = useState(false);
  const [checks, setChecks] = useState([
    { id: 1, text: "Solve 3 DSA problems on arrays",       done: false },
    { id: 2, text: "Watch OS — Memory Management lecture", done: true  },
    { id: 3, text: "Revise CN — TCP/IP model notes",       done: false },
    { id: 4, text: "Practice 2 DBMS SQL queries",          done: false },
    { id: 5, text: "30 min System Design reading",         done: false },
  ]);

  const firstName = account.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const streak = 7;
  const catLabel = { school: "School", college: "College", fresher: "Fresher", working: "Working" };

  const toggleCheck = id => setChecks(cs => cs.map(c => c.id === id ? { ...c, done: !c.done } : c));
  const addCheck    = text => setChecks(cs => [...cs, { id: Date.now(), text, done: false }]);
  const deleteCheck = id   => setChecks(cs => cs.filter(c => c.id !== id));

  const setNav = (key) => {
    setActiveNav(key);
    if (key.startsWith("profile-")) setProfileOpen(true);
  };

  const [completedTopics, setCompletedTopics] = useState(() => new Set([
    // DSA — 4/10 = 40%
    "Data Structures & Algorithms::Arrays & Strings",
    "Data Structures & Algorithms::Linked Lists",
    "Data Structures & Algorithms::Stacks & Queues",
    "Data Structures & Algorithms::Hashing",
    // OS — 2/7 = 28%
    "Operating Systems::Processes & Threads",
    "Operating Systems::CPU Scheduling",
    // CN — 3/8 = 37%
    "Computer Networks::OSI Model",
    "Computer Networks::TCP/IP",
    "Computer Networks::DNS & HTTP",
    // DBMS — 4/8 = 50%
    "DBMS::ER Diagrams",
    "DBMS::SQL Basics",
    "DBMS::Joins & Subqueries",
    "DBMS::Normalisation",
    // WebDev — 6/10 = 60%
    "Web Development::HTML & CSS",
    "Web Development::JavaScript Basics",
    "Web Development::DOM & Events",
    "Web Development::React Fundamentals",
    "Web Development::React Advanced",
    "Web Development::Node.js",
    // AppDev — 1/6 = 17%
    "App Development::React Native Basics",
    // DevOps — 1/8 = 12%
    "DevOps::Linux Basics",
    // AI/ML — 2/9 = 22%
    "AI / ML::Python for ML",
    "AI / ML::Linear & Logistic Regression",
    // DataScience — 1/8 = 12%
    "Data Science::Python Basics",
    // SystemDesign — 2/10 = 20%
    "System Design::HLD Concepts",
    "System Design::LLD Patterns",
    // OtherTechStacks — 3/8 = 37%
    "Other Tech Stacks::Git Mastery",
    "Other Tech Stacks::REST APIs",
    "Other Tech Stacks::GraphQL",
  ]));

  const subjects = ROADMAP.map(s => {
    const done = s.topics.filter(t => completedTopics.has(`${s.title}::${t}`)).length;
    return { ...s, progress: Math.round((done / s.topics.length) * 100), doneCount: done, totalTopics: s.topics.length };
  });

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { min-height: 100%; width: 100%; background: #0A0A0A; font-family: 'DM Sans', sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
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
          <div style={{ padding: "1.6rem 1.2rem 1.2rem", borderBottom: "1px solid #171717" }}>
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
            {/* Profile group */}
            <NavGroup
              icon={icons.profile} label="Profile"
              open={profileOpen} onToggle={() => setProfileOpen(v => !v)}
              active={activeNav.startsWith("profile-")}
            >
              <NavItem icon={icons.profile}   label="Personal Details"  active={activeNav === "profile-personal"}  onClick={() => setNav("profile-personal")} />
              <NavItem icon={icons.checklist} label="Academic Details"  active={activeNav === "profile-academic"}  onClick={() => setNav("profile-academic")} />
              <NavItem icon={icons.goals}     label="Goals"             active={activeNav === "profile-goals"}     onClick={() => setNav("profile-goals")} />
            </NavGroup>

            {/* Dashboard */}
            <NavItem icon={icons.dashboard} label="Dashboard"      active={activeNav === "dashboard"} onClick={() => setNav("dashboard")} />
            <NavItem icon={icons.target}    label="Daily Task"     active={activeNav === "target"}    onClick={() => setNav("target")} />
            <NavItem icon={icons.checklist} label="Daily Checklist" active={activeNav === "checklist"} onClick={() => setNav("checklist")} />
            <NavItem icon={icons.ai}        label="AI Review"      active={activeNav === "ai"}        onClick={() => setNav("ai")} />
          </nav>

          <div style={{ padding: "0.8rem 0.7rem", borderTop: "1px solid #171717", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
            <NavItem icon={icons.settings} label="Settings" active={activeNav === "settings"} onClick={() => setNav("settings")} />
            <NavItem icon={icons.logout} label="Log Out" danger onClick={() => navigate("/login")} />
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main style={{
          marginLeft: SIDEBAR_W, flex: 1, minHeight: "100vh",
          padding: "2.4rem 2.4rem 5rem",
        }}>

          {/* ── DASHBOARD VIEW ── */}
          {activeNav === "dashboard" && (
            <div style={{ animation: "fadeUp 0.5s ease both" }}>
              {/* ── GREETING ── */}
              <div style={{ marginBottom: "1.8rem" }}>
                <p style={{ fontSize: "0.72rem", color: DIM, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.25rem" }}>{greeting} 👋</p>
                <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "2rem", fontWeight: 800, color: "#F0F0F0", lineHeight: 1.15 }}>
                  Hey,{" "}
                  <span style={{ background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    {firstName}!
                  </span>
                </h1>
                <p style={{ fontSize: "0.85rem", color: DIM, marginTop: "0.25rem" }}>Here's your progress overview for today.</p>
              </div>

              {/* ── 4 SECTIONS — flat 2×2 equal-height grid ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto auto", gap: "1rem", marginBottom: "1.4rem" }}>
                <MonthCalendar streak={streak} />
                <StatsSection />
                <IntelligenceGraph />
                <DailyChecklist checks={checks} onToggle={toggleCheck} />
              </div>

              {/* ── LEARNING TRACKS ── */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div>
                    <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.15rem", fontWeight: 700, color: "#D0D0D0" }}>Learning Tracks</h2>
                    <p style={{ fontSize: "0.73rem", color: DIM, marginTop: "0.1rem" }}>Core CS → Development → Data & AI → Design → Tools</p>
                  </div>
                  <span style={{ fontSize: "0.67rem", color: DIM, background: "#111", border: "1px solid #1E1E1E", padding: "0.26rem 0.65rem", borderRadius: 100 }}>
                    {subjects.length} tracks
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.9rem" }}>
                  {subjects.map(s => <SubjectCard key={s.title} {...s} />)}
                </div>
              </div>
            </div>
          )}

          {/* ── PROFILE VIEWS ── */}
          {activeNav === "profile-personal"  && <PersonalDetails  account={account} />}
          {activeNav === "profile-academic"  && <AcademicDetails  account={account} />}
          {activeNav === "profile-goals"     && <GoalsView        account={account} />}

          {/* ── DAILY TASK ── */}
          {activeNav === "target" && (
            <DailyTaskView checks={checks} onToggle={toggleCheck} onAdd={addCheck} onDelete={deleteCheck} />
          )}

          {/* ── DAILY CHECKLIST (full-width standalone) ── */}
          {activeNav === "checklist" && (
            <div style={{ animation: "fadeUp 0.4s ease both", maxWidth: 560 }}>
              <div style={{ marginBottom: "1.6rem" }}>
                <p style={{ fontSize: "0.72rem", color: DIM, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.25rem" }}>Today</p>
                <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.7rem", fontWeight: 800, color: "#F0F0F0" }}>Daily Checklist</h1>
                <p style={{ fontSize: "0.85rem", color: DIM, marginTop: "0.2rem" }}>Track your tasks for today.</p>
              </div>
              <DailyChecklist checks={checks} onToggle={toggleCheck} />
            </div>
          )}

          {/* ── PLACEHOLDER VIEWS ── */}
          {activeNav === "ai"       && <PlaceholderView label="AI Review" />}
          {activeNav === "settings" && <PlaceholderView label="Settings" />}

        </main>
      </div>
    </>
  );
}
