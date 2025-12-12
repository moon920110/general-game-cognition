<script setup>
import { reactive } from 'vue';
const emit = defineEmits(['submit']);

const form = reactive({
  age: '',
  gender: '',
  gamingExp: ''
});

const submitForm = () => {
  if (!form.age || !form.gender) return alert("모든 항목에 답해주세요.");
  emit('submit', { ...form }); // 부모(App.vue)로 데이터 전송
};
</script>

<template>
  <div>
    <h2>기본 정보 설문 (Biographical Data)</h2>
    <div class="form-group">
      <label>나이</label>
      <input type="number" v-model="form.age" placeholder="예: 25">
    </div>
    <div class="form-group">
      <label>성별</label>
      <select v-model="form.gender">
        <option value="" disabled>선택하세요</option>
        <option value="male">남성</option>
        <option value="female">여성</option>
        <option value="other">기타</option>
      </select>
    </div>
    <div class="form-group">
      <label>평소 게임을 얼마나 자주 하시나요?</label>
      <select v-model="form.gamingExp">
        <option value="daily">매일</option>
        <option value="weekly">주 1~3회</option>
        <option value="rarely">거의 안 함</option>
      </select>
    </div>
    <button @click="submitForm">다음</button>
  </div>
</template>

<style scoped>
.form-group { margin-bottom: 20px; display: flex; flex-direction: column; }
label { font-weight: bold; margin-bottom: 5px; }
</style>