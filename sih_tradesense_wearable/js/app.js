/**
 * AeroSentry Industrial
 * app.js — Application bootstrap, tab routing, Chart.js, live metric rendering
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Server ping
  await window.API.ping();
  setInterval(() => window.API.ping(), 15000);

  // 2. Init Chart.js charts
  initCharts();

  // 3. Start telemetry engine
  window.telemetry.subscribe(updateMetricsDisplay);
  window.telemetry.start();

  // 4. Start canvas visualizers
  window.specViz = new SpectrogramVisualizer('spectrogram-canvas', 'fft-bars-canvas');
  window.thermViz = new ThermalVisualizer('thermal-canvas');
  window.specViz.start();
  window.thermViz.start();

  // 5. Init supervisor
  window.supervisor = new SupervisorCommandCenter();
  window.supervisor.init();

  // 6. Init copilot chat
  window.copilot = new CopilotChat('copilot-messages', 'copilot-form', 'copilot-input');
  window.copilot.init();

  // 7. Init tabs
  initTabs();

  // 8. Wire up controls
  wireControls();

  // 9. Render initial worker info
  const w0 = window.telemetry.getWorker('WRK-01');
  if (w0) {
    setElText('active-worker-name', w0.name);
    setElText('active-worker-trade', w0.trade);
    setElText('active-worker-zone', w0.zone);
  }

  // 10. Render worker selector chips
  renderWorkerChips();

  // 11. Periodically refresh supervisor view
  setInterval(() => {
    if (window.supervisor) {
      window.supervisor._renderWorkerList();
      window.supervisor._renderMap();
    }
  }, 3000);

  // Set initial SOP panel to normal
  window.simulator._renderNormalPanel();
});

/* ─── Tab Navigation ─────────────────────────────────────────────────────── */
function initTabs() {
  const tabs = document.querySelectorAll('[data-tab]');
  const sections = document.querySelectorAll('[data-section]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => { t.classList.remove('tab-active'); });
      tab.classList.add('tab-active');

      sections.forEach(s => {
        s.classList.toggle('hidden', s.dataset.section !== target);
      });

      // Resize canvas when switching to labs tab
      if (target === 'labs') {
        setTimeout(() => {
          window.specViz?.resizeCanvas?.();
          window.specViz?.start?.();
          window.thermViz?.start?.();
        }, 50);
      }
    });
  });
}

/* ─── Worker Chips ────────────────────────────────────────────────────────── */
function renderWorkerChips() {
  const container = document.getElementById('worker-chips');
  if (!container) return;
  container.innerHTML = window.telemetry.workers.map(w => `
    <button data-worker-id="${w.id}" onclick="switchAndHighlight('${w.id}')"
      class="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-800 glass-card text-xs font-tech hover:border-cyan-500/40 transition ${w.id === 'WRK-01' ? 'worker-selected border-cyan-500/40' : ''}">
      <span class="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-cyan-400">${w.name.split(' ').map(n=>n[0]).join('')}</span>
      <div class="text-left">
        <div class="font-medium text-slate-200">${w.name}</div>
        <div class="text-slate-500">${w.trade.split(' ').slice(0,2).join(' ')}</div>
      </div>
      <span data-worker-status="${w.id}" class="ml-auto px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">NORMAL</span>
    </button>
  `).join('');
}

window.switchAndHighlight = function(workerId) {
  document.querySelectorAll('[data-worker-id]').forEach(el => el.classList.remove('worker-selected'));
  document.querySelector(`[data-worker-id="${workerId}"]`)?.classList.add('worker-selected');
  switchWorker(workerId);
};

