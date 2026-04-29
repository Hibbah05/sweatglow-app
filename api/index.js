const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(process.cwd(), 'data', 'sessions.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readSessions() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    return { sessions: [] };
  }
}

function writeSessions(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function computeStats(records) {
  const sessions = records.length;
  const totalMinutes = records.reduce((sum, item) => sum + Math.round(item.durationSeconds / 60) || 1, 0);
  const sets = records.reduce((sum, item) => sum + (item.sets || 1), 0);
  return { sessions, totalMinutes, sets };
}

const exercises = [
  { id: 'squats', name: 'Squats', image: 'exercises/squats.jpg', recs: [30, 45, 60], tips: ['baby steps', 'solid werk', 'beast mode'] },
  { id: 'pushups', name: 'Push-ups', image: 'exercises/pushups.jpg', recs: [20, 40, 60], tips: ['warm-up era', 'level up', 'no mercy'] },
  { id: 'planks', name: 'Plank', image: 'exercises/planks.jpg', recs: [30, 60, 90], tips: ['starter pack', 'core queen', 'absolute unit'] },
  { id: 'burpees', name: 'Burpees', image: 'exercises/burpees.jpg', recs: [45, 90, 120], tips: ['still alive', 'sweaty queen', 'send help'] },
  { id: 'lunges', name: 'Lunges', image: 'exercises/lunges.jpg', recs: [30, 45, 60], tips: ['gentle queen', 'burning up', 'jelly legs'] },
  { id: 'jumprope', name: 'Jump Rope', image: 'exercises/jump rope.jpg', recs: [60, 120, 180], tips: ['warmup szn', 'cardio queen', 'legend era'] },
  { id: 'situps', name: 'Sit-ups', image: 'exercises/situps.jpg', recs: [30, 45, 60], tips: ['okay bestie', 'shaky queen', 'warrior mode'] },
  { id: 'glutes', name: 'Glute Gains', image: 'exercises/glutes.jpg', recs: [20, 40, 60], tips: ['fine ig', 'gassing up', 'main character'] },
];

app.get('/api/exercises', (req, res) => {
  res.json({ exercises });
});

app.get('/api/stats', (req, res) => {
  const data = readSessions();
  res.json(computeStats(data.sessions));
});

app.get('/api/history', (req, res) => {
  const data = readSessions();
  const sortedHistory = data.sessions.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
  res.json({ history: sortedHistory });
});

app.post('/api/session', (req, res) => {
  const { exerciseId, durationSeconds, sets = 1 } = req.body;
  if (!exerciseId || typeof durationSeconds !== 'number') {
    return res.status(400).json({ error: 'Invalid session payload' });
  }
  const data = readSessions();
  data.sessions.push({ exerciseId, durationSeconds, sets, recordedAt: new Date().toISOString() });
  writeSessions(data);
  return res.json(computeStats(data.sessions));
});

// Wildcard MUST be last
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname,'..', 'public', 'index.html'));
});

//app.listen(PORT, () => {
  //console.log(`Server running on http://localhost:${PORT}`);
//});

module.exports = app;