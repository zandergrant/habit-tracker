import { auth } from './index.html';
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

// Listen for changes in authentication state (user logs in or out)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        console.log('User logged in:', user.email);
        authContainer.hidden = true;
        trackerContainer.hidden = false;
        userEmailSpan.textContent = user.email;
        // NOTE: We will load habits here in the next step
    } else {
        // User is signed out
        console.log('User logged out');
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
            console.log('Signed up successfully!', userCredential.user);
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
            console.log('Logged in successfully!', userCredential.user);
            loginForm.reset();
        })
        .catch((error) => {
            alert(`Error logging in: ${error.message}`);
        });
});

// Handle Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth).catch((error) => {
        console.error('Logout Error:', error);
    });
});


// --- HABIT TRACKER LOGIC (To be updated later) ---
// For now, the old logic is removed. We'll add Firebase-based logic next.
const habitForm = document.getElementById('habit-form');
const habitInput = document.getElementById('habit-input');
const habitList = document.getElementById('habit-list');

habitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('We will connect this to the database in the next step!');
    habitInput.value = '';
});
