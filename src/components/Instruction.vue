<script setup>
import {computed} from 'vue';

const props = defineProps(['block', 'gameName', 'totalBlocks']);

const instructions = {
  "TinyCars": "A top-down racing game. \nControl a small car and drive through the track. \nThe objective is to win the race!",
  "Solid": "A first-person rally game. \nDrive on a track with loops and turns. Do not crash. \nThe objective is to win the race!",
  "ApexSpeed": "A sci-fi racing game. \nUse jump pads and avoid fire traps. \nThe objective is to win the race!",
  "Heist!": "A First-Person Shooter (FPS). \nYou are inside a building. \nFind and shoot the enemies with your rifle. \nThe objective is to eliminate all enemies within 2 minutes.",
  "Shootout": "A shooting gallery game. \nEnemy targets will appear in fixed positions in front of you. \nShoot them quickly before they attack. \nThe objective is to get the highest score within 2 minutes.",
  "TopDown": "A top-down shooter game. \nMove around the area and shoot to kill enemies. \nThe objective is to eliminate all enemies within 2 minutes.",
  "Run'N'Gun": "A platformer running action game. \nRun and jump while shooting at enemies. \nGet health items to recover. \nThe objective is to travel as far as possible within 2 minutes.",
  "Pirates!": "A platformer game like 'Super Mario'. \nJump over obstacles and enemies. \nCollect coins to get points. \nThe objective is to travel as far as possible within 2 minutes.",
  "Endless": "A platformer infinite running game. \nThe character runs automatically. \nMove your character (up/down) to avoid crashing and to collect coins. \nThe game gets faster over time. \nThe objective is to travel as far as possible within 2 minutes."
};


const info = computed(() => {
  return instructions[props.gameName]
});

</script>

<template>
  <div class="instruction-container">
    <div class="status-bar">
      <span class="step-badge">STEP 3</span>
      <span class="progress-text">Progress: {{ block + 1 }} / {{ totalBlocks }}</span>
    </div>

    <div class="title-section">
      <h1>{{ props.gameName }}</h1>
    </div>

    <div class="desc-box">
      <h3>Game Description</h3>
      <p class="main-desc">{{ info }}</p>

      <div class="warning-box">
        <h4>⚠️ Task Instructions</h4>
        <ul>
          <li>You will watch <strong>10 gameplay clips</strong> of <strong>{{ props.gameName }}</strong>.</li>
          <li>Each clip is a random <strong>3-second</strong> segment.</li>
          <li>Please evaluate the <strong>TBD</strong> of this situation from an <strong>'objective'</strong> perspective.</li>
        </ul>
      </div>
    </div>

    <div class="action-area">
      <button class="start-btn" @click="$emit('next')">
        Let's Start 👉
      </button>
    </div>
  </div>
</template>

<style scoped>
.instruction-container { max-width: 700px; margin: 0 auto; padding: 20px; }

.status-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 30px; color: #666; font-size: 14px; }
.step-badge { background: #eee; padding: 4px 8px; border-radius: 4px; font-weight: bold; }

.title-section { text-align: center; margin-bottom: 40px; }
h1 { font-size: 2.5rem; margin: 0 0 10px 0; color: #cecec0; }
h3 { font-size: 2rem; margin: 0 0 10px 0; color: #2c3e50; }

.desc-box { background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 30px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }

.warning-box { background: #f8f9fa; border-left: 5px solid #42b883; padding: 20px; border-radius: 4px; }
.warning-box h4 { margin-top: 0; color: #42b883; margin-bottom: 10px; }
.warning-box ul { margin: 0; padding-left: 20px; }
.warning-box li { margin-bottom: 8px; color: #555; }

.action-area { text-align: center; margin-top: 40px; }
.start-btn {
  background: #42b883; color: white; border: none;
  padding: 18px 40px; font-size: 1.2rem; border-radius: 50px;
  cursor: pointer; font-weight: bold; box-shadow: 0 4px 10px rgba(66, 184, 131, 0.3);
  transition: transform 0.2s, background 0.2s;
}
.start-btn:hover { background: #3aa876; transform: translateY(-2px); }

.main-desc {
  font-size: 1.2rem;
  line-height: 1.6;
  color: #333;
  margin-bottom: 30px;

  white-space: pre-wrap;
}
</style>