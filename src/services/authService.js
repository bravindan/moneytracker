import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
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
 * Change the current user's password.
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export const changePassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No authenticated user found');
  }

  // Reauthenticate user first
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);

  // Update password
  await updatePassword(user, newPassword);
};

/**
 * Update user profile with photo URL.
 * @param {string} photoURL
 * @returns {Promise<void>}
 */
export const updateUserPhoto = async (photoURL) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  await updateProfile(user, { photoURL });
};

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
