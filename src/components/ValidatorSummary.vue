<script setup>
import { ref, computed } from 'vue';

const allResults = ref([]); // flat array of all result entries across files
const fileGroups = ref([]); // { fileName, results[] }
const activePanel = ref(0);

const appraisalKeys = [
  { key: 'novelty', label: 'Novelty' },
  { key: 'goal_relevance', label: 'Goal Relevance' },
  { key: 'outcome_probability', label: 'Outcome Probability' },
  { key: 'goal_conduciveness', label: 'Goal Conduciveness' },
  { key: 'urgency', label: 'Urgency' },
  { key: 'coping_potential', label: 'Coping Potential' },
];

// ====================================================
// File Upload
// ====================================================
const handleFilesUpload = (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const readPromises = Array.from(files).map(file => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const entries = Array.isArray(data) ? data : [data];
          resolve({ fileName: file.name, results: entries });
        } catch {
          resolve(null);
        }
      };
      reader.readAsText(file);
    });
  });

  Promise.all(readPromises).then(groups => {
    const valid = groups.filter(g => g !== null);
    fileGroups.value = valid;
    allResults.value = valid.flatMap(g => g.results);
    activePanel.value = 0;
  });
};

// ====================================================
// Aggregate Statistics
// ====================================================
const totalParticipants = computed(() => {
  const ids = new Set(allResults.value.map(r => r.participant));
  return ids.size;
});

const totalSessions = computed(() => allResults.value.length);

const avgClipAcc = computed(() => mean(allResults.value.map(r => parseFloat(r.clipAccuracy))));
const avgDimAcc = computed(() => mean(allResults.value.map(r => parseFloat(r.dimAccuracy))));
const avgBothAcc = computed(() => mean(allResults.value.map(r => parseFloat(r.bothAccuracy))));

const sdClipAcc = computed(() => sd(allResults.value.map(r => parseFloat(r.clipAccuracy))));
const sdDimAcc = computed(() => sd(allResults.value.map(r => parseFloat(r.dimAccuracy))));
const sdBothAcc = computed(() => sd(allResults.value.map(r => parseFloat(r.bothAccuracy))));

const perDimStats = computed(() => {
  return appraisalKeys.map(({ key, label }) => {
    const clipRates = [];
    const dimRates = [];
    const bothRates = [];
    allResults.value.forEach(r => {
      const d = r.perDimension?.[key];
      if (!d || d.total === 0) return;
      clipRates.push(d.clipCorrect / d.total * 100);
      dimRates.push(d.dimCorrect / d.total * 100);
      bothRates.push(d.bothCorrect / d.total * 100);
    });
    return {
      label,
      clipMean: mean(clipRates), clipSd: sd(clipRates),
      dimMean: mean(dimRates), dimSd: sd(dimRates),
      bothMean: mean(bothRates), bothSd: sd(bothRates),
      n: clipRates.length,
    };
  });
});

// ====================================================
// Per-file summary for panels
// ====================================================
const fileSummaries = computed(() => {
  return fileGroups.value.map(group => {
    const results = group.results;
    const participants = new Set(results.map(r => r.participant)).size;
    return {
      fileName: group.fileName,
      results,
      participants,
      sessions: results.length,
      avgClip: mean(results.map(r => parseFloat(r.clipAccuracy))),
      avgDim: mean(results.map(r => parseFloat(r.dimAccuracy))),
      avgBoth: mean(results.map(r => parseFloat(r.bothAccuracy))),
      sdClip: sd(results.map(r => parseFloat(r.clipAccuracy))),
      sdDim: sd(results.map(r => parseFloat(r.dimAccuracy))),
      sdBoth: sd(results.map(r => parseFloat(r.bothAccuracy))),
      perDim: appraisalKeys.map(({ key, label }) => {
        const bothRates = [];
        results.forEach(r => {
          const d = r.perDimension?.[key];
          if (!d || d.total === 0) return;
          bothRates.push(d.bothCorrect / d.total * 100);
        });
        return { label, mean: mean(bothRates), sd: sd(bothRates), n: bothRates.length };
      }),
    };
  });
});

