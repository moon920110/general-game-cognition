import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore/lite";

const firebaseConfig = {
    apiKey: "AIzaSyCTiyDYzP32hjqSTB7CnHBa1fUqu8-smEA",
    authDomain: "general-game-cognition.firebaseapp.com",
    projectId: "general-game-cognition",
    storageBucket: "general-game-cognition.firebasestorage.app",
    messagingSenderId: "289738551892",
    appId: "1:289738551892:web:1c6e03ae1c5d110a8533c1",
    measurementId: "G-V6FS0QTFSG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };