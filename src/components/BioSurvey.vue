<script setup>
import { reactive } from 'vue';

const emit = defineEmits(['submit']);

const form = reactive({
  Age: '',
  Gender: '',
  "Left-Handed": '',
  Education: '',
  Country: '',
  "Play Frequency": '',
  Gamer: '',
  PC: '',
  Mobile: '',
  Console: '',
  Genre: ''
});

const genderOptions = ["Male", "Female", "Non-Binary"];

const handOptions = ["Right-Handed", "Left-Handed"];

const eduOptions = [
  { label: "High-School", value: "High-School" },
  { label: "Bachelor's", value: "Bachelors Degree" },
  { label: "Master's", value: "Masters Degree" },
  { label: "Doctoral", value: "Professional Training" },
  { label: "Prefer not to say", value: "Prefer not to say" }
];

const freqOptions = [
  { label: "Daily", value: "Daily" },
  { label: "Weekly", value: "Weekly" },
  { label: "Monthly", value: "Few Times a Month" },
  { label: "Yearly", value: "Few Times a Year" }
];

const gamerOptions = [
  { label: "Not a Gamer", value: "No" },
  { label: "Casual Gamer", value: "Yes, a Casual Gamer" },
  { label: "Hard-Core Gamer", value: "Yes, a Hard-Core Gamer" }
];

const submitForm = () => {
  if (!form.Age || !form.Gender || !form["Left-Handed"] || !form.Education || !form.Country || !form.Gamer || !form['Play Frequency']) {
    alert("Please answer all biographical items.");
    return;
  }
  if (!form.PC || !form.Mobile || !form.Console) {
    alert("Please select Yes/No for all gaming platforms.");
    return;
  }
  if (!form.Genre) {
    alert("Please select your preferred game genre.");
    return;
  }

  emit('submit', { ...form });
};
</script>

