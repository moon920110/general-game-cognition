<script setup>
const PROLIFIC_URL = "https://app.prolific.com/submissions/complete?cc=CT5PSHSG";
</script>

<template>
  <div class="end-container">
    <div class="icon">🎉</div>
    <h1>실험이 모두 종료되었습니다.</h1>
    <p>참여해 주셔서 감사합니다. 데이터가 안전하게 저장되었습니다.</p>

    <div class="action-box">
      <p>아래 버튼을 눌러 Prolific으로 돌아가면<br>자동으로 완료 처리됩니다.</p>

      <a :href="PROLIFIC_URL">
        <button class="primary-btn">Prolific으로 돌아가기 (완료)</button>
      </a>
    </div>

    <div class="backup-box">
      <p>혹시 버튼이 작동하지 않는다면, 아래 코드를 복사해서 Prolific에 입력해주세요.</p>
      <div class="code-display">CT5PSHSG</div>
    </div>
  </div>
</template>

<style scoped>
.end-container { text-align: center; padding: 40px 20px; }
.icon { font-size: 50px; margin-bottom: 20px; }
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
}
.primary-btn:hover { background-color: #3aa876; }
.backup-box { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
.code-display {
  background: #f4f4f4;
  padding: 10px;
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 2px;
  color: #333;
  margin-top: 10px;
  display: inline-block;
  border-radius: 4px;
}
</style>