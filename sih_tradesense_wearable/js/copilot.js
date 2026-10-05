/**
 * AeroSentry Industrial
 * CopilotChat — Industrial AI safety assistant
 */

class CopilotChat {
  constructor(messagesId, formId, inputId) {
    this.messages = document.getElementById(messagesId);
    this.form     = document.getElementById(formId);
    this.input    = document.getElementById(inputId);
    this.kb = {
      steam: {
        category: 'Steam & High-Pressure Pipework Safety',
        response: 'Your wearable MEMS ultrasonic sensor continuously scans the 20–60 kHz frequency band. A high-pressure steam pinhole creates a characteristic hissing resonance at 38–42 kHz that can be detected metres away — even before the leak becomes visible.',
        sopSteps: [
          'Step 1 — Standoff distance: Maintain at least 3 m from any suspect joint. Supersonic steam can penetrate standard work gloves.',
          'Step 2 — Thermal sweep: Use the wearable IR reticle. Steam leaks create a concentrated heat plume (>80°C) traceable from safe distance.',
          'Step 3 — Acoustic triangulation: Slowly approach the pipe at 90°. Ultrasonic peak intensity in the FFT waterfall confirms exact pinhole location.',
          'Step 4 — Isolation & repair: Engage emergency bypass valve, depressurise to 0 PSI, and apply mechanical repair clamp before any physical contact.'
        ]
      },
      gas: {
        category: 'Confined Space Gas & Asphyxiation Safety',
        response: 'The wearable electrochemical multi-gas array continuously monitors H₂S, CH₄, CO, and O₂ simultaneously. The edge AI model tracks the rate-of-change to predict hazard escalation before threshold limits are breached — giving you 30–90 seconds of additional evacuation time.',
        sopSteps: [
          'Step 1 — Alarm response: If H₂S exceeds 10 ppm or O₂ drops below 19.5%, immediately exit the confined space.',
          'Step 2 — No self-rescue: Over 50% of confined space fatalities involve would-be rescuers. Wait for SCBA-equipped emergency team.',
          'Step 3 — Forced ventilation: Deploy mechanical ventilation blowers (≥1500 CFM) for a minimum of 15 minutes before any re-entry.',
          'Step 4 — Multi-level air test: Measure gas concentrations at top, middle, and bottom of the pit. Gas stratification is common.'
        ]
      },
      hvac: {
        category: 'Refrigerant Leak Detection & HVAC Safety',
        response: 'Refrigerant vapour (R-410A, R-32, R-22) triggers the wearable MOS halocarbon sensor array above 100 ppm. Simultaneously, refrigerant leaks escaping under pressure create acoustic signatures in the 30–36 kHz band detectable by the MEMS microphone.',
        sopSteps: [
          'Step 1 — Ventilate first: Before inspection, switch on the mechanical exhaust fans and ensure fresh air supply.',
          'Step 2 — Protect yourself: Don nitrile gloves and full-face goggles. Liquid refrigerant contact causes immediate frostbite.',
          'Step 3 — Isolation: Close manifold service valves and connect a recovery cylinder. Never vent refrigerant to atmosphere.',
          'Step 4 — Precise pinpointing: Use acoustic FFT wand from the wearable — the 32–34 kHz peak amplitude will be highest directly above the leak joint.'
        ]
      },
      electrical: {
        category: 'Electrical Arc Flash & Thermal Safety',
        response: 'Early-stage arcing produces high-frequency corona discharge in the 40–55 kHz ultrasonic range — detectable by the wearable microphone through closed panel doors, without the need to open energised equipment. The IR thermal matrix simultaneously detects surface heating (>50°C warning, >80°C critical).',
        sopSteps: [
          'Step 1 — Maintain Arc Flash Boundary: Step back to at least 2.5 m from the suspect panel immediately.',
          'Step 2 — No manual operation: Do not attempt to open or operate switchgear doors with anomalous readings.',
          'Step 3 — Remote isolation: Trip the upstream main circuit breaker from the remote SCADA station or the safety isolation switch.',
          'Step 4 — LOTO procedure: Implement full Lockout/Tagout protocol, verify absence of voltage, then proceed with thermographic inspection.'
        ]
      }
    };
  }

  init() {
    if (this.form) {
      this.form.addEventListener('submit', e => {
        e.preventDefault();
        const q = this.input?.value?.trim();
        if (q) { this.send(q); if (this.input) this.input.value = ''; }
      });
    }
    document.querySelectorAll('.copilot-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = chip.dataset.query;
        if (q) this.send(q);
      });
    });
  }

  async send(query) {
    if (!query.trim()) return;
    this._appendMsg('user', query);

    // Try server first
    const res = await window.API.post('/api/copilot/chat', { query, workerId: window.telemetry?.activeWorkerId });
    if (res && res.response) {
      this._appendBotResponse(res.response, res.sopSteps, res.category);
      return;
    }

    // Local fallback knowledge base
    const lower = query.toLowerCase();
    let matched = this.kb.steam;
    if (lower.match(/gas|sewer|h2s|hydrogen|methane|trench|confined|pit|manhole|asphyx/)) matched = this.kb.gas;
    else if (lower.match(/hvac|refrigerant|freon|chiller|r.?410|r.?32|cooling|evaporator/)) matched = this.kb.hvac;
    else if (lower.match(/electric|arc|panel|switchgear|loto|lockout|voltage|hv|lt/)) matched = this.kb.electrical;

    setTimeout(() => this._appendBotResponse(matched.response, matched.sopSteps, matched.category), 350);
  }

  _appendMsg(role, text) {
    if (!this.messages) return;
    const div = document.createElement('div');
    div.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} fade-in`;
    if (role === 'user') {
      div.innerHTML = `<div class="max-w-[82%] rounded-2xl rounded-tr-none bg-cyan-600/25 border border-cyan-500/35 p-3 text-sm text-cyan-100">
        <p class="text-[11px] text-cyan-400 font-tech font-bold mb-1">Field Technician</p>
        <p>${this._esc(text)}</p>
      </div>`;
    }
    this.messages.appendChild(div);
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  _appendBotResponse(response, sopSteps, category) {
    if (!this.messages) return;
    const div = document.createElement('div');
    div.className = 'flex justify-start fade-in';
    const stepsHtml = sopSteps ? sopSteps.map(s =>
      `<li class="flex gap-2 items-start text-[12px] text-slate-300"><span class="text-cyan-400 flex-shrink-0">›</span><span>${s}</span></li>`
    ).join('') : '';

    div.innerHTML = `
      <div class="max-w-[92%] rounded-2xl rounded-tl-none bg-slate-800/90 border border-slate-700 p-3.5 shadow-lg">
        <div class="flex items-center gap-2 mb-2">
          <span class="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center text-[9px] font-bold">AI</span>
          <span class="font-tech font-bold text-[11px] text-cyan-400">Industrial Safety Copilot</span>
          ${category ? `<span class="text-[10px] text-slate-500">· ${category}</span>` : ''}
        </div>
        <p class="text-[13px] text-slate-300 leading-relaxed mb-2">${response}</p>
        ${stepsHtml ? `<ul class="space-y-1.5 mt-2 border-t border-slate-700/60 pt-2">${stepsHtml}</ul>` : ''}
      </div>`;
    this.messages.appendChild(div);
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  _esc(t) {
    const d = document.createElement('div'); d.innerText = t; return d.innerHTML;
  }
}

window.CopilotChat = CopilotChat;
