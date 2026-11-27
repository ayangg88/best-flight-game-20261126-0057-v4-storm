// Storm Island Hop — keyboard (and pointer-drag) input. Keys are tracked as a live
// set; main.js polls the set each frame, and flight.js reads the same shape, so the
// grade harness can feed identical input objects into the model in Node.

export function makeInput() {
  const keys = new Set();
  const state = {
    throttleUp: false, throttleDown: false,
    pitchUp: false, pitchDown: false,
    bankLeft: false, bankRight: false,
  };
  const codeMap = {
    KeyW: 'throttleUp', ArrowUp: 'pitchUp', KeyS: 'throttleDown', ArrowDown: 'pitchDown',
    ArrowLeft: 'bankLeft', ArrowRight: 'bankRight', KeyA: 'bankLeft', KeyD: 'bankRight',
  };
  const pressed = new Set(); // edge-triggered keys, consumed by main.js
  let dragX = 0, dragY = 0, dragging = false;

  function sync() {
    for (const [code, name] of Object.entries(codeMap)) state[name] = keys.has(code);
    if (dragging) {
      state.bankLeft = dragX < -12;
      state.bankRight = dragX > 12;
      state.pitchUp = dragY < -12;
      state.pitchDown = dragY > 12;
    }
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
    sync();
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.code); sync(); });
  window.addEventListener('blur', () => { keys.clear(); sync(); });

  // Drag on the canvas steers like a stick: sideways banks, up/down pitches.
  let lastX = 0, lastY = 0;
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#menu') || e.target.closest('button')) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY; dragX = 0; dragY = 0;
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dragX = e.clientX - lastX; dragY = e.clientY - lastY;
    sync();
  });
  window.addEventListener('pointerup', () => { dragging = false; dragX = 0; dragY = 0; sync(); });

  return {
    state,
    // True once if the key was pressed since the last call; main.js drains these.
    wasPressed(code) {
      if (pressed.has(code)) { pressed.delete(code); return true; }
      return false;
    },
    anyKey() { return pressed.size > 0; },
  };
}
