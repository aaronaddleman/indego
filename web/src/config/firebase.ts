import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAxnIenIBXE8fc73n6ePGf4ZFYXqxcB3e4',
  authDomain: 'indego-bc76b.firebaseapp.com',
  projectId: 'indego-bc76b',
  storageBucket: 'indego-bc76b.firebasestorage.app',
  messagingSenderId: '612601183451',
  appId: '1:612601183451:web:0c0c87ed5c664b6130a0fe',
  measurementId: 'G-YLM0YGHNC3',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
