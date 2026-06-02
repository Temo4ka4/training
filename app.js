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
const HOLD_DURATION_MS = 3000;
const MOTIVATION_PHRASES = [
  'Сегодня не нужно быть идеальным. Нужно просто не пропустить.',
  'Один закрытый день сильнее десяти обещаний.',
  'Тело меняется не от планов, а от повторений.',
  'Сделай минимум, но сделай. Стрик важнее настроения.',
  'Ты не обязан хотеть тренировку. Ты обязан прийти и начать.',
  'Лень проходит. Выполненный день остаётся.',
  'Не ищи мотивацию. Создай доказательство, что ты держишь слово.',
  'Сегодняшняя тренировка — кирпич в результат августа.',
  'Не сливай день из-за настроения на пару часов.',
  'Сильные становятся сильными не в удобные дни.',
  'Три секунды удержания — и день закрыт. Всё просто.',
  'Пока другие откладывают, ты собираешь стрик.',
  'Твой прогресс не шумный. Он ежедневный.',
  'Не геройствуй. Просто сделай свою норму.',
  'Один день пропуска легко превращается в неделю. Не открывай эту дверь.',
  'Закрой день сейчас, а не когда появится желание.',
  'Челлендж выигрывают скучной дисциплиной.',
  'Сегодня ты либо укрепляешь привычку, либо кормишь отмазку.',
  'Маленькая тренировка лучше большого нуля.',
  'Твоё будущее тело смотрит на сегодняшний выбор.',
  'Если устал — сделай легче, но не пропускай.',
  'Стрик — это репутация перед самим собой.',
  'Не обсуждай тренировку. Выполни её.',
  'Каждый зелёный день делает следующий проще.',
  'Сейчас важен не рекорд. Сейчас важна непрерывность.',
  'Пропуск не отдых, если он ломает систему.',
  'Делай так, чтобы завтра было стыдно не продолжить.',
  'Сначала действие. Потом настроение подтянется.',
  'Сегодня ты платишь маленькую цену за большой результат.',
  'Усталость не отменяет цель. Она проверяет её.',
  'Не делай идеально. Делай стабильно.',
  'День без тренировки — это голос слабой версии тебя.',
  'Календарь не врёт. Закрывай день.',
  'Сила — это когда сделал, хотя мог не делать.',
  'Лето короткое. Не трать его на обещания.',
  'Твоя задача сегодня — не выпасть из ритма.',
  'Один клик ничего не значит. Удержи и докажи.',
  'Пусть тренировка будет короткой, но день должен быть зелёным.',
  'Ты строишь не форму. Ты строишь характер.',
  'Сегодняшняя дисциплина — завтрашняя уверенность.',
  'Не дай красному квадрату испортить стрик.',
  'Привычка любит повторение. Дай ей его.',
  'Ты уже начал. Самая глупая ошибка — остановиться рано.',
  'Не жди удобного времени. Это и есть время.',
  'Если можешь открыть сайт, можешь закрыть день.',
  'Результат любит тех, кто приходит ежедневно.',
  'Каждый день — голос за человека, которым ты становишься.',
  'Не проиграй день до того, как попробовал.',
  'Три месяца пройдут в любом случае. Вопрос — каким ты выйдешь.',
  'Сегодня не пропускаем. Точка.',
  'Сделай тренировку до того, как мозг придумает оправдание.',
  'Слабая версия просит паузу. Сильная закрывает день.',
  'Ты не обязан делать много. Но ноль — не вариант.',
  'Стрик держится не на мотивации, а на решении.',
  'День закрыт — голова свободна.',
  'Не оставляй тренировку на ночь. Ночь любит отмазки.',
  'Дисциплина — это когда кнопка становится ритуалом.',
  'Каждый зелёный квадрат — это маленькая победа.',
  'Твой рейтинг растёт только после действия.',
  'Не сравнивай себя. Закрывай свой день.',
  'Плохая тренировка лучше красивой причины не тренироваться.',
  'Сегодня ты доказываешь, что проект не игрушка.',
  'Сделай так, чтобы календарь уважал тебя.',
  'Не жди драйва. Драйв приходит после старта.',
  'Сохрани стрик. Остальное приложится.',
  'День нельзя вернуть. Его можно только закрыть сейчас.',
  'Меньше переговоров с ленью. Больше действий.',
  'Пусть это будет день, где ты не сдал назад.',
  'Форма строится повторениями, а не вдохновением.',
  'Ты либо тренируешь тело, либо тренируешь отмазки.',
  'Осталось меньше, чем кажется. Не теряй темп.',
  'Сегодняшний плюс один важнее идеального плана.',
  'Победа выглядит скучно: пришёл, сделал, отметил.',
  'Сделай тренировку, пока день не стал красным.',
  'Твоя цель не любит пропуски.',
  'Не сбрасывай стрик из-за одной слабой мысли.',
  'Сейчас ты не выбираешь тренировку. Ты выбираешь направление.',
  'Держи ритм. Это твой главный актив.',
  'Каждый день без пропуска делает тебя опаснее.',
  'Не надо героизма. Надо закрыть день.',
  'Сделай сегодняшнее дело и иди дальше.',
  'Чем меньше хочется, тем ценнее выполненный день.',
  'Твои 90 дней собираются по одному.',
  'Пока ты держишь стрик, челлендж жив.',
  'Тренировка — это не вопрос желания. Это пункт дня.',
  'Красный день не появляется сам. Его выбирают бездействием.',
  'Закрой день так, чтобы завтра начать с уважением к себе.',
  'Ты сильнее, когда не торгуешься с планом.',
  'Один день. Одна тренировка. Один шаг вперёд.',
  'Финиш строится сегодня.',
  'Не оставляй лето пустым. Закрывай день.'
];
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
let pendingAuthSuccess = null;
let holdTimer = null;
let holdFrame = null;
let holdStartedAt = 0;
let holdCompleted = false;
let workoutIsSubmitting = false;

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
function daysLeftAfterToday() {
  const today = new Date();
  if (today < startDate()) return TOTAL_DAYS;
  if (today > endDate()) return 0;
  return Math.max(0, TOTAL_DAYS - currentChallengeDay());
}