/* ─── Chart.js Initialization ────────────────────────────────────────────── */
function initCharts() {
  if (typeof Chart === 'undefined') return;

  const baseOpts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 6 } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } } }
    },
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { family: 'Chakra Petch', size: 11 }, boxWidth: 12 } },
      tooltip: { backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
    }
  };

  const gasCtx = document.getElementById('gas-chart')?.getContext('2d');
  let gasChart = null;
  if (gasCtx) {
    const wid = window.telemetry.activeWorkerId;
    const h = window.telemetry.history[wid];
    gasChart = new Chart(gasCtx, {
      type: 'line',
      data: {
        labels: h.labels,
        datasets: [
          { label: 'CH₄ (PPM)', data: h.ch4, borderColor: '#ffb703', backgroundColor: 'rgba(255,183,3,0.08)', borderWidth: 2, tension: 0.3, fill: true, pointRadius: 0 },
          { label: 'CO (PPM)',  data: h.co,  borderColor: '#38bdf8', backgroundColor: 'transparent', borderWidth: 1.5, tension: 0.3, pointRadius: 0 },
          { label: 'H₂S (PPM)',data: h.h2s, borderColor: '#ff3366', backgroundColor: 'transparent', borderWidth: 2, tension: 0.3, pointRadius: 0 }
        ]
      },
      options: baseOpts
    });
  }

  const acCtx = document.getElementById('acoustic-chart')?.getContext('2d');
  let acChart = null;
  if (acCtx) {
    const wid = window.telemetry.activeWorkerId;
    const h = window.telemetry.history[wid];
    acChart = new Chart(acCtx, {
      type: 'line',
      data: {
        labels: h.labels,
        datasets: [{ label: 'Ultrasonic Noise (dB)', data: h.ultrasonic, borderColor: '#00f2fe', backgroundColor: 'rgba(0,242,254,0.1)', borderWidth: 2, tension: 0.25, fill: true, pointRadius: 0 }]
      },
      options: baseOpts
    });
  }

  const vtCtx = document.getElementById('vitals-chart')?.getContext('2d');
  let vtChart = null;
  if (vtCtx) {
    const wid = window.telemetry.activeWorkerId;
    const h = window.telemetry.history[wid];
    vtChart = new Chart(vtCtx, {
      type: 'line',
      data: {
        labels: h.labels,
        datasets: [{ label: 'Heart Rate (BPM)', data: h.heartRate, borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.08)', borderWidth: 2, tension: 0.3, fill: true, pointRadius: 0 }]
      },
      options: baseOpts
    });
  }

  window.telemetry.registerCharts({ gasChart, acousticChart: acChart, vitalsChart: vtChart });
}

/* ─── Metrics Display ────────────────────────────────────────────────────── */
function updateMetricsDisplay(state) {
  if (!state) return;

  const set = (id, val) => setElText(id, val);
  const setClass = (id, cls) => { const el = document.getElementById(id); if (el) el.className = cls; };

  // Gas
  set('val-ch4', `${(+state.gas.ch4).toFixed(1)} PPM`);
  set('val-co', `${(+state.gas.co).toFixed(1)} PPM`);
  set('val-h2s', `${(+state.gas.h2s).toFixed(2)} PPM`);
  set('val-o2', `${(+state.gas.o2).toFixed(1)} %`);
  set('val-ref', `${(+state.gas.refrigerant).toFixed(0)} PPM`);

  // Acoustic
  set('val-acoustic-db', `${(+state.acoustic.db).toFixed(1)} dB`);
  set('val-acoustic-freq', `${(+state.acoustic.dominantFreq).toFixed(1)} kHz`);
  const leakEl = document.getElementById('val-leak-status');
  if (leakEl) {
    leakEl.textContent = state.acoustic.leakDetected ? `LEAK DETECTED (${state.acoustic.confidence}%)` : 'NONE DETECTED';
    leakEl.className = `metric-value ${state.acoustic.leakDetected ? 'sev-critical' : 'sev-normal'}`;
  }

  // Thermal
  set('val-thermal-spot', `${(+state.thermal.maxSpot).toFixed(1)}°C`);
  set('val-thermal-amb', `${(+state.thermal.ambient).toFixed(1)}°C`);

  // Worker
  set('val-heartrate', `${state.worker.heartRate} BPM`);
  set('val-battery', `${state.worker.battery}%`);
  set('val-motion', state.worker.motionState || 'ACTIVE');
  set('val-rssi', `${state.worker.rssi} dBm`);

  // Master status badge
  const badge = document.getElementById('master-badge');
  if (badge) {
    badge.textContent = `● ${state.status}`;
    badge.className = `px-3 py-1 rounded-full text-xs font-tech font-bold uppercase tracking-wider ${
      state.status === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500 animate-pulse' :
      state.status === 'WARNING'  ? 'bg-amber-400/20 text-amber-300 border border-amber-400' :
      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
    }`;
  }

  // Color-code individual metric values based on severity
  colorMetric('val-ch4', state.gas.ch4, 500, 2000);
  colorMetric('val-co', state.gas.co, 35, 200);
  colorMetric('val-h2s', state.gas.h2s, 10, 30);
  colorMetric('val-o2', 20.9 - state.gas.o2, 0, 1.4); // inverted: lower O2 = higher danger
  colorMetric('val-ref', state.gas.refrigerant, 250, 600);
  colorMetric('val-acoustic-db', state.acoustic.db, 40, 65);
  colorMetric('val-thermal-spot', state.thermal.maxSpot, 50, 90);
  colorMetric('val-heartrate', state.worker.heartRate, 100, 130);
}

