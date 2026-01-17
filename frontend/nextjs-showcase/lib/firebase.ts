import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDXTSt74RqCuxTgUxWj6Lezlea6ViWNvAs",
  authDomain: "forge-be568.firebaseapp.com",
  projectId: "forge-be568",
  storageBucket: "forge-be568.firebasestorage.app",
  messagingSenderId: "49216990688",
  appId: "1:49216990688:web:7106df8b69d8f33e37cf85",
  measurementId: "G-ZSYRHEBMK6",
};

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

