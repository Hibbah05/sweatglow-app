// Add this at the very top of your app.js to keep track of the AudioContext
let audioCtx;

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

// --- AI COACH STATE ---
let pose = null;
let camera = null;
let isAiActive = false;

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

const feedbackMessages = {
    squats: (angle) => angle > 160 ? "Down we go! ⬇️" : angle < 100 ? "Perfect depth! Slay 💅" : "Lower, bestie!",
    planks: (angle) => angle > 170 ? "Back is straight! 🔥" : "Keep that core tight!",
    default: "I see you! Let's get it ✨"
};

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
  toggleAiBtn: document.getElementById('toggleAiBtn'), // New AI Button
};

async function initApp() {
  elements.btnStart.addEventListener('click', toggleTimer);
  elements.btnReset.addEventListener('click', resetTimer);
  elements.btnSnooze.addEventListener('click', snooze);
  elements.btnDone.addEventListener('click', closeAlarm);
  elements.minInput.addEventListener('change', handleInputChange);
  elements.secInput.addEventListener('change', handleInputChange);
  elements.toggleAiBtn.addEventListener('click', toggleAiCoach); // New AI Listener

  await fetchExercises();
  await fetchStats();
  await fetchHistory();
  setupAiCoach(); // Initialize AI
  updateDisplay();
}

// --- AI COACH ENGINE ---
function setupAiCoach() {
    pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    pose.onResults(onPoseResults);
}

async function toggleAiCoach() {
    const container = document.getElementById('aiCoachContainer');
    const videoElement = document.getElementById('input_video');
    
    isAiActive = !isAiActive;
    
    if (isAiActive) {
        container.style.display = 'block';
        camera = new Camera(videoElement, {
            onFrame: async () => {
                await pose.send({ image: videoElement });
            },
            width: 640,
            height: 480
        });
        camera.start();
        elements.toggleAiBtn.innerText = "Stop AI Coach 🛑";
    } else {
        container.style.display = 'none';
        if (camera) await camera.stop();
        elements.toggleAiBtn.innerText = "Toggle AI Coach 🎥";
    }
}

function onPoseResults(results) {
    const canvasElement = document.getElementById('output_canvas');
    const canvasCtx = canvasElement.getContext('2d');
    const feedback = document.getElementById('aiFeedback');

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw Camera Feed
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks) {
        // Draw Skeleton Dots and Lines
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#c4b5fd', lineWidth: 4 });
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#ec4899', lineWidth: 2 });

        // Logic for Squats (Right Hip=24, Knee=26, Ankle=28)
        const hip = results.poseLandmarks[24];
        const knee = results.poseLandmarks[26];
        const ankle = results.poseLandmarks[28];

        if (hip && knee && ankle) {
            const angle = calculateAngle(hip, knee, ankle);
            const msgFunc = feedbackMessages[selected?.id] || feedbackMessages.default;
            feedback.innerText = msgFunc(angle);
        }
    }
    canvasCtx.restore();
}

function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
}

// --- ORIGINAL DATA FETCHING ---
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
        durationSeconds: totalSeconds
      }),
    });
    
    if (response.ok) {
      const stats = await response.json();
      updateStats(stats);
      await fetchHistory(); 
    }
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

function toggleTimer() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  const silent = new SpeechSynthesisUtterance("");
  window.speechSynthesis.speak(silent);
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  if (running) {
    pauseTimer();
  } else {
    startTimerGo();
  }
}

async function playFunnySound() {
  window.speechSynthesis.cancel();
  
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  beatInterval = setInterval(() => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime); 
    osc.type = 'square'; 
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  }, 400); 

  setTimeout(() => {
    const speakRandom = () => {
      if (!speechInterval) return; 

      const message = new SpeechSynthesisUtterance(unhingedPhrases[Math.floor(Math.random() * unhingedPhrases.length)]);
      let voices = window.speechSynthesis.getVoices();
      
      const bestie = voices.find(v => v.name.includes('Samantha')) || 
                     voices.find(v => v.name.includes('Zira')) || 
                     voices.find(v => v.name.includes('Google US English')) ||
                     voices.find(v => v.name.includes('Female')) ||
                     voices[0];

      message.voice = bestie;
      message.pitch = 1.2; 
      message.rate = 0.9;  
      message.volume = 1.0; 

      window.speechSynthesis.speak(message);
    };

    speechInterval = setInterval(speakRandom, 5000);
    speakRandom(); 
  }, 1000); 
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

function stopFunnySound() {
  window.speechSynthesis.cancel();
  if (speechInterval) {
    clearInterval(speechInterval);
    speechInterval = null;
  }
  if (beatInterval) {
    clearInterval(beatInterval);
    beatInterval = null;
  }
  if (audioCtx && audioCtx.state !== 'closed') {
    audioCtx.suspend();
  }
}

function updateStats(stats) {
  elements.statSessions.textContent = stats.sessions || 0;
  elements.statMinutes.textContent = stats.totalMinutes || 0;
  elements.statStreak.textContent = stats.sets || 0;
}

initApp();

window.speechSynthesis.onvoiceschanged = () => {
  window.speechSynthesis.getVoices();
};