import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const YELLOW = "#FFD700";
const ORANGE = "#FF6A00";

// ── FIELD ──
function Field({ label, type = "text", placeholder, value, onChange, required = false, note }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: ORANGE, marginLeft: 3 }}>*</span>}
      </label>
      <input
        type={type} placeholder={placeholder} value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          background: "#131313", border: `1px solid ${focused ? "rgba(255,215,0,0.42)" : "#202020"}`,
          borderRadius: 8, padding: "0.78rem 1rem", color: "#F0F0F0",
          fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", outline: "none", width: "100%",
          boxShadow: focused ? "0 0 0 3px rgba(255,215,0,0.05)" : "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      />
      {note && <span style={{ fontSize: "0.72rem", color: "#3A3A3A" }}>{note}</span>}
    </div>
  );
}

// ── SELECT ──
function Select({ label, value, onChange, options, required = false }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: ORANGE, marginLeft: 3 }}>*</span>}
      </label>
      <select value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          background: "#131313", border: `1px solid ${focused ? "rgba(255,215,0,0.42)" : "#202020"}`,
          borderRadius: 8, padding: "0.78rem 1rem", color: value ? "#F0F0F0" : "#2A2A2A",
          fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", outline: "none", width: "100%",
          transition: "border-color 0.2s", cursor: "pointer",
          appearance: "none", WebkitAppearance: "none",
        }}>
        <option value="" disabled style={{ color: "#2A2A2A" }}>Select…</option>
        {options.map(o => <option key={o.value} value={o.value} style={{ background: "#131313", color: "#F0F0F0" }}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── TEXTAREA ──
function TextArea({ label, placeholder, value, onChange, required = false, rows = 3 }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: ORANGE, marginLeft: 3 }}>*</span>}
      </label>
      <textarea placeholder={placeholder} value={value} onChange={onChange} rows={rows}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          background: "#131313", border: `1px solid ${focused ? "rgba(255,215,0,0.42)" : "#202020"}`,
          borderRadius: 8, padding: "0.78rem 1rem", color: "#F0F0F0",
          fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", outline: "none", width: "100%",
          resize: "vertical", boxShadow: focused ? "0 0 0 3px rgba(255,215,0,0.05)" : "none",
          transition: "border-color 0.2s",
        }}
      />
    </div>
  );
}

// ── FILE UPLOAD ──
function FileUpload({ label }) {
  const ref = useRef();
  const [fileName, setFileName] = useState("");
  const [hov, setHov] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</label>
      <div
        onClick={() => ref.current.click()}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          background: "#0D0D0D", border: `1px dashed ${hov ? "rgba(255,215,0,0.3)" : "#252525"}`,
          borderRadius: 8, padding: "0.75rem 1rem", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "0.7rem",
          transition: "border-color 0.2s",
        }}>
        <span style={{ fontSize: "1rem" }}>📎</span>
        <span style={{ fontSize: "0.85rem", color: fileName ? "#C0C0C0" : "#333", fontFamily: "'DM Sans', sans-serif", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {fileName || "Click to upload (PDF, JPG, PNG)"}
        </span>
        {fileName && (
          <span onClick={e => { e.stopPropagation(); setFileName(""); ref.current.value = ""; }}
            style={{ fontSize: "0.7rem", color: "#555", cursor: "pointer", flexShrink: 0 }}>✕</span>
        )}
      </div>
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
        onChange={e => setFileName(e.target.files[0]?.name || "")} />
      <span style={{ fontSize: "0.7rem", color: "#2A2A2A" }}>Optional — PDF, JPG or PNG</span>
    </div>
  );
}

// ── INFO ROW ──
function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.28rem" }}>
      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: "0.95rem", color: "#C0C0C0", fontFamily: "'DM Sans', sans-serif" }}>{value || "—"}</span>
    </div>
  );
}

