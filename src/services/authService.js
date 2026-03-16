import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Register a new user with email and password.
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export const registerUser = async (email, password, displayName) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }
  return credential;
};

/**
 * Sign in an existing user.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export const loginUser = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

/**
 * Sign out the current user.
 * @returns {Promise<void>}
 */
export const logoutUser = () => signOut(auth);

/**
 * Send a password-reset email.
 * @param {string} email
 * @returns {Promise<void>}
 */
export const resetPassword = (email) =>
  sendPasswordResetEmail(auth, email);

/**
 * Subscribe to auth state changes.
 * @param {(user: import('firebase/auth').User | null) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export const subscribeToAuthChanges = (callback) =>
  onAuthStateChanged(auth, callback);

/**
 * Get the currently signed-in user (null if not authenticated).
 * @returns {import('firebase/auth').User | null}
 */
export const getCurrentUser = () => auth.currentUser;
