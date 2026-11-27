// Storm Island Hop — the pure flight model. No DOM, no three.js: the browser loop in
// main.js and the Node grade harness both drive this same step() function, so a bug
// found by grading is a bug in the real game, not in a copy of it.
//
// Controls model: throttle (W/S), elevator pitch (Up/Down arrows), bank (Left/Right
// arrows). Banking turns the nose; the nose follows the bank, the way a real light
// aircraft does. Lift comes from speed; below the stall speed the wing quits and the
// aircraft sinks. Fuel burns with throttle and can be topped up by landing.

import {
  STALL_SPEED, MAX_SPEED, FUEL_BURN, FUEL_START, WORLD_RADIUS,
  ISLANDS, TRIAL_RINGS, HOP_RINGS, STRANDED_BOAT,
  terrainHeight, stripAt, clamp, wrapAngle,
} from './config.js';

export function makeFlight(missionId = 'hop') {
  const home = ISLANDS[0].strip;
  return {
    mission: missionId,
    // Start parked on the Coral Cay strip, nose down the runway.
    x: home.x, z: home.z, alt: home.alt,
    heading: (home.heading * Math.PI) / 180,
    pitch: 0, roll: 0,
    speed: 0, throttle: 0, verticalSpeed: 0,
    fuel: FUEL_START, airborne: false,
    crashed: false, crashReason: '',
    landed: false, landedOn: null,
    hopsDone: missionId === 'hop' ? 1 : 0, // you start parked on Coral Cay, hop 1 is done
    ringsDone: 0, ringsTotal: missionId === 'trial' ? TRIAL_RINGS.length : HOP_RINGS.length,
    rescueDone: false,
    time: 0, score: 0, bestTime: null,
    message: 'Hold W to spool up, then pull up gently at 30 m/s.',
    messageUntil: 6,
    windDir: (200 * Math.PI) / 180, // the storm blows out of the south-west
    windBase: 6, gust: 0, gustTimer: 0,
    refuelTimer: 0,
  };
}

// Rings the active mission cares about, in flying order.
export function missionRings(f) {
  if (f.mission === 'trial') return TRIAL_RINGS;
  if (f.mission === 'hop') return HOP_RINGS;
  return [{ x: STRANDED_BOAT.x, z: STRANDED_BOAT.z, alt: 80, r: 24 }];
}

