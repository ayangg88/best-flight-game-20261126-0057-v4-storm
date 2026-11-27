// Storm Island Hop — the world: a turquoise storm sea, three palm islands with white
// beaches and lit airstrips, two lighthouses, a stranded boat, glowing rings, and a
// living storm: drifting cloud banks, slanting rain and lightning that lights the sky.

import * as THREE from '../vendor/three.module.min.js';
import { ISLANDS, TRIAL_RINGS, HOP_RINGS, STRANDED_BOAT, mulberry32 } from './config.js';

function makeCanvasTexture(draw, w = 256, h = 256) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildPalm(rng) {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f9e4f, roughness: 0.8, side: THREE.DoubleSide });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 4.4, 7), trunkMat);
  trunk.position.y = 2.2;
  trunk.rotation.z = (rng() - 0.5) * 0.25;
  palm.add(trunk);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.55), leafMat);
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.1, 4.5, Math.sin(a) * 1.1);
    leaf.rotation.set(Math.sin(a) * 1.1, -a, Math.cos(a) * 1.1 - 0.4);
    palm.add(leaf);
  }
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 }));
  nut.position.set(0.3, 4.3, 0.2);
  palm.add(nut);
  return palm;
}

function buildLighthouse() {
  const g = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 11, 12),
    new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.6 }));
  tower.position.y = 5.5;
  g.add(tower);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.9, 1.6, 12),
    new THREE.MeshStandardMaterial({ color: 0xd43d2a, roughness: 0.6 }));
  band.position.y = 7.5;
  g.add(band);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  lamp.position.y = 11.6;
  g.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.4, 12),
    new THREE.MeshStandardMaterial({ color: 0x2b3a44, roughness: 0.5 }));
  cap.position.y = 12.9;
  g.add(cap);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 3.2, 26, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  beam.rotation.z = Math.PI / 2;
  beam.position.set(13, 11.6, 0);
  g.add(beam);
  g.userData.beam = beam;
  g.userData.lamp = lamp;
  return g;
}

function buildRing(radius, color) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.9, 12, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
  );
  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.55, 0.35, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
  );
  ring.add(inner);
  return ring;
}