function colorMetric(id, val, warnThresh, critThresh) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `metric-value ${val >= critThresh ? 'sev-critical' : val >= warnThresh ? 'sev-warning' : 'sev-normal'}`;
}

function setElText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

/* ─── Controls Wiring ────────────────────────────────────────────────────── */
function wireControls() {
  // Scenario triggers
  const triggers = {
    'btn-steam':   ['WRK-01', 'STEAM_PINHOLE'],
    'btn-gas':     ['WRK-03', 'SEWER_GAS'],
    'btn-hvac':    ['WRK-02', 'HVAC_REFRIGERANT'],
    'btn-arc':     ['WRK-04', 'ELECTRICAL_ARC'],
  };

  Object.entries(triggers).forEach(([btnId, [workerId, scenario]]) => {
    document.getElementById(btnId)?.addEventListener('click', async () => {
      window.simulator.initAudio();
      switchAndHighlight(workerId);
      await window.simulator.trigger(workerId, scenario);
      // Auto-switch to simulator tab to show the SOP
      document.querySelector('[data-tab="simulator"]')?.click();
    });
  });

  // Reset
  document.getElementById('btn-reset')?.addEventListener('click', async () => {
    await window.simulator.reset('ALL');
    window.telemetry.workers.forEach(w => { delete window.telemetry.hazards[w.id]; });
  });

  // Mute toggle
  const muteBtn = document.getElementById('btn-mute');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const muted = window.simulator.toggleMute();
      muteBtn.innerHTML = muted ? '🔇 Alarm Muted' : '🔊 Alarm ON';
      muteBtn.className = muted
        ? 'px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-tech text-slate-400 hover:text-slate-200 transition'
        : 'px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 text-xs font-tech text-cyan-300 hover:bg-cyan-500/25 transition';
    });
  }

  // Evacuation
  document.getElementById('btn-evac')?.addEventListener('click', () => {
    window.simulator.initAudio();
    window.supervisor?.broadcastEvacuation();
  });

  // Audit modal
  document.getElementById('btn-audit')?.addEventListener('click', async () => {
    const report = await window.API.get('/api/audit-report') || {
      generatedAt: new Date().toISOString(),
      status: '100% COMPLIANT',
      workersMonitored: 4,
      incidentsTotal: window.supervisor?.incidents?.length || 0,
      notes: 'All sensor arrays within operational thresholds. Edge AI inference active.'
    };
    setElText('audit-ts', new Date(report.generatedAt).toLocaleString());
    setElText('audit-workers', report.workersMonitored || 4);
    setElText('audit-incidents', report.incidentsTotal || window.supervisor?.incidents?.length || 0);
    setElText('audit-status', report.status || 'COMPLIANT');
    document.getElementById('audit-modal')?.classList.remove('hidden');
  });
  document.getElementById('btn-close-audit')?.addEventListener('click', () => {
    document.getElementById('audit-modal')?.classList.add('hidden');
  });
}
