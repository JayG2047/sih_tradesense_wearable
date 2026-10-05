/**
 * AeroSentry Industrial
 * API Client — Handles both server-connected and standalone modes
 */

const API = (() => {
  const BASE = 'http://localhost:3000';
  let serverOnline = false;
  
  async function ping() {
    try {
      const r = await fetch(`${BASE}/api/workers`, { signal: AbortSignal.timeout(1500) });
      serverOnline = r.ok;
    } catch { serverOnline = false; }
    updateConnBanner();
    return serverOnline;
  }

  function updateConnBanner() {
    const el = document.getElementById('conn-banner');
    if (!el) return;
    if (serverOnline) {
      el.className = 'online';
      el.textContent = '⬤ SERVER ONLINE  |  http://localhost:3000';
    } else {
      el.className = 'offline';
      el.textContent = '⬤ STANDALONE MODE  |  Simulated Data Active';
    }
  }

  async function get(path) {
    if (serverOnline) {
      try {
        const r = await fetch(`${BASE}${path}`);
        if (r.ok) return r.json();
      } catch { serverOnline = false; updateConnBanner(); }
    }
    return null;
  }

  async function post(path, body) {
    if (serverOnline) {
      try {
        const r = await fetch(`${BASE}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (r.ok) return r.json();
      } catch { serverOnline = false; updateConnBanner(); }
    }
    return null;
  }

  return { ping, get, post, isOnline: () => serverOnline };
})();

window.API = API;