<template>
  <div class="bio-container">
    <h2>Biographical Data</h2>

    <div class="form-group">
      <label>Age</label>
      <input type="number" v-model="form.Age" placeholder="e.g., 25">
    </div>

    <div class="form-group">
      <label>Gender</label>
      <div class="button-group">
        <button
            v-for="opt in genderOptions"
            :key="opt"
            class="select-btn"
            :class="{ active: form.Gender === opt }"
            @click="form.Gender = opt"
        >
          {{ opt }}
        </button>
      </div>
    </div>

    <div class="form-group">
      <label>Dominant Hand</label>
      <div class="button-group">
        <button
            v-for="opt in handOptions"
            :key="opt"
            class="select-btn"
            :class="{ active: form['Left-Handed'] === opt }"
            @click="form['Left-Handed'] = opt"
        >
          {{ opt }}
        </button>
      </div>
    </div>

    <div class="form-group">
      <label>Education</label>
      <div class="button-group">
        <button
            v-for="opt in eduOptions"
            :key="opt.value"
            class="select-btn"
            :class="{ active: form.Education === opt.value }"
            @click="form.Education = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="form-group">
      <label>Country</label>
      <input type="text" v-model="form.Country" placeholder="e.g., USA, UK, India, Brazil, Korea">
    </div>

    <div class="form-group">
      <label>Play Frequency</label>
      <div class="button-group">
        <button
            v-for="opt in freqOptions"
            :key="opt.value"
            class="select-btn"
            :class="{ active: form['Play Frequency'] === opt.value }"
            @click="form['Play Frequency'] = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="form-group">
      <label>Gamer Type</label>
      <div class="button-group">
        <button
            v-for="opt in gamerOptions"
            :key="opt.value"
            class="select-btn"
            :class="{ active: form.Gamer === opt.value }"
            @click="form.Gamer = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="platform-group">
      <p class="section-title">Gaming Platforms (Select Yes/No)</p>

      <div class="platform-row">
        <span>Do you play <strong>PC Games</strong>?</span>
        <div class="toggle-group">
          <button class="toggle-btn" :class="{ active: form.PC === 'Yes', yes: true }" @click="form.PC = 'Yes'">Yes</button>
          <button class="toggle-btn" :class="{ active: form.PC === 'No' }" @click="form.PC = 'No'">No</button>
        </div>
      </div>

      <div class="platform-row">
        <span>Do you play <strong>Mobile Games</strong>?</span>
        <div class="toggle-group">
          <button class="toggle-btn" :class="{ active: form.Mobile === 'Yes', yes: true }" @click="form.Mobile = 'Yes'">Yes</button>
          <button class="toggle-btn" :class="{ active: form.Mobile === 'No' }" @click="form.Mobile = 'No'">No</button>
        </div>
      </div>

      <div class="platform-row">
        <span>Do you play <strong>Console Games</strong>?</span>
        <div class="toggle-group">
          <button class="toggle-btn" :class="{ active: form.Console === 'Yes', yes: true }" @click="form.Console = 'Yes'">Yes</button>
          <button class="toggle-btn" :class="{ active: form.Console === 'No' }" @click="form.Console = 'No'">No</button>
        </div>
      </div>
    </div>

    <div class="form-group">
      <label>Please select <strong>the most</strong> preferred game genre</label>
      <select v-model="form.Genre" class="genre-select">
        <option value="" disabled>Select Genre</option>
        <option value="FPS">First Person Shooter (FPS). e.g., Counter Strike</option>
        <option value="Tactical FPS">Tactical Shooter. e.g., Overwatch, PUBG</option>
        <option value="Action RPG">Action RPG. e.g., Diablo, Soul-Like Games, God of War</option>
        <option value="Virtual Life">Virtual Life. e.g., Sims, Animal Crossing, Stardew Valley</option>
        <option value="Fighting">Fighting. e.g., Tekken, Street Fighter</option>
        <option value="JRPG">JRPG. e.g., Final Fantasy, Dragon Quest, Persona</option>
        <option value="Defense">Tower Defense. e.g, Kingdom Rush, Plants vs. Zombies</option>
        <option value="MOBA">Multiplayer Online Battle Arena (MOBA; AOS). League of Legends, DOTA2</option>
        <option value="Auto Racing">Casual Racing. e.g., Mario Kart</option>
        <option value="Stacking Puzzle">Stacking Puzzle. e.g., Tetris</option>
        <option value="MMORPG">MMORPG. e.g., World of Warcraft, LostArk, Elder Scrolls Online</option>
        <option value="Vehicle Sim">Vehicle Simulation. e.g., Euro Truck, American Truck</option>
        <option value="Western RPG">Western RPG. e.g., Red Dead Redemption, The Elder Scrolls, The Witcher 3</option>
        <option value="Sandbox">Sandbox. e.g., Minecraft, Roblox</option>
        <option value="RTS">Real-time Strategy (RTS). e.g., Starcraft, Warcraft</option>
        <option value="Open-world Action">Open-world Adventure. e.g., The Legend of Zelda: Breath of the Wild, Genshin Impact</option>
        <option value="Sports Sim">Sports Simulation. e.g., FIFA, NBA2K, Football Manager, Madden NFL</option>
        <option value="Platformer">Platformer. e.g., Super Mario Bros, Kirby Series</option>
        <option value="Action Puzzle">Action Puzzle. e.g., Angry Bird, Portal</option>
        <option value="Survival">Survival. e.g., The Long Dark, Ark: Survival Evolved</option>
        <option value="Metroidvania">Metroidvania. e.g., Castlevania, Hollow Knight, Super Metroid</option>
        <option value="Trainer RPG">Collectible RPG. e.g., Pokemon Go, Pal World </option>
        <option value="Card Battle">Card Battle Game. e.g., Hearthstone, Magic: The Gathering Arena, Yu-Gi-Oh!</option>
        <option value="Rhythm">Rhythm Game. e.g., DJMax, A Dance of Fire and Ice</option>
        <option value="-">None</option>
      </select>
    </div>

    <button class="next-btn" @click="submitForm">Next</button>
  </div>
</template>

<style scoped>
.bio-container { max-width: 600px; margin: 0 auto; text-align: left; padding-bottom: 50px; }
.form-group { margin-bottom: 25px; display: flex; flex-direction: column; color: #1a1a1a;}
label { font-weight: bold; margin-bottom: 8px; color: #333; }
input, .genre-select { padding: 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 16px; background: white; color: #1a1a1a;}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.select-btn {
  padding: 10px 18px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  transition: all 0.2s;
}

.select-btn:hover { background: #f0f0f0; }

.select-btn.active {
  background: #42b883;
  color: white;
  border-color: #42b883;
  font-weight: bold;
  box-shadow: 0 2px 5px rgba(66, 184, 131, 0.3);
}

.platform-group {
  margin-bottom: 25px;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #eee;
  color: #1a1a1a;
}
.section-title { font-weight: bold; margin-bottom: 15px; color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
.platform-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.toggle-group { display: flex; gap: 5px; }

.toggle-btn {
  padding: 8px 16px;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
  border-radius: 6px;
  font-size: 14px;
  min-width: 60px;
  color: #1a1a1a;
}
.toggle-btn.active { background: #555; color: white; border-color: #333; }
.toggle-btn.active.yes { background: #42b883; border-color: #2e8b57; }

.next-btn {
  width: 100%; padding: 16px; background: #2c3e50; color: white; font-size: 18px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-top: 10px;
}
.next-btn:hover { background: #34495e; }
</style>