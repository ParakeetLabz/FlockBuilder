// FlockBuilder — camera.js
// Camera: pan, zoom, smooth follow, and screen shake.

import { Vector2, lerp, rand } from './utils.js';

export class Camera {
  constructor(w, h) {
    this.pos = new Vector2(0, 0); // world coords of the view's top-left
    this.w = w;
    this.h = h;
    this.zoom = 1;
    this.target = null;
    this.followLerp = 5;
    this._shakeTime = 0;
    this._shakeDur = 0;
    this._shakeMag = 0;
    this._shakeX = 0;
    this._shakeY = 0;
  }

  follow(target, lerpSpeed = 5) {
    this.target = target;
    this.followLerp = lerpSpeed;
    return this;
  }

  unfollow() {
    this.target = null;
    return this;
  }

  shake(mag, dur = 0.3) {
    this._shakeMag = mag;
    this._shakeTime = dur;
    this._shakeDur = dur;
    return this;
  }

  update(dt) {
    if (this.target) {
      const tx = this.target.cx - this.w / (2 * this.zoom);
      const ty = this.target.cy - this.h / (2 * this.zoom);
      const t = 1 - Math.exp(-this.followLerp * dt);
      this.pos.x = lerp(this.pos.x, tx, t);
      this.pos.y = lerp(this.pos.y, ty, t);
    }
    if (this._shakeTime > 0) {
      this._shakeTime -= dt;
      const k = Math.max(0, this._shakeTime / this._shakeDur);
      this._shakeX = rand(-1, 1) * this._shakeMag * k;
      this._shakeY = rand(-1, 1) * this._shakeMag * k;
      if (this._shakeTime <= 0) {
        this._shakeX = 0;
        this._shakeY = 0;
      }
    }
  }

  // Applies the view transform to a canvas context (call inside save/restore).
  apply(ctx) {
    ctx.translate(this.w / 2, this.h / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.w / 2, -this.h / 2);
    ctx.translate(-this.pos.x - this._shakeX, -this.pos.y - this._shakeY);
  }

  screenToWorld(sx, sy) {
    const wx = (sx - this.w / 2) / this.zoom + this.w / 2 + this.pos.x;
    const wy = (sy - this.h / 2) / this.zoom + this.h / 2 + this.pos.y;
    return { x: wx, y: wy };
  }
}
