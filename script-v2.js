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
// New Daily Reflection Elements
const reflectionForm = document.getElementById('reflection-form');
const reflectionInput = document.getElementById('reflection-input');
const reflectionDisplay = document.getElementById('reflection-display');
const displayReflectionText = document.getElementById('display-reflection-text');
const editReflectionBtn = document.getElementById('edit-reflection-btn');

let currentUser = null;
let habitsUnsubscribe = null;
let statsChart = null; 

// --- Helper Functions ---
const getWeekId = (date = new Date()) => { /* ... (no changes) ... */ const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())); const dayNum = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dayNum); const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7); return `${d.getUTCFullYear()}-${weekNo}`; };
// New helper to get a YYYY-MM-DD date string
const getDayId = (date = new Date()) => {
    return date.toISOString().split('T')[0];
};

// --- CHART INITIALIZATION ---
const initializeStatsDashboard = () => { /* ... (no changes) ... */ const ctx = document.getElementById('stats-chart').getContext('2d'); if (statsChart) { statsChart.destroy(); } statsChart = new Chart(ctx, { type: 'line', data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: [{ label: 'Weekly Vibe', data: [], borderColor: '#5d9cec', tension: 0.4, pointBackgroundColor: '#5d9cec', pointRadius: 5, }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: false }, legend: { display: false }, afterDraw: chart => { if (chart.data.datasets[0].data.length === 0) { let ctx = chart.ctx; ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = "16px sans-serif"; ctx.fillStyle = '#aaa'; ctx.fillText('Not enough data to display a trend yet.', chart.width / 2, chart.height / 2); ctx.restore(); } } }, scales: { y: { beginAtZero: true, max: 10, ticks: { display: false } }, x: { grid: { display: false } } } } }); };

// --- AUTHENTICATION LOGIC ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authContainer.hidden = true;
        appContainer.hidden = false;
        userEmailSpan.textContent = user.email;
        initializeStatsDashboard();
        loadHabits();
        loadWeeklyPlan();
        loadDailyReflection(); // ADDED
    } else {
        currentUser = null;
        authContainer.hidden = false;
        appContainer.hidden = true;
        userEmailSpan.textContent = '';
        if (habitsUnsubscribe) habitsUnsubscribe();
        habitList.innerHTML = '';
    }
});

// Auth form listeners (no changes)
signupForm.addEventListener('submit', (e) => { e.preventDefault(); createUserWithEmailAndPassword(auth, document.getElementById('signup-email').value, document.getElementById('signup-password').value).then(() => signupForm.reset()).catch(err => alert(err.message)); });
loginForm.addEventListener('submit', (e) => { e.preventDefault(); signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value).then(() => loginForm.reset()).catch(err => alert(err.message)); });
logoutBtn.addEventListener('click', () => signOut(auth));

// --- HABIT TRACKER LOGIC ---
const loadHabits = () => { /* ... (no changes) ... */ if (!currentUser) return; const q = query(collection(db, 'habits'), where("uid", "==", currentUser.uid)); habitsUnsubscribe = onSnapshot(q, (snapshot) => { habitList.innerHTML = ''; snapshot.forEach(renderHabit); }); };
const renderHabit = (doc) => { /* ... (no changes) ... */ const habit = doc.data(); const li = document.createElement('li'); li.className = 'habit-item'; li.dataset.id = doc.id; if (habit.completed) li.classList.add('completed'); li.innerHTML = `<span class="habit-text">${habit.text}</span><div class="actions"><button class="complete-btn"><i class="fas fa-check-circle"></i></button><button class="delete-btn"><i class="fas fa-trash"></i></button></div>`; habitList.appendChild(li); };
habitForm.addEventListener('submit', async (e) => { /* ... (no changes) ... */ e.preventDefault(); const habitText = habitInput.value.trim(); if (habitText !== '' && currentUser) { await addDoc(collection(db, 'habits'), { text: habitText, completed: false, uid: currentUser.uid }); habitInput.value = ''; } });
habitList.addEventListener('click', async (e) => { /* ... (no changes) ... */ const target = e.target.closest('button'); if (!target) return; const li = target.closest('.habit-item'); const docRef = doc(db, 'habits', li.dataset.id); if (target.classList.contains('delete-btn')) { await deleteDoc(docRef); } else if (target.classList.contains('complete-btn')) { await updateDoc(docRef, { completed: !li.classList.contains('completed') }); } });

// --- WEEKLY RITUAL LOGIC ---
const loadWeeklyPlan = async () => { /* ... (no changes) ... */ if (!currentUser) return; const weekId = getWeekId(); const docRef = doc(db, 'weeklyPlans', `${currentUser.uid}_${weekId}`); const docSnap = await getDoc(docRef); if (docSnap.exists()) { const plan = docSnap.data(); weeklyPlanForm.hidden = true; weeklyPlanDisplay.hidden = false; document.getElementById('display-focus').textContent = plan.focus; document.getElementById('display-vibe').textContent = plan.vibe; const prioritiesList = document.getElementById('display-priorities'); prioritiesList.innerHTML = ''; plan.priorities.forEach(p => { const li = document.createElement('li'); li.textContent = p; prioritiesList.appendChild(li); }); document.getElementById('week-focus').value = plan.focus; document.getElementById('priority-1').value = plan.priorities[0] || ''; document.getElementById('priority-2').value = plan.priorities[1] || ''; document.getElementById('priority-3').value = plan.priorities[2] || ''; document.getElementById('week-vibe').value = plan.vibe; } else { weeklyPlanForm.hidden = false; weeklyPlanDisplay.hidden = true; weeklyPlanForm.reset(); } };
weeklyPlanForm.addEventListener('submit', async (e) => { /* ... (no changes) ... */ e.preventDefault(); if (!currentUser) return; const weekId = getWeekId(); const docRef = doc(db, 'weeklyPlans', `${currentUser.uid}_${weekId}`); const planData = { uid: currentUser.uid, weekId: weekId, focus: document.getElementById('week-focus').value, priorities: [document.getElementById('priority-1').value, document.getElementById('priority-2').value, document.getElementById('priority-3').value,], vibe: document.getElementById('week-vibe').value, }; await setDoc(docRef, planData, { merge: true }); loadWeeklyPlan(); });
editPlanBtn.addEventListener('click', () => { /* ... (no changes) ... */ weeklyPlanForm.hidden = false; weeklyPlanDisplay.hidden = true; });

// --- NEW DAILY REFLECTION LOGIC ---
const loadDailyReflection = async () => {
    if (!currentUser) return;
    const dayId = getDayId();
    const docRef = doc(db, 'reflections', `${currentUser.uid}_${dayId}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const reflection = docSnap.data();
        reflectionForm.hidden = true;
        reflectionDisplay.hidden = false;
        displayReflectionText.textContent = reflection.text;
        reflectionInput.value = reflection.text; // Pre-fill form for editing
    } else {
        reflectionForm.hidden = false;
        reflectionDisplay.hidden = true;
        reflectionForm.reset();
    }
};

reflectionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const reflectionText = reflectionInput.value.trim();
    if (reflectionText === '') return;

    const dayId = getDayId();
    const docRef = doc(db, 'reflections', `${currentUser.uid}_${dayId}`);
    
    await setDoc(docRef, {
        uid: currentUser.uid,
        dayId: dayId,
        text: reflectionText,
        weekId: getWeekId(), // Also store the week ID for later analysis
    }, { merge: true });

    loadDailyReflection(); // Reload to show the display view
});

editReflectionBtn.addEventListener('click', () => {
    reflectionForm.hidden = false;
    reflectionDisplay.hidden = true;
});
