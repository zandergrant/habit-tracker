import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection, addDoc, query, where, onSnapshot, doc,
  deleteDoc, updateDoc, getDoc, setDoc, getDocs,
  orderBy
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

// --- STATE MANAGEMENT ---
let currentUser = null;
let habitsUnsubscribe = null;
let goalsUnsubscribe = null;
let statsChart = null;
let selectedDate = new Date();

// --- Helper Functions ---
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

const changeDate = (offset) => {
  selectedDate.setDate(selectedDate.getDate() + offset);
  updateDateDisplay();
  loadDailyReflection().catch(err => console.error('Reflection load error:', err));
  loadHabits().catch?.(err => console.error('Habits load error:', err));
};

prevDayBtn.addEventListener('click', () => changeDate(-1));
nextDayBtn.addEventListener('click', () => changeDate(1));

// --- CHART LOGIC ---
const populateStatsChart = async () => {
  if (!currentUser) return;

  const metric = metricSelection.value;
  const metricLabel = metric.charAt(0).toUpperCase() + metric.slice(1);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 6);

  const qRef = query(
    collection(db, 'reflections'),
    where('uid', '==', currentUser.uid),
    where('dayId', '>=', getDayId(startDate)),
    orderBy('dayId', 'asc')
  );

  const querySnapshot = await getDocs(qRef);
  const reflectionsData = new Map();
  querySnapshot.forEach(d => {
    const data = d.data();
    if (data.pulse && data.pulse[metric] !== undefined) {
      reflectionsData.set(data.dayId, data.pulse[metric]);
    }
  });

  const labels = [];
  const data = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dayId = getDayId(date);
    labels.push(date.toLocaleDateString(undefined, { weekday: 'short' }));
    data.push(reflectionsData.get(dayId) ?? null);
  }

  if (statsChart) {
    statsChart.data.labels = labels;
    statsChart.data.datasets[0].data = data;
    statsChart.data.datasets[0].label = metricLabel;
    statsChart.update();
  }
};

metricSelection.addEventListener('change', () =>
  populateStatsChart().catch(err => console.error('Chart load error:', err))
);

const initializeStatsDashboard = () => {
  const ctx = document.getElementById('stats-chart').getContext('2d');
  if (statsChart) statsChart.destroy();

  // Custom plugin to display empty state
  const emptyStatePlugin = {
    id: 'emptyState',
    afterDraw(chart) {
      const ds = chart.data.datasets?.[0]?.data ?? [];
      const allEmpty = ds.length === 0 || ds.every(v => v === null || v === undefined);
      if (!allEmpty) return;
      const { ctx } = chart;
      const { top, bottom, left, right } = chart.chartArea || {};
      if (!top) return;
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
    plugins: [emptyStatePlugin]
  });
};

// --- AUTHENTICATION LOGIC ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authContainer.hidden = true;
    appContainer.hidden = false;
    userEmailSpan.textContent = user.email;

    selectedDate = new Date();
    updateDateDisplay();

    initializeStatsDashboard();
    populateStatsChart().catch(err => console.error('Chart load error:', err));

    loadHabits().catch?.(err => console.error('Habits load error:', err));
    loadWeeklyPlan().catch?.(err => console.error('Weekly plan load error:', err));
    loadDailyReflection().catch(err => console.error('Reflection load error:', err));
    loadGoals().catch?.(err => console.error('Goals load error:', err));
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
signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  createUserWithEmailAndPassword(
    auth,
    document.getElementById('signup-email').value,
    document.getElementById('signup-password').value
  ).then(() => signupForm.reset())
   .catch(err => alert(err.message));
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  signInWithEmailAndPassword(
    auth,
    document.getElementById('login-email').value,
    document.getElementById('login-password').value
  ).then(() => loginForm.reset())
   .catch(err => alert(err.message));
});

logoutBtn.addEventListener('click', () => signOut(auth));

