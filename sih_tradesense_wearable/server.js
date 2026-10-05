const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = 3000;
const BASE_DIR = __dirname;

let workers = [
  { id: 'WRK-01', name: 'Rahul Sharma', role: 'Industrial Pipefitter', zone: 'Zone B - High-Pressure Steam Gallery', status: 'NORMAL' },
  { id: 'WRK-02', name: 'Vikram Singh', role: 'HVAC-R Chiller Technician', zone: 'Zone C - Rooftop Chiller Plant', status: 'NORMAL' },
  { id: 'WRK-03', name: 'Amit Patel', role: 'Sanitation & Drainage Operative', zone: 'Zone D - Confined Trench Pit #4', status: 'NORMAL' },
  { id: 'WRK-04', name: 'Priya Das', role: 'Industrial Electrician', zone: 'Zone A - 11kV HT Substation', status: 'NORMAL' }
];

let incidents = [
  {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    workerId: 'WRK-02',
    scenario: 'HVAC_REFRIGERANT',
    description: 'Historical alert: Minor refrigerant leak detected.',
    status: 'RESOLVED'
  }
];

let activeHazards = {};

const generateTelemetry = (workerId) => {
  const isHazard = activeHazards[workerId];
  
  // Base normal values with noise
  const r = (min, max) => min + Math.random() * (max - min);
  const rInt = (min, max) => Math.floor(r(min, max + 1));
  
  let telemetry = {
    workerId,
    timestamp: new Date().toISOString(),
    gas: { ch4: r(10, 15), co: r(5, 10), h2s: r(0, 1), refrigerant: r(0, 5), o2: r(20.8, 21.0) },
    acoustic: { db: r(20, 30), dominantFreq: r(20, 30), leakDetected: false, confidence: rInt(0, 10) },
    thermal: { maxSpot: r(25, 30), ambient: r(20, 26) },
    worker: { heartRate: rInt(70, 85), battery: rInt(80, 100), fallDetected: false, motionState: 'ACTIVE', rssi: rInt(-80, -60) },
    status: 'NORMAL'
  };

  if (isHazard) {
    if (isHazard === 'STEAM_PINHOLE') {
      telemetry.acoustic = { db: r(70, 75), dominantFreq: r(38, 41), leakDetected: true, confidence: rInt(90, 99) };
      telemetry.thermal.maxSpot = r(85, 90);
      telemetry.worker.heartRate = rInt(105, 115);
      telemetry.status = 'CRITICAL';
    } else if (isHazard === 'SEWER_GAS') {
      telemetry.gas.h2s = r(40, 50);
      telemetry.gas.ch4 = r(1800, 1900);
      telemetry.gas.o2 = r(17.5, 18.0);
      telemetry.worker.heartRate = rInt(115, 130);
      telemetry.status = 'CRITICAL';
    } else if (isHazard === 'HVAC_REFRIGERANT') {
      telemetry.gas.refrigerant = r(750, 800);
      telemetry.acoustic = { db: r(50, 58), dominantFreq: r(30, 35), leakDetected: true, confidence: rInt(90, 98) };
      telemetry.status = 'WARNING';
    } else if (isHazard === 'ELECTRICAL_ARC') {
      telemetry.thermal.maxSpot = r(110, 120);
      telemetry.acoustic = { db: r(45, 50), dominantFreq: r(45, 50), leakDetected: false, confidence: rInt(10, 20) };
      telemetry.gas.co = r(45, 55);
      telemetry.worker.heartRate = rInt(95, 105);
      telemetry.status = 'CRITICAL';
    } else if (isHazard === 'EVACUATION') {
        telemetry.status = 'CRITICAL';
    }
  }

  return telemetry;
};

const sendJSON = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
};

const readBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
};

