# TradeSense AI / VayuRakshak
## AI-Enabled Diagnostic & Sensing Wearables for Skilled Trades (Leak and Hazard Detection)

**Smart India Hackathon (SIH) Problem Statement**: `SIH26244`  
**Ministry**: Ministry of Skill Development and Entrepreneurship (MSDE)  
**Category**: Robotics and Drones / Hardware / IoT / Skilled Trades  

---

## 🌟 Executive Summary
**TradeSense AI** is a lightweight, edge-AI powered wearable sensing and diagnostic platform designed for Indian skilled trades (plumbers, pipefitters, HVAC-R technicians, industrial electricians, and municipal sanitation workers).

Occupational hazards in these trades cause over 14,000 injuries and fatalities annually across India—primarily due to:
- **Invisible high-pressure steam/water micro-pinholes** (which slice like razor blades before rupturing).
- **Toxic sewer gas asphyxiation** ($H_2S$, Methane, and Hypoxia in unventilated trenches).
- **Halocarbon refrigerant leaks** ($R-410A, R-32$) in confined commercial chiller rooms.
- **Electrical switchgear arcing and thermal runaways** (>110°C).

TradeSense AI bridges this gap with an on-device TinyML wrist pod featuring **MEMS Ultrasonic Hiss Detection (20–60 kHz)**, an **8x8 Non-Contact Thermal IR Matrix**, and a **Multi-Gas Electrochemical Array**, backed by an intuitive MSDE-aligned training copilot and plant supervisor command center.

---

## 🚀 Key Web Platform Capabilities

1. **Live Wearable Telemetry & Digital Twin**:
   - Continuous simulated sensor feeds: $CH_4$, $CO$, $H_2S$, Refrigerant (PPM), $O_2$ (%), Ultrasonic Noise (dB), Thermal Infrared Hotspot (°C), and Worker Biometrics (Heart Rate BPM, Battery %).
   - Real-time reactive graphs powered by Chart.js.

2. **Interactive Hazard & Leak Diagnostic Testbed**:
   - One-click trigger for 4 industrial scenarios:
     - *Case 1*: High-Pressure Steam Pipe Pinhole (39.5 kHz Ultrasound + Heat Flare).
     - *Case 2*: Confined Space Trench $H_2S$ & Methane Spike (Toxic + Hypoxia Alert).
     - *Case 3*: HVAC Chiller R-410A Halocarbon Flare.
     - *Case 4*: 3-Phase Switchgear Arcing & Thermal Overload (>110°C).
   - Real-time **TinyML Edge Inference Confidence** meter, model latency ($<15\text{ms}$ on ESP32-S3), and quantized Int8 footprint.
   - Built-in **Synthetic Audio Alarm** (Web Audio API) mimicking industrial beepers and evacuation sirens.

3. **Acoustic Spectrogram & Thermal Infrared Lab**:
   - **Canvas-based Ultrasonic FFT Waterfall Spectrogram** displaying 20 kHz to 60 kHz frequency band energy.
   - **Bilinear Interpolated Thermal IR Matrix** with ironbow colormap and animated hotspot target reticle.

4. **MSDE Skill Safety Copilot (Kaushal Rakshak)**:
   - Interactive AI diagnostic troubleshooting assistant aligned with ITI curriculums and NSQF Levels 3–5.
   - Pre-work Daily Toolbox Talk (TBT) safety checklist.

5. **Supervisor Command Center & Fleet Geo-Monitor**:
   - Interactive industrial plant floorplan with live status pins for 4 distributed tradesmen.
   - Broadcast emergency evacuation beacon.
   - Automated DGMS and Factory Act safety compliance incident logging with printable audit certificates.

6. **Scalable Frugal Hardware Architecture (< ₹3,200 / $38 USD)**:
   - ESP32-S3 Dual-Core (Xtensa LX7 with Vector AI acceleration).
   - Knowles SPH0641LU MEMS Ultrasonic Mic ($10\text{ kHz} - 65\text{ kHz}$).
   - Panasonic AMG8833 8x8 IR Thermopile.
   - Multi-gas electrochemical array.
   - Semtech SX1262 LoRaWAN transceiver for long-range connectivity in basement tunnels.

---

## 💻 How to Run the Website

### Option 1: Direct Browser Launch
Simply double-click or open `index.html` in any modern web browser (Chrome, Edge, Firefox, Brave):
```
C:\Users\ALL IS WELL\.gemini\antigravity\scratch\sih-tradesense-wearable\index.html
```

### Option 2: Local HTTP Server (Python or Node)
Using Python:
```bash
cd "C:\Users\ALL IS WELL\.gemini\antigravity\scratch\sih-tradesense-wearable"
python -m http.server 8080
```
Then navigate to `http://localhost:8080`.

---

## 📂 Project Directory Structure

```
sih-tradesense-wearable/
├── index.html              # Main application entry point & HUD UI
├── README.md               # Project documentation & SIH pitch summary
├── css/
│   └── styles.css          # Industrial cyberpunk styling, animations & radar HUD
└── js/
    ├── app.js              # Application controller, tab routing & copilot chat
    ├── telemetry.js        # Multi-gas & sensor physics engine + Chart.js streaming
    ├── spectrogram.js      # HTML5 Canvas 20-60 kHz ultrasonic FFT waterfall visualizer
    ├── thermal.js          # Canvas-based 8x8 / 16x16 infrared thermal camera matrix
    ├── simulator.js        # Hazard injection engine, TinyML inference & Web Audio alarms
    └── supervisor.js       # Multi-worker plant floorplan, SOS dispatch & incident logs
```
