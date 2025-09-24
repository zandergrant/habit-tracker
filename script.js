import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

// Get DOM elements
const authContainer = document.getElementById('auth-container');
const trackerContainer = document.getElementById('tracker-container');
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');

// --- AUTHENTICATION LOGIC ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        authContainer.hidden = true;
        trackerContainer.hidden = false;
        userEmailSpan.textContent = user.email;
    } else {
        // User is signed out
        authContainer.hidden = false;
        trackerContainer.hidden = true;
        userEmailSpan.textContent = '';
    }
});

// Handle Sign-up
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            signupForm.reset();
        })
        .catch((error) => {
            alert(`Error signing up: ${error.message}`);
        });
});

// Handle Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            loginForm.reset();
        })
        .catch((error) => {
            alert(`Error logging in: ${error.message}`);
        });
});

// Handle Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// --- HABIT TRACKER LOGIC (To be updated later) ---
const habitForm = document.getElementById('habit-form');
const habitInput = document.getElementById('habit-input');

habitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('We will connect this to the database in the next step!');
    habitInput.value = '';
});
