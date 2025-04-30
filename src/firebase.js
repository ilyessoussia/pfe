// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBjSByYYW_ZIVTjjU_mDbKW5UXgM8gNxS8",
    authDomain: "truck-34b9d.firebaseapp.com",
    projectId: "truck-34b9d",
    storageBucket: "truck-34b9d.firebasestorage.app",
    messagingSenderId: "837707477533",
    appId: "1:837707477533:web:76f18df7d4d74f932e0cf4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
