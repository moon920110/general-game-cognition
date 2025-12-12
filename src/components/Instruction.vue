<script setup>
defineProps(['block']); // 현재 몇 번째 세트인지 받음
</script>

<template>
  <div>
    <h2>실험 준비 (세트 {{ block + 1 }} / 9)</h2>
    <div class="instruction-box">
      <h3>⚠️ 유의사항</h3>
      <p>이번 세트에 나올 게임은 <strong>[여기에 게임 장르나 특징 설명 동적 할당 가능]</strong> 입니다.</p>
      <p>영상을 보고 즉각적으로 느껴지는 감정을 평가해 주세요.</p>
      <p>영상은 3초간 재생되며 무한 반복됩니다.</p>
    </div>
    <button @click="$emit('next')">이해했습니다. 영상 보기</button>
  </div>
</template>

<style scoped>
.instruction-box { background: #f9f9f9; padding: 20px; border-left: 5px solid #42b883; margin: 20px 0; }
</style>