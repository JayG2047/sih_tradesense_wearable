// Thermal Infrared Camera Matrix Simulator (8x8 or 16x16 sensor array)
// Simulates AMG8833 / MLX90640 thermopile sensor with bilinear interpolation

class ThermalVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.gridSize = 12; // 12x12 thermal sensor cells
    this.dataGrid = [];
    this.palette = 'ironbow'; // 'ironbow' or 'rainbow'
    
    this.initGrid();
    this.animId = null;
    this.isRunning = false;
  }

  initGrid() {
    this.dataGrid = [];
    for (let r = 0; r < this.gridSize; r++) {
      const row = [];
      for (let c = 0; c < this.gridSize; c++) {
        row.push(24.0 + Math.random() * 1.5);
      }
      this.dataGrid.push(row);
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

  updateThermalPhysics() {
    const telemetry = window.telemetry ? window.telemetry.state : null;
    const baseTemp = telemetry?.thermal?.surfaceTemp || 24.5;
    const maxSpot = telemetry?.thermal?.maxSpotTemp || 28.0;
    const activeHazard = telemetry?.activeHazard?.type;

    let centerR = 5, centerC = 6;
    let radius = 3.5;

    if (activeHazard === 'ELECTRICAL_ARC_THERMAL') {
      // Violent localized electrical arcing hotspot
      centerR = 4;
      centerC = 7;
      radius = 3.8;
    } else if (activeHazard === 'STEAM_PINHOLE') {
      // Hot steam plume blowing across top-right
      centerR = 3;
      centerC = 4;
      radius = 4.2;
    }

    const isHot = (maxSpot > 40);

    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        let t = baseTemp + (Math.random() - 0.5) * 0.8;
        if (isHot) {
          const dist = Math.sqrt((r - centerR) ** 2 + (c - centerC) ** 2);
          const heatFalloff = Math.exp(-(dist * dist) / (2 * radius));
          t += (maxSpot - baseTemp) * heatFalloff;
        } else {
          // Slight warm spot in center representing hand/pipe
          const dist = Math.sqrt((r - 5.5) ** 2 + (c - 5.5) ** 2);
          t += (maxSpot - baseTemp) * Math.max(0, 1 - dist / 5);
        }
        // Smooth transition
        this.dataGrid[r][c] = this.dataGrid[r][c] * 0.7 + t * 0.3;
      }
    }
  }

  // Ironbow Color Palette (Deep Purple -> Magenta -> Orange -> Yellow -> White)
  getIronbowColor(temp, minT = 20, maxT = 115) {
    const norm = Math.max(0, Math.min(1, (temp - minT) / (maxT - minT)));
    
    let r = 0, g = 0, b = 0;
    if (norm < 0.2) {
      // Black/Navy to Violet
      const t = norm / 0.2;
      r = Math.floor(10 + t * 65);
      g = Math.floor(5 + t * 15);
      b = Math.floor(25 + t * 120);
    } else if (norm < 0.45) {
      // Violet to Crimson Red
      const t = (norm - 0.2) / 0.25;
      r = Math.floor(75 + t * 165);
      g = Math.floor(20 + t * 10);
      b = Math.floor(145 - t * 115);
    } else if (norm < 0.75) {
      // Crimson Red to Bright Orange/Yellow
      const t = (norm - 0.45) / 0.3;
      r = Math.floor(240 + t * 15);
      g = Math.floor(30 + t * 190);
      b = Math.floor(30 - t * 30);
    } else {
      // Yellow to Intense White
      const t = (norm - 0.75) / 0.25;
      r = 255;
      g = Math.floor(220 + t * 35);
      b = Math.floor(t * 255);
    }
    return `rgb(${r}, ${g}, ${b})`;
  }

  loop() {
    if (!this.isRunning) return;

    this.updateThermalPhysics();
    this.render();

    this.animId = requestAnimationFrame(() => this.loop());
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Clear
    this.ctx.fillStyle = '#080c14';
    this.ctx.fillRect(0, 0, w, h);

    // Find min and max for auto-scaling or fixed limits
    let minT = 1000, maxT = -1000;
    let maxR = 0, maxC = 0;
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const t = this.dataGrid[r][c];
        if (t < minT) minT = t;
        if (t > maxT) {
          maxT = t;
          maxR = r;
          maxC = c;
        }
      }
    }

    const cellW = w / this.gridSize;
    const cellH = h / this.gridSize;

    // Render cells with smooth gradient blocks
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const temp = this.dataGrid[r][c];
        this.ctx.fillStyle = this.getIronbowColor(temp, 20, Math.max(50, maxT));
        this.ctx.fillRect(c * cellW, r * cellH, cellW + 0.6, cellH + 0.6);
      }
    }

    // Grid wire overlay
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.gridSize; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * cellW, 0);
      this.ctx.lineTo(i * cellW, h);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(0, i * cellH);
      this.ctx.lineTo(w, i * cellH);
      this.ctx.stroke();
    }

    // Hotspot Target Reticle
    const hotX = (maxC + 0.5) * cellW;
    const hotY = (maxR + 0.5) * cellH;

    this.ctx.strokeStyle = maxT > 45 ? '#ff3366' : '#00f2fe';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(hotX, hotY, 14, 0, Math.PI * 2);
    this.ctx.moveTo(hotX - 20, hotY);
    this.ctx.lineTo(hotX + 20, hotY);
    this.ctx.moveTo(hotX, hotY - 20);
    this.ctx.lineTo(hotX, hotY + 20);
    this.ctx.stroke();

    // Hotspot temperature label
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 11px "JetBrains Mono", monospace';
    this.ctx.shadowColor = 'black';
    this.ctx.shadowBlur = 4;
    this.ctx.fillText(`${maxT.toFixed(1)}°C`, hotX + 16, hotY - 6);
    this.ctx.shadowBlur = 0;
  }
}

window.ThermalVisualizer = ThermalVisualizer;
