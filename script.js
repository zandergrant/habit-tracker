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
    const password = document.getElementById('signup-password').value;
    createUserWithEmailAndPassword(auth, email, password)
        .then(() => signupForm.reset())
        .catch((error) => alert(`Error signing up: ${error.message}`));
});

// Handle Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, password)
        .then(() => loginForm.reset())
        .catch((error) => alert(`Error logging in: ${error.message}`));
});

// Handle Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// --- FIRESTORE HABIT LOGIC ---

// Load and display habits for the current user in real-time
const loadHabits = () => {
    if (!currentUser) return;

    const habitsCollection = collection(db, 'habits');
    const q = query(habitsCollection, where("uid", "==", currentUser.uid));
    
    // onSnapshot listens for real-time updates
    habitsUnsubscribe = onSnapshot(q, (snapshot) => {
        habitList.innerHTML = ''; // Clear the list before rendering
        snapshot.forEach((doc) => {
            renderHabit(doc);
        });
    });
};

// Create the HTML for a single habit and add it to the page
const renderHabit = (doc) => {
    const habit = doc.data();
    const li = document.createElement('li');
    li.className = 'habit-item';
    li.dataset.id = doc.id; // Store the firestore document ID
    if (habit.completed) {
        li.classList.add('completed');
    }

    const habitTextSpan = document.createElement('span');
    habitTextSpan.className = 'habit-text';
    habitTextSpan.textContent = habit.text;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions';

    const completeBtn = document.createElement('button');
    completeBtn.className = 'complete-btn';
    completeBtn.innerHTML = '<i class="fas fa-check-circle"></i>';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    
    actionsDiv.appendChild(completeBtn);
    actionsDiv.appendChild(deleteBtn);
    li.appendChild(habitTextSpan);
    li.appendChild(actionsDiv);
    habitList.appendChild(li);
};

// Add a new habit to Firestore
habitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const habitText = habitInput.value.trim();
    if (habitText !== '' && currentUser) {
        try {
            await addDoc(collection(db, 'habits'), {
                text: habitText,
                completed: false,
                uid: currentUser.uid // Link the habit to the user
            });
            habitInput.value = '';
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    }
});

// Handle clicks to complete or delete habits
habitList.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    const li = target.closest('.habit-item');
    const docId = li.dataset.id;
    const docRef = doc(db, 'habits', docId);

    if (target.classList.contains('delete-btn')) {
        await deleteDoc(docRef);
    } else if (target.classList.contains('complete-btn')) {
        const isCompleted = !li.classList.contains('completed');
        await updateDoc(docRef, {
            completed: isCompleted
        });
    }
});
