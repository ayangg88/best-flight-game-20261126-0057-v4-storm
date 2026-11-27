// Storm Island Hop — the aircraft itself. A chunky orange-and-cream bush seaplane
// with floats, built from primitives so it reads clearly from the chase camera and
// in the cockpit screenshots. Returns a THREE.Group whose nose points along +Z
// when heading is zero; main.js rotates it to the flight heading.

import * as THREE from '../vendor/three.module.min.js';

export function buildPlane() {
  const group = new THREE.Group();
  const cream = new THREE.MeshStandardMaterial({ color: 0xfff3d6, roughness: 0.55, metalness: 0.08 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff6b2c, roughness: 0.5, metalness: 0.12 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x24313d, roughness: 0.4, metalness: 0.35 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd8e8, roughness: 0.12, metalness: 0.45 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a97a3, roughness: 0.3, metalness: 0.7 });

  // Fuselage: a tapered tube, nose forward (+Z), tail at the back.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.55, 5.4, 12), cream);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 0, 0.2);
  group.add(body);

  // Nose cone and spinner.
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.1, 12), orange);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0, 3.4);
  group.add(nose);
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 10), dark);
  spinner.rotation.x = Math.PI / 2;
  spinner.position.set(0, 0, 4.15);
  group.add(spinner);

  // Propeller: two dark blades + hub, spins in main.js.
  const prop = new THREE.Group();
  prop.position.set(0, 0, 4.3);
  const bladeGeo = new THREE.BoxGeometry(0.22, 2.6, 0.08);
  const blade1 = new THREE.Mesh(bladeGeo, dark);
  const blade2 = new THREE.Mesh(bladeGeo, dark);
  blade2.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), steel);
  prop.add(blade1, blade2, hub);
  prop.userData.isProp = true;
  group.add(prop);
  group.userData.prop = prop;

  // Cockpit canopy: a glass half-dome over the front seats.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.78, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  canopy.scale.set(1, 0.75, 1.5);
  canopy.position.set(0, 0.45, 1.1);
  group.add(canopy);

  // High wing with orange tips, mounted above the cabin on short struts.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.16, 1.5), cream);
  wing.position.set(0, 0.95, 0.6);
  group.add(wing);
  for (const side of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 1.5), orange);
    tip.position.set(side * 4.25, 0.95, 0.6);
    group.add(tip);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.95, 6), steel);
    strut.position.set(side * 0.7, 0.5, 0.6);
    group.add(strut);
  }

  // Tail: horizontal stabiliser + tall orange fin with a white flash.
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 1.0), cream);
  tailplane.position.set(0, 0.25, -2.6);
  group.add(tailplane);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.7, 1.3), orange);
  fin.position.set(0, 0.9, -2.55);
  fin.rotation.x = -0.25;
  group.add(fin);

  // Floats: two long pontoons on struts, so a water landing reads as survivable.
  for (const side of [-1, 1]) {
    const float = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 4.4, 10), orange);
    float.rotation.x = Math.PI / 2;
    float.position.set(side * 1.15, -0.95, 0.2);
    group.add(float);
    const fstrut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 6), steel);
    fstrut.position.set(side * 1.15, -0.55, 0.9);
    group.add(fstrut);
    const fstrut2 = fstrut.clone();
    fstrut2.position.set(side * 1.15, -0.55, -0.6);
    group.add(fstrut2);
  }

  // Navigation lights: red port, green starboard, white tail.
  const lightGeo = new THREE.SphereGeometry(0.09, 8, 6);
  const red = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  red.position.set(-4.6, 0.95, 0.6);
  const green = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0x22ff66 }));
  green.position.set(4.6, 0.95, 0.6);
  const white = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  white.position.set(0, 0.3, -2.95);
  group.add(red, green, white);

  // A soft blob shadow is faked by the renderer; the group origin sits at the
  // aircraft centre, floats hang 1.27 below it.
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}
