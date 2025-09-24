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
let statsChart = null; // Variable to hold our chart instance

// --- Helper Function to get Year and Week ---
const getWeekId = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-${weekNo}`;
};

// --- CHART INITIALIZATION ---
const initializeStatsDashboard = () => {
    const ctx = document.getElementById('stats-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (statsChart) {
        statsChart.destroy();
    }

    statsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Weekly Vibe',
                data: [], // No data yet
                borderColor: '#5d9cec',
                tension: 0.4, // This makes the line wavy
                pointBackgroundColor: '#5d9cec',
                pointRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: false },
                legend: { display: false },
                // Custom plugin to show text if no data
                afterDraw: chart => {
                    if (chart.data.datasets[0].data.length === 0) {
                        let ctx = chart.ctx;
                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = "16px sans-serif";
                        ctx.fillStyle = '#aaa';
                        ctx.fillText('Not enough data to display a trend yet.', chart.width / 2, chart.height / 2);
                        ctx.restore();
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    ticks: { display: false }
                },
                 x: {
                    grid: { display: false }
                }
            }
        }
    });
};


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
    } else {
        currentUser = null;
        authContainer.hidden = false;
        appContainer.hidden = true;
        userEmailSpan.textContent = '';
        if (habitsUnsubscribe) habitsUnsubscribe();
        habitList.innerHTML = '';
    }
});

// Sign-up, Login, Logout functions
signupForm.addEventListener('submit', (e) => { e.preventDefault(); createUserWithEmailAndPassword(auth, document.getElementById('signup-email').value, document.getElementById('signup-password').value).then(() => signupForm.reset()).catch(err => alert(err.message)); });
loginForm.addEventListener('submit', (e) => { e.preventDefault(); signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value).then(() => loginForm.reset()).catch(err => alert(err.message)); });
logoutBtn.addEventListener('click', () => signOut(auth));


// --- HABIT TRACKER LOGIC ---
const loadHabits=()=>{if(!currentUser)return;const t=query(collection(db,"habits"),where("uid","==",currentUser.uid));habitsUnsubscribe=onSnapshot(t,t=>{habitList.innerHTML="",t.forEach(renderHabit)})};const renderHabit=t=>{const e=t.data(),i=document.createElement("li");i.className="habit-item",i.dataset.id=t.id,e.completed&&i.classList.add("completed"),i.innerHTML=`<span class="habit-text">${e.text}</span>\n                    <div class="actions">\n                        <button class="complete-btn"><i class="fas fa-check-circle"></i></button>\n                        <button class="delete-btn"><i class="fas fa-trash"></i></button>\n                    </div>`,habitList.appendChild(i)};habitForm.addEventListener("submit",async t=>{t.preventDefault();const e=habitInput.value.trim();""!==e&&currentUser&&(await addDoc(collection(db,"habits"),{text:e,completed:!1,uid:currentUser.uid}),habitInput.value="")});habitList.addEventListener("click",async t=>{const e=t.target.closest("button");if(!e)return;const i=e.closest(".habit-item"),n=doc(db,"habits",i.dataset.id);e.classList.contains("delete-btn")?await deleteDoc(n):e.classList.contains("complete-btn")&&await updateDoc(n,{completed:!i.classList.contains("completed")})});


// --- WEEKLY RITUAL LOGIC ---
const loadWeeklyPlan=async()=>{if(!currentUser)return;const t=getWeekId(),e=doc(db,"weeklyPlans",`${currentUser.uid}_${t}`),i=await getDoc(e);if(i.exists()){const t=i.data();weeklyPlanForm.hidden=!0,weeklyPlanDisplay.hidden=!1,document.getElementById("display-focus").textContent=t.focus,document.getElementById("display-vibe").textContent=t.vibe;const e=document.getElementById("display-priorities");e.innerHTML="",t.priorities.forEach(t=>{const i=document.createElement("li");i.textContent=t,e.appendChild(i)}),document.getElementById("week-focus").value=t.focus,document.getElementById("priority-1").value=t.priorities[0]||"",document.getElementById("priority-2").value=t.priorities[1]||"",document.getElementById("priority-3").value=t.priorities[2]||"",document.getElementById("week-vibe").value=t.vibe}else weeklyPlanForm.hidden=!1,weeklyPlanDisplay.hidden=!0,weeklyPlanForm.reset()};weeklyPlanForm.addEventListener("submit",async t=>{t.preventDefault();if(!currentUser)return;const e=getWeekId(),i=doc(db,"weeklyPlans",`${currentUser.uid}_${e}`),n={uid:currentUser.uid,weekId:e,focus:document.getElementById("week-focus").value,priorities:[document.getElementById("priority-1").value,document.getElementById("priority-2").value,document.getElementById("priority-3").value],vibe:document.getElementById("week-vibe").value};await setDoc(i,n,{merge:!0}),loadWeeklyPlan()});editPlanBtn.addEventListener("click",()=>{weeklyPlanForm.hidden=!1,weeklyPlanDisplay.hidden=!0});
