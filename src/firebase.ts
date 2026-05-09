import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB0k0KsXZ0VVgLuEOUFkxCG1nALT7DuXtI",
  authDomain: "juego-impostor-234c7.firebaseapp.com",
  databaseURL: "https://juego-impostor-234c7-default-rtdb.firebaseio.com",
  projectId: "juego-impostor-234c7",
  storageBucket: "juego-impostor-234c7.firebasestorage.app",
  messagingSenderId: "1091753750736",
  appId: "1:1091753750736:web:d1182217efdf72eec82ed5"
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

try {
  app = initializeApp(firebaseConfig);
  db = initializeFirestore(app, { experimentalForceLongPolling: true });
  
  if (db) {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
      } else if (err.code == 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence');
      }
    });
  }

  auth = getAuth(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { app, db, auth };
