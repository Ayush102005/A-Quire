# Plan 4 — AUTH-01: Wire ForgotPassword.jsx to Real API

**Phase:** 3
**Wave:** 3
**Depends on:** Plan 3 (api.forgotPassword() added to api.js)
**Files modified:**
  - `Frontend/src/pages/ForgotPassword.jsx` (replace fake setTimeout with real API call)
**Autonomous:** true

---

## Objective

`ForgotPassword.jsx` currently uses a fake `setTimeout` to simulate the forgot-password flow.
The real backend endpoint `POST /api/v1/auth/forgot-password` exists and `api.forgotPassword()` was added in Plan 3.

This plan replaces the fake simulation with real API calls. The UI/UX already matches what we want; only the `handleSubmit` and `handleResend` functions need changing.

---

## Tasks

### Task 1 — Wire handleSubmit to real API

<read_first>
- `Frontend/src/pages/ForgotPassword.jsx` (full file — current implementation)
- `Frontend/src/services/api.js` (api.forgotPassword method)
</read_first>

<action>
In `Frontend/src/pages/ForgotPassword.jsx`, replace the existing `handleSubmit` function:

**Current (lines ~136–147):**
```javascript
  function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    const err = validateEmail(email);
    if (err) { setError(err); inputRef.current?.focus(); return; }
    setError('');
    setStatus('loading');
    setTimeout(() => {
      setStatus('success');
      startCooldown();
    }, 1800);
  }
```

**Replace with:**
```javascript
  async function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    const err = validateEmail(email);
    if (err) { setError(err); inputRef.current?.focus(); return; }
    setError('');
    setStatus('loading');
    try {
      await api.forgotPassword(email);
    } catch {
      // Always show success regardless of outcome — backend deliberately returns
      // 200 even for unknown emails to prevent user enumeration.
      // Only a network error would reach here; still show success per UX spec.
    }
    setStatus('success');
    startCooldown();
  }
```

Also add the import at the top of the file (after the existing React and lucide-react imports):
```javascript
import { api } from '../services/api';
```
</action>

<acceptance_criteria>
- `grep "api.forgotPassword" Frontend/src/pages/ForgotPassword.jsx` returns a match
- `grep "import { api }" Frontend/src/pages/ForgotPassword.jsx` returns a match
- `grep "setTimeout" Frontend/src/pages/ForgotPassword.jsx` returns 0 matches (fake setTimeout removed from handleSubmit)
- The `async function handleSubmit` signature is present (function must be async for await)
</acceptance_criteria>

---

### Task 2 — Wire handleResend to real API

<read_first>
- `Frontend/src/pages/ForgotPassword.jsx` (current handleResend implementation)
</read_first>

<action>
In `Frontend/src/pages/ForgotPassword.jsx`, replace the existing `handleResend` function:

**Current (lines ~149–156):**
```javascript
  function handleResend() {
    if (cooldown > 0 || status === 'resend') return;
    setStatus('resend');
    setTimeout(() => {
      setStatus('success');
      startCooldown();
    }, 1600);
  }
```

**Replace with:**
```javascript
  async function handleResend() {
    if (cooldown > 0 || status === 'resend') return;
    setStatus('resend');
    try {
      await api.forgotPassword(email);
    } catch {
      // Same anti-enumeration rationale as handleSubmit — always show success
    }
    setStatus('success');
    startCooldown();
  }
```
</action>

<acceptance_criteria>
- `grep "handleResend" Frontend/src/pages/ForgotPassword.jsx` returns matches for the function definition
- The `handleResend` function is `async` (contains `async function handleResend` or `const handleResend = async`)
- No `setTimeout` remains in `handleResend` (all fake delays removed)
- `api.forgotPassword(email)` is called inside `handleResend`
</acceptance_criteria>

---

### Task 3 — Final build verification

<read_first>
- `Frontend/package.json`
</read_first>

<action>
Run the Vite build to confirm no import errors or syntax issues:

```
cd Frontend
npm run build
```

Expected: build completes with no errors. Warnings about unused variables are acceptable.
</action>

<acceptance_criteria>
- `npm run build` in Frontend exits with code 0
- Output does NOT contain `error` (case-insensitive) in a way that halts the build
- `dist/` directory is created in Frontend
</acceptance_criteria>

---

## Verification Checklist

- [ ] `grep "api.forgotPassword" Frontend/src/pages/ForgotPassword.jsx` → 2 matches (handleSubmit + handleResend)
- [ ] `grep "setTimeout" Frontend/src/pages/ForgotPassword.jsx` → 0 matches (all fake delays removed)
- [ ] `grep "import { api }" Frontend/src/pages/ForgotPassword.jsx` → 1 match
- [ ] `npm run build` exits with code 0

---

## Must Haves (Goal-Backward)

- [x] Forgot-password form submits to real backend (no fake setTimeout)
- [x] Resend button calls real API again (no fake setTimeout)
- [x] Success state always shown (anti-enumeration: backend always returns 200)
- [x] Build passes with no errors
