// script-v4.js
import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection, addDoc, query, where, onSnapshot, doc,
  deleteDoc, updateDoc, getDoc, setDoc, getDocs, orderBy
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// ----------------------
// DOM ELEMENTS
// ----------------------
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

const reflectionForm = document.getElementById('reflection-form');
const reflectionInput = document.getElementById('reflection-input');
const reflectionDisplay = document.getElementById('reflection-display');
const displayReflectionText = document.getElementById('display-reflection-text');
const editReflectionBtn = document.getElementById('edit-reflection-btn');
const reflectionLoader = document.getElementById('reflection-loader');

const goalForm = document.getElementById('goal-form');
const goalInput = document.getElementById('goal-input');
const goalWhyInput = document.getElementById('goal-why-input');
const goalList = document.getElementById('goal-list');

const prevDayBtn = document.getElementById('prev-day-btn');
const nextDayBtn = document.getElementById('next-day-btn');
const currentDateDisplay = document.getElementById('current-date-display');

const metricSelection = document.getElementById('metric-selection');
const centerednessSlider = document.getElementById('centeredness-slider');
const centerednessValue = document.getElementById('centeredness-value');
const intentionalitySlider = document.getElementById('intentionality-slider');
const intentionalityValue = document.getElementById('intentionality-value');
const connectionSlider = document.getElementById('connection-slider');
const connectionValue = document.getElementById('connection-value');
const movementSlider = document.getElementById('movement-slider');
const movementValue = document.getElementById('movement-value');

// ----------------------
// STATE
// ----------------------
let currentUser = null;
let habitsUnsubscribe = null;
let goalsUnsubscribe = null;
let statsChart = null;
let selectedDate = new Date();

// ----------------------
// HELPERS
// ----------------------
const getWeekId = (date = new Date()) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-${weekNo}`;
};

const getDayId = (date = new Date()) => {
  const d = new Date(date.getTime());
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

// ----------------------
// DATE NAVIGATION
// ----------------------
const updateDateDisplay = () => {
  const todayId = getDayId(new Date());
  const selectedId = getDayId(selectedDate);
  let displayString = selectedDate.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric'
  });
  if (selectedId === todayId) {
    displayString = `Today, ${selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`;
  }
  currentDateDisplay.textContent = displayString;
};

const changeDate = (offset) => {
  selectedDate.setDate(selectedDate.getDate() + offset);
  updateDateDisplay();
  loadDailyReflection().catch(e => console.error('Reflection load error:', e));
  loadHabits().catch?.(e => console.error('Habits load error:', e));
};

prevDayBtn.addEventListener('click', () => changeDate(-1));
nextDayBtn.addEventListener('click', () => changeDate(1));

// ----------------------
// CHART
// ----------------------
const populateStatsChart = async () => {
  if (!currentUser) return;

  const metric = metricSelection.value;
  const metricLabel = metric.charAt(0).toUpperCase() + metric.slice(1);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 6);

  const qRef = query(
    collection(db, 'users', currentUser.uid, 'reflections'),
    where('dayId', '>=', getDayId(startDate)),
    orderBy('dayId', 'asc')
  );

  const snapshot = await getDocs(qRef);
  const byDay = new Map();
  snapshot.forEach(d => {
    const data = d.data();
    if (data.pulse && data.pulse[metric] !== undefined) {
      byDay.set(data.dayId, data.pulse[metric]);
    }
  });

  const labels = [];
  const data = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dayId = getDayId(date);
    labels.push(date.toLocaleDateString(undefined, { weekday: 'short' }));
    data.push(byDay.get(dayId) ?? null);
  }

  if (statsChart) {
    statsChart.data.labels = labels;
    statsChart.data.datasets[0].data = data;
    statsChart.data.datasets[0].label = metricLabel;
    statsChart.update();
  }
};

metricSelection.addEventListener('change', () =>
  populateStatsChart().catch(e => console.error('Chart load error:', e))
);

const initializeStatsDashboard = () => {
  const ctx = document.getElementById('stats-chart').getContext('2d');
  if (statsChart) statsChart.destroy();

  const emptyStatePlugin = {
    id: 'emptyState',
    afterDraw(chart) {
      const ds = chart.data.datasets?.[0]?.data ?? [];
      const allEmpty = ds.length === 0 || ds.every(v => v == null);
      if (!allEmpty) return;
      const { ctx } = chart;
      const { top, bottom, left, right } = chart.chartArea || {};
      if (top == null) return;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Not enough data to display a trend yet.', (left + right) / 2, (top + bottom) / 2);
      ctx.restore();
    }
  };

  statsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Weekly Vibe',
        data: [],
        borderColor: '#5d9cec',
        tension: 0.4,
        pointBackgroundColor: '#5d9cec',
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 10, ticks: { display: false } },
        x: { grid: { display: false } }
      }
    },
    plugins: [emptyStatePl]()
