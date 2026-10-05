/**
 * AeroSentry Industrial
 * SpectrogramVisualizer — Canvas-based ultrasonic FFT waterfall (20–60 kHz)
 */
class SpectrogramVisualizer {
  constructor(waterfallId, barsId) {
    this.cvWater = document.getElementById(waterfallId);
    this.cvBars  = document.getElementById(barsId);
    this.ctxW = this.cvWater?.getContext('2d');
    this.ctxB = this.cvBars?.getContext('2d');
    this.bins  = 64;
    this.rows  = 80;
    this.history = [];
    this.running = false;
    this.raf = null;
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    if (this.cvWater) { const r = this.cvWater.getBoundingClientRect(); this.cvWater.width = r.width || 600; this.cvWater.height = r.height || 180; }
    if (this.cvBars)  { const r = this.cvBars.getBoundingClientRect();  this.cvBars.width  = r.width || 600; this.cvBars.height  = r.height || 80; }
  }

  start() { if (!this.running) { this.running = true; this._loop(); } }
  stop()  { this.running = false; if (this.raf) cancelAnimationFrame(this.raf); }

  _genFrame() {
    const state = window.telemetry?.getState();
    const isLeak = state?.acoustic?.leakDetected;
    const peakKhz = state?.acoustic?.dominantFreq || 24;
    const overallDb = state?.acoustic?.db || 20;
    const frame = new Float32Array(this.bins);

    for (let i = 0; i < this.bins; i++) {
      const khz = 20 + (i / this.bins) * 40;
      let e = Math.random() * 0.13;
      // Ambient hum
      e += Math.exp(-(Math.pow(khz - 24, 2)) / 6) * 0.22;
      if (isLeak) {
        const dist = khz - peakKhz;
        e += Math.exp(-(dist * dist) / (2 * 3.5 * 3.5)) * (overallDb / 60);
      }
      frame[i] = Math.min(1, Math.max(0.02, e));
    }
    return frame;
  }

  _color(v) {
    if (v < 0.2)       return `rgb(10,${Math.floor(25 + v/0.2*90)},${Math.floor(60 + v/0.2*140)})`;
    else if (v < 0.45) { const t=(v-0.2)/0.25; return `rgb(${Math.floor(t*30)},${Math.floor(115+t*110)},${Math.floor(200-t*100)})`; }
    else if (v < 0.7)  { const t=(v-0.45)/0.25; return `rgb(${Math.floor(30+t*225)},225,${Math.floor(100-t*100)})`; }
    else if (v < 0.9)  { const t=(v-0.7)/0.2; return `rgb(255,${Math.floor(225-t*180)},${Math.floor(t*50)})`; }
    else               { const t=(v-0.9)/0.1; return `rgb(255,${Math.floor(45+t*210)},${Math.floor(50+t*205)})`; }
  }

  _loop() {
    if (!this.running) return;
    const frame = this._genFrame();
    this.history.unshift(frame);
    if (this.history.length > this.rows) this.history.pop();
    this._drawWaterfall();
    this._drawBars(frame);
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _drawWaterfall() {
    if (!this.ctxW) return;
    const { width: w, height: h } = this.cvWater;
    this.ctxW.fillStyle = '#060a10'; this.ctxW.fillRect(0, 0, w, h);
    const rH = h / this.rows, cW = w / this.bins;
    this.history.forEach((row, r) => {
      row.forEach((v, c) => {
        this.ctxW.fillStyle = this._color(v);
        this.ctxW.fillRect(c * cW, r * rH, cW + 0.5, rH + 0.5);
      });
    });
    // Frequency markers
    this.ctxW.strokeStyle = 'rgba(255,255,255,0.1)'; this.ctxW.lineWidth = 1;
    [20, 30, 40, 50, 60].forEach(khz => {
      const x = ((khz - 20) / 40) * w;
      this.ctxW.beginPath(); this.ctxW.moveTo(x, 0); this.ctxW.lineTo(x, h); this.ctxW.stroke();
      this.ctxW.fillStyle = 'rgba(255,255,255,0.5)'; this.ctxW.font = '10px "JetBrains Mono"';
      this.ctxW.fillText(`${khz}k`, x + 3, h - 5);
    });
  }

  _drawBars(frame) {
    if (!this.ctxB) return;
    const { width: w, height: h } = this.cvBars;
    this.ctxB.fillStyle = '#0a0f1a'; this.ctxB.fillRect(0, 0, w, h);
    const bW = (w / this.bins) - 1;
    frame.forEach((v, i) => {
      const bH = v * (h - 10);
      this.ctxB.fillStyle = this._color(v);
      this.ctxB.fillRect(i * (w / this.bins), h - bH, bW, bH);
    });
    // Peak marker
    const state = window.telemetry?.getState();
    if (state?.acoustic?.leakDetected) {
      const pkKhz = state.acoustic.dominantFreq;
      const pkX = ((pkKhz - 20) / 40) * w;
      this.ctxB.strokeStyle = '#ff3366'; this.ctxB.setLineDash([4,2]); this.ctxB.lineWidth = 1.5;
      this.ctxB.beginPath(); this.ctxB.moveTo(pkX, 0); this.ctxB.lineTo(pkX, h); this.ctxB.stroke();
      this.ctxB.setLineDash([]);
      this.ctxB.fillStyle = '#ff3366'; this.ctxB.font = 'bold 10px "JetBrains Mono"';
      this.ctxB.fillText(`⚠ ${pkKhz} kHz`, Math.min(w - 100, pkX + 5), 14);
    }
  }
}

/**
 * ThermalVisualizer — 12×12 infrared thermal camera matrix with ironbow palette
 */
class ThermalVisualizer {
  constructor(canvasId) {
    this.cv = document.getElementById(canvasId);
    this.ctx = this.cv?.getContext('2d');
    this.grid = 12;
    this.data = Array.from({ length: this.grid }, () => Array(this.grid).fill(24));
    this.running = false;
    this.raf = null;
  }

