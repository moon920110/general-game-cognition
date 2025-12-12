<script setup>
import {ref, reactive, onMounted, computed} from 'vue';
import Step1 from './components/Intro.vue'
import Step2 from './components/BioSurvey.vue'
import Step3 from './components/Instruction.vue'
import Step4 from './components/Task.vue'
import Step5 from './components/Final.vue'
import {db} from './firebase.js'
import {collection, addDoc} from 'firebase/firestore'

import gameInfo from './assets/unique_AGAIN.json';

const currentStep = ref(1);
const currentBlock = ref(0);

const gameList = Object.keys(gameInfo);
const totalBlocks = gameList.length;

const currentGameName = computed(() => gameList[currentBlock.value]);

const participantData = reactive({
  id: '',
  prolificInfo: {
    pid: '',
    studyId: '',
    sessionID: ''
  },
  bio: {},
  responses: [],
  startTime: new Date().toISOString(),
  endTime: null
});

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);

  const pid = urlParams.get('PROLIFIC_PID');
  const studyID = urlParams.get('STUDY_ID');
  const sessionID = urlParams.get('SESSION_ID');

  if (pid) {
    participantData.id = pid;
    participantData.prolificInfo = {pid, studyID, sessionID};
    console.log("Prolific User Detected:", pid);
  } else {
    const randomId = 'TEST_' + Math.floor(Math.random()*1000000);
    participantData.id = randomId;
    console.log("Testing Mode (No Prolific ID):", randomId);
  }
});

const nextStep = () => {
  window.scrollTo(0, 0);

  if (currentStep.value === 1) {
    currentStep.value = 2;
  } else if (currentStep.value === 2) {
    currentStep.value = 3;
  } else if (currentStep.value === 3) {
    currentStep.value = 4;
  } else if (currentStep.value === 4) {
    currentBlock.value++;
    if (currentBlock.value < totalBlocks) {
      currentStep.value = 3;
    } else {
      finishExperiment();
    }
  }
};

const finishExperiment = () => {
  participantData.endTime = new Date().toISOString();
  saveAllData();
  currentStep.value = 5;
};

const handleBioSubmit = (data) => {
  participantData.bio = data;
  nextStep();
};

const handleTaskSubmit = (blockData) => {
  participantData.responses.push({
    blockIndex: currentBlock.value,
    data: blockData
  });
  nextStep();
};

const saveAllData = async () => {
  try{
    await addDoc(collection(db, "results"), participantData);
    console.log("FB Data Saving Done");
  } catch (e) {
    console.error("Fail to save data to FB", e);
    alert("Failed to Save Data. Please capture the screen and send it to the responsibility (super_moon@gm.gist.ac.kr).");
  }
}
</script>

<template>
  <div class="container">
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
        @submit="handleTaskSubmit" />

    <Step5 v-if="currentStep === 5" :pid="participantData.id" />
  </div>
</template>

<style scoped>
.container { max-width: 800px; margin: 0 auto; padding: 2rem; font-family: 'Noto Sans KR', sans-serif; }
button { padding: 12px 24px; background: #42b883; color: white; border: none; cursor: pointer; font-size: 16px; border-radius: 6px; transition: background 0.2s; }
button:hover { background: #3aa876; }
button:disabled { background: #ccc; cursor: not-allowed; }
input, select { padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px; width: 100%; box-sizing: border-box; }
</style>