// ── CATEGORY CARD ──
function CatCard({ icon, title, subtitle, selected, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: selected ? "rgba(255,215,0,0.06)" : "#0F0F0F",
      border: `1.5px solid ${selected ? YELLOW : "#1A1A1A"}`,
      borderRadius: 12, padding: "1rem 1.2rem", cursor: "pointer",
      display: "flex", alignItems: "center", gap: "1rem",
      boxShadow: selected ? "0 0 20px rgba(255,215,0,0.08)" : "none",
      transition: "all 0.2s",
    }}>
      <span style={{ fontSize: "1.6rem", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: "0.92rem", color: selected ? "#F0F0F0" : "#888", marginBottom: "0.1rem" }}>{title}</div>
        <div style={{ fontSize: "0.75rem", color: "#3A3A3A" }}>{subtitle}</div>
      </div>
      <div style={{
        width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${selected ? YELLOW : "#222"}`,
        background: selected ? YELLOW : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
      }}>
        {selected && <span style={{ color: "#0D0D0D", fontSize: "0.6rem", fontWeight: 900 }}>✓</span>}
      </div>
    </div>
  );
}

// ── SECTION HEADER ──
function SecHead({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.6rem 0 1rem" }}>
      <div style={{ flex: 1, height: 1, background: "#1A1A1A" }} />
      <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", color: ORANGE, textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: "#1A1A1A" }} />
    </div>
  );
}

// ── NAV BUTTONS ──
function NavBtns({ onBack, onNext, nextLabel = "Next →", disabled = false, showBack = true }) {
  const [hovNext, setHovNext] = useState(false);
  return (
    <div style={{ display: "flex", gap: "0.7rem", marginTop: "2rem" }}>
      {showBack && (
        <button onClick={onBack} style={{
          background: "transparent", border: "1px solid #1E1E1E", borderRadius: 8,
          padding: "0.82rem 1.4rem", color: "#555", cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", flexShrink: 0,
          transition: "all 0.2s",
        }}
          onMouseEnter={e => { e.target.style.borderColor = "#333"; e.target.style.color = "#F0F0F0"; }}
          onMouseLeave={e => { e.target.style.borderColor = "#1E1E1E"; e.target.style.color = "#555"; }}
        >← Back</button>
      )}
      <button onClick={onNext} disabled={disabled}
        onMouseEnter={() => setHovNext(true)} onMouseLeave={() => setHovNext(false)}
        style={{
          flex: 1, background: disabled ? "#111" : `linear-gradient(135deg, ${YELLOW}, ${ORANGE})`,
          color: disabled ? "#333" : "#0D0D0D", fontWeight: 700, border: "none",
          cursor: disabled ? "not-allowed" : "pointer", padding: "0.82rem 2rem", borderRadius: 8,
          fontFamily: "'DM Sans', sans-serif", fontSize: "0.95rem", letterSpacing: "0.02em",
          transform: (!disabled && hovNext) ? "translateY(-2px)" : "none",
          boxShadow: (!disabled && hovNext) ? "0 8px 30px rgba(255,180,0,0.25)" : "none",
          transition: "all 0.2s",
        }}>{nextLabel}</button>
    </div>
  );
}

// ── LAUNCH BUTTON ──
function LaunchBtn({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: `linear-gradient(135deg, ${YELLOW}, ${ORANGE})`,
        color: "#0D0D0D", fontWeight: 800, border: "none",
        cursor: "pointer", padding: "1rem 3rem", borderRadius: 10, width: "100%",
        fontFamily: "'DM Sans', sans-serif", fontSize: "1.05rem", letterSpacing: "0.03em",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? "0 12px 40px rgba(255,180,0,0.35)" : "0 6px 24px rgba(255,180,0,0.15)",
        transition: "all 0.2s",
      }}>Let's Get Started →</button>
  );
}

// ══════════════════════════════════════════
// ── MAIN COMPONENT ──
// ══════════════════════════════════════════
export default function StudentInfo() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const account = state || {};

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState("");

  // ── Profile extras ──
  const [profileExtra, setProfileExtra] = useState({ dob: "", currentAddress: "", permanentAddress: "" });
  const [sameAddress, setSameAddress] = useState(false);

  // ── Secondary (Class 10) ──
  const [sec, setSec] = useState({ yearOfPassing: "", board: "", institution: "", address: "", percentage: "" });

  // ── Senior Secondary (Class 12) ──
  const [sen, setSen] = useState({ yearOfPassing: "", board: "", institution: "", address: "", stream: "", percentage: "" });

  // ── College ──
  const [col, setCol] = useState({ currentSem: "", branch: "", cgpa: "", degree: "", institution: "", university: "", address: "", city: "", yearOfJoining: "", graduationYear: "" });

  // ── Current school (school students) ──
  const [sch, setSch] = useState({ institution: "", address: "", city: "", board: "", currentClass: "", percentage: "", prevPercentage: "", subjects: "", yearOfPassing: "", stream: "" });

  // ── School student – Class 10 record (shown for class 11 & 12) ──
  const [sch10, setSch10] = useState({ yearOfPassing: "", board: "", percentage: "", institution: "", address: "" });

  // ── School student – Class 12 record (shown for class 12 only) ──
  const [sch12, setSch12] = useState({ yearOfPassing: "", board: "", stream: "", percentage: "", prevPercentage: "", institution: "", address: "" });

  // ── Work ──
  const [work, setWork] = useState({ company: "", city: "", role: "", yearOfJoining: "", experience: "" });

  // ── Personal ──
  const [personal, setPersonal] = useState({ aim: "", interests: "", hobbies: "", about: "" });

  // ── Internship ──
  const [intern, setIntern] = useState({ company: "", role: "", duration: "", type: "" });

  // ── Links ──
  const [links, setLinks] = useState({ linkedin: "", github: "" });

  const [hasInternship, setHasInternship] = useState(false);

  const pe = k => e => setProfileExtra(p => ({ ...p, [k]: e.target.value }));
  const ss2 = k => e => setSec(p => ({ ...p, [k]: e.target.value }));
  const sn = k => e => setSen(p => ({ ...p, [k]: e.target.value }));
  const sc = k => e => setCol(p => ({ ...p, [k]: e.target.value }));
  const ss = k => e => setSch(p => ({ ...p, [k]: e.target.value }));
  const s10s = k => e => setSch10(p => ({ ...p, [k]: e.target.value }));
  const s12s = k => e => setSch12(p => ({ ...p, [k]: e.target.value }));
  const sw = k => e => setWork(p => ({ ...p, [k]: e.target.value }));
  const sp = k => e => setPersonal(p => ({ ...p, [k]: e.target.value }));
  const si = k => e => setIntern(p => ({ ...p, [k]: e.target.value }));
  const sl = k => e => setLinks(p => ({ ...p, [k]: e.target.value }));

  const isSchool = category === "school";
  const isCollege = category === "college";
  const isFresher = category === "fresher";
  const isWorking = category === "working";

  const stepList = ["profile", "category", "academics", "personal", "launch"];
  const totalSteps = stepList.length;
  const currentStepKey = stepList[step];
  const progressPct = Math.round((step / (totalSteps - 1)) * 100);

  const handleSameAddress = () => {
    setSameAddress(v => {
      if (!v) setProfileExtra(p => ({ ...p, permanentAddress: p.currentAddress }));
      return !v;
    });
  };

  const canProceed = () => {
    if (currentStepKey === "profile") return !!(profileExtra.dob && profileExtra.currentAddress);
    if (currentStepKey === "category") return !!category;
    if (currentStepKey === "academics") {
      if (isSchool) {
        if (!sch.currentClass) return false;
        const cls = parseInt(sch.currentClass);
        if (cls <= 9) return !!(sch.board && sch.institution);
        if (cls === 10) return !!(sch.board && sch.institution);
        if (cls === 11) return !!(sch10.institution && sch10.percentage && sch.institution);
        if (cls === 12) return !!(sch10.institution && sch12.institution);
        return !!(sch.institution && sch.board);
      }
      const secOk = !!(sec.institution && sec.percentage && sec.yearOfPassing && sec.board && sec.address);
      const senOk = !!(sen.institution && sen.percentage && sen.yearOfPassing && sen.board && sen.stream && sen.address);
      const colOk = !!(col.institution && col.branch && col.degree && col.yearOfJoining && col.graduationYear && col.cgpa && col.university && col.address && (!isCollege || col.currentSem));
      const workOk = !isWorking || !!(work.company && work.role && work.city && work.yearOfJoining && work.experience);
      return secOk && senOk && colOk && workOk;
    }
    if (currentStepKey === "personal") return !!(personal.aim);
    return true;
  };

  const handleNext = () => {
    if (step < totalSteps - 1) { setStep(s => s + 1); window.scrollTo(0, 0); }
  };
  const handleBack = () => { setStep(s => s - 1); window.scrollTo(0, 0); };

  const boards = [
    { value: "cbse", label: "CBSE" },
    { value: "icse", label: "ICSE" },
    { value: "state", label: "State Board" },
    { value: "ib", label: "IB" },
    { value: "other", label: "Other" },
  ];

  const streams = [
    { value: "science_pcm", label: "Science (PCM)" },
    { value: "science_pcb", label: "Science (PCB)" },
    { value: "commerce", label: "Commerce" },
    { value: "arts", label: "Arts / Humanities" },
    { value: "other", label: "Other" },
  ];

  const degrees = [
    { value: "btech", label: "B.Tech / B.E." },
    { value: "bsc", label: "B.Sc" },
    { value: "bca", label: "BCA" },
    { value: "bcom", label: "B.Com" },
    { value: "ba", label: "BA" },
    { value: "mtech", label: "M.Tech / M.E." },
    { value: "msc", label: "M.Sc" },
    { value: "mca", label: "MCA" },
    { value: "mba", label: "MBA" },
    { value: "other", label: "Other" },
  ];

  const sems = Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }));

  const classOptions = [
    { value: "6", label: "Class 6" },
    { value: "7", label: "Class 7" },
    { value: "8", label: "Class 8" },
    { value: "9", label: "Class 9" },
    { value: "10", label: "Class 10" },
    { value: "11", label: "Class 11" },
    { value: "12", label: "Class 12" },
  ];

  const expOptions = [
    { value: "0", label: "Less than 1 year" },
    { value: "1", label: "1–2 years" },
    { value: "3", label: "3–5 years" },
    { value: "5", label: "5+ years" },
  ];

  const internTypeOptions = [
    { value: "internship", label: "Internship" },
    { value: "ppo", label: "PPO (Pre-Placement Offer)" },
    { value: "parttime", label: "Part-time" },
    { value: "project", label: "Project / Research" },
    { value: "other", label: "Other" },
  ];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { min-height: 100%; width: 100%; background: #0D0D0D; font-family: 'DM Sans', sans-serif; }
        @keyframes float { from { transform: translate(0,0) scale(1); } to { transform: translate(18px,-18px) scale(1.04); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        option { background: #131313; color: #F0F0F0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0D0D0D; }
        ::-webkit-scrollbar-thumb { background: #1E1E1E; border-radius: 2px; }
      `}</style>

      <div style={{
        width: "100%", minHeight: "100vh", background: "#0D0D0D",
        display: "flex", alignItems: currentStepKey === "launch" ? "center" : "flex-start", justifyContent: "center",
        padding: currentStepKey === "launch" ? "2rem 1rem" : "3rem 1rem 5rem",
        position: "relative", overflowX: "hidden",
      }}>
        {/* Blobs */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
          <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,215,0,0.07), transparent 70%)", filter: "blur(90px)", top: -100, right: -80, animation: "float 10s ease-in-out infinite alternate" }} />
          <div style={{ position: "absolute", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,106,0,0.06), transparent 70%)", filter: "blur(80px)", bottom: 0, left: -60, animation: "float 13s ease-in-out infinite alternate", animationDelay: "-5s" }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: currentStepKey === "launch" ? 520 : 600, animation: "fadeUp 0.5s ease both" }}>

          {currentStepKey !== "launch" && (
            <>
              <div style={{ textAlign: "center", marginBottom: "1.4rem" }}>
                <span style={{
                  fontFamily: "'Times New Roman', serif", fontSize: "1.8rem", fontWeight: 800, letterSpacing: "0.1em",
                  background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`,
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>AQUIRE</span>
                <div style={{ width: 28, height: 2, background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`, margin: "0.4rem auto 0", borderRadius: 2 }} />
              </div>
              <div style={{ width: "100%", height: 3, background: "#181818", borderRadius: 2, marginBottom: "1.4rem", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, width: `${progressPct}%`, background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`, transition: "width 0.4s ease" }} />
              </div>
            </>
          )}

          {/* ── CARD ── */}
          {currentStepKey !== "launch" && (
            <div style={{
              background: "#0F0F0F", border: "1px solid #191919", borderRadius: 20,
              padding: "2.2rem", boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})` }} />

              {/* ── PROFILE ── */}
              {currentStepKey === "profile" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
                  {/* Avatar + heading */}
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, ${YELLOW}, ${ORANGE})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.3rem", fontWeight: 900, color: "#0D0D0D",
                      fontFamily: "'Times New Roman', serif",
                    }}>
                      {(account.name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.45rem", fontWeight: 800, color: "#F0F0F0", lineHeight: 1.2 }}>
                        Your account details
                      </h2>
                      <p style={{ fontSize: "0.82rem", color: "#444", marginTop: "0.2rem" }}>Review your info and fill in a few more details.</p>
                    </div>
                  </div>

                  {/* Account info panel */}
                  <div style={{ background: "#0A0A0A", border: "1px solid #181818", borderRadius: 12, padding: "1.4rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>
                    <InfoRow label="Full Name" value={account.name} />
                    <InfoRow label="Username" value={account.username} />
                    <InfoRow label="Email Address" value={account.email} />
                    <InfoRow label="Phone Number" value={account.phone ? `+91 ${account.phone}` : ""} />
                  </div>

                  {/* Additional fields */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                    <SecHead>Personal Details</SecHead>
                    <Field
                      label="Date of Birth" type="date"
                      value={profileExtra.dob} onChange={pe("dob")} required
                    />
                    <TextArea
                      label="Current Address" rows={2}
                      placeholder="House / Flat No., Street, Area, City, State, PIN"
                      value={profileExtra.currentAddress} onChange={e => {
                        pe("currentAddress")(e);
                        if (sameAddress) setProfileExtra(p => ({ ...p, currentAddress: e.target.value, permanentAddress: e.target.value }));
                      }} required
                    />

                    {/* Same address toggle */}
                    <label style={{ display: "flex", alignItems: "center", gap: "0.65rem", cursor: "pointer" }}>
                      <div onClick={handleSameAddress} style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: `1.5px solid ${sameAddress ? "transparent" : "#303030"}`,
                        background: sameAddress ? `linear-gradient(135deg, ${YELLOW}, ${ORANGE})` : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s", cursor: "pointer",
                      }}>
                        {sameAddress && <span style={{ color: "#0D0D0D", fontSize: "0.58rem", fontWeight: 900, lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: "0.8rem", color: "#555", userSelect: "none" }}>Permanent address same as current address</span>
                    </label>

                    {!sameAddress && (
                      <TextArea
                        label="Permanent Address" rows={2}
                        placeholder="House / Flat No., Street, Area, City, State, PIN"
                        value={profileExtra.permanentAddress} onChange={pe("permanentAddress")}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ── CATEGORY ── */}
              {currentStepKey === "category" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ marginBottom: "0.4rem" }}>
                    <p style={{ fontSize: "0.82rem", color: ORANGE, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                      Hey, {account.name?.split(" ")[0] || "there"}!
                    </p>
                    <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.45rem", fontWeight: 800, color: "#F0F0F0", lineHeight: 1.25 }}>
                      What describes you best?
                    </h2>
                    <p style={{ fontSize: "0.82rem", color: "#444", marginTop: "0.25rem" }}>This personalises the information we collect.</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                    {[
                      { value: "school", icon: "🏫", title: "School Student", subtitle: "Currently in school (Class 6–12)" },
                      { value: "college", icon: "🎓", title: "College Student", subtitle: "Currently pursuing a degree" },
                      { value: "fresher", icon: "🧑‍💻", title: "Fresher / Just Graduated", subtitle: "Graduated, looking for first job" },
                      { value: "working", icon: "💼", title: "Working Professional", subtitle: "Currently employed in the industry" },
                    ].map(c => (
                      <CatCard key={c.value} {...c} selected={category === c.value} onClick={() => setCategory(c.value)} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── ACADEMICS ── */}
              {currentStepKey === "academics" && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ marginBottom: "0.4rem" }}>
                    <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.45rem", fontWeight: 800, color: "#F0F0F0", lineHeight: 1.25 }}>Academic Details</h2>
                    <p style={{ fontSize: "0.82rem", color: "#444", marginTop: "0.2rem" }}>Fill in your complete academic history.</p>
                  </div>

                  {/* ── SCHOOL STUDENT ── */}
                  {isSchool && (() => {
                    const cls = parseInt(sch.currentClass) || 0;
                    return (
                      <>
                        {/* Class selector */}
                        <SecHead>Current Class</SecHead>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                          <Select label="Current Class" value={sch.currentClass} onChange={ss("currentClass")} options={classOptions} required />
                        </div>

                        {/* Class 6–9: board + last class % + institution + address */}
                        {sch.currentClass && cls <= 9 && (
                          <>
                            <SecHead>Current School</SecHead>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                              <Select label="Board" value={sch.board} onChange={ss("board")} options={boards} required />
                              <Field label="Last Class Percentage / CGPA" placeholder="e.g. 85%" value={sch.percentage} onChange={ss("percentage")} />
                              <Field label="Institution Name" placeholder="e.g. Delhi Public School" value={sch.institution} onChange={ss("institution")} required />
                              <TextArea label="Institution's Address" rows={2} placeholder="Street / Area, City, State, PIN" value={sch.address} onChange={ss("address")} />
                            </div>
                          </>
                        )}

                        {/* Class 10: year + board → % → institution → address */}
                        {sch.currentClass && cls === 10 && (
                          <>
                            <SecHead>Current School</SecHead>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                                <Field label="Expected Year of Passing" placeholder="e.g. 2025" value={sch.yearOfPassing} onChange={ss("yearOfPassing")} />
                                <Select label="Board" value={sch.board} onChange={ss("board")} options={boards} required />
                              </div>
                              <Field label="Previous Class (Class 9) Percentage / CGPA" placeholder="e.g. 88%" value={sch.prevPercentage} onChange={ss("prevPercentage")} />
                              <Field label="Institution Name" placeholder="e.g. Delhi Public School" value={sch.institution} onChange={ss("institution")} required />
                              <TextArea label="Institution's Address" rows={2} placeholder="Street / Area, City, State, PIN" value={sch.address} onChange={ss("address")} />
                            </div>
                          </>
                        )}

                        {/* Class 11: show Class 10 secondary section */}
                        {sch.currentClass && cls === 11 && (
                          <>
                            <SecHead>Secondary (Class 10)</SecHead>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                                <Field label="Year of Passing" placeholder="e.g. 2024" value={sch10.yearOfPassing} onChange={s10s("yearOfPassing")} />
                                <Select label="Board" value={sch10.board} onChange={s10s("board")} options={boards} />
                              </div>
                              <Field label="Percentage / CGPA Obtained" placeholder="e.g. 91.4%" value={sch10.percentage} onChange={s10s("percentage")} required />
                              <Field label="Institution Name" placeholder="e.g. St. Xavier's School" value={sch10.institution} onChange={s10s("institution")} required />
                              <TextArea label="Institution's Address" rows={2} placeholder="Street / Area, City, State, PIN" value={sch10.address} onChange={s10s("address")} />
                              <FileUpload label="Upload Marksheet" />
                            </div>

                            <SecHead>Senior Secondary (Class 11)</SecHead>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                              <Select label="Stream" value={sch.stream} onChange={ss("stream")} options={streams} />
                              <Select label="Board" value={sch.board} onChange={ss("board")} options={boards} />
                              <Field label="Institution Name" placeholder="e.g. Kendriya Vidyalaya" value={sch.institution} onChange={ss("institution")} required />
                              <TextArea label="Institution's Address" rows={2} placeholder="Street / Area, City, State, PIN" value={sch.address} onChange={ss("address")} />
                            </div>
                          </>
                        )}

                        {/* Class 12: show Class 10 + Class 12 sections */}
                        {sch.currentClass && cls === 12 && (
                          <>
                            <SecHead>Secondary (Class 10)</SecHead>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                                <Field label="Year of Passing" placeholder="e.g. 2023" value={sch10.yearOfPassing} onChange={s10s("yearOfPassing")} />
                                <Select label="Board" value={sch10.board} onChange={s10s("board")} options={boards} />
                              </div>
                              <Field label="Institution Name" placeholder="e.g. St. Xavier's School" value={sch10.institution} onChange={s10s("institution")} required />
                              <TextArea label="Institution's Address" rows={2} placeholder="Street / Area, City, State, PIN" value={sch10.address} onChange={s10s("address")} />
                              <FileUpload label="Upload Marksheet" />
                            </div>

                            <SecHead>Senior Secondary (Class 12)</SecHead>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                                <Field label="Expected Year of Passing" placeholder="e.g. 2025" value={sch12.yearOfPassing} onChange={s12s("yearOfPassing")} />
                                <Select label="Board" value={sch12.board} onChange={s12s("board")} options={boards} />
                              </div>
                              <Select label="Stream" value={sch12.stream} onChange={s12s("stream")} options={streams} />
                              <Field label="Previous Class (Class 11) Percentage / CGPA" placeholder="e.g. 85%" value={sch12.prevPercentage} onChange={s12s("prevPercentage")} />
                              <Field label="Institution Name" placeholder="e.g. Kendriya Vidyalaya" value={sch12.institution} onChange={s12s("institution")} required />
                              <TextArea label="Institution's Address" rows={2} placeholder="Street / Area, City, State, PIN" value={sch12.address} onChange={s12s("address")} />
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}

                  {/* ── COLLEGE / FRESHER / WORKING ── */}
                  {!isSchool && (
                    <>
                      {/* — SECONDARY — */}
                      <SecHead>Secondary</SecHead>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                          <Field label="Year of Passing" placeholder="e.g. 2019" value={sec.yearOfPassing} onChange={ss2("yearOfPassing")} required />
                          <Select label="Board" value={sec.board} onChange={ss2("board")} options={boards} required />
                        </div>
                        <Field label="Percentage / CGPA Obtained" placeholder="e.g. 91.4%" value={sec.percentage} onChange={ss2("percentage")} required />
                        <Field label="Institution Name" placeholder="e.g. St. Xavier's School" value={sec.institution} onChange={ss2("institution")} required />
                        <TextArea label="Institution's Address" rows={2} placeholder="Street / Area, City, State, PIN" value={sec.address} onChange={ss2("address")} required />
                        <FileUpload label="Upload Marksheet" />
                      </div>

                      {/* — SENIOR SECONDARY — */}
                      <SecHead>Senior Secondary</SecHead>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                          <Field label="Year of Passing" placeholder="e.g. 2021" value={sen.yearOfPassing} onChange={sn("yearOfPassing")} required />
                          <Select label="Board" value={sen.board} onChange={sn("board")} options={boards} required />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                          <Select label="Stream" value={sen.stream} onChange={sn("stream")} options={streams} required />
                          <Field label="Percentage / CGPA Obtained" placeholder="e.g. 88.2%" value={sen.percentage} onChange={sn("percentage")} required />
                        </div>
                        <Field label="Institution Name" placeholder="e.g. Kendriya Vidyalaya" value={sen.institution} onChange={sn("institution")} required />
                        <TextArea label="Institution's Address" rows={2} placeholder="Street / Area, City, State, PIN" value={sen.address} onChange={sn("address")} required />
                        <FileUpload label="Upload Marksheet" />
                      </div>

                      {/* — COLLEGE — */}
                      <SecHead>College / University</SecHead>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                        <div style={{ display: "grid", gridTemplateColumns: isCollege ? "1fr 1fr" : "1fr", gap: "0.9rem" }}>
                          {isCollege && <Select label="Current Semester" value={col.currentSem} onChange={sc("currentSem")} options={sems} required />}
                          <Field label="Branch / Specialisation" placeholder="e.g. Computer Science" value={col.branch} onChange={sc("branch")} required />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                          <Select label="Degree" value={col.degree} onChange={sc("degree")} options={degrees} required />
                          <Field label={isCollege ? "Current CGPA" : "Final CGPA"} placeholder="e.g. 8.4 / 10" value={col.cgpa} onChange={sc("cgpa")} required />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                          <Field label="Year of Joining" placeholder="e.g. 2021" value={col.yearOfJoining} onChange={sc("yearOfJoining")} required />
                          <Field label={isCollege ? "Expected Graduation" : "Year of Graduation"} placeholder="e.g. 2025" value={col.graduationYear} onChange={sc("graduationYear")} required />
                        </div>
                        <Field label="University (Affiliated to)" placeholder="e.g. University of Mumbai" value={col.university} onChange={sc("university")} required />
                        <Field label="Institution Name" placeholder="e.g. IIT Bombay" value={col.institution} onChange={sc("institution")} required />
                        <TextArea label="Institution's Address" rows={2} placeholder="Street / Area, City, State, PIN" value={col.address} onChange={sc("address")} required />
                        {isWorking && <FileUpload label="Upload College Marksheet / Degree Certificate" />}
                      </div>

                      {/* — WORK — */}
                      {isWorking && (
                        <>
                          <SecHead>Current Employment</SecHead>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                            <Field label="Working in (Company Name)" placeholder="e.g. Infosys, Google" value={work.company} onChange={sw("company")} required />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                              <Field label="Role / Designation" placeholder="e.g. Software Engineer" value={work.role} onChange={sw("role")} required />
                              <Field label="City / Location" placeholder="e.g. Bengaluru" value={work.city} onChange={sw("city")} required />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                              <Field label="Year of Joining" placeholder="e.g. 2022" value={work.yearOfJoining} onChange={sw("yearOfJoining")} required />
                              <Select label="Experience" value={work.experience} onChange={sw("experience")} options={expOptions} required />
                            </div>
                          </div>
                        </>
                      )}

                      {/* — LINKS & PROFILES — */}
                      <SecHead>Links & Profiles</SecHead>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                        <Field label="LinkedIn Profile URL" placeholder="https://linkedin.com/in/yourname" value={links.linkedin} onChange={sl("linkedin")} />
                        <Field label="GitHub Profile URL" placeholder="https://github.com/yourname" value={links.github} onChange={sl("github")} />
                        <FileUpload label="Upload Resume" />
                      </div>

                      {/* — INTERNSHIP — */}
                      {(isCollege || isFresher) && (
                        <>
                          <SecHead>{isFresher ? "Internship / Experience" : "Ongoing Internship"}</SecHead>
                          {isCollege && (
                            <label style={{ display: "flex", alignItems: "center", gap: "0.65rem", cursor: "pointer" }}>
                              <div onClick={() => setHasInternship(v => !v)} style={{
                                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                                border: `1.5px solid ${hasInternship ? "transparent" : "#303030"}`,
                                background: hasInternship ? `linear-gradient(135deg, ${YELLOW}, ${ORANGE})` : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.2s", cursor: "pointer",
                              }}>
                                {hasInternship && <span style={{ color: "#0D0D0D", fontSize: "0.58rem", fontWeight: 900, lineHeight: 1 }}>✓</span>}
                              </div>
                              <span style={{ fontSize: "0.8rem", color: "#555", userSelect: "none" }}>I have an ongoing internship</span>
                            </label>
                          )}
                          {(isFresher || hasInternship) && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                                <Field label="Company Name" placeholder="e.g. Google, Infosys" value={intern.company} onChange={si("company")} />
                                <Select label="Type" value={intern.type} onChange={si("type")} options={isFresher ? internTypeOptions.filter(o => o.value !== "ppo") : internTypeOptions} />
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                                <Field label="Role / Designation" placeholder="e.g. SDE Intern" value={intern.role} onChange={si("role")} />
                                <Field label="Duration" placeholder="e.g. 3 months, Jan–Mar 2024" value={intern.duration} onChange={si("duration")} />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── PERSONAL ── */}
              {currentStepKey === "personal" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ marginBottom: "0.2rem" }}>
                    <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.45rem", fontWeight: 800, color: "#F0F0F0", lineHeight: 1.25 }}>Tell us about yourself</h2>
                    <p style={{ fontSize: "0.82rem", color: "#444", marginTop: "0.25rem" }}>Your goals, passions, and what makes you, you.</p>
                  </div>
                  <SecHead>Your Goal</SecHead>
                  <TextArea label="Your Aim" placeholder="e.g. I want to crack a FAANG interview within 6 months and build impactful products…" value={personal.aim} onChange={sp("aim")} required rows={4} />
                  <SecHead>Interests & Hobbies</SecHead>
                  <TextArea label="Interests" placeholder="e.g. Algorithms, System Design, Open Source, Machine Learning…" value={personal.interests} onChange={sp("interests")} rows={3} />
                  <TextArea label="Hobbies" placeholder="e.g. Chess, Competitive Programming, Reading, Gaming, Music…" value={personal.hobbies} onChange={sp("hobbies")} rows={3} />
                  <SecHead>Anything Else?</SecHead>
                  <TextArea label="Want to tell us more about yourself?" placeholder="Achievements, projects, what motivates you, fun facts — anything you'd like AQUIRE to know…" value={personal.about} onChange={sp("about")} rows={4} />
                </div>
              )}

              <NavBtns onBack={handleBack} onNext={handleNext} nextLabel="Next →" disabled={!canProceed()} showBack={step > 0} />
            </div>
          )}

          {/* ── LAUNCH SCREEN ── */}
          {currentStepKey === "launch" && (
            <div style={{ textAlign: "center", animation: "fadeUp 0.6s ease both" }}>
              <div style={{ display: "inline-flex", marginBottom: "2rem" }}>
                <div style={{
                  width: 100, height: 100, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${YELLOW}, ${ORANGE})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "2.8rem",
                  boxShadow: "0 0 60px rgba(255,215,0,0.3), 0 0 120px rgba(255,215,0,0.1)",
                }}>🚀</div>
              </div>
              <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "2.2rem", fontWeight: 800, color: "#F0F0F0", lineHeight: 1.2, marginBottom: "0.8rem" }}>
                You're all set,{" "}
                <span style={{ background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {account.name?.split(" ")[0] || "there"}!
                </span>
              </h1>
              <p style={{ fontSize: "1rem", color: "#555", lineHeight: 1.7, maxWidth: 380, margin: "0 auto 2.5rem" }}>
                Your AQUIRE profile is ready. Time to start your structured journey to mastery.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "2.5rem", textAlign: "left" }}>
                {[
                  { icon: "🤖", text: "AI Mentor tailored to your goals" },
                  { icon: "🗺️", text: "Personalised roadmap built for you" },
                  { icon: "📈", text: "Track your progress in real time" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.9rem", background: "#0F0F0F", border: "1px solid #1A1A1A", borderRadius: 10, padding: "0.8rem 1.1rem" }}>
                    <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                    <span style={{ fontSize: "0.88rem", color: "#888", fontFamily: "'DM Sans', sans-serif" }}>{item.text}</span>
                  </div>
                ))}
              </div>
              <LaunchBtn onClick={() => navigate("/dashboard", { state: {
                ...account, category,
                profileExtra, sec, sen, col, sch, sch10, sch12,
                work, personal, intern, links, hasInternship,
              }})} />
              <p style={{ marginTop: "1.2rem", fontSize: "0.72rem", color: "#1E1E1E" }}>
                All your data is securely stored and used only to personalise your AQUIRE experience.
              </p>
            </div>
          )}

          {currentStepKey !== "launch" && (
            <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.72rem", color: "#1E1E1E" }}>
              All information is securely stored and used only to personalise your AQUIRE experience.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
