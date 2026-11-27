// Storm Island Hop — the HUD: glass panels with ALT / SPD / HDG, fuel, throttle,
// timer and score, a mission banner, a compass strip, and a lit six-dial cockpit
// dashboard drawn on a canvas at the bottom of the screen.

import { deg } from './config.js';

function dial(ctx, cx, cy, r, label, value, min, max, unit, color) {
  ctx.save();
  ctx.translate(cx, cy);
  // Face.
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(8,16,24,0.88)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#5a6b7a'; ctx.stroke();
  // Arc sweep.
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  ctx.beginPath(); ctx.arc(0, 0, r - 6, a0, a1);
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke();
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  ctx.beginPath(); ctx.arc(0, 0, r - 6, a0, a0 + (a1 - a0) * t);
  ctx.lineWidth = 4; ctx.strokeStyle = color; ctx.stroke();
  // Needle.
  const na = a0 + (a1 - a0) * t;
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(na) * (r - 12), Math.sin(na) * (r - 12));
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  // Ticks.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i <= 4; i++) {
    const ta = a0 + (a1 - a0) * (i / 4);
    ctx.beginPath();
    ctx.arc(Math.cos(ta) * (r - 14), Math.sin(ta) * (r - 14), 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Value + label, lit amber.
  ctx.fillStyle = '#ffd98a';
  ctx.font = `bold ${Math.round(r * 0.42)}px monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.round(value)), 0, r * 0.12);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `bold ${Math.round(r * 0.26)}px sans-serif`;
  ctx.fillText(label, 0, r * 0.52);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `${Math.round(r * 0.2)}px sans-serif`;
  ctx.fillText(unit, 0, r * 0.78);
  ctx.restore();
}

export function buildHud(root) {
  root.innerHTML = `
    <div id="hud-top">
      <div class="panel" id="hud-flight">
        <div class="big"><span class="k">ALT</span><span id="hud-alt">0</span><span class="u">m</span></div>
        <div class="big"><span class="k">SPD</span><span id="hud-spd">0</span><span class="u">m/s</span></div>
        <div class="big"><span class="k">HDG</span><span id="hud-hdg">000°</span></div>
      </div>
      <div class="panel" id="hud-mission">
        <div id="hud-mission-name">ISLAND HOP</div>
        <div id="hud-mission-brief"></div>
        <div id="hud-progress"></div>
      </div>
      <div class="panel" id="hud-right">
        <div class="row"><span>TIME</span><b id="hud-time">0:00</b></div>
        <div class="row"><span>SCORE</span><b id="hud-score">0</b></div>
        <div class="row"><span>BEST</span><b id="hud-best">—</b></div>
      </div>
    </div>
    <div id="hud-compass"><div id="hud-compass-strip"></div><div id="hud-compass-needle">▲</div></div>
    <div id="hud-fuel"><div id="hud-fuel-label">FUEL</div><div id="hud-fuel-bar"><div id="hud-fuel-fill"></div></div><div id="hud-thr">THR 0%</div></div>
    <div id="hud-wind">WIND <span id="hud-wind-val">—</span></div>
    <div id="hud-msg"></div>
    <canvas id="dials" width="660" height="118"></canvas>
    <div id="hud-help">W/S throttle · ↑/↓ pitch · ←/→ bank · C camera · M mission · P pause · R reset</div>`;

  const el = (id) => root.querySelector(`#${id}`);
  const dials = el('dials');
  const dctx = dials.getContext('2d');

  function compassStrip(headingDeg) {
    const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    let html = '';
    for (let d = -60; d <= 60; d += 5) {
      const h = (Math.round(headingDeg) + d + 360) % 360;
      const label = h % 45 === 0 ? points[Math.round(h / 45) % 8] : (h % 10 === 0 ? String(h) : '');
      html += `<span class="tick" style="left:${50 + d * 0.8}%">${label}<i style="height:${label ? 10 : 5}px"></i></span>`;
    }
    return html;
  }

  return {
    update(f, mission, bestTimes) {
      el('hud-alt').textContent = Math.max(0, Math.round(f.alt));
      el('hud-spd').textContent = Math.round(f.speed);
      el('hud-hdg').textContent = `${String(Math.round(((deg(f.heading) % 360) + 360) % 360)).padStart(3, '0')}°`;
      const mins = Math.floor(f.time / 60);
      const secs = Math.floor(f.time % 60);
      el('hud-time').textContent = `${mins}:${String(secs).padStart(2, '0')}`;
      el('hud-score').textContent = String(f.score);
      el('hud-best').textContent = bestTimes[f.mission] ? `${bestTimes[f.mission].toFixed(1)}s` : '—';
      el('hud-mission-name').textContent = mission.name.toUpperCase();
      el('hud-mission-brief').textContent = mission.brief;
      const total = f.mission === 'hop' ? 3 : f.ringsTotal;
      const done = f.mission === 'hop' ? f.hopsDone : f.ringsDone;
      el('hud-progress').textContent = f.mission === 'rescue'
        ? (f.rescueDone ? '✓ Boat reached — land on Gull Rock!' : '○ Reach the boat, then land on Gull Rock')
        : `Progress ${done}/${total}`;
      el('hud-fuel-fill').style.width = `${f.fuel}%`;
      el('hud-fuel-fill').style.background = f.fuel < 20 ? '#ff5544' : f.fuel < 45 ? '#ffb020' : '#39d98a';
      el('hud-thr').textContent = `THR ${Math.round(f.throttle * 100)}%`;
      const windDeg = Math.round(((deg(f.windDir) % 360) + 360) % 360);
      const windKt = Math.round((f.windBase + f.gust) * 1.94);
      el('hud-wind-val').textContent = `${windDeg}° ${windKt}kt gusting`;
      el('hud-compass-strip').innerHTML = compassStrip(deg(f.heading));
      const msg = el('hud-msg');
      if (f.messageUntil > f.time) {
        msg.textContent = f.message;
        msg.style.opacity = '1';
      } else {
        msg.style.opacity = '0';
      }
      // --- the six lit dials ---
      dctx.clearRect(0, 0, dials.width, dials.height);
      const r = 52, y = 59;
      const hdg = ((deg(f.heading) % 360) + 360) % 360;
      dial(dctx, 55, y, r, 'AIRSPEED', f.speed, 0, 100, 'm/s', '#39d98a');
      dial(dctx, 165, y, r, 'ALTITUDE', f.alt, 0, 400, 'm', '#22d3ee');
      dial(dctx, 275, y, r, 'HEADING', hdg, 0, 360, 'deg', '#ffd98a');
      dial(dctx, 385, y, r, 'PITCH', deg(f.pitch) + 20, 0, 40, 'deg', '#ff9d5c');
      dial(dctx, 495, y, r, 'FUEL', f.fuel, 0, 100, '%', '#ff6b6b');
      dial(dctx, 605, y, r, 'V/SPEED', f.verticalSpeed + 15, -15, 15, 'm/s', '#c084fc');
    },
    showCrash(reason) {
      const msg = root.querySelector('#hud-msg');
      msg.textContent = `CRASHED — ${reason}. Press R to fly again.`;
      msg.style.opacity = '1';
      msg.style.color = '#ff6b6b';
    },
    showComplete(text) {
      const msg = root.querySelector('#hud-msg');
      msg.textContent = text;
      msg.style.opacity = '1';
      msg.style.color = '#7dffb0';
    },
  };
}
