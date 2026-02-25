<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';

// CSV 데이터 및 로컬 비디오 파일 저장
const rawData = ref([]);
const headers = ref([]);
const videoFiles = ref({});
const videoSrc = ref('');

// Arousal 데이터 저장소
const arousalData = ref({});
const isArousalLoaded = ref(false);

// 필터 상태
const selectedGame = ref('All');
const selectedParticipant = ref('All');
const selectedRowIndex = ref(null);

const CLIP_DURATION = 3;

// ====================================================
// 1. CSV (crowd_log_data) 파싱
// ====================================================
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => parseCSV(e.target.result);
  reader.readAsText(file);
};

// Robust CSV line parser that safely ignores commas inside JSON strings
const parseCSVLine = (text) => {
  const result = [];
  let inQuotes = false;
  let currentVal = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && text[i+1] === '"') {
      currentVal += '"'; // Handle escaped quotes ""
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes; // Toggle quote state
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

const parseCSV = (csvText) => {
  const matches = csvText.match(/(?:[^\n"]|"(?:\\"|[^"])*")+/g);
  const lines = matches ? matches.map(line => line.trim()).filter(line => line) : [];

  if (lines.length < 1) return;

  const headersLine = parseCSVLine(lines[0].replace(/^\ufeff/, ''));
  headers.value = headersLine;

  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headersLine.length) continue;

    const row = {};
    headersLine.forEach((header, index) => row[header] = values[index]);
    parsed.push(row);
  }

  rawData.value = parsed;
  selectedGame.value = 'All';
  selectedParticipant.value = 'All';
  selectedRowIndex.value = null;
};

// ====================================================
// 2. 영상 폴더 업로드
// ====================================================
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
// 3. Arousal Data (clean_data.csv) 파싱
// ====================================================
const handleArousalUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => parseArousalCSV(e.target.result);
  reader.readAsText(file);
};

const parseArousalCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return;

  const headerLine = lines[0].replace(/^\ufeff/, '').split(',').map(h => h.trim());
  const idxSession = headerLine.indexOf('[control]session_id');
  const idxTime = headerLine.indexOf('[control]time_stamp');
  const idxArousal = headerLine.indexOf('[output]arousal');

  if (idxSession === -1 || idxTime === -1 || idxArousal === -1) {
    alert("Error: clean_data.csv columns mismatch.");
    return;
  }

  const dataMap = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length <= idxArousal) continue;

    const sID = cols[idxSession].trim();
    const time = parseFloat(cols[idxTime].trim());
    const val = parseFloat(cols[idxArousal].trim());

    if (isNaN(time) || isNaN(val)) continue;

    if (!dataMap[sID]) dataMap[sID] = [];
    dataMap[sID].push({ time, val });
  }

  for (const sID in dataMap) {
    dataMap[sID].sort((a, b) => a.time - b.time);
  }
  arousalData.value = dataMap;
  isArousalLoaded.value = true;
};

// ====================================================
// 4. 필터링 로직
// ====================================================
const uniqueGames = computed(() => {
  const games = new Set(rawData.value.map(r => r.GameName));
  return ['All', ...Array.from(games).sort()];
});

const uniqueParticipants = computed(() => {
  const pids = new Set(rawData.value.map(r => r.ParticipantID));
  return ['All', ...Array.from(pids)];
});

const filteredData = computed(() => {
  return rawData.value.filter(row => {
    const gameMatch = selectedGame.value === 'All' || row.GameName === selectedGame.value;
    const pidMatch = selectedParticipant.value === 'All' || row.ParticipantID === selectedParticipant.value;
    return gameMatch && pidMatch;
  });
});

const currentItem = computed(() => selectedRowIndex.value !== null ? filteredData.value[selectedRowIndex.value] : null);

// ====================================================
// 5. 데이터 추출
// ====================================================
const currentSessionID = computed(() => {
  if (!currentItem.value) return null;
  const fileName = currentItem.value.VideoFile;
  const parts = fileName.split('_');
  if (parts.length >= 3) {
    return parts[2].replace('.mp4', '');
  }
  return null;
});

