![Storm Island Hop](https://make.fun/badge/best-flight-game-20261126-0057.svg)
![Reward](https://make.fun/badge/best-flight-game-20261126-0057/ayangg88/best-flight-game-20261126-0057-v4-storm/reward.svg)

# Storm Island Hop

A tropical storm is tearing across a chain of palm islands, and you are the only
pilot crazy enough to fly in it. **Storm Island Hop** is a complete 3D flight game
that runs offline in a desktop browser: take off from a lit island airstrip, fight
gusting crosswinds and slanting rain, thread glowing rings between the islands, and
bring the crew of a stranded boat home before your fuel runs out.

Built for the make.fun competition
[best-flight-game-20261126-0057](https://make.fun/competitions/best-flight-game-20261126-0057)
by [@ayangg88](https://github.com/ayangg88). Referral code: `ye9vf8mj`.

## How to play

Serve the game and open it in desktop Chrome — no build step, no network:

```sh
node serve.ts
# open http://localhost:8080
```

| Key | Does |
| --- | --- |
| W / S | Throttle up / down |
| ↑ / ↓ | Pitch nose up / down |
| ← / → or A / D | Bank left / right (banking turns the aircraft) |
| Mouse drag | Steer like a stick |
| C | Chase camera / cockpit camera |
| M | Next mission |
| P | Pause |
| R | Reset after a crash |

## The three missions

1. **Island Hop** — land on all three island strips in order: Coral Cay, Gull Rock,
   Tempest Point. Amber rings mark each leg. A landing only counts if you are slow,
   gentle and lined up with the runway; land on the wrong island and you have to
   try that leg again.
2. **Storm Rescue** — crosswinds are worst on this one. Drop through the red ring
   above the stranded boat off Gull Rock, then put the plane down on the Gull Rock
   strip to bring the crew home.
3. **Lightning Time Trial** — thread all five cyan rings between the islands as fast
   as you can. Your best time is saved in the browser.

## Flying it well

- Lift off at about 30 m/s: hold W, then pull up gently.
- Below 26 m/s the wing stalls and the aircraft sinks — keep your speed up in the
  turns, especially in a gust.
- Fuel burns with the throttle. Land on any strip to refuel; run dry in the air and
  you will be gliding to a ditching.
- The storm wall at the edge of the map turns you back. The wind is real: it pushes
  the airframe sideways, so crab into it on final approach.
- A landing needs all four: on a strip, under 58 m/s, sinking slower than 4.5 m/s,
  and lined up with the runway. Anything else is a crash.

## What is in the game

- A living storm: drifting cloud banks, 2,600 falling rain streaks, lightning that
  flashes the whole sky and rolls thunder a beat later.
- Three islands with white beaches, palm groves, two sweeping lighthouses and lit
  airstrips with green edge lights.
- A glass HUD with ALT / SPD / HDG, a compass strip, fuel and throttle, live wind,
  mission progress — plus a six-dial cockpit dashboard (airspeed, altitude,
  heading, pitch, fuel, vertical speed) with lit needles.
- Procedural WebAudio: rain hiss, wind roar, an engine drone that follows the
  throttle, thunder and a ring chime. No audio files.
- A pure, deterministic flight model (`game/src/flight.js`) that runs in Node as
  well as in the browser, so the takeoff, ring, landing, stall and crash behaviour
  is graded by simulation before every hand-in.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output`
  and writes `dossier.json`.
- `game/index.html` — opens and plays in desktop Chrome, fully offline.
- `game/src/` — one job per file: `config.js` (map, missions, RNG), `flight.js`
  (flight model), `world.js` (sea, islands, storm), `plane.js` (the seaplane),
  `hud.js` (HUD + dials), `audio.js` (procedural sound), `input.js` (keyboard and
  drag), `shots.js` (screenshot presets), `main.js` (renderer and game loop).
- `game/vendor/three.module.min.js` — vendored three.js.
- `screenshots/` — four real renders of the game: takeoff, island cruise in the
  rain, lighthouse approach, cockpit.

## License

MIT — see [LICENSE](LICENSE).
