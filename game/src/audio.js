// Storm Island Hop — procedural WebAudio: rain hiss, wind roar and the engine drone,
// all synthesised from noise buffers and oscillators. No audio files, nothing to
// download; everything starts on the first user gesture (browser autoplay policy).

export function makeAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null, engineOsc2 = null, engineGain = null, engineFilter = null;
  let rainGain = null, windGain = null, windFilter = null;
  let started = false;

  function noiseBuffer(seconds, lowpass) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = lowpass ? last + 0.02 * (white - last) : white;
      data[i] = last * 3;
    }
    return buf;
  }

  function start() {
    if (started) return;
    started = true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    // Rain: looped filtered noise, a steady patter.
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = noiseBuffer(2, true);
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 3200;
    rainFilter.Q.value = 0.4;
    rainGain = ctx.createGain();
    rainGain.gain.value = 0.05;
    rainSrc.connect(rainFilter).connect(rainGain).connect(master);
    rainSrc.start();

    // Wind: a slower, deeper noise that swells with the gusts.
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = noiseBuffer(3, true);
    windSrc.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 420;
    windGain = ctx.createGain();
    windGain.gain.value = 0.06;
    windSrc.connect(windFilter).connect(windGain).connect(master);
    windSrc.start();

    // Engine: two detuned saws through a lowpass, pitch follows the throttle.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 70;
    engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'sawtooth';
    engineOsc2.frequency.value = 71.5;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 500;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.0;
    engineOsc.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain).connect(master);
    engineOsc.start();
    engineOsc2.start();
  }

  return {
    start,
    // Called every frame with the live flight state.
    update(f) {
      if (!started || !ctx) return;
      const t = ctx.currentTime;
      const target = f.airborne || f.throttle > 0.05 ? 0.05 + f.throttle * 0.11 : 0;
      engineGain.gain.setTargetAtTime(target, t, 0.1);
      const freq = 55 + f.throttle * 75 + f.speed * 0.35;
      engineOsc.frequency.setTargetAtTime(freq, t, 0.1);
      engineOsc2.frequency.setTargetAtTime(freq * 1.02, t, 0.1);
      engineFilter.frequency.setTargetAtTime(320 + f.throttle * 900, t, 0.15);
      windGain.gain.setTargetAtTime(0.03 + (f.windBase + f.gust) * 0.006 + f.speed * 0.0006, t, 0.2);
      windFilter.frequency.setTargetAtTime(300 + (f.windBase + f.gust) * 40, t, 0.2);
    },
    // A short thunder rumble after a lightning flash.
    thunder() {
      if (!started || !ctx) return;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(1.6, true);
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(220, ctx.currentTime);
      filt.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 1.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.35, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);
      src.connect(filt).connect(g).connect(master);
      src.start();
      src.stop(ctx.currentTime + 1.7);
    },
    // A bright ping when a ring is collected.
    ring() {
      if (!started || !ctx) return;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.setValueAtTime(1318, ctx.currentTime + 0.09);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.22, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      o.connect(g).connect(master);
      o.start();
      o.stop(ctx.currentTime + 0.4);
    },
  };
}
