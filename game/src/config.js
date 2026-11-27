// Storm Island Hop — shared constants, island map, missions and a tiny seeded RNG.
// Everything in this file is pure data plus deterministic helpers, so the flight model
// in flight.js can be graded in Node without a browser.

export const SEA_LEVEL = 0;
export const STALL_SPEED = 26; // m/s, below this the wing stops flying
export const MAX_SPEED = 92; // m/s at full throttle, level flight
export const CRUISE_SPEED = 58;
export const FUEL_BURN = 0.55; // fuel units per second at full throttle
export const FUEL_START = 100;
export const WORLD_RADIUS = 2600; // playable sea, metres from the origin

// Three island airstrips form a triangle across the storm sea. Each strip sits on
// its own island; the strip altitude is the flattened top of that island.
export const ISLANDS = [
  {
    id: 'coral',
    name: 'Coral Cay',
    x: -720, z: -420, radius: 330, height: 26,
    strip: { x: -720, z: -420, heading: 70, length: 260, width: 30, alt: 26 },
    palms: 46, lighthouse: false, beach: true,
  },
  {
    id: 'gull',
    name: 'Gull Rock',
    x: 640, z: -560, radius: 300, height: 34,
    strip: { x: 640, z: -560, heading: 145, length: 240, width: 30, alt: 34 },
    palms: 30, lighthouse: true, beach: true,
  },
  {
    id: 'tempest',
    name: 'Tempest Point',
    x: 120, z: 760, radius: 380, height: 30,
    strip: { x: 120, z: 760, heading: 250, length: 280, width: 30, alt: 30 },
    palms: 52, lighthouse: true, beach: true,
  },
];

// A stranded fishing boat sheltering in the lee of Gull Rock; the rescue target.
export const STRANDED_BOAT = { x: 430, z: -300, heading: 40 };

// Rings for the time trial: a slalom between the islands, low over the swell.
export const TRIAL_RINGS = [
  { x: -380, z: -620, alt: 95, r: 20 },
  { x: 120, z: -720, alt: 110, r: 20 },
  { x: 700, z: -120, alt: 90, r: 20 },
  { x: 560, z: 420, alt: 105, r: 20 },
  { x: -120, z: 520, alt: 95, r: 20 },
];

// Hop rings mark the route for mission 1, one above each leg.
export const HOP_RINGS = [
  { x: -40, z: -490, alt: 120, r: 22 },
  { x: 380, z: 100, alt: 130, r: 22 },
  { x: 120, z: 760, alt: 110, r: 22 },
];

export const MISSIONS = [
  {
    id: 'hop',
    name: 'Island Hop',
    brief: 'Land on all three island strips in order: Coral Cay, Gull Rock, Tempest Point.',
    reward: 500,
  },
  {
    id: 'rescue',
    name: 'Storm Rescue',
    brief: 'Fight the crosswind to Gull Rock, drop through the rescue ring above the stranded boat, then land.',
    reward: 750,
  },
  {
    id: 'trial',
    name: 'Lightning Time Trial',
    brief: 'Thread all five storm rings as fast as you can. Every missed ring costs 15 seconds.',
    reward: 1000,
  },
];

// Deterministic RNG (mulberry32) so the world layout and the grade runs are stable.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth island height: a cosine dome that falls to sea level at the beach edge.
export function terrainHeight(x, z) {
  let h = SEA_LEVEL;
  for (const isl of ISLANDS) {
    const dx = x - isl.x, dz = z - isl.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < isl.radius) {
      const t = 0.5 + 0.5 * Math.cos((Math.PI * d) / isl.radius);
      h = Math.max(h, isl.height * t * t);
    }
  }
  return h;
}

// The flat top an island strip sits on (the strip altitude, inside its rectangle).
// `margin` widens the rectangle for landing checks: a touchdown a few metres off
// the asphalt still counts, the way a grass overshoot would on a bush strip.
export function stripAt(x, z, margin = 0) {
  for (const isl of ISLANDS) {
    const s = isl.strip;
    const hd = (s.heading * Math.PI) / 180;
    const lx = Math.cos(hd) * (x - s.x) + Math.sin(hd) * (z - s.z);
    const lz = -Math.sin(hd) * (x - s.x) + Math.cos(hd) * (z - s.z);
    if (Math.abs(lx) < s.length / 2 + margin && Math.abs(lz) < s.width / 2 + margin) return s;
  }
  return null;
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
export function deg(rad) { return (rad * 180) / Math.PI; }
export function rad(deg) { return (deg * Math.PI) / 180; }
