<script setup>
import { ref, computed, reactive, onUnmounted } from 'vue';

// ====================================================
// State
// ====================================================
const rawData = ref([]);
const headers = ref([]);
const videoFiles = ref({});

const participantName = ref('');
const SAMPLE_SIZE = 5;
const CLIP_DURATION = 3;

const phase = ref('setup'); // 'setup' | 'task' | 'result'

// Sampled clips: each has { row, finalDesc, side ('A'|'B'), startTime, clipLabel }
const sampledClips = ref([]);
// Shuffled description cards: each { id, text, correctClipIndex, correctDimension }
const descriptionCards = ref([]);
// User responses: keyed by card id → { clipIndex: number|null, dimension: string|null }
const responses = reactive({});

// Video blob URLs per clip index
const videoSources = ref([]);
const videoRefs = ref([]);
const playingStates = ref([]);

const savedResults = ref(JSON.parse(localStorage.getItem('descValidatorResults') || '[]'));

const appraisalKeys = [
  { key: 'novelty', label: 'Novelty' },
  { key: 'goal_relevance', label: 'Goal Relevance' },
  { key: 'outcome_probability', label: 'Outcome Probability' },
  { key: 'goal_conduciveness', label: 'Goal Conduciveness' },
  { key: 'urgency', label: 'Urgency' },
  { key: 'coping_potential', label: 'Coping Potential' },
];

const appraisalOptions = computed(() => [
  { value: '', label: '-- Select Dimension --' },
  ...appraisalKeys.map(a => ({ value: a.key, label: a.label })),
]);

// ====================================================
// CSV Parsing
// ====================================================
const parseCSVLine = (text) => {
  const result = [];
  let inQuotes = false;
  let currentVal = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && text[i + 1] === '"') {
      currentVal += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentVal.trim());
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal.trim());
  return result;
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = e.target.result.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return;
    const headersLine = parseCSVLine(lines[0].replace(/^\ufeff/, ''));
    headers.value = headersLine;
    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headersLine.length) continue;
      const row = {};
      headersLine.forEach((h, idx) => row[h] = values[idx]);
      parsed.push(row);
    }
    rawData.value = parsed;
  };
  reader.readAsText(file);
};

const handleFolderUpload = (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  const fileMap = {};
  for (let i = 0; i < files.length; i++) {
    fileMap[files[i].name] = files[i];
  }
  videoFiles.value = fileMap;
};

// ====================================================
// Shuffle
// ====================================================
const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ====================================================
// Start Task
// ====================================================
const canStart = computed(() => {
  return rawData.value.length >= SAMPLE_SIZE && participantName.value.trim();
});

const startTask = () => {
  // Clean up previous blob URLs
  videoSources.value.forEach(src => {
    if (src && src.startsWith('blob:')) URL.revokeObjectURL(src);
  });

  const n = Math.min(SAMPLE_SIZE, rawData.value.length);
  const shuffledRows = shuffleArray(rawData.value);
  const selectedRows = shuffledRows.slice(0, n);

  // For each selected row, randomly pick side A or B
  const clips = selectedRows.map((row, idx) => {
    const side = Math.random() < 0.5 ? 'A' : 'B';
    let finalDesc = null;
    try { finalDesc = JSON.parse(row.final_desc); } catch (e) { /* skip */ }
    return {
      row,
      finalDesc,
      side,
      startTime: parseFloat(side === 'A' ? row.StartTimeA : row.StartTimeB) || 0,
      clipLabel: `Clip ${idx + 1}`,
      clipIndex: idx,
    };
  });
  sampledClips.value = clips;

  // Create video blob URLs
  videoSources.value = clips.map(clip => {
    const localFile = videoFiles.value[clip.row.VideoFile];
    return localFile ? URL.createObjectURL(localFile) : '';
  });
  playingStates.value = clips.map(() => false);

  // Build description cards: 6 dimensions × n clips = 6n cards
  const cards = [];
  let cardId = 0;
  clips.forEach((clip, clipIdx) => {
    if (!clip.finalDesc) return;
    appraisalKeys.forEach(({ key }) => {
      const dim = clip.finalDesc[key];
      if (!dim) return;
      const descField = clip.side === 'A' ? 'description_A' : 'description_B';
      const text = dim[descField];
      if (!text) return;
      cards.push({
        id: cardId++,
        text,
        correctClipIndex: clipIdx,
        correctDimension: key,
      });
    });
  });

  descriptionCards.value = shuffleArray(cards);

  // Init responses
  Object.keys(responses).forEach(k => delete responses[k]);
  descriptionCards.value.forEach(card => {
    responses[card.id] = { clipIndex: null, dimension: '' };
  });

  phase.value = 'task';
};