// One fixed step. `input` is { throttleUp, throttleDown, pitchUp, pitchDown,
// bankLeft, bankRight } as booleans. Returns a list of event strings for the HUD.
export function stepFlight(f, dt, input) {
  const events = [];
  if (f.crashed) return events;
  f.time += dt;

  // --- wind: a steady storm push plus gusts that swell and fade over ~4 s ---
  f.gustTimer -= dt;
  if (f.gustTimer <= 0) {
    f.gust = 3 + Math.random() * 6;
    f.gustTimer = 2.5 + Math.random() * 3;
  }
  const windSpeed = f.windBase + f.gust * (0.5 + 0.5 * Math.sin(f.time * 0.9));
  const windX = Math.sin(f.windDir) * windSpeed;
  const windZ = Math.cos(f.windDir) * windSpeed;

  // --- throttle and fuel ---
  if (input.throttleUp) f.throttle = clamp(f.throttle + dt * 0.7, 0, 1);
  if (input.throttleDown) f.throttle = clamp(f.throttle - dt * 0.9, 0, 1);
  if (f.throttle > 0 && f.fuel > 0) {
    f.fuel = Math.max(0, f.fuel - FUEL_BURN * (0.25 + f.throttle) * dt);
    if (f.fuel === 0) { f.throttle = 0; events.push('fuel-empty'); }
  }

  // --- pitch and bank, eased toward the pilot's command ---
  const pitchTarget = input.pitchUp ? 0.32 : input.pitchDown ? -0.28 : 0;
  const rollTarget = input.bankLeft ? -0.85 : input.bankRight ? 0.85 : 0;
  f.pitch += (pitchTarget - f.pitch) * Math.min(1, dt * 3.0);
  f.roll += (rollTarget - f.roll) * Math.min(1, dt * 3.0);

  // --- speed: thrust fights drag; a stalled wing adds drag and kills lift ---
  const stalled = f.airborne && f.speed < STALL_SPEED;
  const thrust = f.throttle * 26 * (f.fuel > 0 ? 1 : 0);
  const drag = 0.16 * f.speed + 0.0016 * f.speed * f.speed + (stalled ? 6 : 0);
  f.speed = Math.max(0, f.speed + (thrust - drag - Math.sin(f.pitch) * 9.8 * 0.6) * dt);

  // --- heading follows the bank, faster at speed (positive roll = bank right = turn right) ---
  f.heading = wrapAngle(f.heading + f.roll * (f.speed / 60) * 0.55 * dt);

  // --- vertical speed: lift from speed and pitch, gravity when stalled ---
  let vs;
  if (!f.airborne) vs = 0;
  else if (stalled) vs = -14 - (STALL_SPEED - f.speed) * 0.4;
  else vs = f.speed * Math.sin(f.pitch) * 0.9 - (f.speed < 34 ? (34 - f.speed) * 0.25 : 0);
  f.verticalSpeed = vs;

  // --- move, with the wind pushing the airframe sideways ---
  const forwardX = Math.sin(f.heading);
  const forwardZ = Math.cos(f.heading);
  f.x += (forwardX * f.speed + windX * (f.airborne ? 1 : 0.15)) * dt;
  f.z += (forwardZ * f.speed + windZ * (f.airborne ? 1 : 0.15)) * dt;
  f.alt += vs * dt;

  // --- world edge: the storm wall turns the aircraft back, it never just ends ---
  const dist = Math.hypot(f.x, f.z);
  if (dist > WORLD_RADIUS) {
    const push = (dist - WORLD_RADIUS) / 40;
    f.x -= (f.x / dist) * push * dt * 10;
    f.z -= (f.z / dist) * push * dt * 10;
    if (f.messageUntil < f.time) { f.message = 'Storm wall — turn back!'; f.messageUntil = f.time + 2; }
  }

  // --- takeoff: rolling fast enough on a strip lifts off ---
  const strip = stripAt(f.x, f.z, 6);
  const ground = strip ? strip.alt : terrainHeight(f.x, f.z);
  let justTookOff = false;
  if (!f.airborne) {
    f.alt = ground;
    if (f.speed > 32 && f.pitch > 0.06) {
      f.airborne = true;
      justTookOff = true;
      events.push('takeoff');
      f.message = 'Airborne! Mind the crosswind.'; f.messageUntil = f.time + 3;
    }
  }

  // --- rings: fly through the next one, get points and a time bonus ---
  const rings = missionRings(f);
  const next = rings[f.ringsDone];
  if (next && f.airborne) {
    const dx = f.x - next.x, dz = f.z - next.z, da = f.alt - next.alt;
    // A forgiving window: the storm wind shoves the airframe sideways, so the
    // ring counts a near pass, not a perfect centre-line thread.
    if (Math.hypot(dx, dz) < next.r + 8 && Math.abs(da) < next.r + 8) {
      f.ringsDone += 1;
      f.score += 100;
      events.push('ring');
      f.message = `Ring ${f.ringsDone}/${rings.length}! +100`; f.messageUntil = f.time + 2.5;
      if (f.mission === 'trial' && f.ringsDone === rings.length) {
        f.bestTime = f.time;
        f.score += 400;
        events.push('trial-complete');
        f.message = `Time trial done in ${f.time.toFixed(1)}s! +400`; f.messageUntil = f.time + 5;
      }
    }
  }

  // --- rescue: drop low over the boat in the rescue mission ---
  if (f.mission === 'rescue' && !f.rescueDone && f.airborne) {
    const d = Math.hypot(f.x - STRANDED_BOAT.x, f.z - STRANDED_BOAT.z);
    if (d < 60 && f.alt < 90) {
      f.rescueDone = true;
      f.score += 250;
      events.push('rescue');
      f.message = 'Rescue ring cleared — now land on Gull Rock!'; f.messageUntil = f.time + 4;
    }
  }

  // --- landing and crashing: only when descending onto the ground, never on the
  // very step the aircraft lifts off (its altitude still equals the strip's) ---
  if (f.airborne && !justTookOff && f.verticalSpeed < 0.5 && f.alt <= ground + 0.4) {
    const sinkOk = f.verticalSpeed > -7.5;
    const speedOk = f.speed < 58;
    const stripOk = strip !== null;
    // A strip works from either end: line up with its heading or the reciprocal.
    const hd = stripOk ? (strip.heading * Math.PI) / 180 : 0;
    const diff = stripOk
      ? Math.min(Math.abs(wrapAngle(f.heading - hd)), Math.abs(wrapAngle(f.heading - hd - Math.PI)))
      : 9;
    const aligned = stripOk && diff < 0.75;
    if (stripOk && sinkOk && speedOk && aligned) {
      f.airborne = false;
      f.landed = true;
      f.landedOn = strip;
      f.alt = ground;
      f.speed = Math.min(f.speed, 24);
      events.push('landed');
      f.score += 150;
      const isl = ISLANDS.find((i) => i.strip === strip);
      f.message = `Landed on ${isl ? isl.name : 'a strip'}! +150 — refuelling…`;
      f.messageUntil = f.time + 4;
      // Island Hop wants the strips in order: Coral, Gull, Tempest.
      if (f.mission === 'hop') {
        const order = ISLANDS.map((i) => i.id);
        const expect = order[f.hopsDone];
        if (isl && isl.id === expect) {
          f.hopsDone += 1;
          if (f.hopsDone === order.length) {
            f.score += 500;
            events.push('hop-complete');
            f.message = 'ISLAND HOP COMPLETE! +500'; f.messageUntil = f.time + 6;
          }
        } else if (isl) {
          f.message = `Wrong island — next stop is ${ISLANDS[f.hopsDone].name}.`;
          f.messageUntil = f.time + 4;
        }
      }
      if (f.mission === 'rescue' && f.rescueDone && isl && isl.id === 'gull') {
        f.score += 500;
        events.push('rescue-complete');
        f.message = 'RESCUE COMPLETE! The crew is safe. +500'; f.messageUntil = f.time + 6;
      }
    } else {
      f.crashed = true;
      f.crashReason = !stripOk
        ? (f.alt <= 0.5 ? 'Ditched in the sea' : 'Flew into the island')
        : !sinkOk ? 'Hit the runway too hard' : !speedOk ? 'Landed far too fast' : 'Landed across the runway';
      f.alt = ground;
      events.push('crash');
    }
  }

  // --- refuel while parked on a strip ---
  if (!f.airborne && f.fuel < FUEL_START) {
    f.refuelTimer += dt;
    if (f.refuelTimer > 0.5) {
      f.fuel = Math.min(FUEL_START, f.fuel + 12 * dt);
      f.refuelTimer = 0;
    }
  }

  // --- fuel starvation in the air: glide, then ditch ---
  if (f.airborne && f.fuel <= 0 && f.speed < 8 && f.alt <= ground + 2) {
    f.crashed = true;
    f.crashReason = 'Ran out of fuel';
    events.push('crash');
  }
  return events;
}

// Reset after a crash or a mission change, keeping the chosen mission.
export function resetFlight(f, missionId = f.mission) {
  const fresh = makeFlight(missionId);
  Object.keys(fresh).forEach((k) => { f[k] = fresh[k]; });
}
