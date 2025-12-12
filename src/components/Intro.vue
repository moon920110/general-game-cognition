<script setup>

</script>

<template>
  <div>
  <h1>실험에 오신 것을 환영합니다</h1>
  <p>본 실험은 게임 영상에 대한 감정 반응을 연구하기 위해 진행됩니다.</p>
  <ul>
    <li>소요 시간: 약 20분</li>
    <li>절차: 사전 설문 -> (설명 -> 영상 평가) x 9회 -> 종료</li>
  </ul>
  <p>준비되셨다면 아래 버튼을 눌러주세요.</p>
  <button @click="$emit('next')">동의하고 시작하기</button>
  </div>
</template>

<style scoped>

</style>