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

const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  const headersLine = lines[0].replace(/^\ufeff/, '').split(',').map(h => h.trim());
  headers.value = headersLine;

  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
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

    // 데이터 유효성 검사 (NaN 제외)
    if (isNaN(time) || isNaN(val)) continue;

    if (!dataMap[sID]) dataMap[sID] = [];
    dataMap[sID].push({ time, val });
  }

  // 시간순 정렬
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

const getClipArousal = (startTime) => {
  if (!isArousalLoaded.value || !currentSessionID.value) return [];
  const sessionData = arousalData.value[currentSessionID.value];
  if (!sessionData) return [];

  const startSec = startTime;
  const endSec = startTime + CLIP_DURATION;

  // 데이터 필터링 + 정렬 보장
  return sessionData.filter(d => d.time >= startSec && d.time <= endSec).sort((a, b) => a.time - b.time);
};

const arousalGraphA = computed(() => getClipArousal(startTimeA.value));
const arousalGraphB = computed(() => getClipArousal(startTimeB.value));

// ====================================================
// 6. 비디오 소스 관리
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

// ====================================================
// 7. 비디오 재생 제어
// ====================================================
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
  { key: 'Novelty', label: 'Novelty' },
  { key: 'GoalRelevance', label: 'Goal Relevance' },
  { key: 'OutcomeProbability', label: 'Outcome Probability' },
  { key: 'GoalConduciveness', label: 'Goal Conduciveness' },
  { key: 'Urgency', label: 'Urgency' },
  { key: 'CopingPotential', label: 'Coping Potential' },
];

