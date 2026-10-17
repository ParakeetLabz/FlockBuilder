// FlockBuilder — engine.js
// Game: owns the canvas, the fixed-timestep loop, input, camera, audio,
// particles, and the scene stack.

import { Input } from './input.js';
import { Camera } from './camera.js';
import { AudioEngine } from './audio.js';
import { ParticleSystem } from './particles.js';

export const VERSION = '0.1.0';

export class Game {
  constructor(opts = {}) {
    this.w = opts.width ?? 960;
    this.h = opts.height ?? 540;

    this.canvas = opts.canvas ?? null;
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      document.body.appendChild(this.canvas);
    }
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.ctx = this.canvas.getContext('2d');
    // Crisp pixels for pixel-art games
    this.ctx.imageSmoothingEnabled = opts.smoothing ?? true;

    this.input = new Input();
    this.input.attach(this.canvas);

    this.audio = new AudioEngine();
    this.particles = new ParticleSystem();
    this.camera = new Camera(this.w, this.h);

    this.scenes = [];
    this.running = false;
    this.time = 0;
    this.fps = 0;

    this.fixedStep = opts.fixedStep ?? 1 / 60;
    this._last = 0;
    this._acc = 0;
    this._fpsCount = 0;
    this._fpsTime = 0;

    // Browsers need a user gesture before audio can start.
    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    this._unlockAudio = unlock;
  }

  get scene() {
    return this.scenes.length > 0 ? this.scenes[this.scenes.length - 1] : null;
  }

  pushScene(scene) {
    this.scenes.push(scene);
    scene.onEnter();
    return scene;
  }

  popScene() {
    const s = this.scenes.pop();
    if (s) s.onExit();
    return s;
  }

  replaceScene(scene) {
    this.popScene();
    this.pushScene(scene);
    return scene;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    requestAnimationFrame((t) => this._frame(t));
  }

  stop() {
    this.running = false;
  }

  destroy() {
    this.stop();
    this.input.detach();
    window.removeEventListener('pointerdown', this._unlockAudio);
    window.removeEventListener('keydown', this._unlockAudio);
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.camera.w = w;
    this.camera.h = h;
  }

  _frame(now) {
    if (!this.running) return;
    requestAnimationFrame((t) => this._frame(t));

    let dt = (now - this._last) / 1000;
    this._last = now;
    dt = Math.min(dt, 0.1); // avoid spiral of death after tab switches

    this._fpsCount++;
    this._fpsTime += dt;
    if (this._fpsTime >= 0.5) {
      this.fps = Math.round(this._fpsCount / this._fpsTime);
      this._fpsCount = 0;
      this._fpsTime = 0;
    }

    this._acc += dt;
    const scene = this.scene;
    let guard = 0;
    while (this._acc >= this.fixedStep && guard < 8) {
      this.time += this.fixedStep;
      this.camera.update(this.fixedStep);
      if (scene) scene.update(this.fixedStep);
      this.particles.update(this.fixedStep);
      this._acc -= this.fixedStep;
      guard++;
    }
    if (guard >= 8) this._acc = 0;

    this.render();
    this.input.postUpdate();
  }

  render() {
    const ctx = this.ctx;
    const scene = this.scene;
    ctx.save();
    // Screen-space background
    ctx.fillStyle = scene ? scene.bg : '#000000';
    ctx.fillRect(0, 0, this.w, this.h);
    if (scene) {
      // World space
      this.camera.apply(ctx);
      scene.draw(ctx);
      this.particles.draw(ctx);
    }
    ctx.restore();
    // Screen-space UI (HUDs, menus)
    if (scene) {
      ctx.save();
      scene.drawUI(ctx);
      ctx.restore();
    }
  }
}
