import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
    collection, addDoc, query, where, onSnapshot, doc,
    deleteDoc, updateDoc, getDoc, setDoc, getDocs
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// --- Get DOM Elements ---
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');
const habitForm = document.getElementById('habit-form');
const habitInput = document.getElementById('habit-input');
const habitList = document.getElementById('habit-list');
const weeklyPlanForm = document.getElementById('weekly-plan-form');
const weeklyPlanDisplay = document.getElementById('weekly-plan-display');
const editPlanBtn = document.getElementById('edit-plan-btn');
const goalForm = document.getElementById('goal-form');
const goalInput = document.getElementById('goal-input');
const goalWhyInput = document.getElementById('goal-why-input');
const goalList = document.getElementById('goal-list');
const prevDayBtn = document.getElementById('prev-day-btn');
const nextDayBtn = document.getElementById('next-day-btn');
const currentDateDisplay = document.getElementById('current-date-display');

// --- STATE MANAGEMENT ---
let currentUser = null;
let habitsUnsubscribe = null;
let goalsUnsubscribe = null;
let selectedDate = new Date();

// --- Helper Functions ---
const getWeekId = (date = new Date()) => { const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())); const dayNum = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dayNum); const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7); return `${d.getUTCFullYear()}-${weekNo}`; };
const getDayId = (date = new Date()) => { const d = new Date(date.getTime()); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().split('T')[0]; };

// --- DATE NAVIGATION ---
const updateDateDisplay = () => {
    const todayId = getDayId(new Date());
    const selectedId = getDayId(selectedDate);
    let displayString = selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    if (selectedId === todayId) {
        displayString = `Today, ${selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`;
    }
    currentDateDisplay.textContent = displayString;
};
const changeDate = (offset) => { selectedDate.setDate(selectedDate.getDate() + offset); updateDateDisplay(); loadHabits(); };
prevDayBtn.addEventListener('click', () => changeDate(-1));
nextDayBtn.addEventListener('click', () => changeDate(1));

// --- AUTHENTICATION LOGIC ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authContainer.hidden = true;
        appContainer.hidden = false;
        userEmailSpan.textContent = user.email;
        selectedDate = new Date();
        updateDateDisplay();
        loadHabits();
        loadWeeklyPlan();
        loadGoals();
    } else {
        currentUser = null;
        authContainer.hidden = false;
        appContainer.hidden = true;
        userEmailSpan.textContent = '';
        if (habitsUnsubscribe) habitsUnsubscribe();
        if (goalsUnsubscribe) goalsUnsubscribe();
        habitList.innerHTML = '';
        goalList.innerHTML = '';
    }
});

// Auth form listeners
signupForm.addEventListener('submit', (e) => { e.preventDefault(); createUserWithEmailAndPassword(auth, document.getElementById('signup-email').value, document.getElementById('signup-password').value).then(() => signupForm.reset()).catch(err => alert(err.message)); });
loginForm.addEventListener('submit', (e) => { e.preventDefault(); signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value).then(() => loginForm.reset()).catch(err => alert(err.message)); });
logoutBtn.addEventListener('click', () => signOut(auth));

// --- HABIT TRACKER LOGIC ---
const loadHabits = async () => { if (!currentUser) return; const dayId = getDayId(selectedDate); const logQuery = query(collection(db, 'habitLog'), where("uid", "==", currentUser.uid), where("date", "==", dayId)); const logSnapshot = await getDocs(logQuery); const completedHabitIds = new Set(logSnapshot.docs.map(doc => doc.data().habitId)); const habitsQuery = query(collection(db, 'habits'), where("uid", "==", currentUser.uid)); if (habitsUnsubscribe) habitsUnsubscribe(); habitsUnsubscribe = onSnapshot(habitsQuery, (snapshot) => { habitList.innerHTML = ''; snapshot.forEach(doc => { renderHabit(doc, completedHabitIds); }); }); };
const renderHabit = (doc, completedHabitIds) => { const habit = doc.data(); const habitId = doc.id; const isCompleted = completedHabitIds.has(habitId); const li = document.createElement('li'); li.className = 'habit-item'; li.dataset.id = habitId; if (isCompleted) { li.classList.add('completed'); } li.innerHTML = `<span class="habit-text">${habit.text}</span><div class="actions"><button class="complete-btn"><i class="fas fa-check-circle"></i></button><button class="delete-btn"><i class="fas fa-trash"></i></button></div>`; habitList.appendChild(li); };
habitForm.addEventListener('submit', async (e) => { e.preventDefault(); const habitText = habitInput.value.trim(); if (habitText !== '' && currentUser) { await addDoc(collection(db, 'habits'), { text: habitText, uid: currentUser.uid }); habitInput.value = ''; } });
habitList.addEventListener('click', async (e) => { if (!currentUser) return; const completeButton = e.target.closest('button.complete-btn'); const deleteButton = e.target.closest('button.delete-btn'); const li = e.target.closest('.habit-item'); if (!li) return; const habitId = li.dataset.id; if (deleteButton) { await deleteDoc(doc(db, 'habits', habitId)); } else if (completeButton) { const dayId = getDayId(selectedDate); const logDocId = `${currentUser.uid}_${habitId}_${dayId}`; const logDocRef = doc(db, 'habitLog', logDocId); if (li.classList.contains('completed')) { await deleteDoc(logDocRef); } else { await setDoc(logDocRef, { uid: currentUser.uid, habitId: habitId, date: dayId }); } loadHabits(); } });

