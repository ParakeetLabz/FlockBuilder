// FlockBuilder — sprite.js
// Sprite: a drawable entity. Renders a colored rect, a circle, or an image
// (with optional spritesheet animation).

import { Entity } from './entity.js';

export class Sprite extends Entity {
  constructor(opts = {}) {
    super(opts);
    this.color = opts.color ?? '#22d3ee';
    this.shape = opts.shape ?? 'rect'; // 'rect' | 'circle' | 'image'
    this.image = null;
    // Spritesheet options
    this.frameW = opts.frameW ?? 0;
    this.frameH = opts.frameH ?? 0;
    this.frames = opts.frames ?? 1;
    this.frame = 0;
    this.animFps = opts.animFps ?? 0;
    this._animTimer = 0;
    if (opts.image) this.setImage(opts.image);
  }

  setImage(src) {
    const img = new Image();
    img.src = src;
    this.image = img;
    this.shape = 'image';
    return this;
  }

  update(dt, game) {
    super.update(dt, game);
    if (this.animFps > 0 && this.frames > 1) {
      this._animTimer += dt;
      const step = 1 / this.animFps;
      while (this._animTimer >= step) {
        this._animTimer -= step;
        this.frame = (this.frame + 1) % this.frames;
      }
    }
  }

  draw(ctx, game) {
    if (!this.visible) return;
    const w = this.size.x;
    const h = this.size.y;
    ctx.save();
    // Rotate around the center
    ctx.translate(this.pos.x + w / 2, this.pos.y + h / 2);
    ctx.rotate(this.rotation);
    ctx.translate(-w / 2, -h / 2);

    if (this.shape === 'circle') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'image' && this.image && this.image.complete && this.image.naturalWidth > 0) {
      if (this.frameW > 0 && this.frameH > 0) {
        const cols = Math.max(1, Math.floor(this.image.naturalWidth / this.frameW));
        const sx = (this.frame % cols) * this.frameW;
        const sy = Math.floor(this.frame / cols) * this.frameH;
        ctx.drawImage(this.image, sx, sy, this.frameW, this.frameH, 0, 0, w, h);
      } else {
        ctx.drawImage(this.image, 0, 0, w, h);
      }
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
    super.draw(ctx, game);
  }
}
