const firebaseConfig = window.firebaseConfig || {};
const isFirebaseConfigReady = firebaseConfig.apiKey && !String(firebaseConfig.apiKey).includes('PASTE_');
let app = null;
let auth = null;
let db = null;

try {
  if (!window.firebase) {
    throw new Error('Firebase SDK не загрузился. Проверь интернет, расширения браузера или блокировку gstatic.com.');
  }
  if (!isFirebaseConfigReady) {
    throw new Error('Firebase config не заполнен. Открой firebase-config.js и вставь данные из Firebase Console.');
  }
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
} catch (error) {
  console.error(error);
}

const START_MONTH = 5; // Июнь, месяцы в JS: 0-11
const START_DAY = 1;
const TOTAL_DAYS = 90;
const ACHIEVEMENTS = [
  { id: 'first_workout', title: '🏅 Первая тренировка' },
  { id: 'streak_7', title: '🏅 7 дней подряд' },
  { id: 'streak_14', title: '🏅 14 дней подряд' },
  { id: 'streak_30', title: '🏅 30 дней подряд' },
  { id: 'streak_60', title: '🏅 60 дней подряд' },
  { id: 'perfect_summer', title: '🏅 Лето без пропусков' },
  { id: 'completed_90', title: '🏅 Завершил 90 дней' },
  { id: 'mass_plus_5', title: '🏅 Набрал 5 кг массы' }
];

let currentUser = null;
let currentProfile = null;
let leaderboardCache = [];
let unsubscribeProfile = null;
let unsubscribeLeaderboard = null;

const $ = (id) => document.getElementById(id);
const authScreen = $('authScreen');
const mainApp = $('mainApp');

function challengeYear() {
  const now = new Date();
  return now.getMonth() < START_MONTH ? now.getFullYear() : now.getFullYear();
}

function startDate() {
  return new Date(challengeYear(), START_MONTH, START_DAY);
}

function endDate() {
  const date = startDate();
  date.setDate(date.getDate() + TOTAL_DAYS - 1);
  return date;
}

function toDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateRu(value) {
  if (!value) return '—';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

function daysBetween(a, b) {
  const one = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const two = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((two - one) / 86400000);
}

function currentChallengeDay() {
  const today = new Date();
  const diff = daysBetween(startDate(), today) + 1;
  return Math.min(Math.max(diff, 1), TOTAL_DAYS);
}

function completedAvailableDays() {
  const today = new Date();
  if (today < startDate()) return 0;
  return Math.min(daysBetween(startDate(), today) + 1, TOTAL_DAYS);
}

function numberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function setMessage(el, text, type = '') {
  el.textContent = text;
  el.className = `message ${type}`.trim();
}

function sanitizeUsername(username) {
  return username.trim().replace(/\s+/g, '_');
}

function calcStats(profile) {
  const calendar = profile.calendar || {};
  const available = completedAvailableDays();
  const workoutsCount = Object.values(calendar).filter(Boolean).length;
  const missedDays = Math.max(0, available - workoutsCount);
  const progress = Math.min(workoutsCount, TOTAL_DAYS);
  const percent = TOTAL_DAYS ? Math.round((progress / TOTAL_DAYS) * 100) : 0;

  const keys = Object.keys(calendar).filter((key) => calendar[key]).sort();
  const todayKey = toDateKey();
  let streak = 0;
  let cursor = new Date();

  if (!calendar[todayKey]) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (calendar[toDateKey(cursor)]) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  let bestStreak = 0;
  let running = 0;
  let prev = null;
  for (const key of keys) {
    const d = new Date(`${key}T00:00:00`);
    if (prev && daysBetween(prev, d) === 1) running += 1;
    else running = 1;
    bestStreak = Math.max(bestStreak, running);
    prev = d;
  }

  return { workoutsCount, missedDays, progress, percent, streak, bestStreak };
}

function calculateAchievements(profile) {
  const stats = calcStats(profile);
  const achievements = new Set(profile.achievements || []);
  if (stats.workoutsCount >= 1) achievements.add('first_workout');
  if (stats.streak >= 7 || stats.bestStreak >= 7) achievements.add('streak_7');
  if (stats.streak >= 14 || stats.bestStreak >= 14) achievements.add('streak_14');
  if (stats.streak >= 30 || stats.bestStreak >= 30) achievements.add('streak_30');
  if (stats.streak >= 60 || stats.bestStreak >= 60) achievements.add('streak_60');
  if (stats.workoutsCount >= 90) achievements.add('completed_90');
  if (stats.workoutsCount >= 90 && stats.missedDays === 0) achievements.add('perfect_summer');
  if (profile.currentWeight && profile.startWeight && profile.currentWeight - profile.startWeight >= 5) achievements.add('mass_plus_5');
  if (profile.finalWeight && profile.startWeight && profile.finalWeight - profile.startWeight >= 5) achievements.add('mass_plus_5');
  return [...achievements];
}

function userDoc(uid = currentUser?.uid) {
  return db.collection('users').doc(uid);
}

function usernameDoc(username) {
  return db.collection('usernames').doc(username.toLowerCase());
}

async function registerUser(event) {
  event.preventDefault();
  if (!auth || !db) { setMessage($('authMessage'), 'Firebase не подключён. Проверь firebase-config.js.', 'error'); return; }
  const username = sanitizeUsername($('registerUsername').value);
  const email = $('registerEmail').value.trim();
  const password = $('registerPassword').value;
  const height = numberOrNull($('registerHeight').value);
  const startWeight = numberOrNull($('registerWeight').value);
  const goal = $('registerGoal').value.trim();

  if (!/^[a-zA-Z0-9_а-яА-ЯёЁ-]{3,20}$/.test(username)) {
    setMessage($('authMessage'), 'Логин: 3-20 символов, без пробелов.', 'error');
    return;
  }

  try {
    setMessage($('authMessage'), 'Создаю аккаунт...', '');
    const usernameRef = usernameDoc(username);
    const usernameSnap = await usernameRef.get();
    if (usernameSnap.exists) throw new Error('Этот логин уже занят.');

    const credential = await auth.createUserWithEmailAndPassword(email, password);
    const uid = credential.user.uid;
    const profile = {
      uid,
      username,
      email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      height,
      startHeight: height,
      startWeight,
      currentWeight: startWeight,
      finalWeight: null,
      finalHeight: null,
      goal,
      workoutsCount: 0,
      streak: 0,
      bestStreak: 0,
      missedDays: 0,
      progress: 0,
      lastWorkoutDate: null,
      achievements: [],
      calendar: {}
    };

    await userDoc(uid).set(profile);
    await usernameRef.set({ uid, username, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    setMessage($('authMessage'), 'Аккаунт создан. Вход выполнен.', 'ok');
  } catch (error) {
    setMessage($('authMessage'), readableFirebaseError(error), 'error');
  }
}

async function loginUser(event) {
  event.preventDefault();
  if (!auth) { setMessage($('authMessage'), 'Firebase не подключён. Проверь firebase-config.js.', 'error'); return; }
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  try {
    setMessage($('authMessage'), 'Вхожу...', '');
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    setMessage($('authMessage'), readableFirebaseError(error), 'error');
  }
}

async function ensureProfile(user) {
  const snap = await userDoc(user.uid).get();
  if (snap.exists) return;

  const fallbackUsername = user.email?.split('@')[0] || `user_${user.uid.slice(0, 6)}`;
  await userDoc(user.uid).set({
    uid: user.uid,
    username: fallbackUsername,
    email: user.email || '',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    height: null,
    startHeight: null,
    startWeight: null,
    currentWeight: null,
    finalWeight: null,
    finalHeight: null,
    goal: '',
    workoutsCount: 0,
    streak: 0,
    bestStreak: 0,
    missedDays: 0,
    progress: 0,
    lastWorkoutDate: null,
    achievements: [],
    calendar: {}
  });
}

function subscribeProfile() {
  if (unsubscribeProfile) unsubscribeProfile();
  unsubscribeProfile = userDoc().onSnapshot(async (snap) => {
    if (!snap.exists) return;
    currentProfile = { id: snap.id, ...snap.data() };
    renderAll();

    const stats = calcStats(currentProfile);
    const achievements = calculateAchievements(currentProfile);
    const needsSync = stats.workoutsCount !== currentProfile.workoutsCount ||
      stats.streak !== currentProfile.streak ||
      stats.bestStreak !== currentProfile.bestStreak ||
      stats.missedDays !== currentProfile.missedDays ||
      stats.progress !== currentProfile.progress ||
      achievements.join('|') !== (currentProfile.achievements || []).join('|');

    if (needsSync) {
      await userDoc().update({ ...stats, achievements });
    }
  });
}

function subscribeLeaderboard() {
  if (unsubscribeLeaderboard) unsubscribeLeaderboard();
  const q = db.collection('users').orderBy('workoutsCount', 'desc').limit(50);
  unsubscribeLeaderboard = q.onSnapshot((snapshot) => {
    leaderboardCache = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderLeaderboard();
    renderProfileStats();
  });
}

async function markWorkout() {
  if (!currentUser) return;
  const today = new Date();
  const start = startDate();
  const end = endDate();

  if (today < start) {
    setMessage($('homeMessage'), 'Челлендж стартует 1 июня.', 'error');
    return;
  }
  if (today > new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59)) {
    setMessage($('homeMessage'), 'Челлендж уже завершён. Можно заполнить итоги в профиле.', 'error');
    return;
  }

  const todayKey = toDateKey(today);
  try {
    await db.runTransaction(async (transaction) => {
      const ref = userDoc();
      const snap = await transaction.get(ref);
      if (!snap.exists) throw new Error('Профиль не найден.');
      const data = snap.data();
      const calendar = data.calendar || {};
      if (calendar[todayKey]) throw new Error('Сегодня тренировка уже отмечена.');

      const updated = {
        ...data,
        calendar: { ...calendar, [todayKey]: true },
        lastWorkoutDate: todayKey
      };
      const stats = calcStats(updated);
      const achievements = calculateAchievements({ ...updated, ...stats });
      transaction.update(ref, { calendar: updated.calendar, lastWorkoutDate: todayKey, ...stats, achievements });
    });
    setMessage($('homeMessage'), 'Тренировка отмечена. Не сбавляй темп.', 'ok');
  } catch (error) {
    setMessage($('homeMessage'), error.message || readableFirebaseError(error), 'error');
  }
}

async function saveProfile(event) {
  event.preventDefault();
  const currentWeight = numberOrNull($('currentWeightInput').value);
  const height = numberOrNull($('currentHeightInput').value);
  const goal = $('goalInput').value.trim();
  try {
    const temp = { ...currentProfile, currentWeight, height, goal };
    const achievements = calculateAchievements(temp);
    await userDoc().update({ currentWeight, height, goal, achievements });
    setMessage($('profileMessage'), 'Данные сохранены.', 'ok');
  } catch (error) {
    setMessage($('profileMessage'), readableFirebaseError(error), 'error');
  }
}

async function saveFinal(event) {
  event.preventDefault();
  const finalWeight = numberOrNull($('finalWeightInput').value);
  const finalHeight = numberOrNull($('finalHeightInput').value);
  try {
    const temp = { ...currentProfile, finalWeight, finalHeight };
    const achievements = calculateAchievements(temp);
    await userDoc().update({ finalWeight, finalHeight, achievements });
  } catch (error) {
    setMessage($('profileMessage'), readableFirebaseError(error), 'error');
  }
}

function renderAll() {
  if (!currentProfile) return;
  renderHome();
  renderCalendar();
  renderProfile();
  renderAchievements();
  renderLeaderboard();
}

function renderHome() {
  const stats = calcStats(currentProfile);
  $('summerDayText').textContent = `День ${currentChallengeDay()} из 90`;
  $('progressCount').textContent = stats.progress;
  $('progressFill').style.width = `${Math.min(stats.percent, 100)}%`;
  $('streakText').textContent = `${stats.streak} ${plural(stats.streak, ['день', 'дня', 'дней'])}`;
  $('workoutsText').textContent = stats.workoutsCount;
  $('percentText').textContent = `${stats.percent}%`;

  const already = Boolean(currentProfile.calendar?.[toDateKey()]);
  $('markWorkoutBtn').disabled = already;
  if (already) setMessage($('homeMessage'), 'Сегодня тренировка уже отмечена.', 'ok');
}

function renderCalendar() {
  const root = $('calendarGrid');
  root.innerHTML = '';
  const months = [
    { month: 5, title: 'Июнь' },
    { month: 6, title: 'Июль' },
    { month: 7, title: 'Август' }
  ];
  const todayKey = toDateKey();
  const calendar = currentProfile.calendar || {};

  for (const item of months) {
    const daysInMonth = item.month === 7 ? 29 : new Date(challengeYear(), item.month + 1, 0).getDate();
    const card = document.createElement('div');
    card.className = 'month-card';
    card.innerHTML = `<div class="month-title"><span>${item.title}</span><span>${daysInMonth} дней</span></div>`;
    const grid = document.createElement('div');
    grid.className = 'days-grid';

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(challengeYear(), item.month, day);
      const key = toDateKey(date);
      const cell = document.createElement('div');
      cell.className = 'day-cell';
      cell.textContent = day;
      if (calendar[key]) cell.classList.add('done');
      else if (key > todayKey) cell.classList.add('future');
      else cell.classList.add('missed');
      grid.appendChild(cell);
    }
    card.appendChild(grid);
    root.appendChild(card);
  }
}

function renderLeaderboard() {
  const root = $('leaderboardList');
  if (!root) return;
  root.innerHTML = '';
  if (!leaderboardCache.length) {
    root.innerHTML = '<p class="message">Пока нет участников.</p>';
    return;
  }
  leaderboardCache.forEach((user, index) => {
    const row = document.createElement('div');
    row.className = 'leader-row';
    row.innerHTML = `
      <div class="leader-rank">${index + 1}</div>
      <div>
        <div class="leader-name">${escapeHtml(user.username || 'Без имени')}</div>
        <div class="leader-meta">Стрик: ${user.streak || 0} · Лучший: ${user.bestStreak || 0}</div>
      </div>
      <div class="leader-count">${user.workoutsCount || 0} ${plural(user.workoutsCount || 0, ['тренировка', 'тренировки', 'тренировок'])}</div>
    `;
    root.appendChild(row);
  });
}

function renderProfile() {
  const p = currentProfile;
  const username = p.username || 'User';
  $('profileAvatar').textContent = username[0]?.toUpperCase() || 'U';
  $('profileUsername').textContent = username;
  $('profileCreated').textContent = `Дата регистрации: ${formatDateRu(p.createdAt)}`;
  $('startHeightInfo').textContent = p.startHeight ? `${p.startHeight} см` : '—';
  $('heightInfo').textContent = p.height ? `${p.height} см` : '—';
  $('startWeightInfo').textContent = p.startWeight ? `${p.startWeight} кг` : '—';
  $('currentWeightInfo').textContent = p.currentWeight ? `${p.currentWeight} кг` : '—';
  $('finalWeightInfo').textContent = p.finalWeight ? `${p.finalWeight} кг` : '—';
  $('finalHeightInfo').textContent = p.finalHeight ? `${p.finalHeight} см` : '—';
  $('goalInfo').textContent = p.goal || '—';
  $('lastWorkoutInfo').textContent = p.lastWorkoutDate || '—';
  $('currentWeightInput').value = p.currentWeight ?? '';
  $('currentHeightInput').value = p.height ?? '';
  $('goalInput').value = p.goal ?? '';
  $('finalWeightInput').value = p.finalWeight ?? '';
  $('finalHeightInput').value = p.finalHeight ?? '';
  renderProfileStats();
  renderResults();
}

function renderProfileStats() {
  if (!currentProfile) return;
  const stats = calcStats(currentProfile);
  $('bestStreakInfo').textContent = stats.bestStreak;
  $('missedDaysInfo').textContent = stats.missedDays;
  $('profilePercentInfo').textContent = `${stats.percent}%`;
  const rank = leaderboardCache.findIndex((u) => u.id === currentUser?.uid);
  $('rankInfo').textContent = rank >= 0 ? `#${rank + 1}` : '—';
}

function renderResults() {
  const root = $('resultsBox');
  const p = currentProfile;
  root.innerHTML = '';
  if (p.startWeight && p.finalWeight) {
    const diff = Number((p.finalWeight - p.startWeight).toFixed(1));
    root.innerHTML += `<div class="result-line">Вес: ${p.startWeight} кг → ${p.finalWeight} кг · ${diff >= 0 ? '+' : ''}${diff} кг</div>`;
  }
  if (p.startHeight && p.finalHeight) {
    const diff = Number((p.finalHeight - p.startHeight).toFixed(1));
    root.innerHTML += `<div class="result-line">Рост: ${p.startHeight} см → ${p.finalHeight} см · ${diff >= 0 ? '+' : ''}${diff} см</div>`;
  }
  if (!root.innerHTML) root.innerHTML = '<p class="message">Итоги пока не заполнены.</p>';
}

function renderAchievements() {
  const root = $('achievementsList');
  const unlocked = new Set(currentProfile.achievements || []);
  root.innerHTML = '';
  ACHIEVEMENTS.forEach((a) => {
    const item = document.createElement('div');
    item.className = `achievement ${unlocked.has(a.id) ? 'unlocked' : ''}`;
    item.textContent = a.title;
    root.appendChild(item);
  });
}

function setupTabs() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-page').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      $(`tab${tab}`).classList.add('active');
    });
  });

  document.querySelectorAll('.auth-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      const mode = tabBtn.dataset.authTab;
      document.querySelectorAll('.auth-tab').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach((f) => f.classList.remove('active'));
      tabBtn.classList.add('active');
      $(mode === 'login' ? 'loginForm' : 'registerForm').classList.add('active');
      setMessage($('authMessage'), '', '');
    });
  });
}