function dailyMotivation() {
  const index = Math.max(0, currentChallengeDay() - 1) % MOTIVATION_PHRASES.length;
  return MOTIVATION_PHRASES[index];
}


function numberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function setMessage(el, text, type = '') {
  if (!el) return;
  el.textContent = text;
  el.className = `message ${type}`.trim();
}

function showToast(text, type = 'ok') {
  const root = $('toastContainer');
  if (!root || !text) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${type === 'error' ? '!' : '✓'}</span><span>${escapeHtml(text)}</span>`;
  root.appendChild(toast);
  window.setTimeout(() => {
    toast.style.animation = 'toastOut .22s ease forwards';
    window.setTimeout(() => toast.remove(), 240);
  }, 3200);
}

function showSuccessOverlay(title, text) {
  const overlay = $('successOverlay');
  if (!overlay) return;
  $('successTitle').textContent = title;
  $('successText').textContent = text;
  overlay.classList.remove('hidden');
  runConfetti();
  window.setTimeout(() => overlay.classList.add('hidden'), 1350);
}

function runConfetti() {
  const colors = ['#58f29b', '#5fc8f8', '#ffffff', '#ffd166', '#ff5f6d'];
  for (let i = 0; i < 34; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 0.18}s`;
    piece.style.transform = `rotate(${Math.random() * 180}deg)`;
    document.body.appendChild(piece);
    window.setTimeout(() => piece.remove(), 1500);
  }
}

