import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase project config — values come from EXPO_PUBLIC_ env vars
// Copy .env.example to .env and fill in your Firebase project credentials
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const requiredConfigKeys = ["apiKey", "authDomain", "projectId", "appId"];

let app = null;
let auth = null;
let db = null;
let storage = null;
let firebaseInitError = "";

const missingKeys = requiredConfigKeys.filter((key) => !firebaseConfig[key]);

try {
  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Firebase config: ${missingKeys.join(", ")}. Ensure EXPO_PUBLIC_* vars are set for this build profile.`,
    );
  }

  // Prevent duplicate app initialization (useful with hot reload)
  const isNew = getApps().length === 0;
  app = isNew ? initializeApp(firebaseConfig) : getApp();

  // Auth — use AsyncStorage for session persistence across app restarts
  auth = isNew
    ? initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      })
    : getAuth(app);

  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  firebaseInitError = error?.message ?? "Unknown Firebase initialization error";
  console.error("Firebase initialization failed:", firebaseInitError);
}

const isFirebaseReady = Boolean(app && auth && db && storage);

export { app, auth, db, storage, isFirebaseReady, firebaseInitError };
