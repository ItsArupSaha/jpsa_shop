import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if the config values are present and not placeholders
if (!firebaseConfig.projectId || firebaseConfig.projectId.includes('your_project_id')) {
  // This error will be caught by Next.js and displayed in the browser during development,
  // making it clear what the problem is.
  throw new Error(
    'Firebase configuration is missing or incomplete. Please add your Firebase project credentials to the .env file. You can find these details in your Firebase project settings under "Project Overview" > "Project settings" > "General" > "Your apps" > "SDK setup and configuration".'
  );
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