const startTimeA = computed(() => {
  if (!currentItem.value) return 0;
  const val = parseFloat(currentItem.value.StartTimeA);
  return isNaN(val) ? 0 : val;
});

const startTimeB = computed(() => {
  if (!currentItem.value) return 0;
  const val = parseFloat(currentItem.value.StartTimeB);
  return isNaN(val) ? 0 : val;
});

// 💡 JSON Parsing logic
const rawAData = computed(() => {
  if (!currentItem.value || !currentItem.value.raw_A) return null;
  try { return JSON.parse(currentItem.value.raw_A); } catch(e) { return null; }
});

const rawBData = computed(() => {
  if (!currentItem.value || !currentItem.value.raw_B) return null;
  try { return JSON.parse(currentItem.value.raw_B); } catch(e) { return null; }
});

const synthData = computed(() => {
  if (!currentItem.value || !currentItem.value.final_desc) return null;
  try { return JSON.parse(currentItem.value.final_desc); } catch(e) { return null; }
});

const getClipArousal = (startTime) => {
  if (!isArousalLoaded.value || !currentSessionID.value) return [];
  const sessionData = arousalData.value[currentSessionID.value];
  if (!sessionData) return [];

  const startSec = startTime;
  const endSec = startTime + CLIP_DURATION;

  return sessionData.filter(d => d.time >= startSec && d.time <= endSec).sort((a, b) => a.time - b.time);
};

const arousalGraphA = computed(() => getClipArousal(startTimeA.value));
const arousalGraphB = computed(() => getClipArousal(startTimeB.value));

// ====================================================
// 6. 비디오 재생 제어
// ====================================================
watch(currentItem, (newItem) => {
  if (videoSrc.value && videoSrc.value.startsWith('blob:')) URL.revokeObjectURL(videoSrc.value);
  if (videoRefA.value) { videoRefA.value.pause(); isPlayingA.value = false; }
  if (videoRefB.value) { videoRefB.value.pause(); isPlayingB.value = false; }

  if (!newItem) {
    videoSrc.value = '';
    return;
  }
  const fileName = newItem.VideoFile;
  const localFile = videoFiles.value[fileName];
  videoSrc.value = localFile ? URL.createObjectURL(localFile) : '';
});

onUnmounted(() => {
  if (videoSrc.value && videoSrc.value.startsWith('blob:')) URL.revokeObjectURL(videoSrc.value);
});

const videoRefA = ref(null);
const videoRefB = ref(null);
const isPlayingA = ref(false);
const isPlayingB = ref(false);

const onMetadataLoaded = (type) => {
  const video = type === 'A' ? videoRefA.value : videoRefB.value;
  const start = type === 'A' ? startTimeA.value : startTimeB.value;
  if (video) video.currentTime = start;
};

const handleTimeUpdate = (type) => {
  const video = type === 'A' ? videoRefA.value : videoRefB.value;
  const start = type === 'A' ? startTimeA.value : startTimeB.value;
  if (video && video.currentTime >= start + CLIP_DURATION) {
    video.pause(); video.currentTime = start;
    type === 'A' ? isPlayingA.value = false : isPlayingB.value = false;
  }
};

const playClip = (type) => {
  const video = type === 'A' ? videoRefA.value : videoRefB.value;
  const start = type === 'A' ? startTimeA.value : startTimeB.value;
  if (video) {
    video.currentTime = start; video.play();
    type === 'A' ? isPlayingA.value = true : isPlayingB.value = true;
  }
};

const appraisalKeys = [
  { key: 'Novelty', jsonKey: 'novelty', label: 'Novelty' },
  { key: 'GoalRelevance', jsonKey: 'goal_relevance', label: 'Goal Relevance' },
  { key: 'OutcomeProbability', jsonKey: 'outcome_probability', label: 'Outcome Probability' },
  { key: 'GoalConduciveness', jsonKey: 'goal_conduciveness', label: 'Goal Conduciveness' },
  { key: 'Urgency', jsonKey: 'urgency', label: 'Urgency' },
  { key: 'CopingPotential', jsonKey: 'coping_potential', label: 'Coping Potential' },
];

