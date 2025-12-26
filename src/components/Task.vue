<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps(['block', 'sessionList', 'gameName', 'isDebug', 'isLoading']);
const emit = defineEmits(['submit', 'skip-to-end']);

const items = ref([]);
const isDebug = props.isDebug;

const S3_BASE_URL = import.meta.env.VITE_S3_BASE_URL || "https://general-game-cognition.s3.amazonaws.com/videos_mp4";
const CACHE_URL = "/Users/supermoon/Documents/Research/Affective AI/AGAIN/videos";

const VIDEO_FULL_DURATION = 120;
const CLIP_DURATION = 3;

const gameCodeMap = {
  "TinyCars": "tiny", "Solid": "solid", "ApexSpeed": "apex", "Heist!": "fps",
  "Shootout": "gallery", "TopDown": "topdown", "Run'N'Gun": "gun",
  "Pirates!": "platform", "Endless": "endless"
};

const APPRAISAL_QUESTIONS = [
  {
    key: 'novelty',
    label: 'Novelty (Unexpectedness)',
    desc: 'Which clip shows a situation that is more <strong>unexpected</strong>?'
  },
  {
    key: 'goal_relevance',
    label: 'Goal Relevance',
    desc: 'In which clip is the situation more <strong>relevant</strong> to the game\'s goal?'
  },
  {
    key: 'outcome_probability',
    label: 'Outcome Probability',
    desc: 'In which clip is the <strong>consequence</strong> more <strong>predictable</strong>?'
  },
  {
    key: 'goal_conduciveness',
    label: 'Goal Conduciveness',
    desc: 'Which clip shows a situation that is more <strong>helpful</strong> to achieving the game\'s goal?'
  },
  {
    key: 'urgency',
    label: 'Urgency',
    desc: 'Which clip feels more <strong>urgent</strong> regarding the game\'s goal?'
  },
  {
    key: 'coping_potential',
    label: 'Coping Potential',
    desc: 'In which clip do you feel more <strong>capable</strong> of handling the situation (due to <strong>control</strong> or <strong>resources</strong>)?'
  }
];

onMounted(() => {
  if (!props.sessionList || props.sessionList.length === 0) {
    alert(`ERROR: [${props.gameName}] No game data.`);
    return;
  }
  const randomSession = props.sessionList[Math.floor(Math.random() * props.sessionList.length)];
  const gameCode = gameCodeMap[props.gameName];
  const fileName = `${randomSession.player_id}_${gameCode}_${randomSession.session_id}.mp4`;
  const fullURL = isDebug ? `${CACHE_URL}/${fileName}` : `${S3_BASE_URL}/${fileName}`;

  for (let i = 1; i <= 10; i++) {
    const rStartA = Math.random() * (VIDEO_FULL_DURATION - CLIP_DURATION - 2) + 2;
    const rStartB = Math.random() * (VIDEO_FULL_DURATION - CLIP_DURATION - 2) + 2;
    const initialAnswers = {};
    APPRAISAL_QUESTIONS.forEach(q => initialAnswers[q.key] = isDebug ? "A" : null);

    items.value.push({
      id: i,
      meta: {
        gameName: props.gameName, playerId: randomSession.player_id, sessionID: randomSession.session_id,
        videoFile: fileName, clipStartTimeA: rStartA, clipStartTimeB: rStartB,
      },
      url: fullURL, isPlayingA: false, isPlayingB: false, answers: initialAnswers
    });
  }
});

/* Video Logic */
const videoRefs = {};
const setVideoRef = (el, id, type) => {
  if (el) {
    const key = `${id}_${type}`;
    videoRefs[key] = el;
    el.onloadedmetadata = () => {
      const item = items.value.find(x => x.id === id);
      if (item) el.currentTime = type === 'A' ? item.meta.clipStartTimeA : item.meta.clipStartTimeB;
    };
  }
};
const handleTimeUpdate = (item, type) => {
  const key = `${item.id}_${type}`;
  const video = videoRefs[key];
  if (!video) return;
  const sTime = type === 'A' ? item.meta.clipStartTimeA : item.meta.clipStartTimeB;
  if (video.currentTime >= sTime + CLIP_DURATION) {
    video.pause(); video.currentTime = sTime;
    type === 'A' ? item.isPlayingA = false : item.isPlayingB = false;
  }
};
const playClip = (item, type) => {
  const key = `${item.id}_${type}`;
  const video = videoRefs[key];
  if (!video) return;
  video.currentTime = type === 'A' ? item.meta.clipStartTimeA : item.meta.clipStartTimeB;
  video.play();
  type === 'A' ? item.isPlayingA = true : item.isPlayingB = true;
};

/* Submit Logic */
const submitTask = () => {
  const allAnswered = items.value.every(item => Object.values(item.answers).every(val => val !== null));
  if (!allAnswered) {
    alert("Please answer all questions for every round.");
    return;
  }
  const results = items.value.map(item => ({
    ...item.meta, ...item.answers, timestamp: new Date().toISOString()
  }));
  console.log(results)
  emit('submit', results);
};
</script>

