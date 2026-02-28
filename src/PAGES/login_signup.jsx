import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const YELLOW = "#FFD700";
const ORANGE = "#FF6A00";

// ── BUTTON COMPONENTS ──
function GradBtn({ children, onClick, style = {}, type = "button", disabled = false }) {
  const [hov, setHov] = useState(false);
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: `linear-gradient(135deg, ${YELLOW}, ${ORANGE})`,
        color: "#0D0D0D", fontWeight: 700, border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        padding: "0.88rem 2rem", borderRadius: 8, width: "100%",
        fontFamily: "'DM Sans', sans-serif", fontSize: "1rem",
        transform: (!disabled && hov) ? "translateY(-2px) scale(1.01)" : "none",
        boxShadow: (!disabled && hov) ? "0 8px 40px rgba(255,180,0,0.35)" : "0 4px 20px rgba(255,180,0,0.12)",
        transition: "transform 0.2s, box-shadow 0.2s, opacity 0.2s",
        letterSpacing: "0.02em",
        opacity: disabled ? 0.45 : 1,
        ...style,
      }}>{children}</button>
  );
}

function SocialBtn({ icon: Icon, label }) {
  const [hov, setHov] = useState(false);
  return (
    <button type="button"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
        width: "100%",
        background: hov ? "#1C1C1C" : "#141414",
        border: `1px solid ${hov ? "#383838" : "#222"}`,
        borderRadius: 8, padding: "0.82rem 1rem",
        cursor: "pointer", color: "#C0C0C0",
        fontFamily: "'DM Sans', sans-serif", fontSize: "0.92rem", fontWeight: 500,
        transition: "all 0.2s",
        transform: hov ? "translateY(-1px)" : "none",
        boxShadow: hov ? "0 6px 20px rgba(0,0,0,0.35)" : "none",
      }}>
      <Icon size={18} />
      {label}
    </button>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
      <div style={{ flex: 1, height: 1, background: "#1E1E1E" }} />
      <span style={{ fontSize: "0.73rem", color: "#383838", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "#1E1E1E" }} />
    </div>
  );
}

// ── INPUT FIELD ──
function Field({ label, type = "text", placeholder, value, onChange, required = true, rightEl, prefix }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.42rem" }}>
      {label && <label style={{ fontSize: "0.77rem", fontWeight: 600, color: "#666", letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</label>}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {prefix && (
          <span style={{ position: "absolute", left: "1rem", color: "#555", fontSize: "0.9rem", zIndex: 1, pointerEvents: "none" }}>{prefix}</span>
        )}
        <input
          type={type} placeholder={placeholder} value={value} onChange={onChange} required={required}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            background: "#131313",
            border: `1px solid ${focused ? "rgba(255,215,0,0.42)" : "#202020"}`,
            borderRadius: 8,
            padding: "0.82rem 1.1rem",
            paddingLeft: prefix ? "3.2rem" : "1.1rem",
            paddingRight: rightEl ? "7.5rem" : "1.1rem",
            color: "#F0F0F0",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.93rem",
            outline: "none", width: "100%",
            boxShadow: focused ? "0 0 0 3px rgba(255,215,0,0.06)" : "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
        />
        {rightEl && (
          <div style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)" }}>
            {rightEl}
          </div>
        )}
      </div>
    </div>
  );
}

function ShowHideBtn({ show, onToggle }) {
  return (
    <button type="button" onClick={onToggle} style={{
      background: "none", border: "none", cursor: "pointer",
      color: "#555", fontSize: "0.7rem", fontWeight: 700,
      letterSpacing: "0.05em", padding: "0.3rem 0.6rem",
      fontFamily: "'DM Sans', sans-serif",
    }}>{show ? "HIDE" : "SHOW"}</button>
  );
}

function SendOtpBtn({ verified, onClick }) {
  const [hov, setHov] = useState(false);
  if (verified) return (
    <span style={{
      fontSize: "0.7rem", fontWeight: 700, color: "#22c55e",
      background: "rgba(34,197,94,0.09)", border: "1px solid rgba(34,197,94,0.26)",
      padding: "0.3rem 0.7rem", borderRadius: 100, whiteSpace: "nowrap",
    }}>✓ Verified</span>
  );
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        fontSize: "0.7rem", fontWeight: 700, color: YELLOW,
        background: hov ? "rgba(255,215,0,0.1)" : "rgba(255,215,0,0.06)",
        border: "1px solid rgba(255,215,0,0.2)",
        padding: "0.3rem 0.8rem", borderRadius: 100, cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
        transition: "all 0.18s",
      }}>Send OTP</button>
  );
}