// ====================================================
// 7. SVG Path 생성 함수
// ====================================================
const generatePath = (data, clipStartTime) => {
  if (!data) return '';
  const validData = data.filter(d => !isNaN(Number(d.val)) && !isNaN(Number(d.time)));
  if (validData.length === 0) return '';

  const width = 100;
  const height = 100;
  const baseTime = (typeof clipStartTime === 'number' && !isNaN(clipStartTime)) ? clipStartTime : Number(validData[0].time);

  const vals = validData.map(d => Number(d.val));
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);

  if (maxVal === minVal) {
    const points = validData.map(d => {
      let x = ((Number(d.time) - baseTime) / CLIP_DURATION) * width;
      x = Math.max(0, Math.min(width, x));
      return `${x.toFixed(1)},50`;
    });
    return `M ${points.join(' L ')}`;
  }

  const range = maxVal - minVal;
  const points = validData.map(d => {
    let x = ((Number(d.time) - baseTime) / CLIP_DURATION) * width;
    x = Math.max(0, Math.min(width, x));
    let normalizedY = ((Number(d.val) - minVal) / range) * 80 + 10;
    let y = height - normalizedY;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M ${points.join(' L ')}`;
};
</script>

<template>
  <div class="viewer-container">
    <div class="sidebar">
      <h2>📊 Result Explorer</h2>

      <div class="upload-section">
        <label class="file-label csv-btn">
          📄 1. Crowd / Result Log
          <input type="file" accept=".csv" @change="handleFileUpload" hidden>
        </label>
        <label class="file-label folder-btn">
          📂 2. Video Folder
          <input type="file" webkitdirectory directory multiple @change="handleFolderUpload" hidden>
        </label>
        <label class="file-label arousal-btn">
          📈 3. Clean Data (CSV)
          <input type="file" accept=".csv" @change="handleArousalUpload" hidden>
        </label>
        <div class="status-info">
          <div v-if="rawData.length">✅ CSV Rows: {{ rawData.length }}</div>
          <div v-if="Object.keys(videoFiles).length">✅ Videos: {{ Object.keys(videoFiles).length }}</div>
          <div v-if="isArousalLoaded">✅ Arousal Data: Loaded</div>
        </div>
      </div>

      <div class="filter-section" v-if="rawData.length">
        <div class="filter-group">
          <label>Game:</label>
          <select v-model="selectedGame">
            <option v-for="g in uniqueGames" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>ID:</label>
          <select v-model="selectedParticipant">
            <option v-for="p in uniqueParticipants" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
      </div>

      <div class="list-section" v-if="rawData.length">
        <div v-for="(row, idx) in filteredData" :key="idx" class="list-item" :class="{ active: selectedRowIndex === idx }" @click="selectedRowIndex = idx">
          <div class="item-header">
            <span class="item-game">{{ row.GameName }}</span>
            <span v-if="videoFiles[row.VideoFile]" class="status-dot ok">●</span>
            <span v-else class="status-dot missing">●</span>
          </div>
          <div class="item-sub">ID: {{ row.ParticipantID }}</div>
          <div class="item-file">{{ row.VideoFile }}</div>
        </div>
      </div>
      <div v-else class="empty-msg">Please Load Data Files</div>
    </div>

    <div class="main-content">
      <div v-if="currentItem" class="detail-view">

        <div class="fixed-top-section">
          <header class="detail-header">
            <div class="header-top">
              <h3>{{ currentItem.GameName }}</h3>
              <span class="pid-badge">Participant: {{ currentItem.ParticipantID }}</span>
            </div>
            <p class="file-name">
              {{ currentItem.VideoFile }}
              <span v-if="!videoSrc" class="error-badge">Video Not Found</span>
              <span v-if="!isArousalLoaded" class="warn-badge">Arousal Data Missing</span>
            </p>
          </header>

          <div class="video-grid">
            <div class="video-group">
              <div class="video-card">
                <div class="label-tag tag-a">Clip A ({{ startTimeA.toFixed(1) }}s)</div>
                <video v-if="videoSrc" ref="videoRefA" :src="videoSrc" muted playsinline @loadedmetadata="onMetadataLoaded('A')" @timeupdate="handleTimeUpdate('A')"></video>
                <div v-else class="no-video-placeholder">No Video</div>
                <button class="play-btn" @click="playClip('A')" :disabled="!videoSrc" :class="{ playing: isPlayingA }">{{ isPlayingA ? 'Playing A...' : '▶ Play Clip A' }}</button>
              </div>
              <div class="graph-box">
                <div v-if="arousalGraphA.length > 0" style="width:100%; height:100%">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="arousal-svg">
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#ddd" stroke-width="1" stroke-dasharray="4" />
                    <path :d="generatePath(arousalGraphA, startTimeA)" fill="none" stroke="#42b883" stroke-width="3" />
                  </svg>
                </div>
                <div v-else class="no-data">No Data</div>
              </div>
            </div>

            <div class="video-group">
              <div class="video-card">
                <div class="label-tag tag-b">Clip B ({{ startTimeB.toFixed(1) }}s)</div>
                <video v-if="videoSrc" ref="videoRefB" :src="videoSrc" muted playsinline @loadedmetadata="onMetadataLoaded('B')" @timeupdate="handleTimeUpdate('B')"></video>
                <div v-else class="no-video-placeholder">No Video</div>
                <button class="play-btn" @click="playClip('B')" :disabled="!videoSrc" :class="{ playing: isPlayingB }">{{ isPlayingB ? 'Playing B...' : '▶ Play Clip B' }}</button>
              </div>
              <div class="graph-box">
                <div v-if="arousalGraphB.length > 0" style="width:100%; height:100%">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="arousal-svg">
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#ddd" stroke-width="1" stroke-dasharray="4" />
                    <path :d="generatePath(arousalGraphB, startTimeB)" fill="none" stroke="#35495e" stroke-width="3" />
                  </svg>
                </div>
                <div v-else class="no-data">No Data</div>
              </div>
            </div>
          </div>
        </div>

        <div class="llm-scroll-area">
          <div class="llm-results-container">

            <div class="sticky-header">
              <h2>Phase 1: Clinical Event Logs</h2>
            </div>
            <div class="llm-result-card phase-1-card" v-if="rawAData?.description || rawBData?.description">
              <div class="llm-comparison-grid">
                <div class="llm-side llm-a-side">
                  <div class="llm-box raw-box">
                    <span class="badge">Event Log A</span>
                    <p class="pre-wrap">{{ rawAData?.description || 'No Event Log Data for A' }}</p>
                  </div>
                </div>
                <div class="llm-side llm-b-side">
                  <div class="llm-box raw-box">
                    <span class="badge">Event Log B</span>
                    <p class="pre-wrap">{{ rawBData?.description || 'No Event Log Data for B' }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="sticky-header">
              <h2>Phase 2: Appraisal Synthesis</h2>
            </div>
            <div v-for="appraisal in appraisalKeys" :key="appraisal.key" class="llm-result-card">
              <div class="llm-card-header">
                <h4 class="card-label">{{ appraisal.label }}</h4>
                <div class="human-label-badge">
                  Human Vote: <strong :class="{'text-a': currentItem[appraisal.key] === 'A', 'text-b': currentItem[appraisal.key] === 'B'}">{{ currentItem[appraisal.key] || 'N/A' }}</strong>
                </div>
              </div>

              <div v-if="synthData">
                <div class="llm-unified-rationale">
                  <span class="badge synth-badge">Unified Rationale</span>
                  <p class="rationale-text pre-wrap">{{ synthData?.[appraisal.jsonKey]?.rationale || 'No rationale data available' }}</p>
                </div>

                <div class="llm-comparison-grid mt-3">
                  <div class="llm-side llm-a-side" :class="{ 'is-winner': currentItem[appraisal.key] === 'A' }">
                    <div class="llm-box synth-box">
                      <span class="badge synth-badge">Refined Description A</span>
                      <p class="pre-wrap">{{ synthData?.[appraisal.jsonKey]?.description_A || 'No data' }}</p>
                    </div>
                  </div>

                  <div class="llm-side llm-b-side" :class="{ 'is-winner': currentItem[appraisal.key] === 'B' }">
                    <div class="llm-box synth-box">
                      <span class="badge synth-badge">Refined Description B</span>
                      <p class="pre-wrap">{{ synthData?.[appraisal.jsonKey]?.description_B || 'No data' }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="no-llm-data">
                <p>No Appraisal Synthesis data available for this clip.</p>
              </div>
            </div>

          </div>
        </div>

      </div>
      <div v-else class="placeholder-view">
        <div class="placeholder-content">👈 Select an item from the sidebar</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Basic Layout */
.viewer-container { display: flex; width: 100%; height: 100vh; overflow: hidden; font-family: 'Pretendard', sans-serif; background: #f5f7fa; }
.sidebar { width: 420px; min-width: 420px; background: white; border-right: 1px solid #ddd; display: flex; flex-direction: column; padding: 20px; box-shadow: 2px 0 5px rgba(0,0,0,0.05); z-index: 10; height: 100%; }
h2 { margin: 0 0 20px 0; font-size: 1.5rem; color: #333; }
.upload-section { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
.file-label { display: block; text-align: center; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; font-size: 0.9rem; color: white; }
.csv-btn { background: #2c3e50; } .csv-btn:hover { background: #34495e; }
.folder-btn { background: #42b883; } .folder-btn:hover { background: #3aa876; }
.arousal-btn { background: #e67e22; } .arousal-btn:hover { background: #d35400; }
.status-info { font-size: 0.8rem; color: #666; margin-top: 5px; }
.filter-section { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee; }
.filter-group { display: flex; align-items: center; margin-bottom: 8px; justify-content: space-between; }
.filter-group label { font-size: 0.9rem; font-weight: bold; color: #555; }
.filter-group select { padding: 6px; border: 1px solid #ccc; border-radius: 4px; width: 70%; }
.list-section { flex: 1; overflow-y: auto; border: 1px solid #eee; border-radius: 6px; }
.list-item { padding: 15px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: 0.2s; }
.list-item:hover { background: #f9f9f9; }
.list-item.active { background: #eafff5; border-left: 5px solid #42b883; }
.item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.item-game { font-weight: bold; color: #333; font-size: 1rem; }
.status-dot { font-size: 0.8rem; }
.status-dot.ok { color: #42b883; } .status-dot.missing { color: #e74c3c; }
.item-sub { font-size: 0.85rem; color: #555; margin-bottom: 4px; }
.item-file { font-size: 0.75rem; color: #999; word-break: break-all; line-height: 1.2; font-family: monospace; }
.empty-msg { color: #999; text-align: center; margin-top: 50px; font-size: 1rem; }

.main-content { flex: 1; min-width: 0; padding: 30px 40px 0 40px; display: flex; flex-direction: column; background: #f5f7fa; overflow: hidden; }
.placeholder-view { flex: 1; display: flex; align-items: center; justify-content: center; }
.placeholder-content { font-size: 1.5rem; color: #aaa; font-weight: bold; }
.detail-view { width: 100%; max-width: 1800px; margin: 0 auto; display: flex; flex-direction: column; height: 100%; }

.fixed-top-section { flex-shrink: 0; }
.detail-header { margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 15px; }
.header-top { display: flex; align-items: center; gap: 20px; margin-bottom: 10px; }
.header-top h3 { margin: 0; font-size: 2.2rem; color: #2c3e50; }
.pid-badge { font-size: 1.1rem; background: #eee; padding: 6px 12px; border-radius: 6px; color: #555; }
.file-name { color: #7f8c8d; font-size: 1rem; margin: 0; font-family: monospace; display: flex; align-items: center; gap: 10px; }
.error-badge { color: white; background: #e74c3c; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }
.warn-badge { color: #333; background: #f1c40f; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }

.video-grid { display: flex; gap: 30px; margin-bottom: 15px; width: 100%; }
.video-group { flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.video-card { position: relative; background: #000; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
video { width: 100%; display: block; max-height: 40vh; flex: 1; object-fit: contain; background: #000; }
.no-video-placeholder { height: 250px; display: flex; align-items: center; justify-content: center; color: #666; background: #eee; font-weight: bold; font-size: 1.2rem; }
.label-tag { position: absolute; top: 15px; left: 15px; padding: 8px 16px; border-radius: 6px; color: white; font-weight: bold; font-size: 1rem; z-index: 5; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
.tag-a { background: rgba(66, 184, 131, 0.95); }
.tag-b { background: rgba(53, 73, 94, 0.95); }
.play-btn { width: 100%; padding: 12px; border: none; background: #f8f9fa; cursor: pointer; font-weight: bold; color: #555; border-top: 1px solid #eee; font-size: 1rem; transition: background 0.2s; }
.play-btn:hover:not(:disabled) { background: #e9ecef; }
.play-btn:disabled { color: #ccc; cursor: not-allowed; }
.play-btn.playing { background: #d0ebff; color: #1864ab; }

.graph-box { height: 80px; background: white; border: 1px solid #ddd; border-radius: 8px; position: relative; overflow: hidden; padding: 0; }
.arousal-svg { width: 100%; height: 100%; display: block; }
.no-data { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #bbb; font-size: 0.8rem; background: #f9f9f9; text-align: center; }
path { stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }

.llm-scroll-area { flex: 1; overflow-y: auto; padding-right: 15px; padding-bottom: 30px; }
.llm-scroll-area::-webkit-scrollbar { width: 8px; }
.llm-scroll-area::-webkit-scrollbar-track { background: transparent; }
.llm-scroll-area::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.llm-scroll-area::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

.sticky-header { position: sticky; top: 0; background: #f5f7fa; padding: 15px 0 10px 0; z-index: 10; border-bottom: 2px solid #ddd; margin-bottom: 20px; }
.sticky-header h2 { margin: 0; }

.llm-results-container { display: flex; flex-direction: column; gap: 20px; width: 100%; }
.llm-result-card { background: white; border-radius: 12px; border: 1px solid #ddd; padding: 25px; box-shadow: 0 4px 10px rgba(0,0,0,0.03); }
.phase-1-card { background: #fafafa; border: 2px dashed #ccc; }

.llm-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #eee; }
.llm-card-header h4 { margin: 0; font-size: 1.4rem; color: #2c3e50; }
.human-label-badge { background: #f1f3f5; padding: 8px 16px; border-radius: 6px; font-size: 1rem; color: #333; }
.text-a { color: #42b883; font-weight: 900; }
.text-b { color: #35495e; font-weight: 900; }

/* 💡 NEW: Unified Rationale Box Styles */
.llm-unified-rationale {
  background: rgba(0, 102, 204, 0.03);
  border: 1px solid rgba(0, 102, 204, 0.2);
  border-left: 4px solid #0066cc;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 15px;
}
.mt-3 { margin-top: 15px; }

.llm-comparison-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.llm-side { padding: 20px; border-radius: 8px; border: 2px solid transparent; }
.llm-side.is-winner { border-color: #42b883; background: rgba(66, 184, 131, 0.05); }
.llm-b-side.is-winner { border-color: #35495e; background: rgba(53, 73, 94, 0.05); }

.llm-box { background: white; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.raw-box { border-left: 4px solid #aaa; }
.synth-box { border-left: 4px solid #0066cc; }

.badge { display: inline-block; font-size: 0.75rem; font-weight: bold; padding: 3px 8px; border-radius: 4px; background: #eee; color: #555; margin-bottom: 8px; text-transform: uppercase; }
.synth-badge { background: #e6f2ff; color: #0066cc; }

.pre-wrap { white-space: pre-wrap; word-break: break-word; }
.llm-box p { margin: 0; font-size: 0.95rem; line-height: 1.5; color: #444; }
.llm-unified-rationale p { margin: 0; font-size: 0.95rem; line-height: 1.6; }
.rationale-text { font-style: italic; color: #1864ab; }
.mt-2 { margin-top: 15px; }
.no-llm-data { padding: 20px; text-align: center; color: #888; background: #f9f9f9; border-radius: 8px; font-style: italic; }
</style>