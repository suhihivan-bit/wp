// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
// Project: consultation-booking-1c731

const firebaseConfig = {
    apiKey: "AIzaSyDbmnXheW6el-tDlvsVRQ_lr5bxEhq5Anw",
    authDomain: "consultation-booking-1c731.firebaseapp.com",
    projectId: "consultation-booking-1c731",
    storageBucket: "consultation-booking-1c731.firebasestorage.app",
    messagingSenderId: "539419884200",
    appId: "1:539419884200:web:a4f79d8aa297b976e7209d",
    measurementId: "G-5PD398QL77"
};

// Инициализация Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, query, where, orderBy, onSnapshot, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Инициализация Firebase приложения
const app = initializeApp(firebaseConfig);

// Инициализация сервисов
export const db = getFirestore(app);
export const auth = getAuth(app);

// Экспорт функций Firestore
export {
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
};

// Название коллекций
export const COLLECTIONS = {
    BOOKINGS: 'bookings',
    ADMINS: 'admins'
};

console.log('✅ Firebase initialized successfully');
