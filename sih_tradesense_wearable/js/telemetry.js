/**
 * AeroSentry Industrial
 * TelemetryEngine — Manages live sensor simulation + API polling per worker
 */

class TelemetryEngine extends EventTarget {
  constructor() {
    super();
    
    // All 4 workers base configurations
    this.workers = [
      { id: 'WRK-01', name: 'Rahul Sharma',  trade: 'Industrial Pipefitter',           zone: 'Zone B – High-Pressure Steam Gallery',    battery: 94, heartRate: 76, rssi: -72, mapX: 28, mapY: 40 },
      { id: 'WRK-02', name: 'Vikram Singh',  trade: 'HVAC-R Chiller Technician',       zone: 'Zone C – Rooftop Chiller Plant',          battery: 88, heartRate: 78, rssi: -68, mapX: 72, mapY: 26 },
      { id: 'WRK-03', name: 'Amit Patel',    trade: 'Sanitation & Drainage Operative', zone: 'Zone D – Confined Trench Pit #4',         battery: 82, heartRate: 80, rssi: -85, mapX: 20, mapY: 75 },
      { id: 'WRK-04', name: 'Priya Das',     trade: 'Industrial Electrician',          zone: 'Zone A – 11kV HT Substation',             battery: 91, heartRate: 74, rssi: -70, mapX: 66, mapY: 66 }
    ];

    // Per-worker telemetry state
    this.states = {};
    this.workers.forEach(w => { this.states[w.id] = this._baseState(w); });

    // Active hazards per worker
    this.hazards = {};

    // History per worker (for charts)
    this.history = {};
    this.workers.forEach(w => { this.history[w.id] = this._emptyHistory(); });

    this.activeWorkerId = 'WRK-01';
    this.tickInterval = null;
    this.apiPollInterval = null;
    this.chartInstances = {};
    this.subscribers = [];

    this._initHistory();
  }

  _baseState(worker) {
    return {
      workerId: worker.id,
      timestamp: new Date().toISOString(),
      status: 'NORMAL',
      gas: { ch4: 10 + Math.random() * 6, co: 6 + Math.random() * 4, h2s: 0.4 + Math.random() * 0.6, refrigerant: 3 + Math.random() * 4, o2: 20.9 },
      acoustic: { db: 20 + Math.random() * 5, dominantFreq: 22 + Math.random() * 4, leakDetected: false, confidence: Math.floor(Math.random() * 6) },
      thermal: { maxSpot: 25 + Math.random() * 4, ambient: 24 + Math.random() },
      worker: { heartRate: worker.heartRate, battery: worker.battery, fallDetected: false, motionState: 'ACTIVE', rssi: worker.rssi }
    };
  }