// ── OTP MODAL ──
function OtpModal({ show, onClose, onVerify, type }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [verified, setVerified] = useState(false);
  const refs = useRef([]);

  useEffect(() => {
    if (!show) { setOtp(["", "", "", "", "", ""]); setVerified(false); setTimer(30); return; }
    const t = setInterval(() => setTimer(v => Math.max(v - 1, 0)), 1000);
    return () => clearInterval(t);
  }, [show]);

  const handleChange = (val, i) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKey = (e, i) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const handleVerify = () => {
    if (otp.join("").length < 6) return;
    setVerified(true);
    setTimeout(() => { onVerify(); onClose(); }, 900);
  };

  if (!show) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.9)", backdropFilter: "blur(14px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.25s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#111", border: "1px solid rgba(255,215,0,0.16)",
        borderRadius: 20, padding: "2.4rem",
        maxWidth: 400, width: "90%", position: "relative",
        animation: "scaleIn 0.28s ease",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, borderRadius: "20px 20px 0 0", background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})` }} />
        <button onClick={onClose} style={{ position: "absolute", top: "1rem", right: "1.2rem", background: "none", border: "none", color: "#555", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>

        <div style={{ textAlign: "center", marginBottom: "1.8rem" }}>
          <div style={{ fontSize: "2.6rem", marginBottom: "0.7rem" }}>{type === "email" ? "📧" : "📱"}</div>
          <h3 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.4rem", fontWeight: 800, color: "#F0F0F0", marginBottom: "0.4rem" }}>
            Verify your {type === "email" ? "Email" : "Phone"}
          </h3>
          <p style={{ fontSize: "0.83rem", color: "#666", lineHeight: 1.6 }}>
            We sent a 6-digit code to your {type === "email" ? "email address" : "phone number"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.52rem", justifyContent: "center", marginBottom: "1.8rem" }}>
          {otp.map((d, i) => (
            <input key={i} ref={el => refs.current[i] = el}
              type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={e => handleChange(e.target.value, i)}
              onKeyDown={e => handleKey(e, i)}
              style={{
                width: 46, height: 54, textAlign: "center",
                background: d ? "rgba(255,215,0,0.07)" : "#191919",
                border: `1.5px solid ${d ? "rgba(255,215,0,0.45)" : "#282828"}`,
                borderRadius: 10, color: YELLOW, fontSize: "1.25rem", fontWeight: 700,
                fontFamily: "'Times New Roman', serif", outline: "none", transition: "all 0.15s",
              }}
            />
          ))}
        </div>

        {verified ? (
          <div style={{ textAlign: "center", padding: "0.82rem", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, color: "#22c55e", fontWeight: 600 }}>
            ✓ Verified Successfully!
          </div>
        ) : (
          <GradBtn onClick={handleVerify} style={{ marginBottom: "1rem" }}>Verify OTP</GradBtn>
        )}

        <p style={{ textAlign: "center", fontSize: "0.79rem", color: "#4A4A4A" }}>
          {timer > 0
            ? `Resend code in ${timer}s`
            : <span onClick={() => setTimer(30)} style={{ color: YELLOW, cursor: "pointer", fontWeight: 600 }}>Resend OTP</span>}
        </p>
      </div>
    </div>
  );
}

// ── SHARED LAYOUT ──
function Blobs({ variant }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {variant === "a" ? <>
        <div style={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,215,0,0.09), transparent 70%)", filter: "blur(90px)", top: -140, right: -80, animation: "float 9s ease-in-out infinite alternate" }} />
        <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,106,0,0.07), transparent 70%)", filter: "blur(80px)", bottom: -80, left: -60, animation: "float 12s ease-in-out infinite alternate", animationDelay: "-4s" }} />
      </> : <>
        <div style={{ position: "absolute", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,106,0,0.08), transparent 70%)", filter: "blur(90px)", top: -100, left: -80, animation: "float 10s ease-in-out infinite alternate" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,215,0,0.07), transparent 70%)", filter: "blur(80px)", bottom: -100, right: -50, animation: "float 13s ease-in-out infinite alternate", animationDelay: "-5s" }} />
      </>}
    </div>
  );
}

function Logo() {
  return (
    <div style={{ textAlign: "center", marginBottom: "1.8rem" }}>
      <span style={{
        fontFamily: "'Times New Roman', serif", fontSize: "1.9rem", fontWeight: 800,
        letterSpacing: "0.1em",
        background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
      }}>AQUIRE</span>
      <div style={{ width: 30, height: 2, background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`, margin: "0.5rem auto 0", borderRadius: 2 }} />
    </div>
  );
}

