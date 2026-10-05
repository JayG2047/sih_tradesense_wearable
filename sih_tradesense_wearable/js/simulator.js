/**
 * AeroSentry Industrial
 * Hazard Simulator — Controls scenario injection, UI feedback, audio alarms
 */

class HazardSimulator {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.alarmTimer = null;

    this.SCENARIOS = {
      STEAM_PINHOLE: {
        id: 'STEAM_PINHOLE',
        name: 'High-Pressure Steam Pipe Pinhole Leak',
        tradeAffected: 'Industrial Pipefitter / Steam Plant Technician',
        severity: 'CRITICAL',
        icon: '💨',
        color: 'cyan',
        desc: 'Micro-fracture in high-pressure steam conduit. Ultrasonic hissing at 38–42 kHz detected. Risk of invisible supersonic steam jet, pipe rupture, and severe scalding injury.',
        sensors: ['MEMS Ultrasonic Hiss (39.5 kHz)', 'IR Thermal Spot >85°C', 'Worker Heart Rate Spike'],
        tinyml: { model: 'AcousticCNN-1D-Int8-v4', latency: '14.2ms', confidence: 97.8, ram: '74 KB', result: 'POSITIVE_LEAK_CONFIRMED' },
        sop: [
          'Do NOT approach the pipe with bare hands — supersonic steam jets penetrate standard gloves.',
          'Use wearable thermal reticle to trace the heat plume origin safely from ≥3 m distance.',
          'Engage emergency bypass isolation valve (SV-04) and notify the boiler plant supervisor.',
          'Depressurise the line to 0 PSI before applying mechanical repair clamp or pipe wrap.'
        ]
      },
      SEWER_GAS: {
        id: 'SEWER_GAS',
        name: 'Confined Space Trench — H₂S & Methane Toxic Buildup',
        tradeAffected: 'Plumbing & Municipal Sanitation Operative (NSQF Level 3)',
        severity: 'CRITICAL',
        icon: '☣️',
        color: 'rose',
        desc: 'Lethal Hydrogen Sulfide (>40 ppm) and explosive Methane (>1800 ppm) detected. Oxygen falling below 18% — immediate asphyxiation risk.',
        sensors: ['Electrochemical H₂S Sensor (>40 ppm)', 'Pellistor Methane (>1800 ppm)', 'O₂ Hypoxia Alert (<18%)'],
        tinyml: { model: 'MultiGas-GradientDNN-v2-Int8', latency: '9.8ms', confidence: 99.4, ram: '52 KB', result: 'IMMEDIATE_EVACUATION' },
        sop: [
          'EVACUATE the confined pit or trench IMMEDIATELY — do not attempt rescue without SCBA.',
          'Deploy forced mechanical ventilation blowers (≥1500 CFM) for a minimum of 15 minutes.',
          'Supervisor command centre has received automated GPS SOS beacon — await emergency response.',
          'Re-test air quality at 3 depth strata (top, middle, bottom) before any re-entry attempt.'
        ]
      },
      HVAC_REFRIGERANT: {
        id: 'HVAC_REFRIGERANT',
        name: 'Chiller Room R-410A Halocarbon Refrigerant Leak',
        tradeAffected: 'HVAC-R Refrigeration & Air Conditioning Technician',
        severity: 'WARNING',
        icon: '❄️',
        color: 'amber',
        desc: 'Refrigerant vapour escaping from evaporator expansion joint (>770 ppm). Risk of oxygen displacement, asphyxiation, and ozone-depleting halocarbon release.',
        sensors: ['Halocarbon MOS Array (>770 ppm)', 'Ultrasonic Leak Resonance (32.8 kHz)', 'Compressor Room O₂ Drop'],
        tinyml: { model: 'AcousticHalocarbon-Fusion-M4', latency: '16.5ms', confidence: 94.2, ram: '82 KB', result: 'REFRIGERANT_DISCHARGE' },
        sop: [
          'Activate mechanical exhaust ventilation fans in the compressor room before any inspection.',
          'Don nitrile gloves and safety goggles — refrigerant liquid contact causes immediate frostbite.',
          'Isolate manifold service valves and connect recovery cylinder before any cutting or brazing.',
          'Use ultrasonic wand or soap bubble test to pinpoint the exact leak joint before repair.'
        ]
      },
      ELECTRICAL_ARC: {
        id: 'ELECTRICAL_ARC',
        name: '3-Phase Switchgear Arcing & Thermal Overload',
        tradeAffected: 'Industrial Electrician — HT / LT Switchgear (NSQF Level 5)',
        severity: 'CRITICAL',
        icon: '⚡',
        color: 'purple',
        desc: 'Loose busbar termination generating high-frequency corona arc discharge (48 kHz). Thermal camera detects panel surface >110°C — imminent arc-flash risk.',
        sensors: ['IR Matrix Hotspot >110°C', 'Corona Arc Ultrasonic (48.2 kHz)', 'Trace CO from Smouldering Insulation'],
        tinyml: { model: 'ThermalArc-SpectroFusion-v3', latency: '11.4ms', confidence: 98.6, ram: '68 KB', result: 'ARC_FLASH_RISK_HIGH' },
        sop: [
          'Step back beyond the 2.5 m Arc Flash Boundary immediately — do not open panel doors.',
          'Do NOT manually operate switchgear — risk of arc blast reaching 35,000°F.',
          'Trip the upstream main circuit breaker from remote SCADA or the safety isolation switch.',
          'Execute full Lockout/Tagout (LOTO) protocol before panel access and infrared thermography.'
        ]
      }
    };
  }

  // Unlock Web Audio on first user gesture
  initAudio() {
    if (!this.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.audioCtx = new AC();
    }
    if (this.audioCtx?.state === 'suspended') this.audioCtx.resume();
  }

  playTone(freq, duration, type = 'sawtooth', gain = 0.15) {
    if (this.isMuted || !this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    g.gain.setValueAtTime(gain, this.audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
    osc.connect(g); g.connect(this.audioCtx.destination);
    osc.start(); osc.stop(this.audioCtx.currentTime + duration);
  }

  playHazardAlarm(severity) {
    if (severity === 'CRITICAL') {
      this.playTone(660, 0.22, 'sawtooth');
      setTimeout(() => this.playTone(880, 0.22, 'sawtooth'), 250);
    } else {
      this.playTone(550, 0.28, 'sine');
      setTimeout(() => this.playTone(440, 0.22, 'sine'), 300);
    }
  }

  playClearChime() {
    this.playTone(523, 0.12, 'sine', 0.12);
    setTimeout(() => this.playTone(659, 0.18, 'sine', 0.12), 140);
  }

  startAlarmLoop(severity) {
    this.stopAlarmLoop();
    this.playHazardAlarm(severity);
    this.alarmTimer = setInterval(() => {
      if (window.telemetry?.isHazardActive(window.telemetry?.activeWorkerId)) {
        this.playHazardAlarm(severity);
      } else {
        this.stopAlarmLoop();
      }
    }, 2800);
  }

  stopAlarmLoop() {
    if (this.alarmTimer) { clearInterval(this.alarmTimer); this.alarmTimer = null; }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) this.stopAlarmLoop();
    return this.isMuted;
  }

  async trigger(workerId, scenarioKey) {
    this.initAudio();
    const scenario = this.SCENARIOS[scenarioKey];
    if (!scenario) return;

    await window.telemetry.triggerHazard(workerId, scenarioKey);
    this.startAlarmLoop(scenario.severity);
    this._renderHazardPanel(workerId, scenario);

    // Log incident
    const worker = window.telemetry.getWorker(workerId);
    const incident = {
      workerName: worker?.name || workerId,
      workerId,
      trade: scenario.tradeAffected,
      hazardType: scenario.name,
      severity: scenario.severity,
      location: worker?.zone || '',
      actionTaken: 'Edge AI detected hazard — Haptic alert activated — Supervisor notified via LoRaWAN'
    };
    const saved = await window.API.post('/api/incidents', incident);
    if (saved && window.supervisor) window.supervisor.addIncident(saved);
  }

  async reset(workerId) {
    await window.telemetry.resetHazard(workerId || 'ALL');
    this.stopAlarmLoop();
    this.playClearChime();
    this._renderNormalPanel();
  }

  _renderHazardPanel(workerId, scenario) {
    const el = id => document.getElementById(id);

    const banner = el('hazard-banner');
    const title  = el('hazard-title');
    const desc   = el('hazard-desc');
    const badge  = el('hazard-badge');
    const haptic = el('haptic-indicator');
    const conf   = el('tinyml-confidence');
    const confBar = el('tinyml-conf-bar');
    const model  = el('tinyml-model');
    const latency = el('tinyml-latency');
    const ram    = el('tinyml-ram');
    const sopList = el('sop-list');
    const sensors = el('triggered-sensors');

    const isCritical = scenario.severity === 'CRITICAL';

    if (banner) banner.className = `p-4 rounded-2xl border transition-all duration-300 fade-in ${
      isCritical ? 'border-rose-500/70 bg-rose-950/30 hazard-pulse' : 'border-amber-500/60 bg-amber-950/25 warn-pulse'
    }`;

    if (title) title.textContent = scenario.name;
    if (desc)  desc.textContent  = `${scenario.tradeAffected} — ${scenario.desc}`;

    if (badge) {
      badge.textContent = scenario.severity;
      badge.className = `px-2.5 py-0.5 rounded-full text-[11px] font-tech font-bold uppercase tracking-wider ${
        isCritical ? 'bg-rose-500/25 text-rose-300 border border-rose-500' : 'bg-amber-400/20 text-amber-300 border border-amber-400'
      }`;
    }

    if (haptic) haptic.textContent = 'HAPTIC MOTOR: VIBRATING (TRIPLE PULSE)';
    if (conf)   conf.textContent = `${scenario.tinyml.confidence}%`;
    if (confBar) confBar.style.width = `${scenario.tinyml.confidence}%`;
    if (model)  model.textContent = scenario.tinyml.model;
    if (latency) latency.textContent = scenario.tinyml.latency;
    if (ram)    ram.textContent = scenario.tinyml.ram;

    if (sensors) {
      sensors.innerHTML = scenario.sensors.map(s =>
        `<span class="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300">🔔 ${s}</span>`
      ).join('');
    }

    if (sopList) {
      sopList.innerHTML = scenario.sop.map((step, i) =>
        `<li class="flex gap-3 items-start p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[13px] text-slate-200 fade-in">
           <span class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
             isCritical ? 'bg-rose-500/15 border-rose-500/50 text-rose-400' : 'bg-amber-400/15 border-amber-400/50 text-amber-300'
           }">${i + 1}</span>
           <span>${step}</span>
         </li>`
      ).join('');
    }

    // Update wearable pod badge
    const podBadge = document.getElementById('pod-status-badge');
    if (podBadge) {
      podBadge.textContent = scenario.severity;
      podBadge.className = `px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
        isCritical ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-400 text-slate-950'
      }`;
    }
  }

  _renderNormalPanel() {
    const el = id => document.getElementById(id);
    const banner = el('hazard-banner');
    const haptic = el('haptic-indicator');
    const conf   = el('tinyml-confidence');
    const confBar = el('tinyml-conf-bar');
    const model  = el('tinyml-model');
    const latency = el('tinyml-latency');
    const ram    = el('tinyml-ram');
    const sopList = el('sop-list');
    const badge  = el('hazard-badge');
    const title  = el('hazard-title');
    const desc   = el('hazard-desc');
    const sensors = el('triggered-sensors');

    if (banner) banner.className = 'p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/15 transition-all duration-300';
    if (title)  title.textContent = 'All Systems Nominal — Continuous Background Monitoring Active';
    if (desc)   desc.textContent  = 'Wearable edge inference is scanning all sensor channels at 1 Hz. Gas, acoustic, thermal, and biometric parameters are within safe operational limits.';
    if (badge) { badge.textContent = 'NOMINAL'; badge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-tech font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'; }
    if (haptic) haptic.textContent = 'HAPTIC MOTOR: STANDBY';
    if (conf)   conf.textContent = '2.8%';
    if (confBar) confBar.style.width = '2.8%';
    if (model)  model.textContent = 'Quiescent-MultiSensor-v1';
    if (latency) latency.textContent = '8.4ms';
    if (ram)    ram.textContent = '46 KB';
    if (sensors) sensors.innerHTML = '<span class="text-xs text-emerald-400 font-mono">✓ All sensor channels within safe operational thresholds</span>';
    if (sopList) {
      sopList.innerHTML = [
        'Gas array verified: O₂ 20.9% | H₂S <1 ppm | CH₄ <30 ppm — all within safe limits.',
        'Acoustic scan clear: No ultrasonic hissing signature detected in 20–60 kHz band.',
        'Thermal matrix normal: Max spot temperature 28°C — no anomalous heat gradient.'
      ].map((s, i) =>
        `<li class="flex gap-3 items-start p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[13px] text-slate-300">
           <span class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border bg-emerald-500/15 border-emerald-500/50 text-emerald-400">✓</span>
           <span>${s}</span>
         </li>`
      ).join('');
    }

    const podBadge = document.getElementById('pod-status-badge');
    if (podBadge) {
      podBadge.textContent = 'NORMAL';
      podBadge.className = 'px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40';
    }
  }

  getScenarios() { return Object.values(this.SCENARIOS); }
  getScenario(key) { return this.SCENARIOS[key]; }
}

window.simulator = new HazardSimulator();
