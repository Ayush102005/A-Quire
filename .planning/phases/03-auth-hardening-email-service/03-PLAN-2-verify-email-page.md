# Plan 2 — AUTH-02: VerifyEmail.jsx Frontend Page

**Phase:** 3
**Wave:** 2
**Depends on:** Plan 1 (backend endpoints confirmed working)
**Files modified:**
  - `Frontend/src/pages/VerifyEmail.jsx` [NEW]
  - `Frontend/src/App.jsx` (add `/verify-email` route)
  - `Frontend/src/services/api.js` (add `api.verifyEmail()`)
**Autonomous:** true

---

## Objective

When a user registers, `email_service.py` sends them a link to:
`{FRONTEND_URL}/verify-email?token=<token>`

This route currently does **not exist** in `App.jsx` and there is no `VerifyEmail.jsx` page.
This plan creates the page and wires it up.

The page must:
1. On mount, read `?token=` from URL params
2. Call `GET /api/v1/auth/verify-email?token=<token>`
3. Show success state ("Email verified! You can now log in.") or error state ("Invalid or expired link")
4. Provide a button to navigate to `/login`

---

## Tasks

### Task 1 — Add `api.verifyEmail()` to api.js

<read_first>
- `Frontend/src/services/api.js`
</read_first>

<action>
In `Frontend/src/services/api.js`, inside the `export const api = { ... }` object, after the `getMe()` method and before the `onboarding:` namespace, add:

```javascript
  async verifyEmail(token) {
    // GET /auth/verify-email?token=<token>
    return request(`/auth/verify-email?token=${encodeURIComponent(token)}`);
  },
```

The `request()` function does GET by default (no method specified). This returns `{ message: "Email verified successfully. You can now log in." }` on success or throws an Error with the backend's detail message on failure.
</action>

<acceptance_criteria>
- `grep "verifyEmail" Frontend/src/services/api.js` returns a match
- The method calls `request('/auth/verify-email?token=...')` with no `method` (defaults to GET)
- No other methods in api.js are modified
</acceptance_criteria>

---

### Task 2 — Create VerifyEmail.jsx

<read_first>
- `Frontend/src/services/api.js` (api.verifyEmail method just added)
- `Frontend/src/pages/ForgotPassword.jsx` (reference for styling conventions — teal brand color, card layout, lucide icons)
- `Frontend/src/pages/Login.jsx` (reference for routing patterns)
</read_first>

<action>
Create `Frontend/src/pages/VerifyEmail.jsx` with the following implementation:

```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

/**
 * VerifyEmail — handles the /verify-email?token=... link from registration emails.
 * States: 'loading' | 'success' | 'error'
 */
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setErrorMsg('No verification token found in the URL. Please use the link from your email.');
      setStatus('error');
      return;
    }

    api.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setErrorMsg(err.message || 'Invalid or expired verification link.');
        setStatus('error');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center px-4 py-12 font-sans">

      {/* Background blobs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-50 opacity-60 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-stone-100 opacity-80 blur-3xl" />
      </div>

      {/* Logo */}
      <a
        href="/"
        className="relative z-10 flex items-center gap-2.5 mb-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg"
        aria-label="A-Quire home"
      >
        <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
          A
        </div>
        <span className="font-semibold text-stone-800 text-xl tracking-tight">A-Quire</span>
      </a>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-[420px] bg-white border border-stone-200/80 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden"
        role="main"
      >
        <div className="px-8 py-10 flex flex-col items-center text-center gap-6" aria-live="polite">

          {/* Loading */}
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-teal-600 animate-spin" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Verifying your email…</h1>
                <p className="text-sm text-stone-500 leading-relaxed">Just a moment while we confirm your address.</p>
              </div>
            </>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-teal-600" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Email verified!</h1>
                <p className="text-sm text-stone-500 leading-relaxed max-w-[300px] mx-auto">
                  Your A-Quire account is now active. Sign in to start learning.
                </p>
              </div>
              <button
                id="go-to-login-btn"
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/20 focus-visible:ring-offset-2"
              >
                Sign in to A-Quire
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </>
          )}

          {/* Error */}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Verification failed</h1>
                <p className="text-sm text-stone-500 leading-relaxed max-w-[300px] mx-auto">
                  {errorMsg}
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 w-full">
                <button
                  id="try-login-btn"
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/20 focus-visible:ring-offset-2"
                >
                  Go to sign in
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <p className="text-xs text-stone-400">
                  Need help?{' '}
                  <a href="mailto:support@aquire.in" className="text-teal-700 hover:underline font-semibold">
                    Contact support
                  </a>
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
```
</action>

<acceptance_criteria>
- `Frontend/src/pages/VerifyEmail.jsx` exists
- File contains `useSearchParams` import from `react-router-dom`
- File contains `api.verifyEmail(token)` call
- File contains three state branches: `loading`, `success`, `error`
- File contains `id="go-to-login-btn"` on the success CTA button
</acceptance_criteria>

---

### Task 3 — Add `/verify-email` route in App.jsx

<read_first>
- `Frontend/src/App.jsx`
</read_first>

<action>
In `Frontend/src/App.jsx`:

1. Add import at the top (with other public page imports):
```javascript
import VerifyEmail from './pages/VerifyEmail';
```

2. Add route inside `<Routes>` in the public routes section (after `/forgot-password`):
```jsx
<Route path="/verify-email" element={<VerifyEmail />} />
```

The route should be placed after:
```jsx
<Route path="/forgot-password" element={<ForgotPassword />} />
```
</action>

<acceptance_criteria>
- `grep "VerifyEmail" Frontend/src/App.jsx` returns 2 matches (import + Route)
- `grep 'path="/verify-email"' Frontend/src/App.jsx` returns 1 match
- The route is in the public routes section (no ProtectedRoute wrapper)
</acceptance_criteria>

---

## Verification Checklist

- [ ] `VerifyEmail.jsx` exists in `Frontend/src/pages/`
- [ ] `api.verifyEmail` method exists in `Frontend/src/services/api.js`
- [ ] `/verify-email` route registered in `Frontend/src/App.jsx`
- [ ] `npm run build` in Frontend exits with code 0 (no import errors)

---

## Must Haves (Goal-Backward)

- [x] Verification email link (`/verify-email?token=...`) resolves to a real page
- [x] Page calls backend `GET /auth/verify-email?token=` on mount
- [x] Success state shown with "Sign in" CTA
- [x] Error state shown with clear message and support link
