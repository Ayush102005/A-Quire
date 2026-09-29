import { initializeApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  signOut,
  updateProfile,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInWithEmailPassword(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function createUserWithEmailPassword(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function updateFirebaseProfile(user, profile) {
  return updateProfile(user, profile);
}

export async function sendEmailVerificationToUser(user) {
  return sendEmailVerification(user);
}

export async function sendPasswordReset(email) {
  return sendPasswordResetEmail(auth, email);
}

export function initializeRecaptcha(containerId = "recaptcha-container") {
  if (typeof window === "undefined") {
    throw new Error("Recaptcha can only be initialized in a browser.");
  }

  auth.languageCode = "en";

  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
    window.recaptchaVerifier = null;
  }

  const verifier = new RecaptchaVerifier(
    containerId,
    { size: "invisible", callback: () => {} },
    auth,
  );

  verifier.render().catch(() => {
    // ignore render race conditions in single-page apps
  });

  window.recaptchaVerifier = verifier;
  return verifier;
}

export async function sendPhoneVerificationCode(phoneNumber) {
  if (typeof window === "undefined") {
    throw new Error("Phone verification must run in a browser.");
  }

  const verifier = window.recaptchaVerifier || initializeRecaptcha();
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}

export async function confirmPhoneVerification(confirmationResult, verificationCode) {
  return confirmationResult.confirm(verificationCode);
}

export async function firebaseSignOut() {
  return signOut(auth);
}

export async function getFirebaseToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export { auth };
