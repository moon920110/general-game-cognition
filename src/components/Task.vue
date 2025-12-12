<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps(['block', 'sessionList', 'gameName']);
const emit = defineEmits(['submit']);

// 실제로는 videoData.js 등에서 가져오거나 S3 URL 규칙대로 생성
// 여기서는 예시로 10개 생성
const items = ref([]);

const S3_BASE_URL = "https://general-game-cognition.s3.amazonaws.com/videos_mp4";
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
  const fullURL = `${S3_BASE_URL}/${fileName}`;

  for (let i = 1; i <= 10; i++) {
    const randomStartTime = Math.random() * (VIDEO_FULL_DURATION);

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
      answer1: null, // 설문 응답 1
      answer2: null  // 설문 응답 2
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
    <h2>[{{ gameName }}] 영상 평가 ({{ blockIndex + 1 }}세트)</h2>
    <p class="desc">재생 버튼을 누르면 3초간 재생되고 자동으로 멈춥니다. 원하는 만큼 다시 볼 수 있습니다.</p>

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
            <span v-if="item.isPlaying">⏹ 재생 중...</span>
            <span v-else>▶️ 영상 재생 (3초)</span>
          </button>
        </div>

        <div class="survey-section">
          <div class="q-row">
            <p>Q1. 얼마나 흥미진진(Exciting)한가요?</p>
            <div class="scale-group">
              <label v-for="n in 5" :key="n" :class="{ selected: item.answer1 === n }">
                <input type="radio" :name="`q1_${gameName}_${item.id}`" :value="n" v-model="item.answer1">
                <span>{{ n }}</span>
              </label>
            </div>
            <div class="labels"><span>전혀 아님</span><span>매우 흥미로움</span></div>
          </div>

          <div class="q-row">
            <p>Q2. 얼마나 긍정적(Positive)인가요?</p>
            <div class="scale-group">
              <label v-for="n in 5" :key="n" :class="{ selected: item.answer2 === n }">
                <input type="radio" :name="`q2_${gameName}_${item.id}`" :value="n" v-model="item.answer2">
                <span>{{ n }}</span>
              </label>
            </div>
            <div class="labels"><span>매우 부정적</span><span>매우 긍정적</span></div>
          </div>
        </div>
      </div>
    </div>

    <button class="next-btn" @click="submitTask">다음 세트로 이동</button>
  </div>
</template>

<style scoped>
/* 기존 스타일 유지 + 버튼 스타일 추가 */
.task-container { max-width: 800px; margin: 0 auto; }
.desc { color: #666; margin-bottom: 30px; }
.item-box { background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 20px; margin-bottom: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.header { display: flex; justify-content: space-between; margin-bottom: 15px; }
.badge { background: #42b883; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px; }
.content-wrapper { display: flex; gap: 20px; flex-wrap: wrap; }
.video-section { flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 10px; }
.survey-section { flex: 1; min-width: 300px; }
video { border-radius: 8px; background: #000; width: 100%; aspect-ratio: 16/9; }

/* 재생 버튼 스타일 */
.replay-btn {
  padding: 10px; background-color: #f0f0f0; border: 1px solid #ccc;
  border-radius: 6px; cursor: pointer; font-weight: bold; color: #333;
  transition: background 0.2s;
}
.replay-btn:hover { background-color: #e0e0e0; }

.q-row { margin-bottom: 25px; }
.scale-group { display: flex; justify-content: space-between; background: #f8f9fa; padding: 10px; border-radius: 8px; }
.scale-group label { flex: 1; text-align: center; cursor: pointer; }
.scale-group input { display: none; }
.scale-group span { display: block; width: 30px; height: 30px; line-height: 30px; margin: 0 auto; border-radius: 50%; transition: 0.2s; color: #555; font-weight: bold; }
.scale-group label.selected span { background: #42b883; color: white; transform: scale(1.1); }
.labels { display: flex; justify-content: space-between; font-size: 12px; color: #888; margin-top: 5px; padding: 0 5px; }
.next-btn { width: 100%; padding: 16px; font-size: 18px; background: #2c3e50; color: white; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; }
.next-btn:hover { background: #34495e; }
</style>