// --- HABIT TRACKER LOGIC ---
const loadHabits = async () => {
  if (!currentUser) return;

  const dayId = getDayId(selectedDate);
  const logQuery = query(
    collection(db, 'habitLog'),
    where('uid', '==', currentUser.uid),
    where('date', '==', dayId)
  );
  const logSnapshot = await getDocs(logQuery);
  const completedHabitIds = new Set(logSnapshot.docs.map(d => d.data().habitId));

  const habitsQuery = query(collection(db, 'habits'), where('uid', '==', currentUser.uid));
  if (habitsUnsubscribe) habitsUnsubscribe();

  habitsUnsubscribe = onSnapshot(habitsQuery, (snapshot) => {
    habitList.innerHTML = '';
    snapshot.forEach(d => renderHabit(d, completedHabitIds));
  });
};

const renderHabit = (docSnap, completedHabitIds) => {
  const habit = docSnap.data();
  const habitId = docSnap.id;
  const isCompleted = completedHabitIds.has(habitId);

  const li = document.createElement('li');
  li.className = 'habit-item';
  li.dataset.id = habitId;
  if (isCompleted) li.classList.add('completed');

  li.innerHTML = `
    <span class="habit-text">${habit.text}</span>
    <div class="actions">
      <button class="complete-btn"><i class="fas fa-check-circle"></i></button>
      <button class="delete-btn"><i class="fas fa-trash"></i></button>
    </div>
  `;
  habitList.appendChild(li);
};

habitForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const habitText = habitInput.value.trim();
  if (habitText !== '' && currentUser) {
    await addDoc(collection(db, 'habits'), { text: habitText, uid: currentUser.uid });
    habitInput.value = '';
  }
});

habitList.addEventListener('click', async (e) => {
  if (!currentUser) return;

  const completeButton = e.target.closest('button.complete-btn');
  const deleteButton = e.target.closest('button.delete-btn');
  const li = e.target.closest('.habit-item');
  if (!li) return;

  const habitId = li.dataset.id;

  if (deleteButton) {
    await deleteDoc(doc(db, 'habits', habitId));
  } else if (completeButton) {
    const dayId = getDayId(selectedDate);
    const logDocId = `${currentUser.uid}_${habitId}_${dayId}`;
    const logDocRef = doc(db, 'habitLog', logDocId);

    if (li.classList.contains('completed')) {
      await deleteDoc(logDocRef);
    } else {
      await setDoc(logDocRef, { uid: currentUser.uid, habitId, date: dayId });
    }
    loadHabits().catch?.(err => console.error('Habits reload error:', err));
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
    (plan.priorities || []).forEach(p => {
      const li = document.createElement('li');
      li.textContent = p;
      prioritiesList.appendChild(li);
    });

    document.getElementById('week-focus').value = plan.focus || '';
    document.getElementById('priority-1').value = plan.priorities?.[0] || '';
    document.getElementById('priority-2').value = plan.priorities?.[1] || '';
    document.getElementById('priority-3').value = plan.priorities?.[2] || '';
    document.getElementById('week-vibe').value = plan.vibe || '';
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
    weekId,
    focus: document.getElementById('week-focus').value,
    priorities: [
      document.getElementById('priority-1').value,
      document.getElementById('priority-2').value,
      document.getElementById('priority-3').value
    ],
    vibe: document.getElementById('week-vibe').value
  };

  await setDoc(docRef, planData, { merge: true });
  loadWeeklyPlan().catch?.(err => console.error('Weekly plan reload error:', err));
});

editPlanBtn.addEventListener('click', () => {
  weeklyPlanForm.hidden = false;
  weeklyPlanDisplay.hidden = true;
});

// --- DAILY REFLECTION LOGIC ---
// slider bindings
const sliders = [
  { slider: centerednessSlider, value: centerednessValue, key: 'centeredness' },
  { slider: intentionalitySlider, value: intentionalityValue, key: 'intentionality' },
  { slider: connectionSlider, value: connectionValue, key: 'connection' },
  { slider: movementSlider, value: movementValue, key: 'movement' }
];

sliders.forEach(({ slider, value }) => {
  slider.addEventListener('input', () => { value.textContent = slider.value; });
});

