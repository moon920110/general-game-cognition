<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps(['block', 'sessionList', 'gameName', 'isDebug', 'isLoading']);
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
    const randomStartTimeA = Math.random() * (VIDEO_FULL_DURATION - 3) + 3;
    const randomStartTimeB = Math.random() * (VIDEO_FULL_DURATION - 3) + 3;

    items.value.push({
      id: i,
      meta: {
        gameName: props.gameName,
        playerId: randomSession.player_id,
        sessionID: randomSession.session_id,
        videoFile: fileName,
        clipStartTimeA: randomStartTimeA,
        clipStartTimeB: randomStartTimeB,
      },
      url: fullURL,
      isPlayingA: false,
      isPlayingB: false,
      answer1: isDebug ? "A > B" : null, // 설문 응답 1
      answer2: isDebug ? "A > B" : null  // 설문 응답 2
    });
  }
});

const videoRefs = {};
const setVideoRef = (el, id, type) => {
  if (el) {
    const key = `${id}_${type}`;
    videoRefs[key] = el;
    el.onloadedmetadata = () => {
      const item = items.value.find(x => x.id === id);
      if(item) {
        el.currentTime = type === 'A' ? item.meta.clipStartTimeA : item.meta.clipStartTimeB;
      }
    };
  }
};

const handleTimeUpdate = (item, type) => {
  const key = `${item.id}_${type}`;
  const video = videoRefs[key];
  if (!video) return;

  const startTime = type === 'A' ? item.meta.clipStartTimeA : item.meta.clipStartTimeB;
  const endTime = startTime + CLIP_DURATION;

  if (video.currentTime >= endTime) {
    video.pause();
    video.currentTime = startTime;
    if (type === 'A') item.isPlayingA = false;
    else item.isPlayingB = false;
  }
};

const playClip = (item, type) => {
  const key = `${item.id}_${type}`;

  const video = videoRefs[key];
  if (!video) return;

  video.currentTime = type === 'A' ? item.meta.clipStartTimeA : item.meta.clipStartTimeB;
  video.play();

  if (type === 'A') item.isPlayingA = true;
  else item.isPlayingB = true;
};