// ====================================================
// Video playback
// ====================================================
const setVideoRef = (el, idx) => {
  if (el) videoRefs.value[idx] = el;
};

const onMetadataLoaded = (idx) => {
  const video = videoRefs.value[idx];
  const clip = sampledClips.value[idx];
  if (video && clip) video.currentTime = clip.startTime;
};

const handleTimeUpdate = (idx) => {
  const video = videoRefs.value[idx];
  const clip = sampledClips.value[idx];
  if (video && clip && video.currentTime >= clip.startTime + CLIP_DURATION) {
    video.pause();
    video.currentTime = clip.startTime;
    playingStates.value[idx] = false;
  }
};

const playClip = (idx) => {
  const video = videoRefs.value[idx];
  const clip = sampledClips.value[idx];
  if (video && clip) {
    video.currentTime = clip.startTime;
    video.play();
    playingStates.value[idx] = true;
  }
};

onUnmounted(() => {
  videoSources.value.forEach(src => {
    if (src && src.startsWith('blob:')) URL.revokeObjectURL(src);
  });
});

// ====================================================
// Response helpers
// ====================================================
const clipOptions = computed(() => [
  { value: null, label: '-- Select Clip --' },
  ...sampledClips.value.map((c, i) => ({ value: i, label: c.clipLabel })),
]);

const allAnswered = computed(() => {
  return descriptionCards.value.every(card => {
    const r = responses[card.id];
    return r && r.clipIndex !== null && r.dimension !== '';
  });
});

const answeredCount = computed(() => {
  return descriptionCards.value.filter(card => {
    const r = responses[card.id];
    return r && r.clipIndex !== null && r.dimension !== '';
  }).length;
});

// ====================================================
// Scoring & Results
// ====================================================
const finishTask = () => {
  const result = computeScore();
  const allResults = JSON.parse(localStorage.getItem('descValidatorResults') || '[]');
  allResults.push(result);
  localStorage.setItem('descValidatorResults', JSON.stringify(allResults));
  savedResults.value = allResults;
  phase.value = 'result';
};