// **Guarded** loader so UI never sticks on "Loading..."
const loadDailyReflection = async () => {
  if (!currentUser) return;

  // show loader, hide views
  reflectionLoader.hidden = false;
  reflectionForm.hidden = true;
  reflectionDisplay.hidden = true;

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayId = getDayId(yesterday);

    const docRef = doc(db, 'reflections', `${currentUser.uid}_${dayId}`);
    const docSnap = await getDoc(docRef);

    reflectionLoader.hidden = true;

    if (docSnap.exists()) {
      const reflection = docSnap.data();
      reflectionDisplay.hidden = false;

      // render pulse scores
      const pulseScoresDiv = document.getElementById('display-pulse-scores');
      pulseScoresDiv.innerHTML = '';
      if (reflection.pulse) {
        for (const [key, val] of Object.entries(reflection.pulse)) {
          const label = key.charAt(0).toUpperCase() + key.slice(1);
          const div = document.createElement('div');
          div.className = 'pulse-score';
          div.innerHTML = `
            <span class="pulse-score-label">${label}</span>
            <span class="pulse-score-value">${val}/10</span>
          `;
          pulseScoresDiv.appendChild(div);
        }
      }

      displayReflectionText.textContent = reflection.text || 'No thoughts were recorded.';
      reflectionInput.value = reflection.text || '';

      sliders.forEach(({ slider, value, key }) => {
        slider.value = reflection.pulse?.[key] ?? 5;
        value.textContent = slider.value;
      });
    } else {
      // show blank form if nothing saved yet
      reflectionForm.hidden = false;
      reflectionForm.reset();
      sliders.forEach(({ slider, value }) => { slider.value = 5; value.textContent = '5'; });
    }
  } catch (err) {
    console.error('Failed to load daily reflection:', err);
    // fall back to letting the user create yesterday's entry
    reflectionLoader.hidden = true;
    reflectionForm.hidden = false;
    reflectionForm.reset();
    sliders.forEach(({ slider, value }) => { slider.value = 5; value.textContent = '5'; });
  }
};

reflectionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dayId = getDayId(yesterday);

  const docRef = doc(db, 'reflections', `${currentUser.uid}_${dayId}`);

  const pulseData = {};
  sliders.forEach(({ slider, key }) => { pulseData[key] = parseInt(slider.value, 10); });

  await setDoc(docRef, {
    uid: currentUser.uid,
    dayId,
    text: reflectionInput.value.trim(),
    pulse: pulseData,
    weekId: getWeekId(yesterday)
  }, { merge: true });

  loadDailyReflection().catch(err => console.error('Reflection reload error:', err));
  populateStatsChart().catch(err => console.error('Chart reload error:', err));
});

editReflectionBtn.addEventListener('click', () => {
  reflectionForm.hidden = false;
  reflectionDisplay.hidden = true;
});

// --- GOAL TRACKING LOGIC ---
const loadGoals = async () => {
  if (!currentUser) return;
  const qRef = query(collection(db, 'goals'), where('uid', '==', currentUser.uid));
  if (goalsUnsubscribe) goalsUnsubscribe();
  goalsUnsubscribe = onSnapshot(qRef, (snapshot) => {
    goalList.innerHTML = '';
    snapshot.forEach(renderGoal);
  });
};

const renderGoal = (docSnap) => {
  const goal = docSnap.data();
  const li = document.createElement('li');
  li.className = 'goal-item';
  li.dataset.id = docSnap.id;
  if (goal.completed) li.classList.add('completed');

  const whyHtml = goal.why ? `<p class="goal-why">${goal.why}</p>` : '';
  li.innerHTML = `
    <div class="goal-content">
      <span class="goal-text">${goal.text}</span>
      ${whyHtml}
    </div>
    <div class="actions">
      <button class="complete-btn"><i class="fas fa-check-circle"></i></button>
      <button class="delete-btn"><i class="fas fa-trash"></i></button>
    </div>
  `;
  goalList.appendChild(li);
};

goalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const goalText = goalInput.value.trim();
  const goalWhy = goalWhyInput.value.trim();
  if (goalText !== '' && currentUser) {
    await addDoc(collection(db, 'goals'), {
      text: goalText,
      why: goalWhy,
      completed: false,
      uid: currentUser.uid
    });
    goalInput.value = '';
    goalWhyInput.value = '';
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
