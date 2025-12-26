<script setup>
const PROLIFIC_URL = "https://app.prolific.com/submissions/complete?cc=CT5PSHSG";
</script>

<template>
  <div class="end-container">
    <div class="icon">🎉</div>

    <h1>Experiment Completed</h1>

    <p>Thank you for your participation. Your data has been successfully saved.</p>

    <div class="action-box">
      <p>Please click the button below to return to Prolific<br>to complete your submission.</p>

      <a :href="PROLIFIC_URL">
        <button class="primary-btn">Return to Prolific (Complete)</button>
      </a>
    </div>

    <div class="backup-box">
      <p>If the button above does not work, please manually copy and paste the code below into Prolific.</p>
      <div class="code-display">CT5PSHSG</div>
    </div>
  </div>
</template>

<style scoped>
/* 스타일은 기존과 동일합니다 */
.end-container { text-align: center; padding: 40px 20px; font-family: 'Pretendard', sans-serif; }
.icon { font-size: 50px; margin-bottom: 20px; }
h1 { color: #333; margin-bottom: 10px; }
.action-box { margin: 40px 0; }

.primary-btn {
  background-color: #42b883;
  color: white;
  font-size: 18px;
  padding: 15px 30px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
  font-weight: bold;
  transition: background-color 0.3s;
}
.primary-btn:hover { background-color: #3aa876; }

.backup-box { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; color: #eee; font-size: 14px; line-height: 1.5; }
.code-display {
  background: #f4f4f4;
  padding: 15px 30px;
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 2px;
  color: #333;
  margin-top: 15px;
  display: inline-block;
  border-radius: 8px;
  border: 1px dashed #ccc; /* 코드가 더 잘 보이도록 점선 테두리 추가 */
}
</style>