// ====================================================
// Slider navigation
// ====================================================
const slideLeft = () => {
  if (activePanel.value > 0) activePanel.value--;
};
const slideRight = () => {
  if (activePanel.value < fileSummaries.value.length - 1) activePanel.value++;
};

// ====================================================
// Stats helpers
// ====================================================
function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sd(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function fmt(v) { return v.toFixed(1); }

// ====================================================
// Download aggregate CSV
// ====================================================
const downloadCSV = () => {
  const headers = ['Participant', 'Timestamp', 'SampleSize', 'TotalCards',
    'ClipCorrect', 'DimCorrect', 'BothCorrect',
    'ClipAccuracy', 'DimAccuracy', 'BothAccuracy',
    ...appraisalKeys.flatMap(a => [`${a.label}_ClipCorr`, `${a.label}_DimCorr`, `${a.label}_BothCorr`, `${a.label}_Total`])
  ];

  const rows = allResults.value.map(r => {
    const base = [r.participant, r.timestamp, r.sampleSize, r.totalCards,
      r.clipCorrect, r.dimCorrect, r.bothCorrect,
      r.clipAccuracy, r.dimAccuracy, r.bothAccuracy];
    const dims = appraisalKeys.flatMap(a => {
      const d = r.perDimension?.[a.key] || {};
      return [d.clipCorrect || 0, d.dimCorrect || 0, d.bothCorrect || 0, d.total || 0];
    });
    return [...base, ...dims];
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `validator_summary_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
</script>

<template>
  <div class="summary-container">
    <h1>Validation Results Summary</h1>
    <p class="subtitle">Upload multiple result JSON files to see aggregated statistics.</p>

    <!-- Upload -->
    <div class="upload-card">
      <label class="file-label upload-btn">
        Upload Result Files (.json)
        <input type="file" accept=".json" multiple @change="handleFilesUpload" hidden>
      </label>
      <span v-if="fileGroups.length" class="upload-status">
        {{ fileGroups.length }} file(s) loaded — {{ totalSessions }} session(s) — {{ totalParticipants }} participant(s)
      </span>
    </div>

    <template v-if="allResults.length > 0">

      <!-- ==================== Overall Statistics ==================== -->
      <section class="section-card">
        <div class="section-header">
          <h2>Overall Statistics</h2>
          <button class="export-btn" @click="downloadCSV">Export CSV</button>
        </div>

        <div class="stat-grid">
          <div class="stat-box">
            <div class="stat-label">Clip Match</div>
            <div class="stat-value">{{ fmt(avgClipAcc) }}%</div>
            <div class="stat-sd">&plusmn; {{ fmt(sdClipAcc) }}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Dimension Match</div>
            <div class="stat-value">{{ fmt(avgDimAcc) }}%</div>
            <div class="stat-sd">&plusmn; {{ fmt(sdDimAcc) }}</div>
          </div>
          <div class="stat-box accent">
            <div class="stat-label">Both Correct</div>
            <div class="stat-value">{{ fmt(avgBothAcc) }}%</div>
            <div class="stat-sd">&plusmn; {{ fmt(sdBothAcc) }}</div>
          </div>
          <div class="stat-box muted">
            <div class="stat-label">Sessions</div>
            <div class="stat-value">{{ totalSessions }}</div>
            <div class="stat-sd">{{ totalParticipants }} participants</div>
          </div>
        </div>

        <!-- Per-dimension table -->
        <h3>Per-Dimension Breakdown (Mean &plusmn; SD)</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Clip Match</th>
              <th>Dim Match</th>
              <th>Both Correct</th>
              <th>n</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in perDimStats" :key="d.label">
              <td><strong>{{ d.label }}</strong></td>
              <td>{{ fmt(d.clipMean) }} &plusmn; {{ fmt(d.clipSd) }}</td>
              <td>{{ fmt(d.dimMean) }} &plusmn; {{ fmt(d.dimSd) }}</td>
              <td>{{ fmt(d.bothMean) }} &plusmn; {{ fmt(d.bothSd) }}</td>
              <td>{{ d.n }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Per-dimension bar chart -->
        <h3>Both-Correct Accuracy by Dimension</h3>
        <div class="bar-chart">
          <div v-for="d in perDimStats" :key="d.label" class="bar-row">
            <span class="bar-label">{{ d.label }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: Math.min(d.bothMean, 100) + '%' }">
                <span class="bar-text" v-if="d.bothMean > 15">{{ fmt(d.bothMean) }}%</span>
              </div>
              <div class="bar-sd-marker" v-if="d.bothSd > 0"
                :style="{ left: Math.min(Math.max(d.bothMean - d.bothSd, 0), 100) + '%', width: Math.min(d.bothSd * 2, 100 - Math.max(d.bothMean - d.bothSd, 0)) + '%' }">
              </div>
            </div>
            <span class="bar-value">{{ fmt(d.bothMean) }}%</span>
          </div>
        </div>

        <!-- Participant-level table -->
        <h3>All Sessions</h3>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Date</th>
                <th>Clips</th>
                <th>Cards</th>
                <th>Clip Match</th>
                <th>Dim Match</th>
                <th>Both Correct</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in allResults" :key="i">
                <td>{{ r.participant }}</td>
                <td>{{ new Date(r.timestamp).toLocaleString() }}</td>
                <td>{{ r.sampleSize }}</td>
                <td>{{ r.totalCards }}</td>
                <td>{{ r.clipAccuracy }}%</td>
                <td>{{ r.dimAccuracy }}%</td>
                <td><strong>{{ r.bothAccuracy }}%</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ==================== Per-File Panels (Slider) ==================== -->
      <section class="section-card" v-if="fileSummaries.length > 0">
        <div class="section-header">
          <h2>Per-File Details</h2>
          <div class="slider-nav">
            <button class="slider-btn" @click="slideLeft" :disabled="activePanel === 0">&larr;</button>
            <span class="slider-indicator">{{ activePanel + 1 }} / {{ fileSummaries.length }}</span>
            <button class="slider-btn" @click="slideRight" :disabled="activePanel >= fileSummaries.length - 1">&rarr;</button>
          </div>
        </div>

        <div class="slider-viewport">
          <div class="slider-track" :style="{ transform: `translateX(-${activePanel * 100}%)` }">
            <div v-for="(fs, fi) in fileSummaries" :key="fi" class="slider-panel">

              <div class="panel-header">
                <h3>{{ fs.fileName }}</h3>
                <span class="panel-meta">{{ fs.sessions }} session(s) / {{ fs.participants }} participant(s)</span>
              </div>

              <!-- File-level scores -->
              <div class="stat-grid compact">
                <div class="stat-box small">
                  <div class="stat-label">Clip Match</div>
                  <div class="stat-value">{{ fmt(fs.avgClip) }}%</div>
                  <div class="stat-sd">&plusmn; {{ fmt(fs.sdClip) }}</div>
                </div>
                <div class="stat-box small">
                  <div class="stat-label">Dim Match</div>
                  <div class="stat-value">{{ fmt(fs.avgDim) }}%</div>
                  <div class="stat-sd">&plusmn; {{ fmt(fs.sdDim) }}</div>
                </div>
                <div class="stat-box small accent">
                  <div class="stat-label">Both Correct</div>
                  <div class="stat-value">{{ fmt(fs.avgBoth) }}%</div>
                  <div class="stat-sd">&plusmn; {{ fmt(fs.sdBoth) }}</div>
                </div>
              </div>

              <!-- Per-dimension bars -->
              <h4>Both-Correct by Dimension</h4>
              <div class="bar-chart compact">
                <div v-for="d in fs.perDim" :key="d.label" class="bar-row">
                  <span class="bar-label">{{ d.label }}</span>
                  <div class="bar-track">
                    <div class="bar-fill" :style="{ width: Math.min(d.mean, 100) + '%' }"></div>
                  </div>
                  <span class="bar-value">{{ fmt(d.mean) }}%</span>
                </div>
              </div>

              <!-- Session list -->
              <h4>Sessions in This File</h4>
              <div class="table-scroll">
                <table class="data-table compact">
                  <thead>
                    <tr>
                      <th>Participant</th>
                      <th>Date</th>
                      <th>Clips</th>
                      <th>Clip%</th>
                      <th>Dim%</th>
                      <th>Both%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r, ri) in fs.results" :key="ri">
                      <td>{{ r.participant }}</td>
                      <td>{{ new Date(r.timestamp).toLocaleDateString() }}</td>
                      <td>{{ r.sampleSize }}</td>
                      <td>{{ r.clipAccuracy }}%</td>
                      <td>{{ r.dimAccuracy }}%</td>
                      <td><strong>{{ r.bothAccuracy }}%</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Card-level detail for each session -->
              <div v-for="(r, ri) in fs.results" :key="'detail-' + ri" class="session-detail">
                <h4>{{ r.participant }} — Card Details</h4>
                <div class="table-scroll">
                  <table class="data-table compact">
                    <thead>
                      <tr><th>#</th><th>Description</th><th>Correct Clip</th><th>Answer</th><th>Correct Dim</th><th>Answer</th><th>Result</th></tr>
                    </thead>
                    <tbody>
                      <tr v-for="(c, ci) in r.cardDetails" :key="ci"
                        :class="{ 'row-correct': c.bothMatch, 'row-partial': (c.clipMatch || c.dimMatch) && !c.bothMatch, 'row-wrong': !c.clipMatch && !c.dimMatch }">
                        <td>{{ ci + 1 }}</td>
                        <td class="desc-cell">{{ c.text }}</td>
                        <td>{{ c.correctClip }}</td>
                        <td :class="{ match: c.clipMatch, mismatch: !c.clipMatch }">{{ c.answerClip }}</td>
                        <td>{{ c.correctDim }}</td>
                        <td :class="{ match: c.dimMatch, mismatch: !c.dimMatch }">{{ c.answerDim }}</td>
                        <td>
                          <span v-if="c.bothMatch" class="badge correct">Both</span>
                          <span v-else-if="c.clipMatch" class="badge partial">Clip</span>
                          <span v-else-if="c.dimMatch" class="badge partial">Dim</span>
                          <span v-else class="badge wrong">X</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

    </template>
  </div>
</template>

<style scoped>
.summary-container {
  max-width: 1200px; margin: 0 auto; padding: 30px 40px;
  font-family: 'Pretendard', sans-serif; min-height: 100vh; background: #f5f7fa;
}
h1 { margin: 0 0 8px; font-size: 2rem; color: #2c3e50; }
h2 { margin: 0; font-size: 1.4rem; color: #2c3e50; }
h3 { margin: 25px 0 12px; font-size: 1.1rem; color: #333; }
h4 { margin: 20px 0 10px; font-size: 1rem; color: #444; }
.subtitle { color: #666; margin: 0 0 25px; font-size: 1rem; }

/* Upload */
.upload-card {
  background: white; border-radius: 12px; padding: 20px;
  border: 1px solid #ddd; margin-bottom: 25px;
  display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.file-label {
  display: inline-block; text-align: center; padding: 12px 24px;
  border-radius: 8px; cursor: pointer; font-weight: bold;
  font-size: 0.9rem; color: white; transition: 0.2s;
}
.upload-btn { background: #2c3e50; } .upload-btn:hover { background: #34495e; }
.upload-status { font-size: 0.9rem; color: #42b883; font-weight: bold; }

/* Section card */
.section-card {
  background: white; border-radius: 14px; padding: 30px;
  border: 1px solid #ddd; margin-bottom: 25px;
  box-shadow: 0 3px 12px rgba(0,0,0,0.04);
}
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }

.export-btn {
  padding: 8px 16px; border: 1px solid #42b883; background: white;
  border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85rem;
  color: #42b883; transition: 0.2s;
}
.export-btn:hover { background: #42b883; color: white; }

/* Stat grid */
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
.stat-grid.compact { grid-template-columns: repeat(3, 1fr); }
.stat-box {
  background: #f8f9fa; border-radius: 10px; padding: 20px; text-align: center;
  border: 1px solid #eee;
}
.stat-box.small { padding: 14px; }
.stat-box.accent { border: 2px solid #42b883; background: #f0faf5; }
.stat-box.muted { background: #f0f2f5; }
.stat-label { font-size: 0.8rem; color: #888; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
.stat-value { font-size: 2rem; font-weight: 900; color: #2c3e50; }
.stat-box.small .stat-value { font-size: 1.6rem; }
.stat-box.accent .stat-value { color: #42b883; }
.stat-sd { font-size: 0.8rem; color: #999; margin-top: 2px; }

/* Data table */
.data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.data-table.compact { font-size: 0.82rem; }
.data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; }
.data-table th { background: #f8f9fa; color: #555; font-weight: bold; position: sticky; top: 0; }
.table-scroll { max-height: 400px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; }

.desc-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.78rem; color: #666; }
.match { color: #155724; font-weight: bold; }
.mismatch { color: #721c24; }
.row-correct { background: rgba(66,184,131,0.05); }
.row-partial { background: rgba(255,193,7,0.08); }
.row-wrong { background: rgba(231,76,60,0.05); }

.badge {
  display: inline-block; padding: 2px 6px; border-radius: 4px;
  font-size: 0.7rem; font-weight: bold;
}
.badge.correct { background: #d4edda; color: #155724; }
.badge.partial { background: #fff3cd; color: #856404; }
.badge.wrong { background: #f8d7da; color: #721c24; }

/* Bar chart */
.bar-chart { margin-bottom: 15px; }
.bar-chart.compact .bar-row { margin-bottom: 6px; }
.bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.bar-label { width: 150px; font-size: 0.85rem; font-weight: bold; color: #555; flex-shrink: 0; }
.bar-track { flex: 1; height: 22px; background: #e9ecef; border-radius: 6px; overflow: hidden; position: relative; }
.bar-fill {
  height: 100%; background: linear-gradient(90deg, #42b883, #3aa876);
  border-radius: 6px; transition: width 0.5s; min-width: 2px;
  display: flex; align-items: center; justify-content: flex-end; padding-right: 6px;
}
.bar-text { font-size: 0.7rem; color: white; font-weight: bold; }
.bar-sd-marker {
  position: absolute; top: 3px; height: 16px; background: rgba(0,0,0,0.1);
  border-radius: 3px; pointer-events: none;
}
.bar-value { width: 50px; text-align: right; font-size: 0.85rem; font-weight: bold; color: #333; }

/* Slider */
.slider-nav { display: flex; align-items: center; gap: 10px; }
.slider-btn {
  width: 36px; height: 36px; border-radius: 50%; border: 1px solid #ccc;
  background: white; cursor: pointer; font-size: 1.1rem; display: flex;
  align-items: center; justify-content: center; transition: 0.2s;
}
.slider-btn:hover:not(:disabled) { background: #e9ecef; }
.slider-btn:disabled { color: #ccc; cursor: not-allowed; }
.slider-indicator { font-size: 0.9rem; font-weight: bold; color: #555; }

.slider-viewport { overflow: hidden; border-radius: 10px; }
.slider-track { display: flex; transition: transform 0.4s ease; }
.slider-panel {
  min-width: 100%; flex-shrink: 0; padding: 5px;
  box-sizing: border-box;
}

.panel-header { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #eee; }
.panel-header h3 { margin: 0 0 4px; font-size: 1.2rem; color: #2c3e50; }
.panel-meta { font-size: 0.85rem; color: #888; }

.session-detail {
  margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ddd;
}
</style>