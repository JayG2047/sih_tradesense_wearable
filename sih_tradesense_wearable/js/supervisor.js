/**
 * AeroSentry Industrial
 * SupervisorCommandCenter — Fleet management, plant map, incidents, compliance logging
 */

class SupervisorCommandCenter {
  constructor() {
    this.incidents = [];
    this.evacuating = false;
  }

  init() {
    this._loadIncidents();
    this._renderWorkerList();
    this._renderMap();
    this._renderIncidents();
  }

  async _loadIncidents() {
    const data = await window.API.get('/api/incidents');
    if (data && Array.isArray(data)) {
      this.incidents = data;
      this._renderIncidents();
    }
  }

  addIncident(incident) {
    this.incidents.unshift(incident);
    if (this.incidents.length > 50) this.incidents.pop();
    this._renderIncidents();
    this._renderWorkerList();
    this._renderMap();
  }

  _renderWorkerList() {
    const list = document.getElementById('supervisor-worker-list');
    if (!list) return;

    list.innerHTML = window.telemetry.workers.map(w => {
      const state = window.telemetry.getState(w.id);
      const s = state?.status || 'NORMAL';
      const isActive = w.id === window.telemetry.activeWorkerId;
      return `
        <div class="p-3 rounded-xl border cursor-pointer transition hover:border-cyan-500/40 ${
          s === 'CRITICAL' ? 'border-rose-500/70 bg-rose-950/20' :
          s === 'WARNING'  ? 'border-amber-400/50 bg-amber-950/15' :
          isActive         ? 'border-cyan-500/40 bg-cyan-950/10' :
                             'border-slate-800 bg-slate-900/50'
        }" onclick="switchWorker('${w.id}')">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="relative w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-tech font-bold text-[13px] text-cyan-400 flex-shrink-0">
                ${w.name.split(' ').map(n=>n[0]).join('')}
                <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                  s === 'CRITICAL' ? 'bg-rose-500' : s === 'WARNING' ? 'bg-amber-400' : 'bg-emerald-400'
                }"></span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-slate-100">${w.name}</span>
                  <span class="text-[10px] font-mono text-slate-500">${w.id}</span>
                  ${isActive ? '<span class="text-[10px] font-mono text-cyan-400 border border-cyan-500/40 px-1 rounded">ACTIVE VIEW</span>' : ''}
                </div>
                <p class="text-xs text-slate-400">${w.trade}</p>
                <p class="text-[11px] text-cyan-400/80 font-mono">📍 ${w.zone}</p>
              </div>
            </div>
            <div class="text-right">
              <span data-worker-status="${w.id}" class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                s === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500' :
                s === 'WARNING'  ? 'bg-amber-500/20 text-amber-300 border border-amber-400' :
                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }">${s}</span>
              <div class="text-[11px] font-mono text-slate-400 mt-1">🔋 ${state?.worker?.battery || w.battery}%  ❤️ ${state?.worker?.heartRate || w.heartRate} BPM</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  _renderMap() {
    const container = document.getElementById('supervisor-map');
    if (!container) return;

    // Remove existing pins
    container.querySelectorAll('.map-pin').forEach(p => p.remove());

    window.telemetry.workers.forEach(w => {
      const state = window.telemetry.getState(w.id);
      const s = state?.status || 'NORMAL';
      const initials = w.name.split(' ').map(n => n[0]).join('');

      const pin = document.createElement('div');
      pin.className = 'map-pin';
      pin.style.left = `${w.mapX}%`;
      pin.style.top  = `${w.mapY}%`;
      pin.onclick = () => switchWorker(w.id);

      pin.innerHTML = `
        <div class="map-pin-inner border-2 ${
          s === 'CRITICAL' ? 'bg-rose-500 border-rose-300 text-white' :
          s === 'WARNING'  ? 'bg-amber-400 border-amber-200 text-slate-900' :
          'bg-emerald-400 border-emerald-200 text-slate-900'
        } ${s === 'CRITICAL' ? 'animate-bounce' : ''}">
          ${initials}
        </div>
        <div class="map-pin-tooltip">
          <div class="font-bold text-slate-100 mb-0.5">${w.name} (${w.id})</div>
          <div class="text-cyan-400">${w.trade}</div>
          <div class="text-slate-400">${w.zone}</div>
          <div class="mt-1 font-mono text-[11px]">Status: <span class="${s === 'CRITICAL' ? 'text-rose-400' : s === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'}">${s}</span> | 🔋${state?.worker?.battery || w.battery}%</div>
          <div class="text-slate-500 text-[10px]">Click to inspect live telemetry →</div>
        </div>
      `;

      container.appendChild(pin);
    });
  }

  _renderIncidents() {
    const body = document.getElementById('incident-table-body');
    if (!body) return;

    if (this.incidents.length === 0) {
      body.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-slate-500 text-xs font-mono">No incidents recorded</td></tr>';
      return;
    }

    body.innerHTML = this.incidents.slice(0, 20).map(inc => `
      <tr class="border-b border-slate-800/70 hover:bg-slate-800/25 transition text-xs">
        <td class="py-2.5 px-3 font-mono text-cyan-400 font-medium">${inc.id || inc._id || 'INC-???'}</td>
        <td class="py-2.5 px-3 font-mono text-slate-400">${inc.timestamp || inc.createdAt || '—'}</td>
        <td class="py-2.5 px-3 font-medium text-slate-200">${inc.workerName || '—'}</td>
        <td class="py-2.5 px-3 text-slate-300 max-w-[180px] truncate">${inc.hazardType || inc.type || '—'}</td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase ${
            inc.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50' :
            inc.severity === 'WARNING'  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50' :
            'bg-slate-700 text-slate-300'
          }">${inc.severity || '—'}</span>
        </td>
        <td class="py-2.5 px-3 text-slate-400 max-w-[200px] truncate">${inc.actionTaken || '—'}</td>
      </tr>
    `).join('');

    // Update count badge
    const badge = document.getElementById('incident-count');
    if (badge) badge.textContent = this.incidents.length;
  }

  async broadcastEvacuation() {
    this.evacuating = true;
    const res = await window.API.post('/api/evacuation/broadcast', {});

    window.telemetry.workers.forEach(w => {
      window.telemetry.hazards[w.id] = 'SEWER_GAS'; // triggers general alert physics
      const s = window.telemetry.states[w.id];
      if (s) s.status = 'CRITICAL';
    });

    window.simulator.initAudio();
    [0, 250, 500, 750, 1000, 1250].forEach(d => setTimeout(() => {
      window.simulator.playTone(d % 500 === 0 ? 880 : 660, 0.22, 'sawtooth', 0.18);
    }, d));

    const evBanner = document.getElementById('evac-banner');
    if (evBanner) {
      evBanner.classList.remove('hidden');
      setTimeout(() => evBanner.classList.add('hidden'), 8000);
    }

    // Add mass evacuation incident
    const inc = {
      id: `INC-EVAC-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      workerName: 'ALL PERSONNEL (4 workers)',
      hazardType: 'Site-Wide Emergency Evacuation Broadcast',
      severity: 'CRITICAL',
      actionTaken: 'Mass evacuation beacon triggered from Supervisor Command Centre'
    };
    this.addIncident(inc);

    this._renderWorkerList();
    this._renderMap();
  }
}

// Global helper to switch active worker
function switchWorker(workerId) {
  window.telemetry.setActiveWorker(workerId);
  document.querySelector(`[data-tab="telemetry"]`)?.click();

  // Update header worker display
  const worker = window.telemetry.getWorker(workerId);
  if (worker) {
    const el = document.getElementById('active-worker-name');
    const elT = document.getElementById('active-worker-trade');
    const elZ = document.getElementById('active-worker-zone');
    if (el) el.textContent = worker.name;
    if (elT) elT.textContent = worker.trade;
    if (elZ) elZ.textContent = worker.zone;
  }

  // Highlight selected worker card in supervisor list
  document.querySelectorAll('[data-worker-id]').forEach(el => el.classList.remove('worker-selected'));
  document.querySelector(`[data-worker-id="${workerId}"]`)?.classList.add('worker-selected');

  // Re-render supervisor list to show ACTIVE VIEW badge
  if (window.supervisor) {
    window.supervisor._renderWorkerList();
    window.supervisor._renderMap();
  }
}

window.SupervisorCommandCenter = SupervisorCommandCenter;
window.switchWorker = switchWorker;
