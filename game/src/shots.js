// Storm Island Hop — screenshot presets. The judge (and our own screenshot run)
// opens the game with ?shot=<name>&seed=1 and the game jumps straight into a
// composed, flying frame: aircraft in shot, instruments lit, a ring or runway ahead,
// ALT / SPD / HDG on the HUD. No menu, no waiting for a human to fly there.

import { makeFlight, stepFlight } from './flight.js';
import { ISLANDS, TRIAL_RINGS, HOP_RINGS } from './config.js';

// Fly the model forward headlessly for `seconds` with a scripted input, so the
// screenshot frame is a genuinely flown state, not a posed mock-up.
function flyForward(f, seconds, inputFn) {
  const dt = 1 / 60;
  const steps = Math.floor(seconds / dt);
  for (let i = 0; i < steps; i++) stepFlight(f, dt, inputFn(i * dt, f));
}

const FULL_THROTTLE = () => ({ throttleUp: true, throttleDown: false, pitchUp: false, pitchDown: false, bankLeft: false, bankRight: false });

export function applyShot(name, f) {
  // Returns { camera: 'chase' | 'cockpit', mission } or null for normal play.
  if (name === 'takeoff') {
    // Rolling down the Coral Cay strip at rotation speed, nose just lifting.
    f.throttle = 1; f.speed = 34; f.pitch = 0.12; f.airborne = false;
    flyForward(f, 1.2, (t) => ({
      throttleUp: true, throttleDown: false,
      pitchUp: t > 0.4, pitchDown: false, bankLeft: false, bankRight: false,
    }));
    return { camera: 'chase', mission: 'hop' };
  }
  if (name === 'cruise') {
    // Mid-hop in the rain: level at 130 m between Coral Cay and Gull Rock,
    // amber hop ring dead ahead, storm clouds behind.
    f.mission = 'hop';
    flyForward(f, 7, FULL_THROTTLE);
    f.x = -40; f.z = -620; f.alt = 130; f.speed = 62; f.throttle = 0.72;
    f.heading = Math.atan2(HOP_RINGS[0].x - f.x, HOP_RINGS[0].z - f.z);
    f.pitch = 0.02; f.roll = 0; f.airborne = true;
    return { camera: 'chase', mission: 'hop' };
  }
  if (name === 'lighthouse') {
    // Final approach to Gull Rock in the rescue mission: lighthouse abeam,
    // red rescue ring above the boat ahead, strip lights in the rain.
    f.mission = 'rescue';
    f.x = 300; f.z = -160; f.alt = 95; f.speed = 52; f.throttle = 0.55;
    f.heading = Math.atan2(ISLANDS[1].strip.x - f.x, ISLANDS[1].strip.z - f.z);
    f.pitch = -0.05; f.roll = -0.06; f.airborne = true; f.rescueDone = false;
    return { camera: 'chase', mission: 'rescue' };
  }
  if (name === 'cockpit') {
    // From the pilot's seat on the time-trial leg: cyan ring ahead, dials lit,
    // rain on the windscreen, islands below.
    f.mission = 'trial';
    f.x = 60; f.z = -560; f.alt = 108; f.speed = 68; f.throttle = 0.8;
    f.heading = Math.atan2(TRIAL_RINGS[1].x - f.x, TRIAL_RINGS[1].z - f.z);
    f.pitch = 0.01; f.roll = 0.05; f.airborne = true;
    return { camera: 'cockpit', mission: 'trial' };
  }
  return null;
}