const computeScore = () => {
  let clipCorrect = 0;
  let dimCorrect = 0;
  let bothCorrect = 0;
  const total = descriptionCards.value.length;

  const perDimension = {};
  appraisalKeys.forEach(({ key }) => {
    perDimension[key] = { clipCorrect: 0, dimCorrect: 0, bothCorrect: 0, total: 0 };
  });

  const perClip = {};
  sampledClips.value.forEach((_, i) => {
    perClip[i] = { clipCorrect: 0, dimCorrect: 0, bothCorrect: 0, total: 0 };
  });

  const cardDetails = descriptionCards.value.map(card => {
    const r = responses[card.id];
    const clipMatch = r.clipIndex === card.correctClipIndex;
    const dimMatch = r.dimension === card.correctDimension;
    const bothMatch = clipMatch && dimMatch;

    if (clipMatch) clipCorrect++;
    if (dimMatch) dimCorrect++;
    if (bothMatch) bothCorrect++;

    const dim = card.correctDimension;
    perDimension[dim].total++;
    if (clipMatch) perDimension[dim].clipCorrect++;
    if (dimMatch) perDimension[dim].dimCorrect++;
    if (bothMatch) perDimension[dim].bothCorrect++;

    const ci = card.correctClipIndex;
    perClip[ci].total++;
    if (clipMatch) perClip[ci].clipCorrect++;
    if (dimMatch) perClip[ci].dimCorrect++;
    if (bothMatch) perClip[ci].bothCorrect++;

    return {
      text: card.text.slice(0, 80) + (card.text.length > 80 ? '...' : ''),
      correctClip: sampledClips.value[card.correctClipIndex]?.clipLabel,
      correctDim: appraisalKeys.find(a => a.key === card.correctDimension)?.label,
      answerClip: r.clipIndex !== null ? sampledClips.value[r.clipIndex]?.clipLabel : 'N/A',
      answerDim: appraisalKeys.find(a => a.key === r.dimension)?.label || 'N/A',
      clipMatch,
      dimMatch,
      bothMatch,
    };
  });

  return {
    participant: participantName.value,
    timestamp: new Date().toISOString(),
    sampleSize: sampledClips.value.length,
    totalCards: total,
    clipCorrect,
    dimCorrect,
    bothCorrect,
    clipAccuracy: total > 0 ? (clipCorrect / total * 100).toFixed(1) : '0',
    dimAccuracy: total > 0 ? (dimCorrect / total * 100).toFixed(1) : '0',
    bothAccuracy: total > 0 ? (bothCorrect / total * 100).toFixed(1) : '0',
    perDimension,
    perClip,
    cardDetails,
    clips: sampledClips.value.map(c => ({
      videoFile: c.row.VideoFile,
      gameName: c.row.GameName,
      side: c.side,
      clipLabel: c.clipLabel,
    })),
  };
};

const latestResult = computed(() => {
  if (savedResults.value.length === 0) return null;
  return savedResults.value[savedResults.value.length - 1];
});

const resetTask = () => {
  videoSources.value.forEach(src => {
    if (src && src.startsWith('blob:')) URL.revokeObjectURL(src);
  });
  phase.value = 'setup';
  sampledClips.value = [];
  descriptionCards.value = [];
  Object.keys(responses).forEach(k => delete responses[k]);
  participantName.value = '';
};

const clearHistory = () => {
  localStorage.removeItem('descValidatorResults');
  savedResults.value = [];
};