function plural(num, forms) {
  const n = Math.abs(num) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function readableFirebaseError(error) {
  const code = error?.code || '';
  const map = {
    'auth/email-already-in-use': 'Эта почта уже используется.',
    'auth/invalid-email': 'Неверная почта.',
    'auth/invalid-credential': 'Неверная почта или пароль.',
    'auth/weak-password': 'Пароль слишком слабый. Минимум 6 символов.',
    'auth/network-request-failed': 'Ошибка сети. Проверь интернет.',
    'permission-denied': 'Нет доступа. Проверь Firestore Rules.'
  };
  return map[code] || error?.message || 'Произошла ошибка.';
}

$('registerForm').addEventListener('submit', registerUser);
$('loginForm').addEventListener('submit', loginUser);
$('logoutBtn').addEventListener('click', () => auth && auth.signOut());
$('markWorkoutBtn').addEventListener('click', markWorkout);
$('profileForm').addEventListener('submit', saveProfile);
$('finalForm').addEventListener('submit', saveFinal);
setupTabs();

if (auth) {
auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  if (!user) {
    currentProfile = null;
    if (unsubscribeProfile) unsubscribeProfile();
    if (unsubscribeLeaderboard) unsubscribeLeaderboard();
    authScreen.classList.remove('hidden');
    mainApp.classList.add('hidden');
    return;
  }
  await ensureProfile(user);
  authScreen.classList.add('hidden');
  mainApp.classList.remove('hidden');
  subscribeProfile();
  subscribeLeaderboard();
});
} else {
  window.addEventListener('DOMContentLoaded', () => {
    const msg = document.getElementById('authMessage');
    if (msg) {
      msg.textContent = 'Firebase не подключён. Проверь firebase-config.js и доступ к gstatic.com.';
      msg.className = 'message error';
    }
  });
}
