import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

// --- Get DOM Elements ---
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');

console.log("Debug script loaded. Waiting for auth state...");

// --- AUTHENTICATION-ONLY LOGIC ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is successfully signed in
        console.log("onAuthStateChanged: User is LOGGED IN:", user.email);
        authContainer.hidden = true;
        appContainer.hidden = false;
        userEmailSpan.textContent = user.email;
    } else {
        // User is signed out
        console.log("onAuthStateChanged: User is LOGGED OUT.");
        authContainer.hidden = false;
        appContainer.hidden = true;
        userEmailSpan.textContent = '';
    }
});

// Sign-up listener
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    console.log("Attempting to sign up with:", email);
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("Sign up successful!", userCredential.user);
            signupForm.reset();
        })
        .catch(err => {
            console.error("Sign up error:", err);
            alert(`Error signing up: ${err.message}`);
        });
});

// Login listener
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    console.log("Attempting to log in with:", email);
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("Login successful!", userCredential.user);
            loginForm.reset();
        })
        .catch(err => {
            console.error("Login error:", err);
            alert(`Error logging in: ${err.message}`);
        });
});

// Logout listener
logoutBtn.addEventListener('click', () => {
    console.log("Attempting to log out...");
    signOut(auth);
});
