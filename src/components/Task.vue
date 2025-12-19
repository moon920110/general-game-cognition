<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps(['block', 'sessionList', 'gameName', 'isDebug']);
const emit = defineEmits(['submit', 'skip-to-end']);

const items = ref([]);
const isDebug = props.isDebug;

const S3_BASE_URL = "https://general-game-cognition.s3.amazonaws.com/videos_mp4";
const CACHE_URL = "/Users/supermoon/Documents/Research/Affective AI/AGAIN/videos"
const VIDEO_FULL_DURATION = 120;
const CLIP_DURATION = 3;
const gameCodeMap = {
  "TinyCars": "tiny",
  "Solid": "solid",
  "ApexSpeed": "apex",
  "Heist!": "fps",
  "Shootout": "gallery",
  "TopDown": "topdown",
  "Run'N'Gun": "gun",
  "Pirates!": "platform",
  "Endless": "endless"
};

onMounted(() => {
  if (!props.sessionList || props.sessionList.length === 0) {
    alert(`ERROR: [${props.gameName}] No game data.`)
    return;
  }

  const randomSession = props.sessionList[Math.floor(Math.random() * props.sessionList.length)];
  const gameCode = gameCodeMap[props.gameName];
  const fileName = `${randomSession.player_id}_${gameCode}_${randomSession.session_id}.mp4`;
  const fullURL = isDebug ? `${CACHE_URL}/${fileName}` : `${S3_BASE_URL}/${fileName}`;

  for (let i = 1; i <= 10; i++) {
    const randomStartTime = Math.random() * (VIDEO_FULL_DURATION - 3) + 3;

    items.value.push({
      id: i,
      meta: {
        gameName: props.gameName,
        playerId: randomSession.player_id,
        sessionID: randomSession.session_id,
        videoFile: fileName,
        clipStartTime: randomStartTime
      },
      url: fullURL,
      answer1: isDebug ? 1 : null, // 설문 응답 1
      answer2: isDebug ? 1 : null  // 설문 응답 2
    });
  }
});

const videoRefs = {};
const setVideoRef = (el, id) => {
  if (el) {
    videoRefs[id] = el;
    el.onloadedmetadata = () => {
      const item = items.value.find(x => x.id === id);
      if(item) el.currentTime = item.meta.clipStartTime;
    };
  }
};

const handleTimeUpdate = (item) => {
  const video = videoRefs[item.id];
  if (!video) return;

  const endTime = item.meta.clipStartTime + CLIP_DURATION;

  if (video.currentTime >= endTime) {
    video.pause();
    video.currentTime = item.meta.clipStartTime;
    item.isPlaying = false;
  }
};

const playClip = (item) => {
  const video = videoRefs[item.id];
  if (!video) return;

  video.currentTime = item.meta.clipStartTime;
  video.play();
  item.isPlaying = true;
};

const submitTask = () => {
  // 유효성 검사 (모두 응답했는지)
  const allAnswered = items.value.every(item => item.answer1 && item.answer2);
  if (!allAnswered) {
    alert("Please answer every item.");
    return;
  }

  const results = items.value.map(item => ({
    ...item.meta,

    ans1: item.answer1,
    ans2: item.answer2,

    timestamp: new Date().toISOString()
  }));
  emit('submit', results);
};
</script>

<template>
  <div class="task-container">
    <h2>[{{ gameName }}] Annotation (Game {{ block + 1 }} / 9)</h2>
    <p class="desc">
      Click the play button to watch a 3-second clip.<br>
      You can replay it as many times as you need.
    </p>

    <div v-for="(item, idx) in items" :key="item.id" class="item-box">
      <div class="header">
        <span class="badge">Clip {{ idx + 1 }}</span>
      </div>

      <div class="content-wrapper">
        <div class="video-section">
          <video
              :ref="(el) => setVideoRef(el, item.id)"
              :src="item.url"
              width="100%"
              controls
              muted
              playsinline
              preload="metadata"
              @timeupdate="handleTimeUpdate(item)"
              @play="item.isPlaying = true"
              @pause="item.isPlaying = false"
          ></video>

          <button class="replay-btn" @click="playClip(item)">
            <span v-if="item.isPlaying">⏹ Playing...</span>
            <span v-else>▶️ Play Clip (3s)</span>
          </button>
        </div>

        <div class="survey-section">
          <div class="q-row">
            <p class="question-text">Q1. How <strong>Exciting</strong> is this moment?</p>
            <div class="scale-group">
              <label v-for="n in 5" :key="n" :class="{ selected: item.answer1 === n }">
                <input type="radio" :name="`q1_${gameName}_${item.id}`" :value="n" v-model="item.answer1">
                <span>{{ n }}</span>
              </label>
            </div>
            <div class="labels">
              <span>Not at all</span>
              <span>Very Exciting</span>
            </div>
          </div>

          <div class="q-row">
            <p class="question-text">Q2. How <strong>Positive</strong> is this moment?</p>
            <div class="scale-group">
              <label v-for="n in 5" :key="n" :class="{ selected: item.answer2 === n }">
                <input type="radio" :name="`q2_${gameName}_${item.id}`" :value="n" v-model="item.answer2">
                <span>{{ n }}</span>
              </label>
            </div>
            <div class="labels">
              <span>Very Negative</span>
              <span>Very Positive</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button class="next-btn" @click="submitTask">Submit & Next</button>
    <div v-if="isDebug" class="debug-panel">
      <span>🛠 Debug Tool: </span>

      <button @click="$emit('skip-to-end')" class="debug-btn jump-btn">
        🚀 Jump to End (Force Finish)
      </button>
    </div>
  </div>
</template>

<style scoped>
.task-container { max-width: 800px; margin: 0 auto; }
.desc { color: #ddd; margin-bottom: 30px; line-height: 1.5; }

.item-box {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 40px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.header { display: flex; justify-content: space-between; margin-bottom: 15px; }
.badge { background: #42b883; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px; }

.content-wrapper { display: flex; gap: 20px; flex-wrap: wrap; }
.video-section { flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 10px; }
.survey-section { flex: 1; min-width: 300px; }

video { border-radius: 8px; background: #000; width: 100%; aspect-ratio: 16/9; }

.replay-btn {
  padding: 12px; background-color: #f8f9fa; border: 1px solid #dee2e6;
  border-radius: 6px; cursor: pointer; font-weight: bold; color: #495057;
  transition: all 0.2s;
}
.replay-btn:hover { background-color: #e9ecef; }

.q-row { margin-bottom: 25px; }

/* ✅ [해결] 질문 텍스트 색상을 진한 회색(#333)으로 강제 지정 */
.question-text {
  color: #333 !important;
  font-weight: bold;
  margin-bottom: 8px;
  margin-top: 0;
}

.scale-group { display: flex; justify-content: space-between; background: #f8f9fa; padding: 10px; border-radius: 8px; }
.scale-group label { flex: 1; text-align: center; cursor: pointer; }
.scale-group input { display: none; }
.scale-group span { display: block; width: 30px; height: 30px; line-height: 30px; margin: 0 auto; border-radius: 50%; transition: 0.2s; color: #555; font-weight: bold; }

.scale-group label.selected span { background: #42b883; color: white; transform: scale(1.1); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }

.labels { display: flex; justify-content: space-between; font-size: 12px; color: #888; margin-top: 5px; padding: 0 5px; }

.next-btn { width: 100%; padding: 16px; font-size: 18px; background: #2c3e50; color: white; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; margin-top: 20px; }
.next-btn:hover { background: #34495e; }

</style>