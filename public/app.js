// Add this at the very top of your app.js
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
  { emoji:'🌸', title:'SLAY COMPLETED!', sub:'you are literally THAT girl 💅' },
  { emoji:'✨', title:'PERIODT POOH!', sub:'no cap, you just bodied that set 🏆' },
  { emoji:'💜', title:"IT'S GIVING GAINS!", sub:'the glow-up is REAL bestie 🌟' },
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
  alarmSub: document.querySelector('.alarm-sub'), // Changed to selector for safety
  statSessions: document.getElementById('statSessions'),
  statMinutes: document.getElementById('statMinutes'),
  statStreak: document.getElementById('statStreak'),
  historyList: document.getElementById('historyList'),
  toggleAiBtn: document.getElementById('toggleAiBtn'),
};

async function initApp() {
  elements.btnStart.addEventListener('click', toggleTimer);
  elements.btnReset.addEventListener('click', resetTimer);
  elements.btnSnooze.addEventListener('click', snooze);
  elements.btnDone.addEventListener('click', closeAlarm);
  elements.minInput.addEventListener('change', handleInputChange);
  elements.secInput.addEventListener('change', handleInputChange);
  if(elements.toggleAiBtn) elements.toggleAiBtn.addEventListener('click', toggleAiCoach);

  await fetchExercises();
  await fetchStats();
  await fetchHistory();
  setupAiCoach();
  updateDisplay();
}

// --- AI COACH ENGINE ---
function setupAiCoach() {
    pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    pose.onResults(onPoseResults);
}

