/**
 * Firebase initialization — Auth + Firestore.
 * Replace firebaseConfig with your project's config from Firebase Console.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

let app = null;
let _auth = null;
let _db = null;

try {
  app = initializeApp(firebaseConfig);
  _auth = getAuth(app);
  _db = getFirestore(app);
} catch (err) {
  console.warn('[firebase] Init failed — config not set:', err.message);
}

export const auth = _auth;
export const db = _db;

const googleProvider = _auth ? new GoogleAuthProvider() : null;

// ── Auth helpers ─────────────────────────

export function loginWithGoogle() {
  if (!_auth || !googleProvider) {
    return Promise.reject(new Error('Firebase not configured. Add your config to firebase.js'));
  }
  return signInWithPopup(_auth, googleProvider);
}

export function logout() {
  if (!_auth) return Promise.resolve();
  return signOut(_auth);
}

/**
 * Switch account — opens Google account picker popup.
 * Forces the user to choose an account even if already signed in.
 */
export function switchAccount() {
  if (!_auth || !googleProvider) {
    return Promise.reject(new Error('Firebase not configured'));
  }
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(_auth, googleProvider).finally(() => {
    googleProvider.setCustomParameters({});
  });
}

/**
 * Listen for auth state changes.
 * callback(user) — user is null when logged out, or a Firebase User object.
 */
export function onAuth(callback) {
  if (!_auth) {
    // Firebase not configured — call with null immediately
    setTimeout(() => callback(null), 0);
    return () => {};
  }
  return onAuthStateChanged(_auth, callback);
}

/**
 * Get current logged-in user (or null).
 */
export function getCurrentUser() {
  return _auth?.currentUser || null;
}
