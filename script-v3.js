import { auth, db } from './firebase-config.js';
import { 
    // ... firebase auth imports ...
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
    // ... firestore imports ...
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// --- Get DOM Elements ---
// ... existing element selections ...
// New Goal Tracker Elements
const goalForm = document.getElementById('goal-form');
const goalInput = document.getElementById('goal-input');
const goalList = document.getElementById('goal-list');

let currentUser = null;
let habitsUnsubscribe = null;
let goalsUnsubscribe = null; // For the new goals listener
let statsChart = null; 

// --- Helper Functions (no changes) ---

// --- CHART INITIALIZATION (no changes) ---

// --- AUTHENTICATION LOGIC ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // ... show app, hide auth ...
        userEmailSpan.textContent = user.email;
        initializeStatsDashboard();
        loadHabits();
        loadWeeklyPlan();
        loadDailyReflection();
        loadGoals(); // ADDED
    } else {
        currentUser = null;
        // ... hide app, show auth ...
        if (habitsUnsubscribe) habitsUnsubscribe();
        if (goalsUnsubscribe) goalsUnsubscribe(); // ADDED
        habitList.innerHTML = '';
        goalList.innerHTML = ''; // ADDED
    }
});

// Auth form listeners (no changes)

// --- HABIT TRACKER LOGIC (no changes) ---

// --- WEEKLY RITUAL LOGIC (no changes) ---

// --- DAILY REFLECTION LOGIC (no changes) ---


// --- NEW GOAL TRACKING LOGIC ---
const loadGoals = () => {
    if (!currentUser) return;
    const q = query(collection(db, 'goals'), where("uid", "==", currentUser.uid));
    goalsUnsubscribe = onSnapshot(q, (snapshot) => {
        goalList.innerHTML = '';
        snapshot.forEach(renderGoal);
    });
};

const renderGoal = (doc) => {
    const goal = doc.data();
    const li = document.createElement('li');
    li.className = 'goal-item';
    li.dataset.id = doc.id;
    if (goal.completed) {
        li.classList.add('completed');
    }

    li.innerHTML = `<span class="goal-text">${goal.text}</span>
                    <div class="actions">
                        <button class="complete-btn"><i class="fas fa-check-circle"></i></button>
                        <button class="delete-btn"><i class="fas fa-trash"></i></button>
                    </div>`;
    goalList.appendChild(li);
};

goalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const goalText = goalInput.value.trim();
    if (goalText !== '' && currentUser) {
        await addDoc(collection(db, 'goals'), {
            text: goalText,
            completed: false,
            uid: currentUser.uid
        });
        goalInput.value = '';
    }
});

goalList.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    const li = target.closest('.goal-item');
    const docRef = doc(db, 'goals', li.dataset.id);

    if (target.classList.contains('delete-btn')) {
        await deleteDoc(docRef);
    } else if (target.classList.contains('complete-btn')) {
        const isCompleted = !li.classList.contains('completed');
        await updateDoc(docRef, { completed: isCompleted });
    }
});
