import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    doc,
    deleteDoc,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// Get DOM elements
const authContainer = document.getElementById('auth-container');
const trackerContainer = document.getElementById('tracker-container');
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');
const habitForm = document.getElementById('habit-form');
const habitInput = document.getElementById('habit-input');
const habitList = document.getElementById('habit-list');

let currentUser = null;
let habitsUnsubscribe = null; // To stop listening for habit changes when logged out

// --- AUTHENTICATION LOGIC ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authContainer.hidden = true;
        trackerContainer.hidden = false;
        userEmailSpan.textContent = user.email;
        loadHabits(); // Load habits for the logged-in user
    } else {
        currentUser = null;
        authContainer.hidden = false;
        trackerContainer.hidden = true;
        userEmailSpan.textContent = '';
        if (habitsUnsubscribe) habitsUnsubscribe(); // Stop listening
        habitList.innerHTML = ''; // Clear habits list
    }
});

// Handle Sign-up
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