function Card({ children }) {
  return (
    <div style={{
      background: "#0F0F0F", border: "1px solid #1A1A1A",
      borderRadius: 20, padding: "2.4rem",
      boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,215,0,0.02)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})` }} />
      {children}
    </div>
  );
}

// ── LOGIN PAGE ──
function LoginPage({ onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t); }, []);

  const handleSubmit = e => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div style={{
      width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0D0D0D", padding: "2rem 1rem", position: "relative", overflow: "hidden",
    }}>
      <Blobs variant="a" />
      <div style={{
        position: "relative", zIndex: 1, width: "100%", maxWidth: 440,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.65s ease, transform 0.65s ease",
      }}>
        <Logo />
        <Card>
          <div style={{ marginBottom: "1.8rem" }}>
            <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.75rem", fontWeight: 800, color: "#F0F0F0", marginBottom: "0.35rem", lineHeight: 1.2 }}>
              Welcome back!
            </h1>
            <p style={{ color: "#505050", fontSize: "0.87rem" }}>Continue your structured learning journey</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <Field label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            <Field
              label="Password"
              type={showPass ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              rightEl={<ShowHideBtn show={showPass} onToggle={() => setShowPass(v => !v)} />}
            />
            <div style={{ textAlign: "right", marginTop: "-0.3rem" }}>
              <a href="#" style={{ fontSize: "0.79rem", color: YELLOW, textDecoration: "none", fontWeight: 500 }}>Forgot password?</a>
            </div>

            {/* ── SIGN IN BUTTON ── */}
            <GradBtn type="submit" style={{ marginTop: "0.1rem" }}>
              {loading
                ? <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ width: 15, height: 15, border: "2px solid rgba(0,0,0,0.25)", borderTopColor: "#0D0D0D", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                    Signing In...
                  </span>
                : "Sign In →"}
            </GradBtn>
          </form>

          {/* ── SOCIAL SECTION — after Sign In button ── */}
          <div style={{ marginTop: "1.4rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <Divider label="or continue with" />
            <SocialBtn icon={GoogleIcon} label="Continue with Google" />
          </div>

          <p style={{ textAlign: "center", marginTop: "1.6rem", fontSize: "0.85rem", color: "#4A4A4A" }}>
            Don't have an account?{" "}
            <span onClick={onSwitch} style={{ color: YELLOW, fontWeight: 600, cursor: "pointer" }}>Create one free →</span>
          </p>
        </Card>

        <p style={{ textAlign: "center", marginTop: "1.3rem", fontSize: "0.73rem", color: "#333", lineHeight: 1.6 }}>
          By continuing, you agree to AQUIRE's{" "}
          <a href="#" style={{ color: "#484848", textDecoration: "none" }}>Terms</a>{" "}and{" "}
          <a href="#" style={{ color: "#484848", textDecoration: "none" }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

// ── SIGNUP PAGE ──
function SignupPage({ onSwitch }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", username: "", password: "", confirmPassword: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpModal, setOtpModal] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const strength = (() => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 6) return { label: "Weak", color: "#ef4444", w: "28%" };
    if (p.length < 10 || !/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { label: "Fair", color: ORANGE, w: "60%" };
    return { label: "Strong", color: "#22c55e", w: "100%" };
  })();

  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;
  const canSubmit = form.name && form.email && form.phone && form.username && passwordsMatch && agreed;

  const handleSubmit = e => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/studentinfo', { state: { name: form.name, email: form.email, phone: form.phone, username: form.username } });
    }, 2000);
  };

  return (
    <div style={{
      width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0D0D0D", padding: "2rem 1rem", position: "relative", overflow: "hidden",
    }}>
      <Blobs variant="b" />
      <div style={{
        position: "relative", zIndex: 1, width: "100%", maxWidth: 500,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.65s ease, transform 0.65s ease",
      }}>
        <Logo />
        <Card>
          <div style={{ marginBottom: "1.8rem" }}>
            <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.75rem", fontWeight: 800, color: "#F0F0F0", marginBottom: "0.35rem", lineHeight: 1.2 }}>
              Create your account
            </h1>
            <p style={{ color: "#505050", fontSize: "0.87rem" }}>Join 2,400+ engineers on a structured path to mastery</p>
          </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                {/* 1. Full Name */}
                <Field label="Full Name" placeholder="Your full name" value={form.name} onChange={set("name")} />

                {/* 2. Email */}
                <Field
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set("email")}
                />

                {/* 3. Phone + Send OTP */}
                <Field
                  label="Phone Number"
                  type="tel"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={set("phone")}
                  prefix="+91"
                  rightEl={<SendOtpBtn verified={phoneVerified} onClick={() => form.phone && setOtpModal("phone")} />}
                />

                {/* 4. Username */}
                <Field label="Username" placeholder="e.g. arjun_codes" value={form.username} onChange={set("username")} />

                {/* 5. Password */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  <Field
                    label="Create Password"
                    type={showPass ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={set("password")}
                    rightEl={<ShowHideBtn show={showPass} onToggle={() => setShowPass(v => !v)} />}
                  />
                  {strength && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ flex: 1, height: 4, background: "#1A1A1A", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: strength.w, background: strength.color, borderRadius: 2, transition: "width 0.4s, background 0.3s" }} />
                      </div>
                      <span style={{ fontSize: "0.71rem", color: strength.color, fontWeight: 700, minWidth: 40 }}>{strength.label}</span>
                    </div>
                  )}
                </div>

                {/* 6. Confirm Password */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <Field
                    label="Confirm Password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    rightEl={<ShowHideBtn show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />}
                  />
                  {form.confirmPassword && (
                    <p style={{ fontSize: "0.72rem", color: passwordsMatch ? "#22c55e" : "#ef4444" }}>
                      {passwordsMatch ? "✓ Passwords match" : "✗ Passwords don't match"}
                    </p>
                  )}
                </div>

                {/* 7. Terms Checkbox */}
                <label style={{ display: "flex", alignItems: "flex-start", gap: "0.72rem", cursor: "pointer", marginTop: "0.15rem" }}>
                  <div
                    onClick={() => setAgreed(v => !v)}
                    style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: "2px",
                      border: `1.5px solid ${agreed ? "transparent" : "#303030"}`,
                      background: agreed ? `linear-gradient(135deg, ${YELLOW}, ${ORANGE})` : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s", cursor: "pointer",
                    }}>
                    {agreed && <span style={{ color: "#0D0D0D", fontSize: "0.65rem", fontWeight: 900, lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: "0.82rem", color: "#5A5A5A", lineHeight: 1.55 }}>
                    I agree to AQUIRE's{" "}
                    <a href="#" onClick={e => e.stopPropagation()} style={{ color: YELLOW, textDecoration: "none", fontWeight: 600 }}>Terms of Service</a>
                    {" "}and{" "}
                    <a href="#" onClick={e => e.stopPropagation()} style={{ color: YELLOW, textDecoration: "none", fontWeight: 600 }}>Privacy Policy</a>
                  </span>
                </label>

                {/* ── CREATE ACCOUNT BUTTON ── */}
                <GradBtn type="submit" disabled={!canSubmit} style={{ marginTop: "0.3rem" }}>
                  {loading
                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ width: 15, height: 15, border: "2px solid rgba(0,0,0,0.25)", borderTopColor: "#0D0D0D", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                        Creating Account...
                      </span>
                    : "Create Account →"}
                </GradBtn>
              </form>

              {/* ── SOCIAL SECTION — after Create Account button ── */}
              <div style={{ marginTop: "1.4rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                <Divider label="or continue with" />
                <SocialBtn icon={GoogleIcon} label="Continue with Google" />
              </div>

              <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "#4A4A4A" }}>
                Already have an account?{" "}
                <span onClick={onSwitch} style={{ color: YELLOW, fontWeight: 600, cursor: "pointer" }}>Sign in →</span>
            </p>
        </Card>
      </div>

      <OtpModal
        show={!!otpModal}
        type={otpModal}
        onClose={() => setOtpModal(null)}
        onVerify={() => {
          if (otpModal === "email") setEmailVerified(true);
          if (otpModal === "phone") setPhoneVerified(true);
          setOtpModal(null);
        }}
      />
    </div>
  );
}

// ── ICONS ──
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ── APP ──
export default function App({ initialPage = "login" }) {
  const navigate = useNavigate();
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; width: 100%; background: #0D0D0D; font-family: 'DM Sans', sans-serif; font-size: 16px; line-height: 1.6; }
        @keyframes float { from { transform: translate(0,0) scale(1); } to { transform: translate(18px,-18px) scale(1.04); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.93); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        input::placeholder { color: #2A2A2A; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #131313 inset !important; -webkit-text-fill-color: #F0F0F0 !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0D0D0D; }
        ::-webkit-scrollbar-thumb { background: #1E1E1E; border-radius: 2px; }
      `}</style>
      {initialPage === "login"
        ? <LoginPage onSwitch={() => navigate('/signup')} />
        : <SignupPage onSwitch={() => navigate('/login')} />}
    </>
  );
}