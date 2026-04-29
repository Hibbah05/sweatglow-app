const API_BASE = '/api';
const circumference = 2 * Math.PI * 88;
let exercises = [];
let selected = null;
let totalSeconds = 90;
let remaining = 90;
let running = false;
let timerInterval = null;
let motiveInterval = null;
let motiveIndex = 0;

// --- CHIPMUNK & MOTIVATION SETUP ---
let speechInterval = null;
let beatInterval = null;

const unhingedPhrases = [
  "OH MY GOD, SLAY GIRL!!! You are LITERALLY the main character right now!! DON'T YOU DARE STOP!!",
  "GET UP ",
  "You’re eating that workout UP!! ",
  "YOU ARE DOING AMAZING",
  "ONE MORE SET!! AND YOU ARE BASICALLY A FITNESS MODEL!!",
  "YASSSS QUEEN!! LOOK AT THAT FORM!!  KEEP GOING!",
  "GIRL, STOP!! YOU ARE KILLING IT!! DON'T YOU STOP UNTIL YOU SLAY THE WHOLE DAY!!"
];

const motivations = [
  "you're literally glowing rn ✨",
  "okay bestie, we're doing this! 💜",
  "no pain no gain but make it cute 🌸",
  "YOU are the main character 👑",
  "she's built different fr fr 💪",
  "slay the workout, slay the day ✨",
  "girlboss era activated 🚀",
  "your future self is obsessed with you 💅",
  "it's giving athlete, it's giving queen 🏆",
  "channeling your inner baddie rn 🔥",
  "the grind is cute when YOU do it 💖",
  "stay focused bestie, almost there! 🌟",
];

const alarmMsgs = [
  { emoji:'🌸', title:'WORKOUT COMPLETED!', sub:'you are literally THAT girl 💅' },
  { emoji:'✨', title:'PERIODT POOH!', sub:'no cap, you just bodied that set 🏆' },
  { emoji:'💜', title:"IT'S GIVING GAINS!", sub:'the glow-up is REAL bestie 🌟' },
  { emoji:'🔥', title:'SHEEEESH QUEEN!', sub:"you're built SO different omg 💪" },
  { emoji:'🎀', title:'YASSS BESTIE!', sub:"that's the main character behavior 🚀" },
  { emoji:'👑', title:'CROWN ON TIGHT!', sub:'your muscles are eating and they are WINNING 🏆' },
  { emoji:'💖', title:'NOT YOU SLAYING!', sub:"we love a girlboss in her fitness era ✨" },
];

const elements = {
  exerciseGrid: document.getElementById('exerciseGrid'),
  noSelectMsg: document.getElementById('noSelectMsg'),
  timerContent: document.getElementById('timerContent'),
  exLabel: document.getElementById('exLabel'),
  motiveTicker: document.getElementById('motiveTicker'),
  ringWrap: document.getElementById('ringWrap'),
  ringFill: document.getElementById('ringFill'),
  timerBig: document.getElementById('timerBig'),
  timerStatus: document.getElementById('timerStatus'),
  presetsRow: document.getElementById('presetsRow'),
  minInput: document.getElementById('minInput'),
  secInput: document.getElementById('secInput'),
  btnStart: document.getElementById('btnStart'),
  btnReset: document.getElementById('btnReset'),
  btnSnooze: document.getElementById('btnSnooze'),
  btnDone: document.getElementById('btnDone'),
  alarmOverlay: document.getElementById('alarmOverlay'),
  alarmEmoji: document.getElementById('alarmEmoji'),
  alarmTitle: document.getElementById('alarmTitle'),
  alarmSub: document.getElementById('alarmSub'),
  statSessions: document.getElementById('statSessions'),
  statMinutes: document.getElementById('statMinutes'),
  statStreak: document.getElementById('statStreak'),
  historyList: document.getElementById('historyList'),
};

async function initApp() {
  elements.btnStart.addEventListener('click', toggleTimer);
  elements.btnReset.addEventListener('click', resetTimer);
  elements.btnSnooze.addEventListener('click', snooze);
  elements.btnDone.addEventListener('click', closeAlarm);
  elements.minInput.addEventListener('change', handleInputChange);
  elements.secInput.addEventListener('change', handleInputChange);

  await fetchExercises();
  await fetchStats();
  await fetchHistory();
  updateDisplay();
}

async function fetchExercises() {
  try {
    const response = await fetch(`${API_BASE}/exercises`);
    const data = await response.json();
    exercises = data.exercises || [];
    renderExercises();
  } catch (error) {
    console.error('Failed to load exercises', error);
  }
}