  _emptyHistory() {
    const now = Date.now();
    const h = { labels: [], ch4: [], co: [], h2s: [], ultrasonic: [], heartRate: [] };
    for (let i = 19; i >= 0; i--) {
      h.labels.push(new Date(now - i * 1500).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }));
      h.ch4.push(10 + Math.random() * 5);
      h.co.push(6 + Math.random() * 4);
      h.h2s.push(0.4 + Math.random() * 0.5);
      h.ultrasonic.push(19 + Math.random() * 5);
      h.heartRate.push(72 + Math.floor(Math.random() * 6));
    }
    return h;
  }

  _initHistory() {
    // Already done via workers loop above — this is a no-op but kept for clarity
  }

  // Jitter a value by ±delta, clamped to [min, max]
  _jitter(val, delta, min, max) {
    return Math.min(max, Math.max(min, val + (Math.random() - 0.5) * 2 * delta));
  }

  start() {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => this._tick(), 1200);
    this._pollAPI();
    this.apiPollInterval = setInterval(() => this._pollAPI(), 3000);
  }

  stop() {
    clearInterval(this.tickInterval);
    clearInterval(this.apiPollInterval);
    this.tickInterval = null;
    this.apiPollInterval = null;
  }

  setActiveWorker(workerId) {
    if (!this.workers.find(w => w.id === workerId)) return;
    this.activeWorkerId = workerId;
    // Notify subscribers immediately with current state
    this._notify(this.states[workerId]);
    this._updateCharts(workerId);
  }

  getWorker(id) { return this.workers.find(w => w.id === id); }
  getState(id) { return this.states[id || this.activeWorkerId]; }
  getAllStates() { return Object.values(this.states); }

  subscribe(fn) { this.subscribers.push(fn); }

  async _pollAPI() {
    const state = await window.API.get(`/api/telemetry/${this.activeWorkerId}`);
    if (state) {
      this.states[this.activeWorkerId] = state;
    }
  }

  _tick() {
    // Update all workers' local simulation state
    this.workers.forEach(w => {
      const s = this.states[w.id];
      const hazard = this.hazards[w.id];
      const h = this.history[w.id];

      if (hazard) {
        this._applyHazardPhysics(s, hazard);
      } else {
        // Normal baseline jitter
        s.gas.ch4         = this._jitter(s.gas.ch4, 1.5, 5, 30);
        s.gas.co          = this._jitter(s.gas.co, 1, 2, 20);
        s.gas.h2s         = +(this._jitter(s.gas.h2s, 0.12, 0.1, 2)).toFixed(2);
        s.gas.refrigerant = this._jitter(s.gas.refrigerant, 1, 1, 15);
        s.gas.o2          = +(20.9 + (Math.random() - 0.5) * 0.08).toFixed(1);
        s.acoustic.db     = this._jitter(s.acoustic.db, 2, 15, 28);
        s.acoustic.dominantFreq = +(22 + Math.random() * 4).toFixed(1);
        s.acoustic.leakDetected = false;
        s.acoustic.confidence   = Math.floor(Math.random() * 7);
        s.thermal.maxSpot  = +(this._jitter(s.thermal.maxSpot, 0.4, 23, 31)).toFixed(1);
        s.thermal.ambient  = +(24 + (Math.random() - 0.5) * 0.4).toFixed(1);
        s.worker.heartRate = Math.round(this._jitter(w.heartRate, 3, 60, 90));
        s.status = 'NORMAL';
      }

      s.timestamp = new Date().toISOString();
      const ts = new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });

      // Push to history, keep last 25
      h.labels.push(ts);
      h.ch4.push(+s.gas.ch4.toFixed(1));
      h.co.push(+s.gas.co.toFixed(1));
      h.h2s.push(+s.gas.h2s.toFixed(2));
      h.ultrasonic.push(+s.acoustic.db.toFixed(1));
      h.heartRate.push(s.worker.heartRate);

      if (h.labels.length > 25) {
        ['labels','ch4','co','h2s','ultrasonic','heartRate'].forEach(k => h[k].shift());
      }
    });

    // Notify with active worker's state
    this._notify(this.states[this.activeWorkerId]);
    this._updateCharts(this.activeWorkerId);
    this._updateAllWorkerPills();
  }

  _applyHazardPhysics(state, hazard) {
    switch (hazard) {
      case 'STEAM_PINHOLE':
        state.acoustic.db = +(68 + Math.random() * 8).toFixed(1);
        state.acoustic.dominantFreq = +(39.5 + (Math.random() - 0.5) * 1.2).toFixed(1);
        state.acoustic.leakDetected = true;
        state.acoustic.confidence = 97;
        state.thermal.maxSpot = +(88 + Math.random() * 5).toFixed(1);
        state.worker.heartRate = 104 + Math.floor(Math.random() * 10);
        state.status = 'CRITICAL';
        break;
      case 'SEWER_GAS':
        state.gas.h2s = +(40 + Math.random() * 6).toFixed(1);
        state.gas.ch4 = +(1800 + Math.random() * 120).toFixed(0);
        state.gas.o2  = +(17.6 - Math.random() * 0.4).toFixed(1);
        state.worker.heartRate = 120 + Math.floor(Math.random() * 10);
        state.status = 'CRITICAL';
        break;
      case 'HVAC_REFRIGERANT':
        state.gas.refrigerant = +(770 + Math.random() * 55).toFixed(0);
        state.acoustic.db = +(52 + Math.random() * 4).toFixed(1);
        state.acoustic.dominantFreq = +(32.8 + Math.random() * 1).toFixed(1);
        state.acoustic.leakDetected = true;
        state.acoustic.confidence = 94;
        state.status = 'WARNING';
        break;
      case 'ELECTRICAL_ARC':
        state.thermal.maxSpot = +(110 + Math.random() * 8).toFixed(1);
        state.acoustic.db = +(46 + Math.random() * 5).toFixed(1);
        state.acoustic.dominantFreq = +(48.2 + Math.random() * 2).toFixed(1);
        state.gas.co = +(46 + Math.random() * 6).toFixed(1);
        state.worker.heartRate = 96 + Math.floor(Math.random() * 7);
        state.status = 'CRITICAL';
        break;
    }
  }

  async triggerHazard(workerId, scenario) {
    this.hazards[workerId] = scenario;
    // Try server sync
    await window.API.post('/api/simulator/trigger', { workerId, scenario });
  }

  async resetHazard(workerId) {
    if (workerId === 'ALL') {
      this.workers.forEach(w => { delete this.hazards[w.id]; });
      await window.API.post('/api/simulator/reset', { workerId: 'ALL' });
    } else {
      delete this.hazards[workerId];
      await window.API.post('/api/simulator/reset', { workerId });
    }
  }

  isHazardActive(workerId) { return !!this.hazards[workerId]; }
  getHazardType(workerId) { return this.hazards[workerId] || null; }

  _notify(state) {
    this.subscribers.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } });
  }

  _updateAllWorkerPills() {
    this.workers.forEach(w => {
      const pill = document.querySelector(`[data-worker-status="${w.id}"]`);
      if (!pill) return;
      const s = this.states[w.id];
      pill.textContent = s.status;
      pill.className = `px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
        s.status === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500' :
        s.status === 'WARNING'  ? 'bg-amber-500/20 text-amber-300 border border-amber-400' :
        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
      }`;
    });
  }

  // Chart.js instances
  registerCharts(instances) { Object.assign(this.chartInstances, instances); }

  _updateCharts(workerId) {
    const h = this.history[workerId];
    if (this.chartInstances.gasChart) {
      this.chartInstances.gasChart.data.labels = h.labels;
      this.chartInstances.gasChart.data.datasets[0].data = h.ch4;
      this.chartInstances.gasChart.data.datasets[1].data = h.co;
      this.chartInstances.gasChart.data.datasets[2].data = h.h2s;
      this.chartInstances.gasChart.update('none');
    }
    if (this.chartInstances.acousticChart) {
      this.chartInstances.acousticChart.data.labels = h.labels;
      this.chartInstances.acousticChart.data.datasets[0].data = h.ultrasonic;
      this.chartInstances.acousticChart.update('none');
    }
    if (this.chartInstances.vitalsChart) {
      this.chartInstances.vitalsChart.data.labels = h.labels;
      this.chartInstances.vitalsChart.data.datasets[0].data = h.heartRate;
      this.chartInstances.vitalsChart.update('none');
    }
  }
}

window.telemetry = new TelemetryEngine();