  start() { if (!this.running) { this.running = true; this._loop(); } }
  stop()  { this.running = false; if (this.raf) cancelAnimationFrame(this.raf); }

  _loop() {
    if (!this.running) return;
    this._update();
    this._render();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _update() {
    const state = window.telemetry?.getState();
    const base = state?.thermal?.ambient || 24.5;
    const maxSpot = state?.thermal?.maxSpot || 27;
    const hazard = window.telemetry?.getHazardType(window.telemetry?.activeWorkerId);

    let hotR = 5, hotC = 6, radius = 3.5;
    if (hazard === 'ELECTRICAL_ARC') { hotR = 4; hotC = 7; radius = 3.8; }
    else if (hazard === 'STEAM_PINHOLE') { hotR = 3; hotC = 4; radius = 4.2; }

    for (let r = 0; r < this.grid; r++) {
      for (let c = 0; c < this.grid; c++) {
        let t = base + (Math.random() - 0.5) * 0.8;
        const dist = Math.sqrt((r - hotR) ** 2 + (c - hotC) ** 2);
        t += (maxSpot - base) * Math.exp(-(dist * dist) / (2 * radius));
        this.data[r][c] = this.data[r][c] * 0.72 + t * 0.28;
      }
    }
  }

  _ironbow(temp, lo = 20, hi = 120) {
    const v = Math.max(0, Math.min(1, (temp - lo) / (hi - lo)));
    if (v < 0.2)       { const t = v / 0.2; return `rgb(${Math.floor(10+t*65)},${Math.floor(5+t*15)},${Math.floor(25+t*120)})`; }
    else if (v < 0.45) { const t=(v-0.2)/0.25; return `rgb(${Math.floor(75+t*165)},${Math.floor(20+t*10)},${Math.floor(145-t*115)})`; }
    else if (v < 0.75) { const t=(v-0.45)/0.3; return `rgb(${Math.floor(240+t*15)},${Math.floor(30+t*190)},${Math.floor(30-t*30)})`; }
    else               { const t=(v-0.75)/0.25; return `rgb(255,${Math.floor(220+t*35)},${Math.floor(t*255)})`; }
  }

  _render() {
    if (!this.ctx || !this.cv) return;
    const w = this.cv.width, h = this.cv.height;
    const cW = w / this.grid, cH = h / this.grid;

    let maxT = -Infinity, maxR = 0, maxC = 0;
    this.data.forEach((row, r) => row.forEach((t, c) => { if (t > maxT) { maxT = t; maxR = r; maxC = c; } }));

    this.ctx.fillStyle = '#060a10'; this.ctx.fillRect(0, 0, w, h);

    this.data.forEach((row, r) => {
      row.forEach((t, c) => {
        this.ctx.fillStyle = this._ironbow(t, 20, Math.max(50, maxT));
        this.ctx.fillRect(c * cW, r * cH, cW + 0.6, cH + 0.6);
      });
    });

    // Grid overlay
    this.ctx.strokeStyle = 'rgba(255,255,255,0.045)'; this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.grid; i++) {
      this.ctx.beginPath(); this.ctx.moveTo(i * cW, 0); this.ctx.lineTo(i * cW, h); this.ctx.stroke();
      this.ctx.beginPath(); this.ctx.moveTo(0, i * cH); this.ctx.lineTo(w, i * cH); this.ctx.stroke();
    }

    // Hotspot reticle
    const hx = (maxC + 0.5) * cW, hy = (maxR + 0.5) * cH;
    const isCritical = maxT > 45;
    this.ctx.strokeStyle = isCritical ? '#ff3366' : '#00f2fe'; this.ctx.lineWidth = 1.5;
    this.ctx.beginPath(); this.ctx.arc(hx, hy, 15, 0, Math.PI * 2);
    this.ctx.moveTo(hx - 22, hy); this.ctx.lineTo(hx + 22, hy);
    this.ctx.moveTo(hx, hy - 22); this.ctx.lineTo(hx, hy + 22);
    this.ctx.stroke();

    // Temperature label
    this.ctx.fillStyle = '#fff'; this.ctx.font = 'bold 11px "JetBrains Mono"';
    this.ctx.shadowColor = '#000'; this.ctx.shadowBlur = 5;
    this.ctx.fillText(`${maxT.toFixed(1)}°C`, Math.min(w - 60, hx + 18), hy - 5);
    this.ctx.shadowBlur = 0;
  }
}

window.SpectrogramVisualizer = SpectrogramVisualizer;
window.ThermalVisualizer = ThermalVisualizer;
