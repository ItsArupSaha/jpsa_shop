
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app;
let db;
let auth;

// Check if the config values are present and not placeholders
if (!firebaseConfig.projectId || firebaseConfig.projectId.includes('your-project-id')) {
  console.warn(`
    **********************************************************************************
    * FIREBASE CONFIGURATION IS MISSING OR INCOMPLETE!                               *
    *                                                                                *
    * Please add your Firebase project credentials to the .env file.                 *
    * You can find these details in your Firebase project settings:                  *
    * Project Overview > Project settings > General > Your apps > SDK setup          *
    *                                                                                *
    * The application will not be able to connect to Firestore until this is done.   *
    **********************************************************************************
  `);
} else {
    // Initialize Firebase
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
}

export { app, db, auth };
