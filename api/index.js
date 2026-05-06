const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

const exercises = [
  { id: 'squats', name: 'Squats', image: 'exercises/squats.jpg', recs: [30, 45, 60], tips: ['baby steps', 'solid werk', 'beast mode'] },
  { id: 'pushups', name: 'Push-ups', image: 'exercises/pushups.jpg', recs: [20, 40, 60], tips: ['warm-up era', 'level up', 'no mercy'] },
  { id: 'planks', name: 'Plank', image: 'exercises/planks.jpg', recs: [30, 60, 90], tips: ['starter pack', 'core queen', 'absolute unit'] },
  { id: 'burpees', name: 'Burpees', image: 'exercises/burpees.jpg', recs: [45, 90, 120], tips: ['still alive', 'sweaty queen', 'send help'] },
  { id: 'lunges', name: 'Lunges', image: 'exercises/lunges.jpg', recs: [30, 45, 60], tips: ['gentle queen', 'burning up', 'jelly legs'] },
  { id: 'jumprope', name: 'Jump Rope', image: 'exercises/jump rope.jpg', recs: [60, 120, 180], tips: ['warmup szn', 'cardio queen', 'legend era'] },
  { id: 'situps', name: 'Sit-ups', image: 'exercises/situps.jpg', recs: [30, 45, 60], tips: ['okay bestie', 'shaky queen', 'warrior mode'] },
  { id: 'glutes', name: 'Glute Gains', image: 'exercises/glutes.jpg', recs: [20, 40, 60], tips: ['fine ig', 'gassing up', 'main character'] }
];

function computeStats(records) {
  if (!records || records.length === 0) return { sessions: 0, totalMinutes: 0, sets: 0 };
  const sessions = records.length;
  const totalMinutes = records.reduce((sum, item) => sum + Math.round((item.duration_seconds || 0) / 60) || 1, 0);
  const sets = records.reduce((sum, item) => sum + (item.sets || 1), 0);
  return { sessions, totalMinutes, sets };
}

app.get('/api/exercises', (req, res) => {
  res.json({ exercises });
});

app.get('/api/stats', async (req, res) => {
  try {
    const { data, error } = await supabase.from('workout_history').select('*');
    if (error) throw error;
    res.json(computeStats(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('workout_history')
      .select('*')
      .order('recorded_at', { ascending: false });
    if (error) throw error;
    const history = data.map(item => ({
      exerciseId: item.exercise_id,
      durationSeconds: item.duration_seconds,
      sets: item.sets,
      recordedAt: item.recorded_at
    }));
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/session', async (req, res) => {
  const { exerciseId, durationSeconds, sets = 1 } = req.body;
  try {
    const { error: insertError } = await supabase
      .from('workout_history')
      .insert([{ exercise_id: exerciseId, duration_seconds: durationSeconds, sets: sets }]);
    if (insertError) throw insertError;
    const { data: allData, error: fetchError } = await supabase.from('workout_history').select('*');
    if (fetchError) throw fetchError;
    return res.json(computeStats(allData));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

module.exports = app;
//ugh