<template>
  <div class="task-container">
    <h2>[{{ gameName }}] Appraisal Evaluation (Game {{ block + 1 }} / 9)</h2>
    <p class="desc">
      Watch Clip A and Clip B.<br>
      Compare them based on the 8 questions below.
    </p>

    <div v-for="(item, idx) in items" :key="item.id" class="item-box">
      <div class="header">
        <span class="round-badge">Round {{ idx + 1 }}</span>
      </div>

      <div class="content-wrapper">

        <div class="video-section">
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
          <div class="questions-grid">
            <div
                v-for="(question, qIdx) in APPRAISAL_QUESTIONS"
                :key="question.key"
                class="q-block"
            >
              <div class="text-area">
                <p class="question-text">
                  <span class="q-num">Q{{ qIdx + 1 }}.</span>
                  <strong>{{ question.label }}</strong>
                </p>
                <p class="question-desc" v-html="question.desc"></p>
              </div>

              <div class="comparison-group">
                <label :class="{ selected: item.answers[question.key] === 'A' }">
                  <input type="radio" :name="`${question.key}_${item.id}`" value="A" v-model="item.answers[question.key]">
                  <span>A</span>
                  <small>is More</small>
                </label>

                <label :class="{ selected: item.answers[question.key] === 'B' }">
                  <input type="radio" :name="`${question.key}_${item.id}`" value="B" v-model="item.answers[question.key]">
                  <span>B</span>
                  <small>is More</small>
                </label>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <button class="next-btn" @click="submitTask" :disabled="isLoading">
      <span v-if="isLoading">⏳ Saving Data...</span>
      <span v-else>Submit & Next</span>
    </button>

  </div>
</template>

<style scoped>
.task-container { max-width: 1200px; margin: 0 auto; padding-bottom: 50px; }
.desc { color: #555; margin-bottom: 30px; text-align: center; }

.item-box {
  background: white; border: 1px solid #e0e0e0; border-radius: 12px;
  padding: 30px; margin-bottom: 50px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.header { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
.round-badge { background: #333; color: white; padding: 5px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; }

.content-wrapper { display: flex; flex-direction: column; gap: 25px; }

.video-section {
  display: flex; gap: 20px; justify-content: center;
}
.video-card {
  flex: 1; max-width: 450px; /* 너무 커지지 않게 제한 */
  position: relative; background: #f8f9fa; padding: 10px; border-radius: 8px; border: 1px solid #eee;
}
video { width: 100%; border-radius: 6px; background: black; display: block; }

.label-tag {
  position: absolute; top: 20px; left: 20px; padding: 4px 10px;
  color: white; font-weight: bold; border-radius: 4px; z-index: 5; font-size: 12px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
.tag-a { background: rgba(66, 184, 131, 0.9); }
.tag-b { background: rgba(53, 73, 94, 0.9); }

.replay-btn {
  width: 100%; margin-top: 8px; padding: 10px;
  border: 1px solid #eee; background: white; border-radius: 6px;
  cursor: pointer; font-weight: 600; color: #0d47a1; transition: 0.2s;
}
.replay-btn:hover { background: #ccc; }
.replay-btn.active { background: #e3f2fd; border-color: #2196f3; color: #0d47a1; }

.survey-section { width: 100%; }

.questions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.q-block {
  background: #fdfdfd; border: 1px solid #eee; padding: 15px; border-radius: 8px;
  display: flex; flex-direction: column; justify-content: space-between;
}

.text-area { min-height: 100px;}

.question-text { font-size: 14.5px; margin-bottom: 6px; color: #2c3e50; line-height: 1.3; }
.q-num { color: #42b883; font-weight: bold; margin-right: 5px; }
.question-desc { font-size: 13px; color: #777; margin-bottom: 10px; line-height: 1.4; }

.comparison-group { display: flex; gap: 5px; margin-top: auto; }

.comparison-group label {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 8px 2px;
  border: 1px solid #ddd; border-radius: 6px;
  cursor: pointer; transition: all 0.2s; background: #fff;
  min-width: 0;
}
.comparison-group input { display: none; }
.comparison-group span { font-size: 14px; font-weight: bold; color: #555; white-space: nowrap; }
.comparison-group small { font-size: 10px; color: #999; white-space: nowrap; margin-top: 2px; }

.comparison-group label:hover { border-color: #bbb; background: #f9f9f9; }
.comparison-group label.selected {
  border-color: #42b883; background: #eafff5; box-shadow: 0 2px 5px rgba(66, 184, 131, 0.2);
}
.comparison-group label.selected span { color: #42b883; }
.comparison-group label.selected small { color: #2c3e50; font-weight: bold; }

@media (max-width: 1000px) {
  .questions-grid { grid-template-columns: repeat(2, 1fr); } /* 태블릿에선 2열 */
}
@media (max-width: 600px) {
  .questions-grid { grid-template-columns: 1fr; } /* 모바일에선 1열 */
  .video-section { flex-direction: column; }
  .video-card { max-width: 100%; }
}

.next-btn {
  width: 100%; padding: 16px; font-size: 18px;
  background: #2c3e50; color: white;
  border-radius: 8px; border: none; cursor: pointer; font-weight: bold;
}
.next-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.next-btn:hover:not(:disabled) { background: #34495e; }
</style>