const submitTask = () => {
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
    <h2>[{{ gameName }}] Pairwise Comparison (Game {{ block + 1 }} / 9)</h2>
    <p class="desc">
      Watch Clip A and Clip B.<br>
      Compare them and select which one shows more of the stated emotion.
    </p>

    <div v-for="(item, idx) in items" :key="item.id" class="item-box">
      <div class="header">
        <span class="round-badge">Round {{ idx + 1 }}</span>
      </div>

      <div class="content-wrapper">

        <div class="video-column">

          <div class="video-card">
            <div class="label-tag tag-a">Clip A</div>
            <video
                :ref="(el) => setVideoRef(el, item.id, 'A')"
                :src="item.url"
                muted playsinline preload="auto"
                @timeupdate="handleTimeUpdate(item, 'A')"
                @play="item.isPlayingA = true"
                @pause="item.isPlayingA = false"
            ></video>
            <button class="replay-btn" @click="playClip(item, 'A')" :class="{ active: item.isPlayingA }">
              {{ item.isPlayingA ? 'Playing A...' : '▶ Play Clip A' }}
            </button>
          </div>

          <div class="video-card">
            <div class="label-tag tag-b">Clip B</div>
            <video
                :ref="(el) => setVideoRef(el, item.id, 'B')"
                :src="item.url"
                muted playsinline preload="auto"
                @timeupdate="handleTimeUpdate(item, 'B')"
                @play="item.isPlayingB = true"
                @pause="item.isPlayingB = false"
            ></video>
            <button class="replay-btn" @click="playClip(item, 'B')" :class="{ active: item.isPlayingB }">
              {{ item.isPlayingB ? 'Playing B...' : '▶ Play Clip B' }}
            </button>
          </div>
        </div>

        <div class="survey-section">

          <div class="q-row">
            <p class="question-text">Q1. Which is more <strong>Exciting</strong>?</p>
            <div class="comparison-group">
              <label :class="{ selected: item.answer1 === 'A > B' }">
                <input type="radio" :name="`q1_${item.id}`" value="A > B" v-model="item.answer1">
                <span>A &gt; B</span>
                <small>A is more</small>
              </label>

              <label :class="{ selected: item.answer1 === 'A < B' }">
                <input type="radio" :name="`q1_${item.id}`" value="A < B" v-model="item.answer1">
                <span>A &lt; B</span>
                <small>B is more</small>
              </label>
            </div>
          </div>

          <div class="divider"></div>

          <div class="q-row">
            <p class="question-text">Q2. Which is more <strong>Positive</strong>?</p>
            <div class="comparison-group">
              <label :class="{ selected: item.answer2 === 'A > B' }">
                <input type="radio" :name="`q2_${item.id}`" value="A > B" v-model="item.answer2">
                <span>A &gt; B</span>
                <small>A is more</small>
              </label>

              <label :class="{ selected: item.answer2 === 'A < B' }">
                <input type="radio" :name="`q2_${item.id}`" value="A < B" v-model="item.answer2">
                <span>A &lt; B</span>
                <small>B is more</small>
              </label>
            </div>
          </div>

        </div>
      </div>
    </div>

    <button
        class="next-btn"
        @click="submitTask"
        :disabled="isLoading"
        :style="{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }"
    >
      <span v-if="isLoading">⏳ Saving Data...</span>
      <span v-else>Submit & Next</span>
    </button>

  </div>
</template>

<style scoped>
/* 기존 스타일 유지 */
.task-container { max-width: 900px; margin: 0 auto; padding-bottom: 50px; }
.desc { color: #888; margin-bottom: 30px; text-align: center; }

.item-box {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 50px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.header { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
.round-badge { background: #333; color: white; padding: 5px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; }

.content-wrapper { display: flex; gap: 30px; align-items: flex-start; }

.video-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 320px;
}

.video-card {
  position: relative;
  background: #f8f9fa;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #eee;
}

video {
  width: 100%;
  border-radius: 6px;
  background: black;
  display: block;
}

.label-tag {
  position: absolute;
  top: 20px; left: 20px;
  padding: 4px 10px;
  color: white;
  font-weight: bold;
  border-radius: 4px;
  z-index: 5;
  font-size: 12px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
.tag-a { background: rgba(66, 184, 131, 0.9); }
.tag-b { background: rgba(53, 73, 94, 0.9); }

.replay-btn {
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  border: 1px solid #eee;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  color: #0d47a1;
  transition: 0.2s;
}
.replay-btn:hover { background: #ccc; }
.replay-btn.active { background: #e3f2fd; border-color: #2196f3; color: #0d47a1; }

.survey-section {
  flex: 1;
  padding-top: 10px;
}

.q-row { margin-bottom: 10px; }
.question-text { font-size: 16px; margin-bottom: 12px; color: #2c3e50; }
.divider { height: 1px; background: #eee; margin: 25px 0; }

.comparison-group {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.comparison-group label {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 15px 5px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}

.comparison-group input { display: none; }

.comparison-group span {
  font-size: 18px;
  font-weight: bold;
  color: #555;
  margin-bottom: 4px;
}

.comparison-group small {
  font-size: 11px;
  color: #999;
}

.comparison-group label:hover { border-color: #bbb; background: #f9f9f9; }

.comparison-group label.selected {
  border-color: #42b883;
  background: #eafff5;
  box-shadow: 0 4px 10px rgba(66, 184, 131, 0.2);
}
.comparison-group label.selected span { color: #42b883; }
.comparison-group label.selected small { color: #2c3e50; font-weight: bold; }

@media (max-width: 768px) {
  .content-wrapper { flex-direction: column; }
  .video-column, .survey-section { width: 100%; }
}

.next-btn {
  width: 100%; padding: 16px; font-size: 18px;
  background: #2c3e50; color: white;
  border-radius: 8px; border: none; cursor: pointer; font-weight: bold;
}
.next-btn:hover { background: #34495e; }
</style>