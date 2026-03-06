import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js';

const POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

// Deferred init — prevents a bad env var from crashing the whole app
let userPool = null;
try {
    if (POOL_ID && CLIENT_ID) {
        userPool = new CognitoUserPool({ UserPoolId: POOL_ID, ClientId: CLIENT_ID });
    } else {
        console.warn('[Cognito] VITE_COGNITO_USER_POOL_ID or VITE_COGNITO_CLIENT_ID not set — auth disabled');
    }
} catch (e) {
    console.error('[Cognito] Failed to init UserPool:', e.message);
}

export { userPool };


// ── Sign Up ───────────────────────────────────────────────────────────────────
export function cognitoSignUp(email, password, name, username) {
    return new Promise((resolve, reject) => {
        const attrs = [
            new CognitoUserAttribute({ Name: 'email', Value: email }),
            new CognitoUserAttribute({ Name: 'name', Value: name }),
            // 'preferred_username' maps to Cognito's username alias
            new CognitoUserAttribute({ Name: 'preferred_username', Value: username }),
        ];

        userPool.signUp(email, password, attrs, null, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}


// ── Confirm Sign Up (email OTP) ───────────────────────────────────────────────
export function cognitoConfirmSignUp(email, code) {
    return new Promise((resolve, reject) => {
        const user = new CognitoUser({ Username: email, Pool: userPool });
        user.confirmRegistration(code, true, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}


// ── Sign In ───────────────────────────────────────────────────────────────────
export function cognitoSignIn(email, password) {
    return new Promise((resolve, reject) => {
        const authDetails = new AuthenticationDetails({ Username: email, Password: password });
        const user = new CognitoUser({ Username: email, Pool: userPool });

        user.authenticateUser(authDetails, {
            onSuccess: (session) => resolve({ user, session }),
            onFailure: (err) => reject(err),
            newPasswordRequired: () =>
                reject(new Error('New password required — contact support')),
        });
    });
}


// ── Sign Out ──────────────────────────────────────────────────────────────────
export function cognitoSignOut() {
    if (!userPool) return;
    const user = userPool.getCurrentUser();
    if (user) user.signOut();
}


// ── Get current session tokens ────────────────────────────────────────────────
export function getSession() {
    return new Promise((resolve) => {
        if (!userPool) return resolve(null);
        const user = userPool.getCurrentUser();
        if (!user) return resolve(null);
        user.getSession((err, session) => {
            if (err || !session?.isValid()) return resolve(null);
            resolve(session);
        });
    });
}

// Returns the ID token JWT string (for Authorization header)
export async function getIdToken() {
    const session = await getSession();
    return session ? session.getIdToken().getJwtToken() : null;
}

// Returns decoded user info from ID token
export async function getCurrentUserInfo() {
    const session = await getSession();
    if (!session) return null;
    const payload = session.getIdToken().decodePayload();
    return {
        uid: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
        username: payload.preferred_username || payload.email,
    };
}

// ── Forgot Password ───────────────────────────────────────────────────────────
export function cognitoForgotPassword(email) {
    return new Promise((resolve, reject) => {
        const user = new CognitoUser({ Username: email, Pool: userPool });
        user.forgotPassword({ onSuccess: resolve, onFailure: reject });
    });
}

export function cognitoConfirmNewPassword(email, code, newPassword) {
    return new Promise((resolve, reject) => {
        const user = new CognitoUser({ Username: email, Pool: userPool });
        user.confirmPassword(code, newPassword, { onSuccess: resolve, onFailure: reject });
    });
}