const downloadResults = () => {
  const data = JSON.stringify(savedResults.value, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `desc_validator_results_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
</script>

<template>
  <div class="validator-container">

    <!-- ==================== SETUP PHASE ==================== -->
    <div v-if="phase === 'setup'" class="setup-phase">
      <h1>Description Distinguishability Test</h1>
      <p class="subtitle">
        Watch video clips and match each shuffled description to its source clip and appraisal dimension.
      </p>

      <div class="setup-card">
        <h3>1. Upload Data</h3>
        <div class="upload-group">
          <label class="file-label csv-btn">
            Upload description.csv
            <input type="file" accept=".csv" @change="handleFileUpload" hidden>
          </label>
          <label class="file-label folder-btn">
            Upload Video Folder
            <input type="file" webkitdirectory directory multiple @change="handleFolderUpload" hidden>
          </label>
        </div>
        <div class="status-info">
          <div v-if="rawData.length">CSV Rows: {{ rawData.length }}</div>
          <div v-if="Object.keys(videoFiles).length">Videos: {{ Object.keys(videoFiles).length }}</div>
        </div>
      </div>

      <div class="setup-card">
        <h3>2. Participant Info</h3>
        <div class="form-group">
          <label>Participant Name / ID</label>
          <input v-model="participantName" type="text" placeholder="Enter name or ID" />
        </div>
        <p class="hint" v-if="rawData.length">{{ SAMPLE_SIZE }} clips will be sampled ({{ SAMPLE_SIZE * 6 }} descriptions total)</p>
      </div>

      <button class="start-btn" :disabled="!canStart" @click="startTask">
        Start Test
      </button>

      <!-- History -->
      <div v-if="savedResults.length > 0" class="setup-card history-card">
        <h3>Previous Results</h3>
        <table class="history-table">
          <thead>
            <tr>
              <th>Participant</th>
              <th>Date</th>
              <th>Clips</th>
              <th>Both Correct</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in savedResults" :key="i">
              <td>{{ r.participant }}</td>
              <td>{{ new Date(r.timestamp).toLocaleString() }}</td>
              <td>{{ r.sampleSize }}</td>
              <td><strong>{{ r.bothAccuracy }}%</strong> ({{ r.bothCorrect }}/{{ r.totalCards }})</td>
            </tr>
          </tbody>
        </table>
        <div class="history-actions">
          <button class="secondary-btn" @click="downloadResults">Download All Results (JSON)</button>
          <button class="danger-btn" @click="clearHistory">Clear History</button>
        </div>
      </div>
    </div>

    <!-- ==================== TASK PHASE ==================== -->
    <div v-else-if="phase === 'task'" class="task-phase">

      <!-- Sticky clip videos at top -->
      <div class="clips-header">
        <div class="clips-title">
          <h2>Video Clips</h2>
          <span class="participant-badge">{{ participantName }}</span>
          <span class="progress-badge">{{ answeredCount }} / {{ descriptionCards.length }} answered</span>
        </div>
        <div class="clips-grid">
          <div v-for="(clip, idx) in sampledClips" :key="idx" class="clip-cell">
            <div class="clip-video-card">
              <div class="clip-label-tag" :style="{ background: `hsl(${idx * 360 / sampledClips.length}, 65%, 45%)` }">
                {{ clip.clipLabel }}
              </div>
              <video v-if="videoSources[idx]" :ref="(el) => setVideoRef(el, idx)"
                :src="videoSources[idx]" muted playsinline
                @loadedmetadata="onMetadataLoaded(idx)"
                @timeupdate="handleTimeUpdate(idx)"></video>
              <div v-else class="no-video-placeholder">No Video</div>
              <button class="play-btn" @click="playClip(idx)" :disabled="!videoSources[idx]"
                :class="{ playing: playingStates[idx] }">
                {{ playingStates[idx] ? 'Playing...' : 'Play' }}
              </button>
            </div>
            <div class="clip-meta">{{ clip.row.GameName }}</div>
          </div>
        </div>
      </div>

      <!-- Instruction -->
      <div class="task-instruction">
        <p><strong>Task:</strong> For each description below, select which <strong>clip</strong> it belongs to and which <strong>appraisal dimension</strong> it describes.</p>
      </div>

      <!-- Description cards -->
      <div class="desc-cards-list">
        <div v-for="(card, idx) in descriptionCards" :key="card.id" class="desc-card"
          :class="{ answered: responses[card.id]?.clipIndex !== null && responses[card.id]?.dimension !== '' }">
          <div class="desc-card-number">{{ idx + 1 }}</div>
          <div class="desc-card-body">
            <p class="desc-text">{{ card.text }}</p>
            <div class="desc-selectors">
              <div class="selector-group">
                <label>Clip:</label>
                <select v-model="responses[card.id].clipIndex">
                  <option :value="null">-- Select Clip --</option>
                  <option v-for="(c, ci) in sampledClips" :key="ci" :value="ci">{{ c.clipLabel }}</option>
                </select>
              </div>
              <div class="selector-group">
                <label>Dimension:</label>
                <select v-model="responses[card.id].dimension">
                  <option value="">-- Select Dimension --</option>
                  <option v-for="a in appraisalKeys" :key="a.key" :value="a.key">{{ a.label }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit -->
      <div class="submit-section">
        <button class="start-btn" :disabled="!allAnswered" @click="finishTask">
          Submit Answers ({{ answeredCount }}/{{ descriptionCards.length }})
        </button>
      </div>
    </div>

    <!-- ==================== RESULT PHASE ==================== -->
    <div v-else-if="phase === 'result' && latestResult" class="result-phase">
      <h1>Results</h1>
      <p class="subtitle">Participant: <strong>{{ latestResult.participant }}</strong> | {{ new Date(latestResult.timestamp).toLocaleString() }}</p>

      <!-- Score cards -->
      <div class="score-grid">
        <div class="score-card">
          <div class="score-label">Clip Match</div>
          <div class="score-big">{{ latestResult.clipAccuracy }}%</div>
          <div class="score-detail">{{ latestResult.clipCorrect }} / {{ latestResult.totalCards }}</div>
        </div>
        <div class="score-card">
          <div class="score-label">Dimension Match</div>
          <div class="score-big">{{ latestResult.dimAccuracy }}%</div>
          <div class="score-detail">{{ latestResult.dimCorrect }} / {{ latestResult.totalCards }}</div>
        </div>
        <div class="score-card accent">
          <div class="score-label">Both Correct</div>
          <div class="score-big">{{ latestResult.bothAccuracy }}%</div>
          <div class="score-detail">{{ latestResult.bothCorrect }} / {{ latestResult.totalCards }}</div>
        </div>
      </div>

      <!-- Per-Dimension -->
      <div class="result-section">
        <h3>Per-Dimension Accuracy</h3>
        <table class="result-table">
          <thead>
            <tr><th>Dimension</th><th>Clip Match</th><th>Dim Match</th><th>Both</th></tr>
          </thead>
          <tbody>
            <tr v-for="a in appraisalKeys" :key="a.key">
              <td><strong>{{ a.label }}</strong></td>
              <td>{{ latestResult.perDimension[a.key].clipCorrect }}/{{ latestResult.perDimension[a.key].total }}</td>
              <td>{{ latestResult.perDimension[a.key].dimCorrect }}/{{ latestResult.perDimension[a.key].total }}</td>
              <td>{{ latestResult.perDimension[a.key].bothCorrect }}/{{ latestResult.perDimension[a.key].total }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Per-Clip -->
      <div class="result-section">
        <h3>Per-Clip Accuracy</h3>
        <table class="result-table">
          <thead>
            <tr><th>Clip</th><th>Game</th><th>Side</th><th>Clip Match</th><th>Dim Match</th><th>Both</th></tr>
          </thead>
          <tbody>
            <tr v-for="(c, i) in latestResult.clips" :key="i">
              <td><strong>{{ c.clipLabel }}</strong></td>
              <td>{{ c.gameName }}</td>
              <td>{{ c.side }}</td>
              <td>{{ latestResult.perClip[i].clipCorrect }}/{{ latestResult.perClip[i].total }}</td>
              <td>{{ latestResult.perClip[i].dimCorrect }}/{{ latestResult.perClip[i].total }}</td>
              <td>{{ latestResult.perClip[i].bothCorrect }}/{{ latestResult.perClip[i].total }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Card-level detail -->
      <div class="result-section">
        <h3>Per-Description Detail</h3>
        <table class="result-table detail-table">
          <thead>
            <tr><th>#</th><th>Description</th><th>Correct Clip</th><th>Answer Clip</th><th>Correct Dim</th><th>Answer Dim</th><th>Result</th></tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in latestResult.cardDetails" :key="i"
              :class="{ 'row-correct': d.bothMatch, 'row-partial': (d.clipMatch || d.dimMatch) && !d.bothMatch, 'row-wrong': !d.clipMatch && !d.dimMatch }">
              <td>{{ i + 1 }}</td>
              <td class="desc-cell">{{ d.text }}</td>
              <td>{{ d.correctClip }}</td>
              <td :class="{ match: d.clipMatch, mismatch: !d.clipMatch }">{{ d.answerClip }}</td>
              <td>{{ d.correctDim }}</td>
              <td :class="{ match: d.dimMatch, mismatch: !d.dimMatch }">{{ d.answerDim }}</td>
              <td>
                <span v-if="d.bothMatch" class="result-badge correct">Both</span>
                <span v-else-if="d.clipMatch" class="result-badge partial">Clip Only</span>
                <span v-else-if="d.dimMatch" class="result-badge partial">Dim Only</span>
                <span v-else class="result-badge wrong">Wrong</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="result-actions">
        <button class="nav-btn primary" @click="resetTask">New Test</button>
        <button class="secondary-btn" @click="downloadResults">Download All Results</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.validator-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 40px;
  font-family: 'Pretendard', sans-serif;
  min-height: 100vh;
  background: #f5f7fa;
}

/* ==================== Setup Phase ==================== */
.setup-phase { max-width: 700px; margin: 0 auto; }
h1 { margin: 0 0 8px; font-size: 2rem; color: #2c3e50; }
h2 { margin: 0; font-size: 1.3rem; color: #2c3e50; }
.subtitle { color: #666; margin: 0 0 30px; font-size: 1rem; }

.setup-card {
  background: white; border-radius: 12px; padding: 25px;
  margin-bottom: 20px; border: 1px solid #ddd;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.setup-card h3 { margin: 0 0 15px; color: #2c3e50; }

.upload-group { display: flex; gap: 10px; flex-wrap: wrap; }
.file-label {
  display: inline-block; text-align: center; padding: 12px 20px;
  border-radius: 8px; cursor: pointer; font-weight: bold;
  font-size: 0.9rem; color: white; transition: 0.2s;
}
.csv-btn { background: #2c3e50; } .csv-btn:hover { background: #34495e; }
.folder-btn { background: #42b883; } .folder-btn:hover { background: #3aa876; }
.status-info { margin-top: 10px; font-size: 0.85rem; color: #42b883; font-weight: bold; }

.form-group { margin-bottom: 15px; }
.form-group label { display: block; font-weight: bold; color: #555; margin-bottom: 5px; font-size: 0.9rem; }
.form-group input {
  width: 100%; padding: 10px 12px; border: 1px solid #ccc;
  border-radius: 6px; font-size: 1rem; box-sizing: border-box;
}
.hint { display: block; margin-top: 5px; font-size: 0.8rem; color: #888; }

.start-btn {
  width: 100%; padding: 16px; font-size: 1.2rem; font-weight: bold;
  background: #42b883; color: white; border: none; border-radius: 10px;
  cursor: pointer; transition: 0.2s; margin-bottom: 30px;
}
.start-btn:hover:not(:disabled) { background: #3aa876; }
.start-btn:disabled { background: #ccc; cursor: not-allowed; }

.history-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.history-table th, .history-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; }
.history-table th { background: #f8f9fa; color: #555; font-weight: bold; }
.history-actions { display: flex; gap: 10px; margin-top: 15px; }

.secondary-btn {
  padding: 10px 16px; border: 1px solid #ccc; background: white;
  border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85rem; color: #555;
}
.secondary-btn:hover { background: #f0f0f0; }
.danger-btn {
  padding: 10px 16px; border: none; background: #e74c3c;
  border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85rem; color: white;
}
.danger-btn:hover { background: #c0392b; }

/* ==================== Task Phase ==================== */
.task-phase { max-width: 1200px; margin: 0 auto; }

.clips-header {
  background: white; border-radius: 12px; padding: 20px;
  border: 1px solid #ddd; margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  position: sticky; top: 0; z-index: 100;
}
.clips-title { display: flex; align-items: center; gap: 12px; margin-bottom: 15px; flex-wrap: wrap; }
.participant-badge { background: #e67e22; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }
.progress-badge { background: #2c3e50; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }

.clips-grid {
  display: flex; gap: 12px; overflow-x: auto; padding-bottom: 5px;
}
.clip-cell { min-width: 280px; flex-shrink: 0; }
.clip-video-card {
  position: relative; background: #000; border-radius: 8px; overflow: hidden;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}
.clip-video-card video { width: 100%; display: block; height: 220px; object-fit: contain; background: #000; }
.no-video-placeholder { height: 220px; display: flex; align-items: center; justify-content: center; color: #666; background: #eee; font-size: 0.8rem; }
.clip-label-tag {
  position: absolute; top: 6px; left: 6px; padding: 3px 10px; border-radius: 4px;
  color: white; font-weight: bold; font-size: 0.75rem; z-index: 5;
}
.play-btn {
  width: 100%; padding: 6px; border: none; background: #f8f9fa;
  cursor: pointer; font-weight: bold; color: #555; font-size: 0.8rem; transition: 0.2s;
}
.play-btn:hover:not(:disabled) { background: #e9ecef; }
.play-btn:disabled { color: #ccc; cursor: not-allowed; }
.play-btn.playing { background: #d0ebff; color: #1864ab; }
.clip-meta { font-size: 0.75rem; color: #888; margin-top: 4px; text-align: center; }

.task-instruction {
  background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px;
  padding: 12px 18px; margin-bottom: 20px; font-size: 0.95rem;
}
.task-instruction p { margin: 0; }

/* Description cards */
.desc-cards-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.desc-card {
  display: flex; gap: 15px; background: white; border-radius: 10px;
  border: 2px solid #e0e0e0; padding: 18px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03); transition: border-color 0.2s;
}
.desc-card.answered { border-color: #42b883; background: #fafffe; }
.desc-card-number {
  width: 36px; height: 36px; flex-shrink: 0;
  background: #e9ecef; border-radius: 50%; display: flex;
  align-items: center; justify-content: center;
  font-weight: 900; color: #555; font-size: 0.9rem;
}
.desc-card.answered .desc-card-number { background: #42b883; color: white; }
.desc-card-body { flex: 1; min-width: 0; }
.desc-text {
  margin: 0 0 12px; font-size: 0.92rem; line-height: 1.6;
  color: #333; white-space: pre-wrap; word-break: break-word;
}

.desc-selectors { display: flex; gap: 15px; flex-wrap: wrap; }
.selector-group { display: flex; align-items: center; gap: 8px; }
.selector-group label { font-weight: bold; font-size: 0.85rem; color: #555; white-space: nowrap; }
.selector-group select {
  padding: 6px 10px; border: 1px solid #ccc; border-radius: 6px;
  font-size: 0.9rem; min-width: 160px;
}

.submit-section { padding-bottom: 40px; }

/* ==================== Result Phase ==================== */
.result-phase { max-width: 1000px; margin: 0 auto; }

.score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
.score-card {
  background: white; border-radius: 16px; padding: 30px; text-align: center;
  border: 1px solid #ddd; box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}
.score-card.accent { border: 2px solid #42b883; background: #f0faf5; }
.score-label { font-size: 0.9rem; color: #888; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
.score-big { font-size: 3rem; font-weight: 900; color: #2c3e50; }
.score-card.accent .score-big { color: #42b883; }
.score-detail { font-size: 1rem; color: #666; margin-top: 3px; }

.result-section {
  background: white; border-radius: 12px; padding: 25px;
  border: 1px solid #ddd; margin-bottom: 20px;
}
.result-section h3 { margin: 0 0 15px; color: #2c3e50; }

.result-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.result-table th, .result-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; }
.result-table th { background: #f8f9fa; color: #555; font-weight: bold; }

.detail-table .desc-cell { max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; color: #666; }
.match { color: #155724; font-weight: bold; }
.mismatch { color: #721c24; }

.row-correct { background: rgba(66,184,131,0.05); }
.row-partial { background: rgba(255,193,7,0.08); }
.row-wrong { background: rgba(231,76,60,0.05); }

.result-badge {
  display: inline-block; padding: 3px 8px; border-radius: 4px;
  font-size: 0.75rem; font-weight: bold;
}
.result-badge.correct { background: #d4edda; color: #155724; }
.result-badge.partial { background: #fff3cd; color: #856404; }
.result-badge.wrong { background: #f8d7da; color: #721c24; }

.result-actions { display: flex; gap: 12px; margin-top: 20px; padding-bottom: 40px; }
.nav-btn {
  padding: 12px 30px; border: 1px solid #ccc; background: white;
  border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1rem;
}
.nav-btn:hover:not(:disabled) { background: #f0f0f0; }
.nav-btn.primary { background: #42b883; color: white; border: none; }
.nav-btn.primary:hover { background: #3aa876; }
</style>