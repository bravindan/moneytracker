import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, isFirebaseReady, firebaseInitError } from "../config/firebase";

const ensureAuthReady = () => {
  if (!isFirebaseReady || !auth) {
    throw new Error(firebaseInitError || "Firebase auth is not initialized");
  }
};

/**
 * Register a new user with email and password.
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export const registerUser = async (email, password, displayName) => {
  ensureAuthReady();
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
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
export const loginUser = (email, password) => (
  ensureAuthReady(),
  signInWithEmailAndPassword(auth, email, password)
);

/**
 * Sign out the current user.
 * @returns {Promise<void>}
 */
export const logoutUser = () => (ensureAuthReady(), signOut(auth));

/**
 * Send a password-reset email.
 * @param {string} email
 * @returns {Promise<void>}
 */
export const resetPassword = (email) => (
  ensureAuthReady(),
  sendPasswordResetEmail(auth, email)
);

/**
 * Change the current user's password.
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export const changePassword = async (currentPassword, newPassword) => {
  ensureAuthReady();
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No authenticated user found");
  }

  // Reauthenticate user first
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);

  // Update password
  await updatePassword(user, newPassword);
};

/**
 * Subscribe to auth state changes.
 * @param {(user: import('firebase/auth').User | null) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export const subscribeToAuthChanges = (callback) =>
  isFirebaseReady && auth
    ? onAuthStateChanged(auth, callback)
    : (callback(null), () => {});

/**
 * Get the currently signed-in user (null if not authenticated).
 * @returns {import('firebase/auth').User | null}
 */
export const getCurrentUser = () => (auth ? auth.currentUser : null);

/**
 * Update the current user's email in Firebase Auth.
 * Sends a verification email to the new address first.
 * Requires reauthentication with the current password.
 * @param {string} newEmail
 * @param {string} currentPassword
 * @returns {Promise<void>}
 */
export const updateUserEmail = async (newEmail, currentPassword) => {
  ensureAuthReady();
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No authenticated user found");
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await verifyBeforeUpdateEmail(user, newEmail);
};

/**
 * Delete the current user account.
 * Requires reauthentication with the current password.
 * @param {string} currentPassword
 * @returns {Promise<void>}
 */
export const deleteCurrentUser = async (currentPassword) => {
  ensureAuthReady();
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No authenticated user found");
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await deleteUser(user);
};
