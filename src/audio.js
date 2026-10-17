// FlockBuilder — audio.js
// AudioEngine: WebAudio-based sound. Synthesized SFX out of the box,
// named-sound registry, master volume and mute.
// Note: browsers require a user gesture before audio starts — the Game
// unlocks the context on the first pointer/key event automatically.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.sounds = new Map();

    // Built-in synthesized sounds
    this.define('blip', (a) => a.tone(440, 0.08, 'square', 0.25));
    this.define('jump', (a) => a.tone(300, 0.15, 'square', 0.3, 600));
    this.define('coin', (a) => {
      a.tone(880, 0.07, 'square', 0.25);
      setTimeout(() => a.tone(1320, 0.12, 'square', 0.25), 70);
    });
    this.define('hit', (a) => {
      a.noise(0.25, 0.5, 400);
      a.tone(160, 0.3, 'sawtooth', 0.35, 60);
    });
    this.define('powerup', (a) => a.tone(520, 0.25, 'triangle', 0.35, 1040));
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolume(v) {
    if (this.master) this.master.gain.value = v;
  }

  setMuted(m) {
    this.muted = m;
  }

  // Simple oscillator blip. slideTo (Hz) gives pitch sweeps.
  tone(freq, dur = 0.15, type = 'square', vol = 0.4, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // Filtered noise burst — explosions, hits, splashes.
  noise(dur = 0.2, vol = 0.4, filterFreq = 1000) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  define(name, fn) {
    this.sounds.set(name, fn);
    return this;
  }

  play(name) {
    const fn = this.sounds.get(name);
    if (fn) fn(this);
  }
}
