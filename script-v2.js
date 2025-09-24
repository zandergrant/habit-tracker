import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
    collection, addDoc, query, where, onSnapshot, doc,
    deleteDoc, updateDoc, getDoc, setDoc
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// --- Get DOM Elements ---
const authContainer = document.getElementById('auth-container');
const trackerContainer = document.getElementById('tracker-container');
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');

// Habit Tracker Elements
const habitForm = document.getElementById('habit-form');
const habitInput = document.getElementById('habit-input');
const habitList = document.getElementById('habit-list');

// Weekly Ritual Elements
const weeklyPlanForm = document.getElementById('weekly-plan-form');
const weeklyPlanDisplay = document.getElementById('weekly-plan-display');
const editPlanBtn = document.getElementById('edit-plan-btn');

let currentUser = null;
let habitsUnsubscribe = null;

// --- Helper Function to get Year and Week ---
const getWeekId = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-${weekNo}`;
};


// --- AUTHENTICATION LOGIC ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authContainer.hidden = true;
        trackerContainer.hidden = false;
        userEmailSpan.textContent = user.email;
        loadHabits();
        loadWeeklyPlan();
    } else {
        currentUser = null;
        authContainer.hidden = false;
        trackerContainer.hidden = true;
        userEmailSpan.textContent = '';
        if (habitsUnsubscribe) habitsUnsubscribe();
        habitList.innerHTML = '';
    }
});

// Sign-up, Login, Logout functions
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    createUserWithEmailAndPassword(auth, document.getElementById('signup-email').value, document.getElementById('signup-password').value)
        .then(() => signupForm.reset())
        .catch(err => alert(err.message));
});
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value)
        .then(() => loginForm.reset())
        .catch(err => alert(err.message));
});
logoutBtn.addEventListener('click', () => signOut(auth));


// --- HABIT TRACKER LOGIC ---
const loadHabits = () => {
    if (!currentUser) return;
    const q = query(collection(db, 'habits'), where("uid", "==", currentUser.uid));
    habitsUnsubscribe = onSnapshot(q, (snapshot) => {
        habitList.innerHTML = '';
        snapshot.forEach(renderHabit);
    });
};
const renderHabit = (doc) => {
    const habit = doc.data();
    const li = document.createElement('li');
    li.className = 'habit-item';
    li.dataset.id = doc.id;
    if (habit.completed) li.classList.add('completed');

    li.innerHTML = `<span class="habit-text">${habit.text}</span>
                    <div class="actions">
                        <button class="complete-btn"><i class="fas fa-check-circle"></i></button>
                        <button class="delete-btn"><i class="fas fa-trash"></i></button>
                    </div>`;
    habitList.appendChild(li);
};
habitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const habitText = habitInput.value.trim();
    if (habitText !== '' && currentUser) {
        await addDoc(collection(db, 'habits'), { text: habitText, completed: false, uid: currentUser.uid });
        habitInput.value = '';
    }
});
habitList.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    const li = target.closest('.habit-item');
    const docRef = doc(db, 'habits', li.dataset.id);
    if (target.classList.contains('delete-btn')) {
        await deleteDoc(docRef);
    } else if (target.classList.contains('complete-btn')) {
        await updateDoc(docRef, { completed: !li.classList.contains('completed') });
    }
});


// --- WEEKLY RITUAL LOGIC ---
const loadWeeklyPlan = async () => {
    if (!currentUser) return;
    const weekId = getWeekId();
    const docRef = doc(db, 'weeklyPlans', `${currentUser.uid}_${weekId}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const plan = docSnap.data();
        weeklyPlanForm.hidden = true;
        weeklyPlanDisplay.hidden = false;
        document.getElementById('display-focus').textContent = plan.focus;
        document.getElementById('display-vibe').textContent = plan.vibe;
        const prioritiesList = document.getElementById('display-priorities');
        prioritiesList.innerHTML = '';
        plan.priorities.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p;
            prioritiesList.appendChild(li);
        });
        document.getElementById('week-focus').value = plan.focus;
        document.getElementById('priority-1').value = plan.priorities[0] || '';
        document.getElementById('priority-2').value = plan.priorities[1] || '';
        document.getElementById('priority-3').value = plan.priorities[2] || '';
        document.getElementById('week-vibe').value = plan.vibe;
    } else {
        weeklyPlanForm.hidden = false;
        weeklyPlanDisplay.hidden = true;
        weeklyPlanForm.reset();
    }
};

weeklyPlanForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const weekId = getWeekId();
    const docRef = doc(db, 'weeklyPlans', `${currentUser.uid}_${weekId}`);

    const planData = {
        uid: currentUser.uid,
        weekId: weekId,
        focus: document.getElementById('week-focus').value,
        priorities: [
            document.getElementById('priority-1').value,
            document.getElementById('priority-2').value,
            document.getElementById('priority-3').value,
        ],
        vibe: document.getElementById('week-vibe').value,
    };

    await setDoc(docRef, planData, { merge: true });
    loadWeeklyPlan();
});

editPlanBtn.addEventListener('click', () => {
    weeklyPlanForm.hidden = false;
    weeklyPlanDisplay.hidden = true;
});
