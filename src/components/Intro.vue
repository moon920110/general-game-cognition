<script setup>
// 로직 없음
</script>

<template>
  <div class="welcome-container">
    <h1>Welcome to the Research Study</h1>

    <p class="intro">
      This study aims to identify general factors in game situations <br>
      that influence human <strong>Core Affect (Arousal & Valence)</strong>.
    </p>

    <div class="info-box">
      <h3>🔒 Privacy & Data Security</h3>
      <p>
        Before starting, we will collect brief information regarding your <strong>gaming background and preferences</strong>
        (e.g., play time, favorite genres, gamer type).
        <br>
        Your data will be <strong>encrypted</strong> and used <strong>solely for academic research purposes</strong>.
      </p>
    </div>

    <div class="info-box">
      <h3>📌 Study Overview</h3>
      <ul>
        <li><strong>Estimated Duration:</strong> Approx. 20 minutes</li>
        <li><strong>Content:</strong> 9 Games × 10 Clips (3 seconds each)</li>
        <li><strong>Task Instruction:</strong>
          <ul class="sub-list">
            <li>You will watch short gameplay clips.</li>
            <li>Please evaluate the situational factors (e.g., <strong>Control</strong>, <strong>Resource Sufficiency</strong>, etc.) from an <strong>'OBJECTIVE'</strong> perspective.</li>
          </ul>
        </li>
      </ul>
    </div>

    <div class="consent-note">
      <p>By clicking the button below, you agree to participate in this study.</p>
    </div>

    <button class="start-btn" @click="$emit('next')">
      I Agree & Start Experiment
    </button>
  </div>
</template>

<style scoped>
/* 스타일은 이전과 동일합니다 */
.welcome-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 40px 20px;
  text-align: center;
  font-family: 'Pretendard', sans-serif;
}

h1 {
  color: #bcced0;
  margin-bottom: 20px;
  font-size: 2.2rem;
}

.intro {
  font-size: 1.1rem;
  color: #999;
  line-height: 1.6;
  margin-bottom: 30px;
}

.info-box {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 30px;
  text-align: left;
  border: 1px solid #e9ecef;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.info-box h3 {
  margin-top: 0;
  color: #42b883;
  font-size: 1.2rem;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-box p {
  margin: 0;
  color: #444;
  line-height: 1.6;
}

.info-box ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.info-box li {
  margin-bottom: 12px;
  font-size: 1rem;
  color: #333;
}

.sub-list {
  margin-top: 8px !important;
  padding-left: 20px !important;
  list-style: disc !important;
}
.sub-list li {
  margin-bottom: 5px;
  color: #555;
  font-size: 0.95rem;
}

.consent-note {
  color: #666;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.start-btn {
  background-color: #42b883;
  color: white;
  font-size: 1.2rem;
  padding: 16px 40px;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 4px 15px rgba(66, 184, 131, 0.4);
  transition: transform 0.2s, background-color 0.2s;
}

.start-btn:hover {
  background-color: #3aa876;
  transform: translateY(-2px);
}
</style>