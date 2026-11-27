// Storm Island Hop — the glue: renderer, cameras, menu, pause, scoring and the
// per-frame loop that ties the pure flight model (flight.js) to the three.js world.

import * as THREE from '../vendor/three.module.min.js';
import { MISSIONS, ISLANDS, deg } from './config.js';
import { makeFlight, stepFlight, resetFlight, missionRings } from './flight.js';
import { buildWorld } from './world.js';
import { buildPlane } from './plane.js';
import { buildHud } from './hud.js';
import { makeAudio } from './audio.js';
import { makeInput } from './input.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 20261127);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a2436, 0.00045);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 12000);
camera.position.set(-760, 60, -480);

const world = buildWorld(scene, seed);
const plane = buildPlane();
plane.rotation.order = 'YXZ';
scene.add(plane);

let flight = makeFlight('hop');
let cameraMode = 'chase';
let paused = false;
let started = false;
let bestTimes = {};
try { bestTimes = JSON.parse(localStorage.getItem('storm-island-hop-best') || '{}'); } catch { bestTimes = {}; }

const hud = buildHud(document.getElementById('hud'));
const audio = makeAudio();
const input = makeInput();

// --- menu ---
const menu = document.getElementById('menu');
const missionList = document.getElementById('mission-list');
let selectedMission = 'hop';
MISSIONS.forEach((m) => {
  const btn = document.createElement('button');
  btn.className = 'mission-btn';
  btn.innerHTML = `<b>${m.name}</b><span>${m.brief}</span><em>up to ${m.reward} pts</em>`;
  btn.onclick = () => { selectedMission = m.id; audio.start(); startGame(m.id); };
  missionList.appendChild(btn);
});
document.getElementById('start-btn').onclick = () => { audio.start(); startGame(selectedMission); };

function startGame(missionId) {
  resetFlight(flight, missionId);
  started = true;
  paused = false;
  menu.classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  flight.message = `${MISSIONS.find((m) => m.id === missionId).name} — hold W, lift off at 30 m/s.`;
  flight.messageUntil = 4;
}

// --- screenshot mode: jump straight into a composed flying frame ---
let shot = null;
if (shotName) {
  shot = applyShot(shotName, flight);
  if (shot) {
    started = true;
    cameraMode = shot.camera;
    menu.classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    flight.message = '';
    flight.messageUntil = 0;
  }
}

function cycleMission() {
  const idx = MISSIONS.findIndex((m) => m.id === flight.mission);
  const next = MISSIONS[(idx + 1) % MISSIONS.length];
  resetFlight(flight, next.id);
  flight.message = `${next.name} — ${next.brief}`;
  flight.messageUntil = 5;
}

function saveBest() {
  if (flight.mission === 'trial' && flight.bestTime) {
    const prev = bestTimes.trial;
    if (!prev || flight.bestTime < prev) {
      bestTimes.trial = flight.bestTime;
      try { localStorage.setItem('storm-island-hop-best', JSON.stringify(bestTimes)); } catch { /* private mode */ }
    }
  }
}

function missionOf(f) { return MISSIONS.find((m) => m.id === f.mission); }

// --- ring visibility: only the next ring of the active mission glows ---
function updateRings() {
  const rings = missionRings(flight);
  for (const r of world.rings) {
    if (r.kind === 'rescue') { r.mesh.visible = flight.mission === 'rescue' && !flight.rescueDone; continue; }
    if (r.kind !== flight.mission) { r.mesh.visible = false; continue; }
    const idx = rings.indexOf(r.def);
    r.mesh.visible = idx >= flight.ringsDone;
    const isNext = idx === flight.ringsDone;
    r.mesh.material.opacity = isNext ? 0.95 : 0.35;
    r.mesh.children[0].material.opacity = isNext ? 0.7 : 0.2;
  }
}

// --- camera: chase over the shoulder, or the pilot's seat ---
const camPos = new THREE.Vector3();
const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  const f = flight;
  const fwd = new THREE.Vector3(Math.sin(f.heading), 0, Math.cos(f.heading));
  const up = new THREE.Vector3(0, 1, 0);
  if (cameraMode === 'cockpit') {
    camPos.copy(plane.position).addScaledVector(fwd, 2.2).addScaledVector(up, 1.5);
    camTarget.copy(plane.position).addScaledVector(fwd, 60)
      .addScaledVector(up, Math.sin(f.pitch) * 40 - 2);
    camera.position.lerp(camPos, Math.min(1, dt * 18));
    camera.lookAt(camTarget);
    camera.rotation.z += -f.roll * 0.55;
    plane.userData.prop.visible = false; // the prop disc would freeze as a bar in front of the lens
  } else {
    plane.userData.prop.visible = true;
    const back = 15 + f.speed * 0.06;
    const height = 4.5 + Math.max(0, f.pitch) * 6;
    camPos.copy(plane.position).addScaledVector(fwd, -back).addScaledVector(up, height);
    camTarget.copy(plane.position).addScaledVector(fwd, 26);
    camera.position.lerp(camPos, Math.min(1, dt * 6));
    camera.lookAt(camTarget);
  }
}

// --- main loop ---
const clock = new THREE.Clock();
let elapsed = 0;
let lastFlash = 0;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  // Edge-triggered keys.
  if (input.wasPressed('KeyC')) cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
  if (input.wasPressed('KeyM') && started) cycleMission();
  if (input.wasPressed('KeyR') && started) { resetFlight(flight, flight.mission); }
  if (input.wasPressed('KeyP') && started) paused = !paused;
  if (input.wasPressed('Enter') && !started) startGame(selectedMission);
  if (input.wasPressed('Space') && !started) { audio.start(); startGame(selectedMission); }

  if (started && !paused) {
    const events = stepFlight(flight, dt, input.state);
    for (const e of events) {
      if (e === 'ring') audio.ring();
      if (e === 'crash') hud.showCrash(flight.crashReason);
      if (e === 'hop-complete' || e === 'rescue-complete' || e === 'trial-complete') {
        hud.showComplete(flight.message);
        saveBest();
      }
    }
    audio.update(flight);
    if (world.lightning.flash > 0 && lastFlash <= 0) audio.thunder();
    lastFlash = world.lightning.flash;
  }

  // Sync the mesh to the model.
  const f = flight;
  plane.position.set(f.x, f.alt + 1.3, f.z);
  plane.rotation.y = f.heading;
  plane.rotation.x = -f.pitch;
  plane.rotation.z = -f.roll;
  plane.userData.prop.rotation.z += dt * (4 + f.throttle * 40) * (f.throttle > 0.02 ? 1 : 0);

  updateRings();
  updateCamera(dt);
  world.update(elapsed, dt, camera.position);
  hud.update(f, missionOf(f), bestTimes);
  document.getElementById('pause-veil').classList.toggle('hidden', !paused);
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

frame();