// ====================================================
// 8. SVG Path 생성 함수 (강력한 안정성 버전)
// ====================================================
const generatePath = (data, clipStartTime) => {
  // 1. 유효 데이터만 추출 (NaN 제거)
  if (!data) return '';
  const validData = data.filter(d => !isNaN(Number(d.val)) && !isNaN(Number(d.time)));
  if (validData.length === 0) return '';

  const width = 100;
  const height = 100;

  // 2. 기준 시간 설정
  const baseTime = (typeof clipStartTime === 'number' && !isNaN(clipStartTime))
      ? clipStartTime
      : Number(validData[0].time);

  // 3. Min/Max 계산
  const vals = validData.map(d => Number(d.val));
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);

  // 4. 값이 모두 같을 경우 (Flat Line) 전용 처리
  if (maxVal === minVal) {
    // 모든 포인트를 중앙(50)에 찍음
    const points = validData.map(d => {
      let x = ((Number(d.time) - baseTime) / CLIP_DURATION) * width;
      x = Math.max(0, Math.min(width, x));
      return `${x.toFixed(1)},50`;
    });
    return `M ${points.join(' L ')}`;
  }

  // 5. 일반적인 경우 (변화 있음)
  const range = maxVal - minVal;
  const points = validData.map(d => {
    let x = ((Number(d.time) - baseTime) / CLIP_DURATION) * width;
    x = Math.max(0, Math.min(width, x));

    // Y축 정규화 (10% ~ 90% 영역 사용)
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
          📄 1. Crowd Log (CSV)
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
          <div v-if="rawData.length">✅ Crowd Log: {{ rawData.length }} rows</div>
          <div v-if="Object.keys(videoFiles).length">✅ Videos: {{ Object.keys(videoFiles).length }} files</div>
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
        <div
            v-for="(row, idx) in filteredData"
            :key="idx"
            class="list-item"
            :class="{ active: selectedRowIndex === idx }"
            @click="selectedRowIndex = idx"
        >
          <div class="item-header">
            <span class="item-game">{{ row.GameName }}</span>
            <span v-if="videoFiles[row.VideoFile]" class="status-dot ok">●</span>
            <span v-else class="status-dot missing">●</span>
          </div>
          <div class="item-sub">ID: {{ row.ParticipantID }}</div>
          <div class="item-file">{{ row.VideoFile }}</div>
        </div>
      </div>
      <div v-else class="empty-msg">
        Please Load Data Files
      </div>
    </div>

    <div class="main-content">
      <div v-if="currentItem" class="detail-view">
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
              <video v-if="videoSrc"
                     ref="videoRefA" :src="videoSrc" muted playsinline
                     @loadedmetadata="onMetadataLoaded('A')" @timeupdate="handleTimeUpdate('A')"
              ></video>
              <div v-else class="no-video-placeholder">No Video</div>
              <button class="play-btn" @click="playClip('A')" :disabled="!videoSrc" :class="{ playing: isPlayingA }">
                {{ isPlayingA ? 'Playing A...' : '▶ Play Clip A' }}
              </button>
            </div>

            <div class="graph-box">
              <div v-if="arousalGraphA.length > 0" style="width:100%; height:100%">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="arousal-svg">
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#ddd" stroke-width="1" stroke-dasharray="4" />
                  <path :d="generatePath(arousalGraphA, startTimeA)" fill="none" stroke="#42b883" stroke-width="3" />
                </svg>
                <div class="debug-info">
                  Pts: {{ arousalGraphA.length }} / Range: {{ Math.min(...arousalGraphA.map(d=>d.val)).toFixed(2) }}~{{ Math.max(...arousalGraphA.map(d=>d.val)).toFixed(2) }}
                </div>
              </div>
              <div v-else class="no-data">
                No Data (Check Time/ID)
              </div>
            </div>
          </div>

          <div class="video-group">
            <div class="video-card">
              <div class="label-tag tag-b">Clip B ({{ startTimeB.toFixed(1) }}s)</div>
              <video v-if="videoSrc"
                     ref="videoRefB" :src="videoSrc" muted playsinline
                     @loadedmetadata="onMetadataLoaded('B')" @timeupdate="handleTimeUpdate('B')"
              ></video>
              <div v-else class="no-video-placeholder">No Video</div>
              <button class="play-btn" @click="playClip('B')" :disabled="!videoSrc" :class="{ playing: isPlayingB }">
                {{ isPlayingB ? 'Playing B...' : '▶ Play Clip B' }}
              </button>
            </div>

            <div class="graph-box">
              <div v-if="arousalGraphB.length > 0" style="width:100%; height:100%">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="arousal-svg">
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#ddd" stroke-width="1" stroke-dasharray="4" />
                  <path :d="generatePath(arousalGraphB, startTimeB)" fill="none" stroke="#35495e" stroke-width="3" />
                </svg>
                <div class="debug-info">
                  Pts: {{ arousalGraphB.length }} / Range: {{ Math.min(...arousalGraphB.map(d=>d.val)).toFixed(2) }}~{{ Math.max(...arousalGraphB.map(d=>d.val)).toFixed(2) }}
                </div>
              </div>
              <div v-else class="no-data">
                No Data (Check Time/ID)
              </div>
            </div>
          </div>
        </div>

        <div class="result-grid">
          <div v-for="appraisal in appraisalKeys" :key="appraisal.key" class="result-card">
            <div class="card-label">{{ appraisal.label }}</div>
            <div class="choice-display">
              <div class="choice-box a-box" :class="{ selected: currentItem[appraisal.key] === 'A' }">A</div>
              <div class="choice-box b-box" :class="{ selected: currentItem[appraisal.key] === 'B' }">B</div>
            </div>
            <div class="result-text">User chose: <strong>{{ currentItem[appraisal.key] }}</strong></div>
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
/* ✅ 전체 레이아웃: 100vw 대신 100% 사용 (스크롤바 이슈 방지) */
.viewer-container {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  font-family: 'Pretendard', sans-serif;
  background: #f5f7fa;
}

/* 사이드바 */
.sidebar {
  width: 420px;
  min-width: 420px; /* 고정 너비 */
  background: white;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-shadow: 2px 0 5px rgba(0,0,0,0.05);
  z-index: 10;
  height: 100%; /* 높이 꽉 채우기 */
}
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

/* ✅ 메인 컨텐츠 (수정됨) */
.main-content {
  flex: 1;
  min-width: 0; /* ⚠️ 핵심: Flex 자식이 부모보다 커지는 것 방지 (21:9 해결) */
  overflow-y: auto;
  padding: 30px 40px;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.placeholder-view { flex: 1; display: flex; align-items: center; justify-content: center; }
.placeholder-content { font-size: 1.5rem; color: #aaa; font-weight: bold; }

/* ✅ 21:9 대응: 콘텐츠가 너무 퍼지지 않게 중앙 정렬 및 최대 너비 제한 */
.detail-view {
  width: 100%;
  max-width: 1800px; /* 울트라와이드에서 너무 넓어지는 것 방지 */
  margin: 0 auto;    /* 중앙 정렬 */
}

.detail-header { margin-bottom: 30px; border-bottom: 1px solid #ddd; padding-bottom: 20px; }
.header-top { display: flex; align-items: center; gap: 20px; margin-bottom: 10px; }
.header-top h3 { margin: 0; font-size: 2.2rem; color: #2c3e50; }
.pid-badge { font-size: 1.1rem; background: #eee; padding: 6px 12px; border-radius: 6px; color: #555; }
.file-name { color: #7f8c8d; font-size: 1rem; margin: 0; font-family: monospace; display: flex; align-items: center; gap: 10px; }
.error-badge { color: white; background: #e74c3c; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }
.warn-badge { color: #333; background: #f1c40f; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }

.video-grid { display: flex; gap: 30px; margin-bottom: 40px; width: 100%; }
.video-group { flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0; /* 내부 요소 넘침 방지 */ }

.video-card { position: relative; background: #000; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
video { width: 100%; display: block; max-height: 50vh; flex: 1; object-fit: contain; background: #000; }
.no-video-placeholder { height: 300px; display: flex; align-items: center; justify-content: center; color: #666; background: #eee; font-weight: bold; font-size: 1.2rem; }

.label-tag { position: absolute; top: 15px; left: 15px; padding: 8px 16px; border-radius: 6px; color: white; font-weight: bold; font-size: 1rem; z-index: 5; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
.tag-a { background: rgba(66, 184, 131, 0.95); }
.tag-b { background: rgba(53, 73, 94, 0.95); }

.play-btn { width: 100%; padding: 15px; border: none; background: #f8f9fa; cursor: pointer; font-weight: bold; color: #555; border-top: 1px solid #eee; font-size: 1rem; transition: background 0.2s; }
.play-btn:hover:not(:disabled) { background: #e9ecef; }
.play-btn:disabled { color: #ccc; cursor: not-allowed; }
.play-btn.playing { background: #d0ebff; color: #1864ab; }

/* 그래프 박스 */
.graph-box { height: 120px; background: white; border: 1px solid #ddd; border-radius: 8px; position: relative; overflow: hidden; padding: 0; }
.arousal-svg { width: 100%; height: 100%; display: block; }
.no-data { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #bbb; font-size: 0.8rem; background: #f9f9f9; text-align: center; }
.debug-info { position: absolute; bottom: 2px; right: 5px; font-size: 10px; color: #aaa; background: rgba(255,255,255,0.9); padding: 2px 4px; border-radius: 4px; pointer-events: none; }
path { stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }

.result-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 25px; width: 100%; }
.result-card { background: white; padding: 25px; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 4px 10px rgba(0,0,0,0.03); display: flex; flex-direction: column; align-items: center; transition: transform 0.2s; }
.result-card:hover { transform: translateY(-3px); }
.card-label { font-weight: bold; color: #555; margin-bottom: 15px; font-size: 1.2rem; }

.choice-display { display: flex; gap: 20px; margin-bottom: 15px; }
.choice-box { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-weight: bold; color: #ddd; border: 3px solid #eee; font-size: 1.4rem; }
.a-box.selected { background: #42b883; color: white; border-color: #42b883; box-shadow: 0 0 15px rgba(66, 184, 131, 0.5); }
.b-box.selected { background: #35495e; color: white; border-color: #35495e; box-shadow: 0 0 15px rgba(53, 73, 94, 0.5); }
.result-text { font-size: 1.1rem; color: #666; }
</style>