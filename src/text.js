// FlockBuilder — text.js
// Text: a simple canvas text entity for scores, labels, and HUDs.

import { Entity } from './entity.js';

export class Text extends Entity {
  constructor(text, opts = {}) {
    super({ x: opts.x ?? 0, y: opts.y ?? 0 });
    this.text = String(text);
    this.font = opts.font ?? '16px system-ui, sans-serif';
    this.color = opts.color ?? '#ffffff';
    this.align = opts.align ?? 'left'; // left | center | right
    this.outline = opts.outline ?? null; // stroke color for readability
  }

  draw(ctx, game) {
    if (!this.visible) return;
    ctx.save();
    ctx.font = this.font;
    ctx.fillStyle = this.color;
    ctx.textAlign = this.align;
    ctx.textBaseline = 'top';
    if (this.outline) {
      ctx.strokeStyle = this.outline;
      ctx.lineWidth = 4;
      ctx.strokeText(this.text, this.pos.x, this.pos.y);
    }
    ctx.fillText(this.text, this.pos.x, this.pos.y);
    ctx.restore();
    super.draw(ctx, game);
  }
}