function celebrateWorkout() {
  const btn = $('markWorkoutBtn');
  if (btn) {
    btn.classList.remove('success-bounce');
    void btn.offsetWidth;
    btn.classList.add('success-bounce');
  }
  showSuccessOverlay('Тренировка засчитана', 'Красавчик. Один день ближе к цели.');
  showToast('Тренировка отмечена', 'ok');
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

    pendingAuthSuccess = { title: 'Аккаунт создан', text: 'Вход выполнен. Теперь не сливай стрик.' };
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
    pendingAuthSuccess = { title: 'Успешный вход', text: 'Добро пожаловать обратно. Пора работать.' };
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

function setWorkoutHoldProgress(value) {
  const btn = $('markWorkoutBtn');
  if (!btn) return;
  const safeValue = Math.max(0, Math.min(100, value));
  btn.style.setProperty('--hold-progress', safeValue.toFixed(1));
}

function resetWorkoutHold() {
  const btn = $('markWorkoutBtn');
  if (holdTimer) window.clearTimeout(holdTimer);
  if (holdFrame) window.cancelAnimationFrame(holdFrame);
  holdTimer = null;
  holdFrame = null;
  holdStartedAt = 0;
  holdCompleted = false;
  if (btn) btn.classList.remove('holding');
  if (!btn?.classList.contains('is-done')) setWorkoutHoldProgress(0);
}

function updateWorkoutHoldFrame() {
  if (!holdStartedAt) return;
  const elapsed = performance.now() - holdStartedAt;
  const progress = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
  setWorkoutHoldProgress(progress);
  if (progress < 100 && !holdCompleted) {
    holdFrame = window.requestAnimationFrame(updateWorkoutHoldFrame);
  }
}

function startWorkoutHold(event) {
  const btn = $('markWorkoutBtn');
  if (!btn || btn.disabled || workoutIsSubmitting) return;
  if (event?.type === 'pointerdown' && event.button !== undefined && event.button !== 0) return;

  event?.preventDefault?.();
  holdCompleted = false;
  holdStartedAt = performance.now();
  btn.classList.add('holding');
  setWorkoutHoldProgress(0);

  if (event?.pointerId !== undefined && btn.setPointerCapture) {
    try { btn.setPointerCapture(event.pointerId); } catch (_) {}
  }

  if (holdTimer) window.clearTimeout(holdTimer);
  if (holdFrame) window.cancelAnimationFrame(holdFrame);
  holdFrame = window.requestAnimationFrame(updateWorkoutHoldFrame);
  holdTimer = window.setTimeout(async () => {
    holdCompleted = true;
    setWorkoutHoldProgress(100);
    btn.classList.remove('holding');
    await markWorkout();
  }, HOLD_DURATION_MS);
}

function cancelWorkoutHold(event) {
  if (!holdStartedAt || holdCompleted) return;
  event?.preventDefault?.();
  resetWorkoutHold();
}

async function markWorkout() {
  if (!currentUser || workoutIsSubmitting) return;
  workoutIsSubmitting = true;
  const btn = $('markWorkoutBtn');
  if (btn) btn.disabled = true;
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
    celebrateWorkout();
  } catch (error) {
    const message = error.message || readableFirebaseError(error);
    setMessage($('homeMessage'), message, 'error');
    showToast(message, 'error');
  } finally {
    workoutIsSubmitting = false;
    resetWorkoutHold();
    renderHome();
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
    showToast('Данные профиля сохранены', 'ok');
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
    showSuccessOverlay('Итог сохранён', 'Финальные показатели записаны.');
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
  const challengeDay = currentChallengeDay();
  const left = daysLeftAfterToday();
  $('summerDayText').textContent = `День ${challengeDay} из 90`;
  $('progressCount').textContent = stats.progress;
  $('progressFill').style.width = `${Math.min(stats.percent, 100)}%`;
  $('streakText').textContent = `${stats.streak} ${plural(stats.streak, ['день', 'дня', 'дней'])}`;
  $('workoutsText').textContent = stats.workoutsCount;
  $('percentText').textContent = `${stats.percent}%`;
  if ($('daysLeftText')) $('daysLeftText').textContent = `${left} ${plural(left, ['день', 'дня', 'дней'])}`;
  if ($('dailyMotivationText')) $('dailyMotivationText').textContent = dailyMotivation();
  if ($('workoutDayLabel')) $('workoutDayLabel').textContent = `🔥 День ${challengeDay}`;

  const already = Boolean(currentProfile.calendar?.[toDateKey()]);
  const btn = $('markWorkoutBtn');
  btn.disabled = already || workoutIsSubmitting;
  btn.classList.toggle('is-done', already);

  if (already) {
    setWorkoutHoldProgress(100);
    if ($('workoutActionText')) $('workoutActionText').textContent = '✅ Выполнено сегодня';
    if ($('workoutHintText')) $('workoutHintText').textContent = 'Стрик в безопасности. Возвращайся завтра.';
    setMessage($('homeMessage'), 'Сегодня тренировка уже отмечена.', 'ok');
  } else {
    setWorkoutHoldProgress(0);
    if ($('workoutActionText')) $('workoutActionText').textContent = 'Удерживай 3 сек';
    if ($('workoutHintText')) $('workoutHintText').textContent = 'Отметить тренировку';
    if ($('homeMessage')?.textContent === 'Сегодня тренировка уже отмечена.') setMessage($('homeMessage'), '', '');
  }
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
      if (calendar[key]) {
        cell.classList.add('done');
        if (key === todayKey) cell.classList.add('just-done');
      }
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
$('markWorkoutBtn').addEventListener('pointerdown', startWorkoutHold);
$('markWorkoutBtn').addEventListener('pointerup', cancelWorkoutHold);
$('markWorkoutBtn').addEventListener('pointerleave', cancelWorkoutHold);
$('markWorkoutBtn').addEventListener('pointercancel', cancelWorkoutHold);
$('markWorkoutBtn').addEventListener('keydown', (event) => {
  if (event.key === ' ' || event.key === 'Enter') startWorkoutHold(event);
});
$('markWorkoutBtn').addEventListener('keyup', (event) => {
  if (event.key === ' ' || event.key === 'Enter') cancelWorkoutHold(event);
});
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
  if (pendingAuthSuccess) {
    showSuccessOverlay(pendingAuthSuccess.title, pendingAuthSuccess.text);
    showToast(pendingAuthSuccess.title, 'ok');
    pendingAuthSuccess = null;
  }
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
