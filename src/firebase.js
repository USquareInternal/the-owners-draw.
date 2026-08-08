import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBVqpHzrIP1QPNEIdcsxnoLFgBXV88rPW8",
  authDomain: "lucky-spin-nexora.firebaseapp.com",
  projectId: "lucky-spin-nexora",
  storageBucket: "lucky-spin-nexora.firebasestorage.app",
  messagingSenderId: "557322127233",
  appId: "1:557322127233:web:709f4c9b19cf0eac4d8a80",
  measurementId: "G-CN1BXYDRT0",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