async function fetchStats() {
  try {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) return;
    const stats = await response.json();
    updateStats(stats);
  } catch (error) {
    console.error('Failed to load stats', error);
  }
}

async function fetchHistory() {
  try {
    const response = await fetch(`${API_BASE}/history`);
    const data = await response.json();
    renderHistory(data.history || []);
  } catch (error) {
    console.error('Failed to load history', error);
  }
}

function renderExercises() {
  elements.exerciseGrid.innerHTML = exercises.map(ex => `
    <div class="exercise-card" id="card-${ex.id}" onclick="selectExercise('${ex.id}')">
      <div class="ex-image-container" style="width:100%; height:120px; overflow:hidden; border-radius:12px; margin-bottom:8px;">
        <img src="${ex.image}" alt="${ex.name}" style="width:100%; height:100%; object-fit:cover;">
      </div>
      <span class="ex-name">${ex.name}</span>
      <span class="ex-rec">${ex.recs[1]}s rec</span>
    </div>`).join('');
}

function renderHistory(history) {
  if (!elements.historyList) return;
  if (history.length === 0) return;

  elements.historyList.innerHTML = history.map(item => {
    const date = new Date(item.recordedAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const ex = exercises.find(e => e.id === item.exerciseId) || { name: 'Workout' };
    return `
      <div class="history-item">
        <div class="hist-info">
          <span class="hist-name">${ex.name}</span>
          <span class="hist-date">${date}</span>
        </div>
        <div class="hist-tag">${Math.round(item.durationSeconds / 60) || 1} MIN</div>
      </div>
    `;
  }).join('');
}

window.selectExercise = function(id) {
  document.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById(`card-${id}`);
  if (!card) return;
  card.classList.add('selected');
  selected = exercises.find(e => e.id === id);
  elements.noSelectMsg.style.display = 'none';
  elements.timerContent.style.display = 'block';
  elements.exLabel.textContent = selected.name.toUpperCase();
  resetTimer();
  renderPresets();
};

function renderPresets() {
  if (!selected) return;
  elements.presetsRow.innerHTML = selected.recs.map((r, i) => `
    <button class="preset-btn" onclick="applyPreset(${r})">
      ${r >= 60 ? (r / 60) + 'min' : r + 's'} — ${selected.tips[i]}
    </button>`).join('');
}

window.applyPreset = function(seconds) {
  if (running) return;
  totalSeconds = seconds;
  remaining = seconds;
  setInputs();
  updateDisplay();
};

function handleInputChange() {
  if (running) return;
  totalSeconds = getInputTotal() || 90;
  remaining = totalSeconds;
  updateDisplay();
}

function setInputs() {
  elements.minInput.value = Math.floor(totalSeconds / 60);
  elements.secInput.value = totalSeconds % 60;
}

function getInputTotal() {
  return (parseInt(elements.minInput.value, 10) || 0) * 60 + (parseInt(elements.secInput.value, 10) || 0);
}

// --- UPDATED START HANDLER WITH MOBILE UNLOCK ---
function toggleTimer() {
  // 1. MOBILE VOICE UNLOCK: Speak a silent message on user tap
  const silentMsg = new SpeechSynthesisUtterance("");
  window.speechSynthesis.speak(silentMsg);

  // 2. MOBILE AUDIO UNLOCK: Resume audio context if it exists
  const dummyCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (dummyCtx.state === 'suspended') dummyCtx.resume();

  if (running) {
    pauseTimer();
  } else {
    startTimerGo();
  }
}

function startTimerGo() {
  if (!timerInterval) {
    const setValue = getInputTotal() || totalSeconds || 90;
    totalSeconds = setValue;
    remaining = remaining > 0 ? remaining : setValue;
  }

  running = true;
  elements.btnStart.textContent = 'Pause ⏸';
  elements.timerStatus.textContent = 'going bestie 🔥';
  elements.ringWrap.classList.add('pulsing');
  timerInterval = setInterval(tick, 1000);
  startMotivations();
}

function pauseTimer() {
  running = false;
  clearInterval(timerInterval);
  timerInterval = null;
  stopMotivations();
  elements.btnStart.textContent = 'Resume 💪';
  elements.timerStatus.textContent = 'paused 🤔';
  elements.ringWrap.classList.remove('pulsing');
}

function resetTimer() {
  running = false;
  clearInterval(timerInterval);
  timerInterval = null;
  stopMotivations();
  stopFunnySound(); 
  totalSeconds = getInputTotal() || 90;
  remaining = totalSeconds;
  updateDisplay();
  elements.btnStart.textContent = 'Start 🚀';
  elements.timerStatus.textContent = 'ready bestie';
  elements.motiveTicker.textContent = "let's get it bestie ✨";
  elements.ringWrap.classList.remove('pulsing');
}

function tick() {
  remaining = Math.max(0, remaining - 1);
  updateDisplay();
  if (remaining <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    running = false;
    stopMotivations();
    elements.ringWrap.classList.remove('pulsing');
    triggerAlarm();
  }
}

function updateDisplay() {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  elements.timerBig.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const pct = totalSeconds > 0 ? remaining / totalSeconds : 1;
  elements.ringFill.style.strokeDashoffset = circumference * (1 - pct);
}

function startMotivations() {
  motiveIndex = Math.floor(Math.random() * motivations.length);
  showMotive();
  motiveInterval = setInterval(() => {
    motiveIndex = (motiveIndex + 1) % motivations.length;
    showMotive();
  }, 8000);
}

function showMotive() {
  const el = elements.motiveTicker;
  el.style.animation = 'none';
  void el.offsetHeight;
  el.style.animation = 'fadeSlide 0.4s ease';
  el.textContent = motivations[motiveIndex];
}

function stopMotivations() {
  clearInterval(motiveInterval);
  motiveInterval = null;
}

async function triggerAlarm() {
  const msg = alarmMsgs[Math.floor(Math.random() * alarmMsgs.length)];
  elements.alarmEmoji.textContent = msg.emoji;
  elements.alarmTitle.textContent = msg.title;
  elements.alarmSub.textContent = msg.sub;
  spawnConfetti();
  elements.alarmOverlay.classList.add('show');
  
  playFunnySound(); 
  await saveSession();
}

async function saveSession() {
  if (!selected) return;
  try {
    const response = await fetch(`${API_BASE}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseId: selected.id,
        durationSeconds: totalSeconds,
        sets: 1,
      }),
    });
    if (!response.ok) return;
    const stats = await response.json();
    updateStats(stats);
    await fetchHistory();
  } catch (error) {
    console.warn('Could not save session:', error);
  }
}

function closeAlarm() {
  stopFunnySound(); 
  elements.alarmOverlay.classList.remove('show');
  elements.btnStart.textContent = 'Again? 💪';
  elements.timerStatus.textContent = 'done! 🏆';
  elements.motiveTicker.textContent = "that's the glow-up era bestie 🌟";
  remaining = 0;
  updateDisplay();
}

function snooze() {
  stopFunnySound(); 
  elements.alarmOverlay.classList.remove('show');
  totalSeconds = 30;
  remaining = 30;
  updateDisplay();
  startTimerGo();
  elements.timerStatus.textContent = 'snoozed 30s 😮‍💨';
}

async function playFunnySound() {
  window.speechSynthesis.cancel();
  
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  beatInterval = setInterval(() => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.frequency.setValueAtTime(900, audioCtx.currentTime); 
    osc.type = 'square'; 
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  }, 300); 

  setTimeout(() => {
    const speakRandom = () => {
      if (!speechInterval) return; 

      const randomText = unhingedPhrases[Math.floor(Math.random() * unhingedPhrases.length)];
      const message = new SpeechSynthesisUtterance(randomText);
      
      let voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => 
        v.name.includes('Samantha') || 
        v.name.includes('Google US English') || 
        v.name.includes('Female') || 
        v.lang === 'en-US'
      );
      
      if (femaleVoice) message.voice = femaleVoice;
      message.pitch = 1.7; 
      message.rate = 1.4;
      message.volume = 1.0; 

      window.speechSynthesis.speak(message);
    };

    speechInterval = setInterval(speakRandom, 4500);
    speakRandom(); 
  }, 1500); 
}

function stopFunnySound() {
  clearInterval(speechInterval);
  clearInterval(beatInterval);
  speechInterval = null;
  beatInterval = null;
  window.speechSynthesis.cancel();
}

function spawnConfetti() {
  const card = document.getElementById('alarmCard');
  const colors = ['#f472b6', '#a855f7', '#818cf8', '#fde68a', '#34d399'];
  for (let i = 0; i < 18; i++) {
    const dot = document.createElement('div');
    dot.className = 'confetti-dot';
    dot.style.cssText = `
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 40}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay: ${Math.random() * 1.5}s;
      animation-duration: ${1.5 + Math.random()}s;
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    card.appendChild(dot);
    setTimeout(() => dot.remove(), 3000);
  }
}

function updateStats(stats) {
  elements.statSessions.textContent = stats.sessions || 0;
  elements.statMinutes.textContent = stats.totalMinutes || 0;
  elements.statStreak.textContent = stats.sets || 0;
}

initApp();