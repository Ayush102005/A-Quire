import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cognitoSignIn, cognitoSignUp, cognitoConfirmSignUp } from "../cognito";
import { useAuth } from "../context/AuthContext";

const YELLOW = "#FFD700";
const ORANGE = "#FF6A00";

// ── SHARED UI COMPONENTS ──────────────────────────────────────────────────────

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
        letterSpacing: "0.02em", opacity: disabled ? 0.45 : 1, ...style,
      }}>{children}</button>
  );
}

function Field({ label, type = "text", placeholder, value, onChange, required = true, rightEl, prefix }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.42rem" }}>
      {label && <label style={{ fontSize: "0.77rem", fontWeight: 600, color: "#666", letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</label>}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {prefix && <span style={{ position: "absolute", left: "1rem", color: "#555", fontSize: "0.9rem", zIndex: 1, pointerEvents: "none" }}>{prefix}</span>}
        <input type={type} placeholder={placeholder} value={value} onChange={onChange} required={required}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            background: "#131313", border: `1px solid ${focused ? "rgba(255,215,0,0.42)" : "#202020"}`,
            borderRadius: 8, padding: "0.82rem 1.1rem",
            paddingLeft: prefix ? "3.2rem" : "1.1rem",
            paddingRight: rightEl ? "7.5rem" : "1.1rem",
            color: "#F0F0F0", fontFamily: "'DM Sans', sans-serif", fontSize: "0.93rem",
            outline: "none", width: "100%",
            boxShadow: focused ? "0 0 0 3px rgba(255,215,0,0.06)" : "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
        />
        {rightEl && <div style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)" }}>{rightEl}</div>}
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

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────

function LoginPage({ onSwitch }) {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      console.log("[Login] Signing in...");
      await cognitoSignIn(email, password);
      console.log("[Login] Sign in successful, refreshing session...");
      // Refresh auth context to update currentUser
      await refreshSession();
      console.log("[Login] Session refreshed, navigating to dashboard...");
      navigate("/dashboard");
    } catch (err) {
      console.error("[Login] Error:", err);
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D0D0D", padding: "2rem 1rem", position: "relative", overflow: "hidden" }}>
      <Blobs variant="a" />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.65s ease, transform 0.65s ease" }}>
        <Logo />
        <Card>
          <div style={{ marginBottom: "1.8rem" }}>
            <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.75rem", fontWeight: 800, color: "#F0F0F0", marginBottom: "0.35rem", lineHeight: 1.2 }}>Welcome back!</h1>
            <p style={{ color: "#505050", fontSize: "0.87rem" }}>Continue your structured learning journey</p>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <Field label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            <Field label="Password" type={showPass ? "text" : "password"} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)}
              rightEl={<ShowHideBtn show={showPass} onToggle={() => setShowPass(v => !v)} />}
            />
            {error && <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "-0.5rem" }}>{error}</p>}
            <GradBtn type="submit" style={{ marginTop: "0.1rem" }}>
              {loading
                ? <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: 15, height: 15, border: "2px solid rgba(0,0,0,0.25)", borderTopColor: "#0D0D0D", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                  Signing In...
                </span>
                : "Sign In →"}
            </GradBtn>
          </form>
          <p style={{ textAlign: "center", marginTop: "1.6rem", fontSize: "0.85rem", color: "#4A4A4A" }}>
            Don't have an account?{" "}
            <span onClick={onSwitch} style={{ color: YELLOW, fontWeight: 600, cursor: "pointer" }}>Create one free →</span>
          </p>
        </Card>
      </div>
    </div>
  );
}

// ── SIGNUP + OTP CONFIRMATION ─────────────────────────────────────────────────

