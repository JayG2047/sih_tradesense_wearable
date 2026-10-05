// Ultrasonic Acoustic Spectrogram & FFT Waterfall Visualizer (20kHz - 60kHz)
// Demonstrates acoustic micro-leak hissing detection for pipe pinholes, steam, and compressed gas

class SpectrogramVisualizer {
  constructor(canvasId, barCanvasId) {
    this.canvas = document.getElementById(canvasId);
    this.barCanvas = document.getElementById(barCanvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.barCtx = this.barCanvas ? this.barCanvas.getContext('2d') : null;
    
    this.numFreqBins = 64; // 20kHz to 60kHz (approx 625 Hz per bin)
    this.spectrogramHistory = [];
    this.maxRows = 80;
    this.isRunning = false;
    this.animId = null;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width || 600;
    this.canvas.height = rect.height || 180;
    
    if (this.barCanvas) {
      const bRect = this.barCanvas.getBoundingClientRect();
      this.barCanvas.width = bRect.width || 600;
      this.barCanvas.height = bRect.height || 80;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  // Generates simulated frequency bin energy based on current telemetry state
  generateFFTFrame() {
    const frame = new Float32Array(this.numFreqBins);
    const telemetry = window.telemetry ? window.telemetry.state : null;
    const isLeak = telemetry?.acoustic?.leakSignatureDetected;
    const dominantFreq = telemetry?.acoustic?.dominantFreq || 24;
    const overallDb = telemetry?.acoustic?.ultrasonicDb || 20;

    for (let i = 0; i < this.numFreqBins; i++) {
      // Frequency from 20kHz to 60kHz
      const freqKhz = 20 + (i / this.numFreqBins) * 40;
      
      // Ambient floor noise
      let energy = Math.random() * 0.15;

      // Leak hissing resonant peak
      if (isLeak) {
        const dist = Math.abs(freqKhz - dominantFreq);
        // Gaussian bell curve peak around leak frequency
        const peakWidth = 3.5;
        const leakBoost = Math.exp(-(dist * dist) / (2 * peakWidth * peakWidth)) * (overallDb / 60);
        energy += leakBoost;
      } else {
        // Minor background motor/air hum around 24kHz
        const dist = Math.abs(freqKhz - 24.0);
        energy += Math.exp(-(dist * dist) / 6) * 0.25;
      }

      frame[i] = Math.min(1.0, Math.max(0.02, energy));
    }
    return frame;
  }

  getColor(val) {
    // Jet / Thermal color mapping: Blue -> Cyan -> Green -> Yellow -> Red -> White
    if (val < 0.2) {
      // Dark Blue to Cyan
      const t = val / 0.2;
      return `rgb(10, ${Math.floor(25 + t * 90)}, ${Math.floor(60 + t * 140)})`;
    } else if (val < 0.45) {
      // Cyan to Emerald
      const t = (val - 0.2) / 0.25;
      return `rgb(${Math.floor(t * 30)}, ${Math.floor(115 + t * 110)}, ${Math.floor(200 - t * 100)})`;
    } else if (val < 0.7) {
      // Emerald to Yellow
      const t = (val - 0.45) / 0.25;
      return `rgb(${Math.floor(30 + t * 225)}, ${Math.floor(225)}, ${Math.floor(100 - t * 100)})`;
    } else if (val < 0.9) {
      // Yellow to Vivid Orange/Red
      const t = (val - 0.7) / 0.2;
      return `rgb(255, ${Math.floor(225 - t * 180)}, ${Math.floor(t * 50)})`;
    } else {
      // Red to White (intense ultrasonic leak!)
      const t = (val - 0.9) / 0.1;
      return `rgb(255, ${Math.floor(45 + t * 210)}, ${Math.floor(50 + t * 205)})`;
    }
  }

  loop() {
    if (!this.isRunning) return;

    const frame = this.generateFFTFrame();
    this.spectrogramHistory.unshift(frame);
    if (this.spectrogramHistory.length > this.maxRows) {
      this.spectrogramHistory.pop();
    }

    this.renderWaterfall();
    this.renderFFTBars(frame);

    this.animId = requestAnimationFrame(() => this.loop());
  }

  renderWaterfall() {
    if (!this.ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.fillStyle = '#090d16';
    this.ctx.fillRect(0, 0, w, h);

    const rowHeight = h / this.maxRows;
    const colWidth = w / this.numFreqBins;

    for (let r = 0; r < this.spectrogramHistory.length; r++) {
      const row = this.spectrogramHistory[r];
      const y = r * rowHeight;
      for (let c = 0; c < row.length; c++) {
        const val = row[c];
        this.ctx.fillStyle = this.getColor(val);
        this.ctx.fillRect(c * colWidth, y, colWidth + 0.5, rowHeight + 0.5);
      }
    }

    // Grid overlays & frequency labels
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    for (let khz = 20; khz <= 60; khz += 10) {
      const x = ((khz - 20) / 40) * w;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.font = '10px "JetBrains Mono", monospace';
      this.ctx.fillText(`${khz}kHz`, x + 3, h - 6);
    }
  }

  renderFFTBars(frame) {
    if (!this.barCtx) return;
    const w = this.barCanvas.width;
    const h = this.barCanvas.height;
    this.barCtx.fillStyle = '#0d131f';
    this.barCtx.fillRect(0, 0, w, h);

    const barWidth = (w / this.numFreqBins) - 1.5;

    for (let i = 0; i < this.numFreqBins; i++) {
      const val = frame[i];
      const barHeight = val * (h - 15);
      const x = i * (w / this.numFreqBins);
      const y = h - barHeight;

      this.barCtx.fillStyle = this.getColor(val);
      this.barCtx.fillRect(x, y, barWidth, barHeight);
    }

    // Peak marker line
    const telemetry = window.telemetry ? window.telemetry.state : null;
    if (telemetry?.acoustic?.leakSignatureDetected) {
      const dominantFreq = telemetry.acoustic.dominantFreq;
      const peakX = ((dominantFreq - 20) / 40) * w;
      
      this.barCtx.strokeStyle = '#ff3366';
      this.barCtx.setLineDash([4, 2]);
      this.barCtx.beginPath();
      this.barCtx.moveTo(peakX, 0);
      this.barCtx.lineTo(peakX, h);
      this.barCtx.stroke();
      this.barCtx.setLineDash([]);

      this.barCtx.fillStyle = '#ff3366';
      this.barCtx.font = 'bold 10px "JetBrains Mono"';
      this.barCtx.fillText(`PEAK: ${dominantFreq} kHz [LEAK]`, Math.min(w - 140, Math.max(10, peakX - 40)), 14);
    }
  }
}

window.SpectrogramVisualizer = SpectrogramVisualizer;
