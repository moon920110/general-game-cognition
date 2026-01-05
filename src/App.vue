<script setup>
import {ref, reactive, onMounted, computed} from 'vue';
import Step1 from './components/Intro.vue'
import Step2 from './components/BioSurvey.vue'
import Step3 from './components/Instruction.vue'
import Step4 from './components/Task.vue'
import Step5 from './components/Final.vue'
import Reviewer from './components/ResultViewer.vue'
import {db} from './firebase.js'
import {collection, addDoc} from 'firebase/firestore/lite'

import gameInfo from './assets/unique_AGAIN.json';

const isReviewMode = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('mode') === 'review';
});

const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const isLoading = ref(false);
const isDebug = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return window.location.hostname === 'localhost' || params.get('debug') === 'true';
});

const currentStep = ref(1);
const currentBlock = ref(0);

const originalGameKeys = Object.keys(gameInfo);
// 셔플 로직은 실험 모드일 때만 돌려도 됨 (에러 방지 차원에서 유지해도 무관)
const gameList = ref(shuffleArray(originalGameKeys));
const totalBlocks = gameList.value.length;

const currentGameName = computed(() => gameList.value[currentBlock.value]);

const participantData = reactive({
  id: '',
  prolificInfo: {
    pid: '',
    studyId: '',
    sessionID: ''
  },
  bio: {},
  responses: [],
  gameOrder: [], // 필요하다면 gameList.value 저장
  startTime: new Date().toISOString(),
  endTime: ''
});

onMounted(() => {
  // 리뷰 모드면 참가자 ID 로직 실행 안 함
  if (isReviewMode.value) return;

  const urlParams = new URLSearchParams(window.location.search);
  const pid = urlParams.get('PROLIFIC_PID');
  const studyID = urlParams.get('STUDY_ID');
  const sessionID = urlParams.get('SESSION_ID');

  if (pid) {
    participantData.id = pid;
    participantData.prolificInfo = { pid, studyID, sessionID };
    console.log("Prolific User Detected:", pid);
  }
  if (!pid && isDebug.value) {
    const randomId = 'TEST_' + Math.floor(Math.random()*1000000);
    participantData.id = randomId;
    console.log("Testing Mode (No Prolific ID):", randomId);
  }

  // 게임 순서 저장
  participantData.gameOrder = gameList.value;
});

const nextStep = () => {
  window.scrollTo(0, 0);
  if (currentStep.value === 1) currentStep.value = 2;
  else if (currentStep.value === 2) currentStep.value = 3;
  else if (currentStep.value === 3) currentStep.value = 4;
  else if (currentStep.value === 4) {
    currentBlock.value++;
    currentStep.value = 3;
  }
};

const handleBioSubmit = (data) => {
  participantData.bio = data;
  nextStep();
};

const handleTaskSubmit = (blockData) => {
  participantData.responses.push({
    blockIndex: currentBlock.value,
    gameName: currentGameName.value,
    data: blockData
  });
  if (currentBlock.value + 1 < totalBlocks){
    nextStep();
  } else {
    finishExperiment();
  }
};

const finishExperiment = async () => {
  if (!participantData.id) {
    alert("[Invalid Access] No ID found.");
    return;
  }
  participantData.endTime = new Date().toISOString();
  isLoading.value = true;
  try {
    await saveAllData();
    window.scrollTo(0, 0);
    isLoading.value = false;
    currentStep.value = 5;
  } catch (error) {
    console.error("Save failed:", error);
    alert("Failed to Save Data.");
    isLoading.value = false;
  }
};

const saveAllData = async () => {
  console.log("Start logging");
  await addDoc(collection(db, "results"), participantData);
  console.log("FB Data Saving Done");
}
</script>

<template>
  <Reviewer v-if="isReviewMode" />

  <div v-else class="container">
    <Step1 v-if="currentStep === 1" @next="nextStep" />
    <Step2 v-if="currentStep === 2" @submit="handleBioSubmit" />

    <Step3
        v-if="currentStep === 3"
        :block="currentBlock"
        :gameName="currentGameName"
        :totalBlocks="totalBlocks"
        @next="nextStep" />
    <Step4
        v-if="currentStep === 4"
        :block="currentBlock"
        :sessionList="gameInfo[currentGameName]"
        :gameName="currentGameName"
        :isDebug="isDebug"
        :isLoading="isLoading"
        @submit="handleTaskSubmit"
        @skip-to-end="finishExperiment"/>

    <Step5 v-if="currentStep === 5" :pid="participantData.id" />

    <footer class="contact-footer">
      If you have any problems or questions, please feel free to contact <a href="mailto:super_moon@gm.gist.ac.kr">super_moon@gm.gist.ac.kr</a> <br>
      Conducted by Cognition and Intelligence Lab (CILAB), Gwangju Institute of Science and Technology (GIST), South Korea.
    </footer>
  </div>
</template>

<style>
/* 스타일은 그대로 유지 */
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");

body {
  font-family: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
  background-color: #f0f2f5;
  color: #333;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

button, input, select, textarea {
  font-family: inherit;
}

.contact-footer {
  margin-top: auto;
  padding-top: 50px;
  padding-bottom: 20px;
  text-align: center;
  font-size: 14px;
  color: #999;
  border-top: 1px solid #eee;
}
</style>