async function toggleAiCoach() {
    const container = document.getElementById('aiCoachContainer');
    const videoElement = document.getElementById('input_video');
    isAiActive = !isAiActive;
    if (isAiActive) {
        container.style.display = 'block';
        camera = new Camera(videoElement, {
            onFrame: async () => { await pose.send({ image: videoElement }); },
            width: 640, height: 480
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
    if(!canvasCtx) return;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#c4b5fd', lineWidth: 4 });
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#ec4899', lineWidth: 2 });
        const hip = results.poseLandmarks[24];
        const knee = results.poseLandmarks[26];
        const ankle = results.poseLandmarks[28];
        if (hip && knee && ankle) {
            const angle = calculateAngle(hip, knee, ankle);
            const msgFunc = feedbackMessages[selected?.id] || feedbackMessages.default;
            if(feedback) feedback.innerText = msgFunc(angle);
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

// --- TIMER LOGIC ---
function toggleTimer() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  if (running) pauseTimer();
  else startTimerGo();
}

function startTimerGo() {
  const setValue = getInputTotal() || totalSeconds || 90;
  totalSeconds = setValue;
  remaining = remaining > 0 ? remaining : setValue;
  running = true;
  elements.btnStart.textContent = 'Pause ⏸';
  elements.timerStatus.textContent = 'going bestie 🔥';
  elements.ringWrap.classList.add('pulsing');
  timerInterval = setInterval(tick, 1000);
  startMotivations();
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

async function triggerAlarm() {
  const msg = alarmMsgs[Math.floor(Math.random() * alarmMsgs.length)];
  if(elements.alarmEmoji) elements.alarmEmoji.textContent = msg.emoji;
  if(elements.alarmTitle) elements.alarmTitle.textContent = msg.title;
  if(elements.alarmSub) elements.alarmSub.textContent = msg.sub;
  if(elements.alarmOverlay) elements.alarmOverlay.classList.add('show');
  spawnConfetti();
  playFunnySound(); 
  await saveSession();
}

function closeAlarm() {
  stopFunnySound(); 
  if(elements.alarmOverlay) elements.alarmOverlay.classList.remove('show');
  elements.btnStart.textContent = 'Again? 💪';
  elements.timerStatus.textContent = 'done! 🏆';
}

function snooze() {
  stopFunnySound(); 
  if(elements.alarmOverlay) elements.alarmOverlay.classList.remove('show');
  totalSeconds = 30;
  remaining = 30;
  updateDisplay();
  startTimerGo();
}

// --- RENDERING & UTILS ---
async function fetchExercises() {
  const response = await fetch(`${API_BASE}/exercises`);
  const data = await response.json();
  exercises = data.exercises || [];
  renderExercises();
}

async function fetchStats() {
  const response = await fetch(`${API_BASE}/stats`);
  if (response.ok) updateStats(await response.json());
}

async function fetchHistory() {
  const response = await fetch(`${API_BASE}/history`);
  const data = await response.json();
  renderHistory(data.history || []);
}

function renderExercises() {
  elements.exerciseGrid.innerHTML = exercises.map(ex => `
    <div class="exercise-card" id="card-${ex.id}" onclick="selectExercise('${ex.id}')">
      <div class="ex-image-container"><img src="${ex.image}" style="width:100%; height:100%; object-fit:cover;"></div>
      <span class="ex-name">${ex.name}</span>
      <span class="ex-rec">${ex.recs[1]}s rec</span>
    </div>`).join('');
}

function renderHistory(history) {
    if (!elements.historyList) return;
    elements.historyList.innerHTML = history.map(item => {
        const date = new Date(item.recordedAt).toLocaleString();
        return `<div class="history-item"><span>${item.exerciseId}</span><span>${date}</span></div>`;
    }).join('');
}

window.selectExercise = function(id) {
  document.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById(`card-${id}`);
  if(card) card.classList.add('selected');
  selected = exercises.find(e => e.id === id);
  elements.noSelectMsg.style.display = 'none';
  elements.timerContent.style.display = 'block';
  elements.exLabel.textContent = selected.name.toUpperCase();
  resetTimer();
  renderPresets();
};

function renderPresets() {
  elements.presetsRow.innerHTML = selected.recs.map((r, i) => `
    <button class="preset-btn" onclick="applyPreset(${r})">${r}s</button>`).join('');
}

window.applyPreset = function(s) { totalSeconds = s; remaining = s; setInputs(); updateDisplay(); };
function handleInputChange() { totalSeconds = getInputTotal(); remaining = totalSeconds; updateDisplay(); }
function setInputs() { elements.minInput.value = Math.floor(totalSeconds / 60); elements.secInput.value = totalSeconds % 60; }
function getInputTotal() { return (parseInt(elements.minInput.value) || 0) * 60 + (parseInt(elements.secInput.value) || 0); }
function pauseTimer() { running = false; clearInterval(timerInterval); stopMotivations(); elements.btnStart.textContent = 'Resume 💪'; }
function resetTimer() { running = false; clearInterval(timerInterval); stopMotivations(); stopFunnySound(); remaining = totalSeconds; updateDisplay(); elements.btnStart.textContent = 'Start 🚀'; }

function updateDisplay() {
  const m = Math.floor(remaining / 60), s = remaining % 60;
  elements.timerBig.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  elements.ringFill.style.strokeDashoffset = circumference * (1 - (remaining / totalSeconds));
}

function startMotivations() { showMotive(); motiveInterval = setInterval(() => { motiveIndex = (motiveIndex+1)%motivations.length; showMotive(); }, 8000); }
function showMotive() { elements.motiveTicker.textContent = motivations[motiveIndex]; }
function stopMotivations() { clearInterval(motiveInterval); }

async function saveSession() {
  if (!selected) return;
  const res = await fetch(`${API_BASE}/session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exerciseId: selected.id, durationSeconds: totalSeconds }),
  });
  if (res.ok) { updateStats(await res.json()); await fetchHistory(); }
}

async function playFunnySound() {
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  
  // Start the beeps
  beatInterval = setInterval(() => {
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime); osc.type = 'square';
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.1);
    osc.start(); osc.stop(audioCtx.currentTime+0.1);
  }, 400);

  // Start the "Slay" Speech
  speechInterval = setInterval(() => {
    const msg = new SpeechSynthesisUtterance(unhingedPhrases[Math.floor(Math.random()*unhingedPhrases.length)]);
    
    // THE VOICE PICKER LOGIC
    let voices = window.speechSynthesis.getVoices();
    
    // Priority: Samantha (iOS), Zira (Windows), Google Female, or any Female voice
    const bestieVoice = voices.find(v => v.name.includes('Samantha')) || 
                        voices.find(v => v.name.includes('Zira')) || 
                        voices.find(v => v.name.includes('Google US English')) ||
                        voices.find(v => v.name.includes('Female')) ||
                        voices[0];

    msg.voice = bestieVoice;
    msg.pitch = 1.3; // Higher pitch for that "bestie" vibe
    msg.rate = 0.95; 
    window.speechSynthesis.speak(msg);
  }, 5000);
}


function stopFunnySound() {
  window.speechSynthesis.cancel();
  clearInterval(speechInterval); clearInterval(beatInterval);
  if (audioCtx) audioCtx.suspend();
}

function spawnConfetti() {
  const card = document.getElementById('alarmCard');
  if(!card) return;
  for (let i = 0; i < 10; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `position:absolute; width:8px; height:8px; background:pink; left:${Math.random()*100}%; top:0;`;
    card.appendChild(dot);
    setTimeout(() => dot.remove(), 3000);
  }
}

function updateStats(s) {
  if(elements.statSessions) elements.statSessions.textContent = s.sessions;
  if(elements.statMinutes) elements.statMinutes.textContent = s.totalMinutes;
  if(elements.statStreak) elements.statStreak.textContent = s.sets;
}

initApp();