function SignupPage({ onSwitch }) {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", username: "", password: "", confirmPassword: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  // OTP confirmation step
  const [step, setStep] = useState("signup");  // "signup" | "confirm"
  const [otpCode, setOtpCode] = useState("");

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

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true); setError("");
    try {
      await cognitoSignUp(form.email, form.password, form.name, form.username);
      // Cognito sends a verification code to the email
      setStep("confirm");
    } catch (err) {
      setError(err.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await cognitoConfirmSignUp(form.email, otpCode);
      // Sign in immediately after email verification
      await cognitoSignIn(form.email, form.password);
      // Refresh auth context to update currentUser
      await refreshSession();
      navigate("/studentinfo", { state: { name: form.name, email: form.email, phone: form.phone, username: form.username } });
    } catch (err) {
      setError(err.message || "Confirmation failed. Check your code.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "confirm") {
    return (
      <div style={{ width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D0D0D", padding: "2rem 1rem", position: "relative", overflow: "hidden" }}>
        <Blobs variant="b" />
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.65s ease, transform 0.65s ease" }}>
          <Logo />
          <Card>
            <div style={{ marginBottom: "1.8rem" }}>
              <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.75rem", fontWeight: 800, color: "#F0F0F0", marginBottom: "0.35rem" }}>Check your email</h1>
              <p style={{ color: "#505050", fontSize: "0.87rem" }}>We sent a verification code to <strong style={{ color: "#888" }}>{form.email}</strong></p>
            </div>
            <form onSubmit={handleConfirm} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <Field label="Verification Code" placeholder="123456" value={otpCode} onChange={e => setOtpCode(e.target.value)} />
              {error && <p style={{ color: "#ef4444", fontSize: "0.8rem" }}>{error}</p>}
              <GradBtn type="submit" disabled={!otpCode || loading}>
                {loading ? "Verifying..." : "Verify & Continue →"}
              </GradBtn>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D0D0D", padding: "2rem 1rem", position: "relative", overflow: "hidden" }}>
      <Blobs variant="b" />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 500, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.65s ease, transform 0.65s ease" }}>
        <Logo />
        <Card>
          <div style={{ marginBottom: "1.8rem" }}>
            <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "1.75rem", fontWeight: 800, color: "#F0F0F0", marginBottom: "0.35rem" }}>Create your account</h1>
            <p style={{ color: "#505050", fontSize: "0.87rem" }}>Join 2,400+ engineers on a structured path to mastery</p>
          </div>
          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Field label="Full Name" placeholder="Your full name" value={form.name} onChange={set("name")} />
            <Field label="Email Address" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />
            <Field label="Phone Number" type="tel" placeholder="9876543210" value={form.phone} onChange={set("phone")} prefix="+91" />
            <Field label="Username" placeholder="e.g. arjun_codes" value={form.username} onChange={set("username")} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              <Field label="Create Password" type={showPass ? "text" : "password"} placeholder="Min. 8 characters" value={form.password} onChange={set("password")}
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
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <Field label="Confirm Password" type={showConfirm ? "text" : "password"} placeholder="Re-enter your password" value={form.confirmPassword} onChange={set("confirmPassword")}
                rightEl={<ShowHideBtn show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />}
              />
              {form.confirmPassword && (
                <p style={{ fontSize: "0.72rem", color: passwordsMatch ? "#22c55e" : "#ef4444" }}>
                  {passwordsMatch ? "✓ Passwords match" : "✗ Passwords don't match"}
                </p>
              )}
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.72rem", cursor: "pointer", marginTop: "0.15rem" }}>
              <div onClick={() => setAgreed(v => !v)} style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: "2px", border: `1.5px solid ${agreed ? "transparent" : "#303030"}`, background: agreed ? `linear-gradient(135deg, ${YELLOW}, ${ORANGE})` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", cursor: "pointer" }}>
                {agreed && <span style={{ color: "#0D0D0D", fontSize: "0.65rem", fontWeight: 900, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: "0.82rem", color: "#5A5A5A", lineHeight: 1.55 }}>
                I agree to AQUIRE's{" "}
                <a href="#" onClick={e => e.stopPropagation()} style={{ color: YELLOW, textDecoration: "none", fontWeight: 600 }}>Terms of Service</a>
                {" "}and{" "}
                <a href="#" onClick={e => e.stopPropagation()} style={{ color: YELLOW, textDecoration: "none", fontWeight: 600 }}>Privacy Policy</a>
              </span>
            </label>
            {error && <p style={{ color: "#ef4444", fontSize: "0.8rem" }}>{error}</p>}
            <GradBtn type="submit" disabled={!canSubmit} style={{ marginTop: "0.3rem" }}>
              {loading
                ? <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: 15, height: 15, border: "2px solid rgba(0,0,0,0.25)", borderTopColor: "#0D0D0D", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                  Creating Account...
                </span>
                : "Create Account →"}
            </GradBtn>
          </form>
          <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "#4A4A4A" }}>
            Already have an account?{" "}
            <span onClick={onSwitch} style={{ color: YELLOW, fontWeight: 600, cursor: "pointer" }}>Sign in →</span>
          </p>
        </Card>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
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