export function buildWorld(scene, rngSeed = 20261127) {
  const rng = mulberry32(rngSeed);
  const world = { rings: [], lighthouses: [], clouds: [], rain: null, lightning: null, update: null };

  // --- sky: a dark storm gradient dome with brighter breaks where the sun fights through ---
  const skyGeo = new THREE.SphereGeometry(5200, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { flash: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP; uniform float flash;
      void main(){
        float h = normalize(vP).y;
        vec3 deep = vec3(0.10, 0.13, 0.22);
        vec3 band = vec3(0.32, 0.36, 0.48);
        vec3 breakCol = vec3(0.95, 0.72, 0.38);
        vec3 c = mix(deep, band, smoothstep(-0.05, 0.45, h));
        float brk = smoothstep(0.55, 0.95, sin(normalize(vP).x * 2.1 + 1.3) * 0.5 + 0.5)
                  * smoothstep(0.02, 0.22, h) * (1.0 - smoothstep(0.22, 0.5, h));
        c = mix(c, breakCol, brk * 0.75);
        c += vec3(flash * 0.55);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
  world.skyMat = skyMat;

  // --- sea: a big turquoise plane with a procedural swell normal-ish texture ---
  const seaTex = makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#0e6f7a'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const g = rng();
      ctx.fillStyle = g > 0.5 ? 'rgba(32,160,170,0.35)' : 'rgba(6,70,86,0.4)';
      ctx.beginPath();
      ctx.ellipse(rng() * w, rng() * h, 4 + rng() * 26, 1.5 + rng() * 4, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 512, 512);
  seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping;
  seaTex.repeat.set(24, 24);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(11000, 11000, 48, 48),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: seaTex, roughness: 0.35, metalness: 0.25 }));
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = true;
  scene.add(sea);
  world.sea = sea;

  // --- islands: sand beach ring, green dome, palms, strip, lighthouse ---
  const sandTex = makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#f2e3bb'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(190,160,110,0.5)' : 'rgba(255,250,230,0.6)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x3f8f4a, roughness: 0.95 });
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: sandTex, roughness: 0.9 });
  const stripMat = new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.85 });
  const stripLineMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });

  for (const isl of ISLANDS) {
    // Green dome: a squashed sphere whose rim meets the sea.
    const dome = new THREE.Mesh(new THREE.SphereGeometry(isl.radius, 36, 18), grassMat);
    dome.scale.set(1, isl.height / isl.radius, 1);
    dome.position.set(isl.x, 0, isl.z);
    dome.receiveShadow = true;
    scene.add(dome);
    // White beach: a flat ring just above the waterline.
    const beach = new THREE.Mesh(new THREE.RingGeometry(isl.radius * 0.86, isl.radius * 1.04, 40), sandMat);
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(isl.x, 0.6, isl.z);
    scene.add(beach);

    // Airstrip: dark slab with a centre line, chevrons and edge lights.
    const s = isl.strip;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(s.width, 1.2, s.length), stripMat);
    strip.position.set(s.x, s.alt - 0.4, s.z);
    strip.rotation.y = (s.heading * Math.PI) / 180;
    strip.receiveShadow = true;
    scene.add(strip);
    const centre = new THREE.Mesh(new THREE.PlaneGeometry(1.6, s.length * 0.86), stripLineMat);
    centre.rotation.x = -Math.PI / 2;
    centre.rotation.z = (s.heading * Math.PI) / 180;
    centre.position.set(s.x, s.alt + 0.25, s.z);
    scene.add(centre);
    for (const side of [-1, 1]) {
      for (let i = -4; i <= 4; i++) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0x7dffb0 }));
        const hd = (s.heading * Math.PI) / 180;
        const along = (i / 4) * (s.length / 2 - 8);
        lamp.position.set(
          s.x + Math.sin(hd) * along + Math.cos(hd) * side * (s.width / 2 + 1.5),
          s.alt + 0.5,
          s.z + Math.cos(hd) * along - Math.sin(hd) * side * (s.width / 2 + 1.5),
        );
        scene.add(lamp);
      }
    }
    // Island name, floating above the strip on a canvas sprite.
    const label = makeCanvasTexture((ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(10,20,30,0.9)'; ctx.lineWidth = 8;
      ctx.strokeText(isl.name.toUpperCase(), w / 2, h / 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(isl.name.toUpperCase(), w / 2, h / 2);
    }, 512, 96);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: label, transparent: true, depthWrite: false }));
    sprite.scale.set(150, 28, 1);
    sprite.position.set(s.x, s.alt + 42, s.z);
    scene.add(sprite);

    // Palms scattered on the dome, kept off the runway.
    for (let i = 0; i < isl.palms; i++) {
      const a = rng() * Math.PI * 2;
      const rr = isl.radius * (0.35 + rng() * 0.55);
      const px = isl.x + Math.cos(a) * rr;
      const pz = isl.z + Math.sin(a) * rr;
      const hd = (s.heading * Math.PI) / 180;
      const lx = Math.cos(hd) * (px - s.x) + Math.sin(hd) * (pz - s.z);
      if (Math.abs(lx) < s.length / 2 + 14) continue;
      const palm = buildPalm(rng);
      const domeH = isl.height * Math.pow(0.5 + 0.5 * Math.cos((Math.PI * rr) / isl.radius), 2);
      palm.position.set(px, Math.max(domeH - 0.5, 1), pz);
      palm.rotation.y = rng() * Math.PI * 2;
      const sc = 0.8 + rng() * 0.7;
      palm.scale.setScalar(sc);
      scene.add(palm);
    }

    if (isl.lighthouse) {
      const lh = buildLighthouse();
      const a = rng() * Math.PI * 2;
      lh.position.set(isl.x + Math.cos(a) * isl.radius * 0.55, isl.height * 0.55, isl.z + Math.sin(a) * isl.radius * 0.55);
      scene.add(lh);
      world.lighthouses.push(lh);
    }
  }

  // --- the stranded boat: a small white hull with a red stripe, bobbing in the swell ---
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(7, 1.6, 2.6),
    new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.6 }));
  hull.position.y = 0.8;
  boat.add(hull);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.5, 2.7),
    new THREE.MeshStandardMaterial({ color: 0xd43d2a, roughness: 0.6 }));
  stripe.position.y = 0.9;
  boat.add(stripe);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x2b6cb0, roughness: 0.55 }));
  cabin.position.set(-0.6, 2.2, 0);
  boat.add(cabin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5, 6),
    new THREE.MeshStandardMaterial({ color: 0x8a97a3, roughness: 0.5, metalness: 0.5 }));
  mast.position.set(1.6, 3.4, 0);
  boat.add(mast);
  const sos = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff3333 }));
  sos.position.set(1.6, 6.2, 0);
  boat.add(sos);
  boat.userData.sos = sos;
  boat.position.set(STRANDED_BOAT.x, 0.4, STRANDED_BOAT.z);
  boat.rotation.y = (STRANDED_BOAT.heading * Math.PI) / 180;
  scene.add(boat);
  world.boat = boat;

  // --- rings: hop rings in amber, trial rings in cyan ---
  for (const r of HOP_RINGS) {
    const ring = buildRing(r.r, 0xffb020);
    ring.position.set(r.x, r.alt, r.z);
    scene.add(ring);
    world.rings.push({ mesh: ring, def: r, kind: 'hop' });
  }
  for (const r of TRIAL_RINGS) {
    const ring = buildRing(r.r, 0x22d3ee);
    ring.position.set(r.x, r.alt, r.z);
    scene.add(ring);
    world.rings.push({ mesh: ring, def: r, kind: 'trial' });
  }
  // Rescue ring above the boat, pulsing red.
  const rescue = buildRing(24, 0xff4455);
  rescue.position.set(STRANDED_BOAT.x, 80, STRANDED_BOAT.z);
  scene.add(rescue);
  world.rings.push({ mesh: rescue, def: { x: STRANDED_BOAT.x, z: STRANDED_BOAT.z, alt: 80, r: 24 }, kind: 'rescue' });
  world.rescueRing = rescue;

  // --- storm clouds: dark billboards drifting slowly across the sky ---
  const cloudTex = makeCanvasTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const gx = 40 + Math.random() * (w - 80);
      const gy = 70 + Math.random() * (h - 120);
      const gr = 26 + Math.random() * 46;
      const grad = ctx.createRadialGradient(gx, gy, 4, gx, gy, gr);
      grad.addColorStop(0, 'rgba(38,44,62,0.85)');
      grad.addColorStop(1, 'rgba(38,44,62,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
    }
  }, 256, 128);
  for (let i = 0; i < 26; i++) {
    const mat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.75 + rng() * 0.2 });
    const cloud = new THREE.Sprite(mat);
    const a = rng() * Math.PI * 2;
    const rr = 500 + rng() * 2200;
    cloud.position.set(Math.cos(a) * rr, 260 + rng() * 260, Math.sin(a) * rr);
    cloud.scale.set(700 + rng() * 700, 180 + rng() * 160, 1);
    scene.add(cloud);
    world.clouds.push({ sprite: cloud, speed: 6 + rng() * 10 });
  }

  // --- rain: one Points cloud of streaks falling around the camera ---
  const RAIN_COUNT = 2600;
  const rainPos = new Float32Array(RAIN_COUNT * 3);
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainPos[i * 3] = (rng() - 0.5) * 320;
    rainPos[i * 3 + 1] = rng() * 160;
    rainPos[i * 3 + 2] = (rng() - 0.5) * 320;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({
    color: 0xaac4d8, size: 0.55, transparent: true, opacity: 0.6, sizeAttenuation: true,
  }));
  scene.add(rain);
  world.rain = rain;

  // --- lightning: a point light high in the sky, fired in flashes ---
  const bolt = new THREE.PointLight(0xcfe4ff, 0, 4000, 0.4);
  bolt.position.set(0, 500, 0);
  scene.add(bolt);
  world.lightning = { light: bolt, timer: 5, flash: 0, x: 0, z: 0 };

  // --- lights: low storm sun + cool ambient ---
  const sun = new THREE.DirectionalLight(0xffd9a0, 1.5);
  sun.position.set(-900, 700, -500);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -400; sun.shadow.camera.right = 400;
  sun.shadow.camera.top = 400; sun.shadow.camera.bottom = -400;
  sun.shadow.camera.far = 4000;
  scene.add(sun);
  world.sun = sun;
  scene.add(new THREE.AmbientLight(0x5a6b80, 0.85));
  const hemi = new THREE.HemisphereLight(0x8fa3b8, 0x0e3a44, 0.5);
  scene.add(hemi);

  // --- per-frame animation: clouds drift, rain falls, lighthouse beams sweep,
  // rings pulse, lightning fires, the boat bobs. `t` is seconds, `cam` the camera.
  world.update = (t, dt, camPos) => {
    for (const c of world.clouds) {
      c.sprite.position.x += c.speed * dt;
      if (c.sprite.position.x > 3000) c.sprite.position.x = -3000;
    }
    rain.position.set(camPos.x, 0, camPos.z);
    const pos = rainGeo.attributes.position;
    for (let i = 0; i < RAIN_COUNT; i++) {
      let y = pos.getY(i) - dt * (55 + (i % 7) * 4);
      if (y < 0) y = 150 + (i % 13);
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    for (const lh of world.lighthouses) {
      lh.userData.beam.rotation.y = t * 0.5;
      lh.userData.lamp.material.color.setHex(Math.sin(t * 4) > 0 ? 0xffe9a8 : 0xffc860);
    }
    for (const r of world.rings) {
      const s = 1 + Math.sin(t * 2.2 + r.def.x) * 0.05;
      r.mesh.scale.setScalar(s);
      r.mesh.rotation.y = t * 0.25;
    }
    boat.position.y = 0.4 + Math.sin(t * 1.3) * 0.35;
    boat.rotation.z = Math.sin(t * 0.9) * 0.06;
    boat.userData.sos.material.color.setHex(Math.sin(t * 5) > 0 ? 0xff3333 : 0x881111);
    // Lightning: random strikes, a double flash, then darkness again.
    const L = world.lightning;
    L.timer -= dt;
    if (L.timer <= 0) {
      L.timer = 4 + Math.random() * 9;
      L.flash = 1;
      L.x = camPos.x + (Math.random() - 0.5) * 1600;
      L.z = camPos.z + (Math.random() - 0.5) * 1600;
      L.light.position.set(L.x, 480, L.z);
    }
    if (L.flash > 0) {
      L.flash = Math.max(0, L.flash - dt * 3.2);
      const v = L.flash * (0.6 + 0.4 * Math.sin(t * 40));
      L.light.intensity = 90000 * Math.max(0, v);
      skyMat.uniforms.flash.value = Math.max(0, v) * 0.5;
    } else {
      L.light.intensity = 0;
      skyMat.uniforms.flash.value = 0;
    }
  };

  return world;
}
