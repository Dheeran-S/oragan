// src/firebase/config.js
// Firebase project configuration and initialization

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCCa_WHTanjYNMV2ix-aKFOZ3EVO3_MqX8",
  authDomain: "organ-donation-network-ca8fd.firebaseapp.com",
  projectId: "organ-donation-network-ca8fd",
  storageBucket: "organ-donation-network-ca8fd.firebasestorage.app",
  messagingSenderId: "325545162996",
  appId: "1:325545162996:web:7cda990f518ffd65d4c6a1"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Auth instance
export const auth = getAuth(app);

// Firestore instance
export const db = getFirestore(app);

export default app;
