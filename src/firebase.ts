import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Default config from environment variables (Vercel/Production)
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID
};

// Helper to get config
async function getFirebaseConfig() {
  if (envConfig.apiKey) return envConfig;
  
  try {
    // @ts-ignore
    const localConfig = await import('../firebase-applet-config.json');
    return localConfig.default;
  } catch (e) {
    console.warn("Firebase config not found in environment or local file.");
    return envConfig;
  }
}

const finalConfig = await getFirebaseConfig();
const app = initializeApp(finalConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, finalConfig.firestoreDatabaseId || '(default)');
export const googleProvider = new GoogleAuthProvider();

export const signIn = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);