const server = http.createServer(async (req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (req.method === 'GET' && pathname === '/api/workers') {
    return sendJSON(res, 200, workers);
  }

  if (req.method === 'GET' && pathname.startsWith('/api/telemetry/')) {
    const workerId = pathname.split('/').pop();
    const w = workers.find(w => w.id === workerId);
    if (!w) return sendJSON(res, 404, { error: 'Worker not found' });
    const telemetry = generateTelemetry(workerId);
    return sendJSON(res, 200, telemetry);
  }

  if (req.method === 'POST' && pathname === '/api/simulator/trigger') {
    try {
      const body = await readBody(req);
      const { workerId, scenario } = body;
      const worker = workers.find(w => w.id === workerId);
      if (!worker) return sendJSON(res, 404, { error: 'Worker not found' });
      
      activeHazards[workerId] = scenario;
      worker.status = scenario === 'HVAC_REFRIGERANT' ? 'WARNING' : 'CRITICAL';
      
      const newIncident = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        workerId,
        scenario,
        description: `Simulated hazard triggered: ${scenario}`,
        status: 'OPEN'
      };
      incidents.unshift(newIncident);
      return sendJSON(res, 200, { success: true, activeHazards, workerStatus: worker.status });
    } catch (e) {
      return sendJSON(res, 400, { error: 'Invalid JSON' });
    }
  }

  if (req.method === 'POST' && pathname === '/api/simulator/reset') {
    try {
      const body = await readBody(req);
      const { workerId } = body;
      if (workerId === 'ALL') {
        activeHazards = {};
        workers.forEach(w => w.status = 'NORMAL');
      } else {
        delete activeHazards[workerId];
        const worker = workers.find(w => w.id === workerId);
        if (worker) worker.status = 'NORMAL';
      }
      return sendJSON(res, 200, { success: true, activeHazards });
    } catch (e) {
      return sendJSON(res, 400, { error: 'Invalid JSON' });
    }
  }

  if (req.method === 'GET' && pathname === '/api/incidents') {
    return sendJSON(res, 200, incidents);
  }

  if (req.method === 'POST' && pathname === '/api/incidents') {
    try {
      const body = await readBody(req);
      const newIncident = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        ...body,
        status: 'OPEN'
      };
      incidents.unshift(newIncident);
      return sendJSON(res, 201, newIncident);
    } catch (e) {
      return sendJSON(res, 400, { error: 'Invalid JSON' });
    }
  }

  if (req.method === 'POST' && pathname === '/api/copilot/chat') {
    try {
      const body = await readBody(req);
      const query = body.query.toLowerCase();
      let response = 'Maintain situational awareness. Proceed with caution.';
      let category = 'GENERAL_SAFETY';
      let sopSteps = ['Assess environment', 'Report anomalies'];

      if (/(steam|pipe|pinhole|pressure)/.test(query)) {
        category = 'STEAM_PROTOCOL';
        response = 'Potential high-pressure steam leak detected. Do not investigate visually.';
        sopSteps = ['Evacuate immediate area', 'Use thermal imaging from distance', 'Isolate valve remotely', 'Notify plant manager'];
      } else if (/(gas|sewer|h2s|methane|trench|confined)/.test(query)) {
        category = 'CONFINED_SPACE_PROTOCOL';
        response = 'Hazardous gas buildup in confined space detected. Immediate risk to life and health.';
        sopSteps = ['Do NOT enter space to rescue', 'Activate localized ventilation', 'Don SCBA gear', 'Deploy mechanical extraction team'];
      } else if (/(hvac|refrigerant|freon|chiller|cooling)/.test(query)) {
        category = 'HVAC_REFRIGERANT_PROTOCOL';
        response = 'Refrigerant leak detected. Asphyxiation risk in enclosed spaces.';
        sopSteps = ['Ensure adequate ventilation', 'Use portable leak detectors to pinpoint', 'Evacuate refrigerant safely', 'Repair line break'];
      } else if (/(electric|arc|panel|switchgear|loto)/.test(query)) {
        category = 'ELECTRICAL_SAFETY_PROTOCOL';
        response = 'Thermal anomalies near electrical switchgear. Arc flash hazard high.';
        sopSteps = ['Establish arc flash boundary', 'Initiate Lockout/Tagout (LOTO)', 'Wear appropriate PPE (Arc Rated)', 'De-energize equipment'];
      }

      return sendJSON(res, 200, { response, category, sopSteps });
    } catch (e) {
      return sendJSON(res, 400, { error: 'Invalid JSON' });
    }
  }

  if (req.method === 'POST' && pathname === '/api/evacuation/broadcast') {
    workers.forEach(w => {
      w.status = 'CRITICAL';
      activeHazards[w.id] = 'EVACUATION';
    });
    
    incidents.unshift({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      workerId: 'ALL',
      scenario: 'MASS_EVACUATION',
      description: 'Site-wide evacuation order issued manually.',
      status: 'OPEN'
    });

    return sendJSON(res, 200, { success: true, message: 'Evacuation signal broadcast to all wearables', affectedWorkers: workers.length });
  }

  if (req.method === 'GET' && pathname === '/api/audit-report') {
    return sendJSON(res, 200, {
      timestamp: new Date().toISOString(),
      systemHealth: 'OPERATIONAL',
      totalWorkers: workers.length,
      incidentsLogged: incidents.length,
      workers
    });
  }

  // Static files serving
  if (req.method === 'GET') {
    let filePath = path.join(BASE_DIR, pathname === '/' ? 'index.html' : pathname);
    let extname = String(path.extname(filePath)).toLowerCase();
    
    let mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };

    let contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code == 'ENOENT') {
          res.writeHead(404);
          res.end('File not found');
        } else {
          res.writeHead(500);
          res.end('Server error: ' + error.code);
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  }
});

server.listen(PORT, () => {
  console.log(`AeroSentry Industrial API running on http://localhost:${PORT}`);
});