// --- WEEKLY RITUAL LOGIC ---
const loadWeeklyPlan = async () => { if (!currentUser) return; const weekId = getWeekId(); const docRef = doc(db, 'weeklyPlans', `${currentUser.uid}_${weekId}`); const docSnap = await getDoc(docRef); if (docSnap.exists()) { const plan = docSnap.data(); weeklyPlanForm.hidden = true; weeklyPlanDisplay.hidden = false; document.getElementById('display-focus').textContent = plan.focus; document.getElementById('display-vibe').textContent = plan.vibe; const prioritiesList = document.getElementById('display-priorities'); prioritiesList.innerHTML = ''; plan.priorities.forEach(p => { const li = document.createElement('li'); li.textContent = p; prioritiesList.appendChild(li); }); document.getElementById('week-focus').value = plan.focus; document.getElementById('priority-1').value = plan.priorities[0] || ''; document.getElementById('priority-2').value = plan.priorities[1] || ''; document.getElementById('priority-3').value = plan.priorities[2] || ''; document.getElementById('week-vibe').value = plan.vibe; } else { weeklyPlanForm.hidden = false; weeklyPlanDisplay.hidden = true; weeklyPlanForm.reset(); } };
weeklyPlanForm.addEventListener('submit', async (e) => { e.preventDefault(); if (!currentUser) return; const weekId = getWeekId(); const docRef = doc(db, 'weeklyPlans', `${currentUser.uid}_${weekId}`); const planData = { uid: currentUser.uid, weekId: weekId, focus: document.getElementById('week-focus').value, priorities: [document.getElementById('priority-1').value, document.getElementById('priority-2').value, document.getElementById('priority-3').value,], vibe: document.getElementById('week-vibe').value, }; await setDoc(docRef, planData, { merge: true }); loadWeeklyPlan(); });
editPlanBtn.addEventListener('click', () => { weeklyPlanForm.hidden = false; weeklyPlanDisplay.hidden = true; });

// --- GOAL TRACKING LOGIC ---
const loadGoals = () => { if (!currentUser) return; const q = query(collection(db, 'goals'), where("uid", "==", currentUser.uid)); goalsUnsubscribe = onSnapshot(q, (snapshot) => { goalList.innerHTML = ''; snapshot.forEach(renderGoal); }); };
const renderGoal = (doc) => { const goal = doc.data(); const li = document.createElement('li'); li.className = 'goal-item'; li.dataset.id = doc.id; if (goal.completed) { li.classList.add('completed'); } let whyHtml = ''; if (goal.why) { whyHtml = `<p class="goal-why">${goal.why}</p>`; } li.innerHTML = `<div class="goal-content"><span class="goal-text">${goal.text}</span>${whyHtml}</div><div class="actions"><button class="complete-btn"><i class="fas fa-check-circle"></i></button><button class="delete-btn"><i class="fas fa-trash"></i></button></div>`; goalList.appendChild(li); };
goalForm.addEventListener('submit', async (e) => { e.preventDefault(); const goalText = goalInput.value.trim(); const goalWhy = goalWhyInput.value.trim(); if (goalText !== '' && currentUser) { await addDoc(collection(db, 'goals'), { text: goalText, why: goalWhy, completed: false, uid: currentUser.uid }); goalInput.value = ''; goalWhyInput.value = ''; } });
goalList.addEventListener('click', async (e) => { const target = e.target.closest('button'); if (!target) return; const li = target.closest('.goal-item'); const docRef = doc(db, 'goals', li.dataset.id); if (target.classList.contains('delete-btn')) { await deleteDoc(docRef); } else if (target.classList.contains('complete-btn')) { const isCompleted = !li.classList.contains('completed'); await updateDoc(docRef, { completed: isCompleted }); } });
