// FlockBuilder — builder/game-objects.js
// Gameplay objects for the visual Game Builder. No DOM access here —
// pure engine classes, so this module is unit-testable in Node.

import {
  Scene,
  Sprite,
  Entity,
  applyGravity,
  moveAndCollide,
  overlaps,
  clamp,
  rand,
  TAU,
} from '../src/flock.js';

export const WORLD_W = 960;
export const WORLD_H = 540;

// Every object type the builder can place.
export const OBJECT_TYPES = [
  'player', 'wall', 'coin', 'enemy', 'goal',
  'platform', 'spikes', 'spring', 'key', 'door', 'sign', 'actor', 'label',
  'checkpoint', 'decor',
];

// ---------------------------------------------------------------- Decor --
// Pure decoration: flowers, grass, bushes, rocks, clouds, stars. No
// collision, no gameplay — just makes rooms feel alive.

export const DECOR_VARIANTS = ['flower', 'grass', 'bush', 'rock', 'cloud', 'star'];

export class Decor extends Entity {
  constructor(o = {}) {
    super({ x: o.x ?? 0, y: o.y ?? 0, w: o.w ?? 40, h: o.h ?? 40 });
    this.addTag('decor');
    this.variant = DECOR_VARIANTS.includes(o.variant) ? o.variant : 'flower';
    this.t = Math.random() * 10;
    this.seed = Math.random() * 1000;
  }

  update(dt, game) {
    this.t += dt;
    super.update(dt, game);
  }

  draw(ctx) {
    if (!this.visible) return;
    const x = this.pos.x;
    const y = this.pos.y;
    const w = this.size.x;
    const h = this.size.y;
    const cx = x + w / 2;
    ctx.save();
    if (this.variant === 'flower') {
      const sway = Math.sin(this.t * 2 + this.seed) * 2;
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, y + h);
      ctx.quadraticCurveTo(cx + sway, y + h * 0.5, cx + sway * 1.5, y + h * 0.25);
      ctx.stroke();
      const fx = cx + sway * 1.5;
      const fy = y + h * 0.22;
      const pr = Math.min(w, h) * 0.16;
      ctx.fillStyle = '#f9a8d4';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * pr * 1.4, fy + Math.sin(a) * pr * 1.4, pr, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(fx, fy, pr * 0.9, 0, TAU);
      ctx.fill();
    } else if (this.variant === 'grass') {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const blades = 5;
      for (let i = 0; i < blades; i++) {
        const bx = x + (i / (blades - 1)) * w;
        const sway = Math.sin(this.t * 2.5 + this.seed + i) * 3;
        const bh = h * (0.5 + ((i * 37 + this.seed) % 40) / 100);
        ctx.beginPath();
        ctx.moveTo(bx, y + h);
        ctx.quadraticCurveTo(bx + sway, y + h - bh * 0.6, bx + sway * 1.6, y + h - bh);
        ctx.stroke();
      }
    } else if (this.variant === 'bush') {
      ctx.fillStyle = '#16a34a';
      const r = Math.min(w, h) / 2.6;
      for (const [ox, oy, s] of [[-0.25, 0.1, 1], [0, -0.1, 1.25], [0.25, 0.1, 1]]) {
        ctx.beginPath();
        ctx.arc(cx + ox * w, y + h * 0.55 + oy * h, r * s, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(cx - w * 0.12, y + h * 0.42, r * 0.45, 0, TAU);
      ctx.fill();
    } else if (this.variant === 'rock') {
      ctx.fillStyle = '#78716c';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.1, y + h);
      ctx.lineTo(x + w * 0.25, y + h * 0.35);
      ctx.lineTo(x + w * 0.6, y + h * 0.15);
      ctx.lineTo(x + w * 0.9, y + h * 0.5);
      ctx.lineTo(x + w * 0.95, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#a8a29e';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.25, y + h * 0.35);
      ctx.lineTo(x + w * 0.6, y + h * 0.15);
      ctx.lineTo(x + w * 0.72, y + h * 0.45);
      ctx.lineTo(x + w * 0.4, y + h * 0.55);
      ctx.closePath();
      ctx.fill();
    } else if (this.variant === 'cloud') {
      const drift = Math.sin(this.t * 0.4 + this.seed) * 6;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      const r = h * 0.28;
      for (const [ox, oy, s] of [[-0.3, 0.1, 0.8], [0, -0.05, 1.1], [0.3, 0.1, 0.85]]) {
        ctx.beginPath();
        ctx.arc(cx + drift + ox * w, y + h * 0.5 + oy * h, r * s, 0, TAU);
        ctx.fill();
      }
    } else if (this.variant === 'star') {
      const tw = 0.5 + 0.5 * Math.sin(this.t * 3 + this.seed);
      ctx.fillStyle = `rgba(253,224,71,${0.35 + tw * 0.6})`;
      const r1 = Math.min(w, h) * 0.32;
      const r2 = r1 * 0.45;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? r1 : r2;
        const a = (i / 10) * TAU - Math.PI / 2;
        const px = cx + Math.cos(a) * r;
        const py = y + h / 2 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

export function validObj(o) {
  return (
    o &&
    typeof o === 'object' &&
    OBJECT_TYPES.includes(o.type) &&
    Number.isFinite(o.x) &&
    Number.isFinite(o.y) &&
    Number.isFinite(o.w) &&
    Number.isFinite(o.h)
  );
}

// Accepts every level format the builder has ever written and normalizes it
// to [{ name, objects }]. Returns null when there is nothing usable.
//   v0: bare array of objects (original autosave)
//   v1: { objects } (original export)
//   v2: { rooms: [{ name, objects }] }
export function normalizeRooms(data) {
  try {
    if (!data) return null;
    if (Array.isArray(data)) {
      const objects = data.filter(validObj);
      return objects.length > 0 ? [{ name: 'Room 1', objects }] : null;
    }
    if (Array.isArray(data.rooms)) {
      const rooms = data.rooms
        .map((r, i) => ({
          name: typeof r.name === 'string' && r.name ? r.name.slice(0, 24) : `Room ${i + 1}`,
          objects: Array.isArray(r.objects) ? r.objects.filter(validObj) : [],
        }))
        .filter((r) => r.objects.length > 0);
      return rooms.length > 0 ? rooms : null;
    }
    if (Array.isArray(data.objects)) {
      const objects = data.objects.filter(validObj);
      return objects.length > 0 ? [{ name: 'Room 1', objects }] : null;
    }
  } catch (e) {
    /* corrupted data — fall through to null */
  }
  return null;
}

// Rounded-rect path helper (with fallback for older canvas implementations).
export function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

// ---------------------------------------------------------------- Hero ----
// The player character: runs with arrows/AD, jumps with Space/W/Up.
// Rides moving platforms and bounces on springs.

export class Hero extends Sprite {
  constructor(o = {}) {
    super({
      x: o.x ?? 60,
      y: o.y ?? 60,
      w: o.w ?? 36,
      h: o.h ?? 46,
      color: o.color ?? '#22d3ee',
    });
    this.addTag('hero');
    this.grounded = false;
    this.groundRef = null;
    this.face = 1;
    this.walkT = 0;
    this.solids = [];
    this.speed = 340;
    this.jumpV = -740;
  }

  update(dt, game) {
    const input = game.input;
    const L = input.down('ArrowLeft') || input.down('KeyA');
    const R = input.down('ArrowRight') || input.down('KeyD');
    this.vel.x = (R ? this.speed : 0) - (L ? this.speed : 0);
    if (this.vel.x !== 0) {
      this.face = Math.sign(this.vel.x);
      this.walkT += dt;
    }
    const jump =
      input.pressed('Space') || input.pressed('ArrowUp') || input.pressed('KeyW');
    if (jump && this.grounded) {
      this.vel.y = this.jumpV;
      this.grounded = false;
      game.audio.play('jump');
    }
    applyGravity(this, 2200, dt);
    const hits = moveAndCollide(this, this.solids, dt);
    this.grounded = hits.y === 1;
    this.groundRef = this.grounded ? this.groundRef : null;
    // Ride moving platforms
    if (this.grounded && this.groundRef && this.groundRef.isPlatform) {
      this.pos.x += this.groundRef.dx || 0;
      this.pos.y += this.groundRef.dy || 0;
    }
    // Keep inside the world horizontally
    this.pos.x = clamp(this.pos.x, 0, WORLD_W - this.size.x);
    super.update(dt, game);
  }

  draw(ctx) {
    if (!this.visible) return;
    const x = this.pos.x;
    const y = this.pos.y;
    const w = this.size.x;
    const h = this.size.y;
    ctx.save();
    // Body
    ctx.fillStyle = this.color;
    rr(ctx, x, y, w, h, 10);
    ctx.fill();
    // Belly
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    rr(ctx, x + 6, y + h * 0.55, w - 12, h * 0.3, 6);
    ctx.fill();
    // Eye (looks toward movement direction)
    const ex = x + w / 2 + this.face * w * 0.16;
    const ey = y + h * 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, w * 0.16, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(ex + this.face * w * 0.06, ey, w * 0.075, 0, TAU);
    ctx.fill();
    // Feet
    ctx.fillStyle = '#0f172a';
    const lift = this.grounded ? 0 : 4;
    ctx.fillRect(x + 6, y + h - 4 + lift, 10, 4);
    ctx.fillRect(x + w - 16, y + h - 4 + lift, 10, 4);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Enemy ---
// Patrols back and forth. Touching it defeats the player.

export class Enemy extends Sprite {
  constructor(o = {}) {
    super({
      x: o.x ?? 0,
      y: o.y ?? 0,
      w: o.w ?? 38,
      h: o.h ?? 38,
      color: o.color ?? '#ef4444',
    });
    this.addTag('enemy');
    this.originX = o.x ?? 0;
    this.range = o.range ?? 160;
    this.speed = o.speed ?? 130;
    this.dir = 1;
    this.hp = o.hp ?? 1;
    this.maxHp = this.hp;
    this.flash = 0;
  }

  update(dt) {
    if (this.flash > 0) this.flash -= dt;
    this.pos.x += this.dir * this.speed * dt;
    if (this.pos.x >= this.originX + this.range) {
      this.pos.x = this.originX + this.range;
      this.dir = -1;
    } else if (this.pos.x <= this.originX) {
      this.pos.x = this.originX;
      this.dir = 1;
    }
    super.update(dt);
  }

  draw(ctx) {
    if (!this.visible) return;
    const x = this.pos.x;
    const y = this.pos.y;
    const w = this.size.x;
    const h = this.size.y;
    ctx.save();
    // Spikes
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 3; i++) {
      const sx = x + 5 + (i * (w - 10)) / 2;
      ctx.beginPath();
      ctx.moveTo(sx, y + 2);
      ctx.lineTo(sx + 7, y - 7);
      ctx.lineTo(sx + 14, y + 2);
      ctx.closePath();
      ctx.fill();
    }
    // Body
    ctx.fillStyle = this.color;
    rr(ctx, x, y, w, h, 9);
    ctx.fill();
    // Angry eyes track patrol direction
    for (const s of [-1, 1]) {
      const ex = x + w / 2 + s * w * 0.18 + this.dir * 3;
      const ey = y + h * 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, w * 0.13, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(ex + this.dir * 2, ey + 1, w * 0.06, 0, TAU);
      ctx.fill();
    }
    // Angry brows
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.18, y + h * 0.16);
    ctx.lineTo(x + w * 0.42, y + h * 0.27);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.82, y + h * 0.16);
    ctx.lineTo(x + w * 0.58, y + h * 0.27);
    ctx.stroke();
    // Hit flash
    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(1, this.flash * 6);
      ctx.fillStyle = '#ffffff';
      rr(ctx, x, y, w, h, 9);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // HP pips for tough enemies (bosses)
    if (this.maxHp > 1) {
      for (let i = 0; i < this.maxHp; i++) {
        ctx.fillStyle = i < this.hp ? '#fca5a5' : 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(x + 8 + (i * (w - 16)) / (this.maxHp - 1), y - 8, 4, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

// ------------------------------------------------------- MovingPlatform ---
// Solid platform gliding on a smooth ping-pong path. Carries the player.

export class MovingPlatform extends Sprite {
  constructor(o = {}) {
    super({
      x: o.x ?? 0,
      y: o.y ?? 0,
      w: o.w ?? 120,
      h: o.h ?? 24,
      color: o.color ?? '#8b5cf6',
    });
    this.addTag('platform');
    this.solid = true;
    this.isPlatform = true;
    this.originX = o.x ?? 0;
    this.originY = o.y ?? 0;
    this.range = o.range ?? 200;
    this.speed = o.speed ?? 100;
    this.axis = o.axis === 'y' ? 'y' : 'x';
    this.t = Math.random();
    this.dx = 0;
    this.dy = 0;
  }

  update(dt) {
    const px = this.pos.x;
    const py = this.pos.y;
    this.t += (dt * this.speed) / Math.max(1, this.range);
    const k = (Math.sin(this.t * Math.PI * 2 - Math.PI / 2) + 1) / 2; // 0..1
    if (this.axis === 'x') this.pos.x = this.originX + k * this.range;
    else this.pos.y = this.originY + k * this.range;
    this.dx = this.pos.x - px;
    this.dy = this.pos.y - py;
    super.update(dt);
  }

  draw(ctx) {
    if (!this.visible) return;
    const x = this.pos.x;
    const y = this.pos.y;
    const w = this.size.x;
    const h = this.size.y;
    ctx.save();
    ctx.fillStyle = this.color;
    rr(ctx, x, y, w, h, 8);
    ctx.fill();
    // Direction arrows
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `bold ${Math.min(16, h)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.axis === 'x' ? '⇔' : '⇕', x + w / 2, y + h / 2 + 1);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Spikes --
// Static hazard. Touching them defeats the player.

export class Spikes extends Entity {
  constructor(o = {}) {
    super({ x: o.x ?? 0, y: o.y ?? 0, w: o.w ?? 60, h: o.h ?? 24 });
    this.addTag('spikes');
    this.color = o.color ?? '#f97316';
  }

  draw(ctx) {
    if (!this.visible) return;
    const x = this.pos.x;
    const y = this.pos.y;
    const w = this.size.x;
    const h = this.size.y;
    const n = Math.max(2, Math.round(w / 20));
    const sw = w / n;
    ctx.save();
    ctx.fillStyle = this.color;
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * sw, y + h);
      ctx.lineTo(x + i * sw + sw / 2, y);
      ctx.lineTo(x + (i + 1) * sw, y + h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x, y + h - 5, w, 5);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Spring --
// Bounce pad: launches the player upward on contact.

export class Spring extends Entity {
  constructor(o = {}) {
    super({ x: o.x ?? 0, y: o.y ?? 0, w: o.w ?? 44, h: o.h ?? 28 });
    this.addTag('spring');
    this.color = o.color ?? '#a3e635';
    this.power = o.power ?? 1100;
    this.squish = 0;
  }

  bounce() {
    this.squish = 1;
  }

  update(dt) {
    this.squish = Math.max(0, this.squish - dt * 5);
    super.update(dt);
  }

  draw(ctx) {
    if (!this.visible) return;
    const x = this.pos.x;
    const y = this.pos.y;
    const w = this.size.x;
    const h = this.size.y;
    const s = 1 - this.squish * 0.45;
    ctx.save();
    // Base
    ctx.fillStyle = '#4d7c0f';
    rr(ctx, x, y + h - 8, w, 8, 3);
    ctx.fill();
    // Coil
    ctx.strokeStyle = '#65a30d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const coils = 3;
    const top = y + 4 + (h - 12) * (1 - s);
    for (let i = 0; i <= coils * 2; i++) {
      const yy = y + h - 8 - ((h - 12) * s * i) / (coils * 2);
      const xx = x + w / 2 + (i % 2 === 0 ? -w * 0.28 : w * 0.28);
      if (i === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    // Pad
    ctx.fillStyle = this.color;
    rr(ctx, x + 2, top - 4, w - 4, 10, 4);
    ctx.fill();
    ctx.restore();
  }
}

// ------------------------------------------------------------------ Key ---
// Collect it to open every door in the room.

export class Key extends Entity {
  constructor(o = {}) {
    super({ x: o.x ?? 0, y: o.y ?? 0, w: o.w ?? 26, h: o.h ?? 30 });
    this.addTag('key');
    this.color = o.color ?? '#fbbf24';
    this.t = rand(0, 6);
  }

  update(dt) {
    this.t += dt;
    super.update(dt);
  }

  draw(ctx) {
    if (!this.visible) return;
    const w = this.size.x;
    const h = this.size.y;
    const bob = Math.sin(this.t * 3) * 3;
    ctx.save();
    ctx.translate(this.pos.x + w / 2, this.pos.y + h / 2 + bob);
    ctx.fillStyle = this.color;
    // Bow
    ctx.beginPath();
    ctx.arc(-4, -6, 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0b1020';
    ctx.beginPath();
    ctx.arc(-4, -6, 3, 0, TAU);
    ctx.fill();
    // Shaft + teeth
    ctx.fillStyle = this.color;
    ctx.fillRect(-1, -2, 5, 16);
    ctx.fillRect(-1, 8, 9, 4);
    ctx.fillRect(-1, 13, 7, 4);
    ctx.restore();
  }
}

// ----------------------------------------------------------------- Door ---
// Solid until a key is collected, then it opens.

export class Door extends Sprite {
  constructor(o = {}) {
    super({
      x: o.x ?? 0,
      y: o.y ?? 0,
      w: o.w ?? 44,
      h: o.h ?? 76,
      color: o.color ?? '#b45309',
    });
    this.addTag('door');
    this.solid = true;
    this.isDoor = true;
  }

  open() {
    this.active = false;
    this.visible = false;
  }

  draw(ctx) {
    if (!this.visible) return;
    const x = this.pos.x;
    const y = this.pos.y;
    const w = this.size.x;
    const h = this.size.y;
    ctx.save();
    ctx.fillStyle = this.color;
    rr(ctx, x, y, w, h, 6);
    ctx.fill();
    // Planks
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 4, y + (h * i) / 4);
      ctx.lineTo(x + w - 4, y + (h * i) / 4);
      ctx.stroke();
    }
    // Keyhole
    ctx.fillStyle = '#0b1020';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.45, 5, 0, TAU);
    ctx.fill();
    ctx.fillRect(x + w / 2 - 2, y + h * 0.45, 4, 10);
    ctx.restore();
  }
}

// ----------------------------------------------------------------- Sign ---
// Shows a message dialog when the player touches it.

export class Sign extends Entity {
  constructor(o = {}) {
    super({ x: o.x ?? 0, y: o.y ?? 0, w: o.w ?? 34, h: o.h ?? 44 });
    this.addTag('sign');
    this.color = o.color ?? '#d6a35c';
    this.message = o.message ?? 'Hello!';
  }

  draw(ctx) {
    if (!this.visible) return;
    const x = this.pos.x;
    const y = this.pos.y;
    const w = this.size.x;
    const h = this.size.y;
    ctx.save();
    // Post
    ctx.fillStyle = '#8a6a3b';
    ctx.fillRect(x + w / 2 - 3, y + h * 0.4, 6, h * 0.6);
    // Board
    ctx.fillStyle = this.color;
    rr(ctx, x, y, w, h * 0.55, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.font = `bold ${Math.min(18, h * 0.32)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', x + w / 2, y + h * 0.28);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Coin ----

export class Coin extends Entity {
  constructor(o = {}) {
    super({ x: o.x ?? 0, y: o.y ?? 0, w: o.w ?? 26, h: o.h ?? 26 });
    this.addTag('coin');
    this.color = o.color ?? '#fde047';
    this.t = rand(0, 6);
  }

  update(dt) {
    this.t += dt;
    super.update(dt);
  }

  draw(ctx) {
    if (!this.visible) return;
    const w = this.size.x;
    const h = this.size.y;
    const squash = 0.35 + 0.65 * Math.abs(Math.cos(this.t * 4));
    ctx.save();
    ctx.translate(this.pos.x + w / 2, this.pos.y + h / 2);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, (w / 2) * squash, h / 2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse((-w / 2) * squash * 0.3, -h * 0.18, w * 0.1 * squash, h * 0.14, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Goal ----
// Reaching the flag advances to the next room, or wins the game.

export class Goal extends Entity {
  constructor(o = {}) {
    super({ x: o.x ?? 0, y: o.y ?? 0, w: o.w ?? 54, h: o.h ?? 70 });
    this.addTag('goal');
    this.color = o.color ?? '#22c55e';
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    super.update(dt);
  }

  draw(ctx) {
    if (!this.visible) return;
    const x = this.pos.x;
    const y = this.pos.y;
    const w = this.size.x;
    const h = this.size.y;
    ctx.save();
    // Pole + base
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x + w / 2 - 3, y, 6, h);
    ctx.fillStyle = '#64748b';
    rr(ctx, x + w / 2 - 13, y + h - 8, 26, 8, 3);
    ctx.fill();
    // Waving flag
    const wave = Math.sin(this.t * 6) * 4;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 + 3, y + 4);
    ctx.quadraticCurveTo(x + w / 2 + w * 0.45, y + 8 + wave, x + w - 4, y + 16 + wave);
    ctx.lineTo(x + w / 2 + 3, y + 30);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Actor ---
// The GameMaker-style object: a blank slate driven entirely by visual rules.
// A rule is { trigger, ...triggerParams, action, ...actionParams }:
//
//   triggers: 'start' | 'touch' (player) | 'key' | 'timer' | 'destroyed'
//   actions:  'move' | 'jump' | 'destroy' | 'score' | 'sound' | 'win' |
//             'lose' | 'message' | 'teleport' | 'spawn'

export class Actor extends Sprite {
  constructor(o = {}) {
    super({
      x: o.x ?? 0,
      y: o.y ?? 0,
      w: o.w ?? 40,
      h: o.h ?? 40,
      color: o.color ?? '#38bdf8',
    });
    this.addTag('actor');
    this.hasGravity = o.gravity !== false;
    this.solid = !!o.solid;
    this.rules = Array.isArray(o.rules) ? o.rules : [];
    this.timers = this.rules.map(() => 0);
    this.firedStart = false;
    this._destroying = false;
    this.solids = [];
    this.grounded = false;
    // Custom sprite image (data URL), uploaded in the builder.
    this.imageSrc = o.image || null;
    this._img = this.imageSrc ? Actor.imageFor(this.imageSrc) : null;
  }

  // Shared cache so one upload doesn't create an Image per actor.
  static _imageCache = new Map();
  static imageFor(src) {
    let img = Actor._imageCache.get(src);
    if (!img && typeof Image !== 'undefined') {
      img = new Image();
      img.src = src;
      Actor._imageCache.set(src, img);
    }
    return img || null;
  }

  update(dt, game) {
    const scene = game.scene;
    for (let i = 0; i < this.rules.length; i++) {
      const rule = this.rules[i];
      if (this.checkTrigger(rule, i, dt, game, scene)) {
        this.doAction(rule, game, scene);
        if (!this.active) break; // destroyed mid-update
      }
    }
    if (this.active && this.hasGravity) applyGravity(this, 2200, dt);
    if (this.active) {
      const hits = moveAndCollide(this, this.solids, dt);
      this.grounded = hits.y === 1;
    }
    super.update(dt, game);
  }

  checkTrigger(rule, i, dt, game, scene) {
    switch (rule.trigger) {
      case 'start':
        if (!this.firedStart) {
          this.firedStart = true;
          return true;
        }
        return false;
      case 'touch':
        return !!scene.player && overlaps(this, scene.player);
      case 'key':
        return game.input.pressed(rule.key || 'Space');
      case 'timer':
        this.timers[i] += dt;
        if (this.timers[i] >= (rule.seconds || 1)) {
          this.timers[i] = 0;
          return true;
        }
        return false;
      case 'score': {
        // Fires once when the score first reaches the threshold
        this._scoreFlags = this._scoreFlags || {};
        if (!this._scoreFlags[i] && scene.score >= (rule.score || 1)) {
          this._scoreFlags[i] = true;
          return true;
        }
        return false;
      }
      case 'cleared': {
        // Fires once when every enemy in the room is beaten
        this._clearedFlag = this._clearedFlag || {};
        if (!this._clearedFlag[i] && scene.enemies.length > 0 && scene.enemies.every((e) => !e.active)) {
          this._clearedFlag[i] = true;
          return true;
        }
        return false;
      }
      default:
        return false;
    }
  }

  doAction(rule, game, scene) {
    const p = scene.player;
    switch (rule.action) {
      case 'move': {
        const sp = rule.speed ?? 200;
        const d = rule.direction || 'right';
        if (d === 'left') this.vel.x = -sp;
        else if (d === 'right') this.vel.x = sp;
        else if (d === 'up') this.vel.y = -sp;
        else if (d === 'down') this.vel.y = sp;
        else if ((d === 'toward' || d === 'away') && p) {
          const dx = p.cx - this.cx;
          const dy = p.cy - this.cy;
          const l = Math.hypot(dx, dy) || 1;
          const s = d === 'toward' ? 1 : -1;
          this.vel.x = (dx / l) * sp * s;
          this.vel.y = (dy / l) * sp * s;
        }
        break;
      }
      case 'jump':
        this.vel.y = -(rule.power ?? 600);
        this.grounded = false;
        break;
      case 'destroy': {
        if (this._destroying) break;
        this._destroying = true;
        for (const r of this.rules) {
          if (r.trigger === 'destroyed') this.doAction(r, game, scene);
        }
        this.active = false;
        this.visible = false;
        break;
      }
      case 'score':
        scene.score += rule.amount ?? 1;
        break;
      case 'sound':
        game.audio.play(rule.sound || 'blip');
        break;
      case 'win':
        scene.winGame();
        break;
      case 'lose':
        scene.lose();
        break;
      case 'message':
        scene.message = rule.text || '';
        scene.messageT = 3;
        break;
      case 'teleport':
        this.pos.x = rule.tx ?? 0;
        this.pos.y = rule.ty ?? 0;
        this.vel.set(0, 0);
        break;
      case 'spawn':
        scene.spawnObject(rule.spawn || 'coin', this.cx, this.cy);
        break;
      case 'fx':
        scene.emitEffect(rule.fx || '', this.cx, this.cy);
        break;
      case 'shoot': {
        const sp = rule.speed ?? 500;
        const d = rule.direction || 'right';
        let vx = 0;
        let vy = 0;
        let ox = 0;
        let oy = 0;
        if (d === 'left') {
          vx = -sp;
          ox = -this.size.x / 2 - 8;
        } else if (d === 'right') {
          vx = sp;
          ox = this.size.x / 2 + 8;
        } else if (d === 'up') {
          vy = -sp;
          oy = -this.size.y / 2 - 8;
        } else if (d === 'down') {
          vy = sp;
          oy = this.size.y / 2 + 8;
        } else if ((d === 'toward' || d === 'away') && p) {
          const dx = p.cx - this.cx;
          const dy = p.cy - this.cy;
          const l = Math.hypot(dx, dy) || 1;
          const s = d === 'toward' ? 1 : -1;
          vx = (dx / l) * sp * s;
          vy = (dy / l) * sp * s;
          ox = (dx / l) * (this.size.x / 2 + 8) * s;
          oy = (dy / l) * (this.size.y / 2 + 8) * s;
        }
        scene.spawnBullet(this.cx + ox, this.cy + oy, vx, vy);
        game.audio.play('blip');
        break;
      }
      default:
        break;
    }
  }

  draw(ctx) {
    if (!this.visible) return;
    const x = this.pos.x;
    const y = this.pos.y;
    const w = this.size.x;
    const h = this.size.y;
    ctx.save();
    const img = this._img;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x, y, w, h);
    } else {
      // Body
      ctx.fillStyle = this.color;
      rr(ctx, x, y, w, h, 10);
      ctx.fill();
      // Gear badge = "this one runs on rules"
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `bold ${Math.min(18, h * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚙', x + w / 2, y + h / 2 + 1);
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Bullet --
// A projectile fired by the 'shoot' action. Kills enemies, pops on walls,
// and hurts the player (after a short grace period so you can't hit yourself).

export class Bullet extends Entity {
  constructor(x, y, vx, vy) {
    super({ x: x - 6, y: y - 6, w: 12, h: 12 });
    this.addTag('bullet');
    this.vel.set(vx, vy);
    this.age = 0;
    this.life = 3;
    this.t = 0;
  }

  update(dt, game) {
    this.age += dt;
    this.t += dt;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    if (this.age >= this.life) {
      this.active = false;
      this.visible = false;
    }
    super.update(dt, game);
  }

  draw(ctx) {
    if (!this.visible) return;
    const pulse = 1 + Math.sin(this.t * 20) * 0.15;
    ctx.save();
    ctx.fillStyle = '#fde047';
    if (typeof ctx.shadowBlur === 'number') {
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, 6 * pulse, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

// ------------------------------------------------------------ Checkpoint --
// Touch it to set your respawn point. Dying respawns you here instead of
// restarting the room, with a couple seconds of mercy invulnerability.

export class Checkpoint extends Entity {
  constructor(o = {}) {
    super({ x: o.x ?? 0, y: o.y ?? 0, w: o.w ?? 40, h: o.h ?? 64 });
    this.addTag('checkpoint');
    this.color = o.color ?? '#a78bfa';
    this.activated = false;
    this.t = 0;
  }

  update(dt, game) {
    this.t += dt;
    super.update(dt, game);
  }

  draw(ctx) {
    if (!this.visible) return;
    const x = this.pos.x;
    const y = this.pos.y;
    const w = this.size.x;
    const h = this.size.y;
    ctx.save();
    // Pole + base
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x + w / 2 - 3, y, 6, h);
    ctx.fillStyle = '#64748b';
    rr(ctx, x + w / 2 - 12, y + h - 8, 24, 8, 3);
    ctx.fill();
    // Flag: gray until activated, then green and waving
    const wave = this.activated ? Math.sin(this.t * 6) * 4 : 0;
    ctx.fillStyle = this.activated ? '#4ade80' : '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(x + w / 2 + 3, y + 4);
    ctx.quadraticCurveTo(x + w / 2 + w * 0.4, y + 8 + wave, x + w - 2, y + 15 + wave);
    ctx.lineTo(x + w / 2 + 3, y + 28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ------------------------------------------------- PLL (Parakeet Labz Language)
// FlockBuilder's own scripting language: a tiny line-based language that
// compiles 1:1 to the visual rules engine. "PLL Visual" (the WHEN/THEN
// dropdown editor) and PLL text are two views of the same rules.
//
//   when start then say "Go!"
//   when touch player then score 5
//   when touch player then destroy self
//   when destroyed then sound coin
//   when timer 1.6 then jump 750
//   when key E then move right 200
//   when key Space then teleport 700 100
//   when timer 0.5 then spawn enemy
//   when destroyed then fx poof

const PLL_DIRS = ['left', 'right', 'up', 'down', 'toward', 'away'];
const PLL_SPAWNS = ['coin', 'enemy'];

function pllKeyToCode(word) {
  if (/^[a-z]$/i.test(word)) return 'Key' + word.toUpperCase();
  const w = word.toLowerCase();
  if (w === 'space') return 'Space';
  if (w === 'up') return 'ArrowUp';
  if (w === 'down') return 'ArrowDown';
  if (w === 'left') return 'ArrowLeft';
  if (w === 'right') return 'ArrowRight';
  return word; // assume a raw KeyboardEvent.code like ShiftLeft
}

function pllCodeToKey(code) {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  const m = { Space: 'Space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' };
  return m[code] || code;
}

function pllParseTrigger(src, lineNo, errors) {
  const parts = src.trim().split(/\s+/);
  const head = (parts[0] || '').toLowerCase();
  if (head === 'start' && parts.length === 1) return { trigger: 'start' };
  if (head === 'touch' && parts.length === 2 && parts[1].toLowerCase() === 'player') {
    return { trigger: 'touch' };
  }
  if (head === 'destroyed' && parts.length === 1) return { trigger: 'destroyed' };
  if (head === 'key' && parts.length === 2) {
    return { trigger: 'key', key: pllKeyToCode(parts[1]) };
  }
  if (head === 'timer' && parts.length === 2) {
    const seconds = parseFloat(parts[1]);
    if (!(seconds > 0)) {
      errors.push({ line: lineNo, message: `timer needs seconds > 0, got "${parts[1]}"` });
      return null;
    }
    return { trigger: 'timer', seconds };
  }
  if (head === 'cleared' && parts.length === 1) {
    return { trigger: 'cleared' };
  }
  if (head === 'score' && parts.length === 2) {
    const at = parseInt(parts[1], 10);
    if (!Number.isFinite(at) || at < 1) {
      errors.push({ line: lineNo, message: `score needs a whole number 1 or more, got "${parts[1]}"` });
      return null;
    }
    return { trigger: 'score', score: at };
  }
  errors.push({
    line: lineNo,
    message: `unknown trigger "${src}" — try: start, touch player, destroyed, key E, timer 1.5, score 10, cleared`,
  });
  return null;
}

function pllParseAction(src, lineNo, errors) {
  const m = src.trim().match(/^([a-z]+)\b\s*(.*)$/i);
  if (!m) {
    errors.push({ line: lineNo, message: `unknown action "${src}"` });
    return null;
  }
  const head = m[1].toLowerCase();
  const rest = m[2].trim();
  const num = (s, what) => {
    const v = parseFloat(s);
    if (!Number.isFinite(v)) {
      errors.push({ line: lineNo, message: `${what} needs a number, got "${s}"` });
      return null;
    }
    return v;
  };
  switch (head) {
    case 'say': {
      if (!rest) {
        errors.push({ line: lineNo, message: 'say needs a message, e.g. say "Hi!"' });
        return null;
      }
      const q = rest.match(/^"(.*)"$/);
      return { action: 'message', text: q ? q[1] : rest };
    }
    case 'score': {
      const amount = num(rest, 'score');
      return amount === null ? null : { action: 'score', amount: Math.round(amount) };
    }
    case 'destroy':
      if (rest.toLowerCase() !== 'self') {
        errors.push({ line: lineNo, message: 'did you mean "destroy self"?' });
        return null;
      }
      return { action: 'destroy' };
    case 'jump': {
      const power = num(rest, 'jump');
      return power === null ? null : { action: 'jump', power };
    }
    case 'move': {
      const p = rest.split(/\s+/);
      const dir = (p[0] || '').toLowerCase();
      if (!PLL_DIRS.includes(dir)) {
        errors.push({ line: lineNo, message: `move needs a direction (${PLL_DIRS.join('/')}), got "${p[0] || ''}"` });
        return null;
      }
      const speed = num(p[1] || '', 'move');
      return speed === null ? null : { action: 'move', direction: dir, speed };
    }
    case 'sound':
      if (!rest) {
        errors.push({ line: lineNo, message: 'sound needs a name, e.g. sound coin' });
        return null;
      }
      return { action: 'sound', sound: rest.split(/\s+/)[0].toLowerCase() };
    case 'win':
      return { action: 'win' };
    case 'lose':
      return { action: 'lose' };
    case 'teleport': {
      const p = rest.split(/\s+/);
      const tx = num(p[0] || '', 'teleport x');
      const ty = num(p[1] || '', 'teleport y');
      return tx === null || ty === null ? null : { action: 'teleport', tx, ty };
    }
    case 'spawn': {
      const kind = rest.toLowerCase().split(/\s+/)[0];
      if (!PLL_SPAWNS.includes(kind)) {
        errors.push({ line: lineNo, message: `spawn needs ${PLL_SPAWNS.join('/')} , got "${rest}"` });
        return null;
      }
      return { action: 'spawn', spawn: kind };
    }
    case 'fx':
      if (!rest) {
        errors.push({ line: lineNo, message: 'fx needs an effect name, e.g. fx poof' });
        return null;
      }
      return { action: 'fx', fx: rest.split(/\s+/)[0] };
    case 'shoot': {
      const p = rest.split(/\s+/);
      const dir = (p[0] || '').toLowerCase();
      if (!PLL_DIRS.includes(dir)) {
        errors.push({ line: lineNo, message: `shoot needs a direction (${PLL_DIRS.join('/')}), got "${p[0] || ''}"` });
        return null;
      }
      const speed = num(p[1] || '', 'shoot');
      return speed === null ? null : { action: 'shoot', direction: dir, speed };
    }
    default:
      errors.push({
        line: lineNo,
        message: `unknown action "${head}" — try: say, score, destroy self, jump, move, shoot, sound, win, lose, teleport, spawn, fx`,
      });
      return null;
  }
}

// Parses PLL source into { rules, errors }. errors is [{ line, message }].
export function parsePLL(text) {
  const rules = [];
  const errors = [];
  String(text || '')
    .split('\n')
    .forEach((raw, idx) => {
      const lineNo = idx + 1;
      const line = raw.replace(/#.*$/, '').trim();
      if (!line) return;
      const m = line.match(/^when\s+(.+?)\s+then\s+(.+)$/i);
      if (!m) {
        errors.push({ line: lineNo, message: 'each rule looks like: when <trigger> then <action>' });
        return;
      }
      const t = pllParseTrigger(m[1], lineNo, errors);
      if (!t) return;
      const a = pllParseAction(m[2], lineNo, errors);
      if (!a) return;
      rules.push({ ...t, ...a });
    });
  return { rules, errors };
}

// Serializes rules back to PLL text.
export function rulesToPLL(rules) {
  return (rules || [])
    .map((r) => {
      let t = '';
      switch (r.trigger) {
        case 'start':
          t = 'when start';
          break;
        case 'touch':
          t = 'when touch player';
          break;
        case 'destroyed':
          t = 'when destroyed';
          break;
        case 'key':
          t = `when key ${pllCodeToKey(r.key || 'Space')}`;
          break;
        case 'timer':
          t = `when timer ${r.seconds ?? 2}`;
          break;
        case 'score':
          t = `when score ${r.score ?? 5}`;
          break;
        case 'cleared':
          t = 'when cleared';
          break;
        default:
          t = 'when start';
      }
      let a = '';
      switch (r.action) {
        case 'message':
          a = `say "${r.text || ''}"`;
          break;
        case 'score':
          a = `score ${r.amount ?? 1}`;
          break;
        case 'destroy':
          a = 'destroy self';
          break;
        case 'jump':
          a = `jump ${r.power ?? 600}`;
          break;
        case 'move':
          a = `move ${r.direction || 'right'} ${r.speed ?? 200}`;
          break;
        case 'sound':
          a = `sound ${r.sound || 'blip'}`;
          break;
        case 'win':
          a = 'win';
          break;
        case 'lose':
          a = 'lose';
          break;
        case 'teleport':
          a = `teleport ${r.tx ?? 0} ${r.ty ?? 0}`;
          break;
        case 'spawn':
          a = `spawn ${r.spawn || 'coin'}`;
          break;
        case 'fx':
          a = `fx ${r.fx || ''}`;
          break;
        case 'shoot':
          a = `shoot ${r.direction || 'right'} ${r.speed ?? 500}`;
          break;
        default:
          a = 'say "?"';
      }
      return `${t} then ${a}`;
    })
    .join('\n');
}

// ---------------------------------------------------------------- Cloud ---

export class Cloud extends Entity {
  constructor(x, y, s = 1) {
    super({ x, y, w: 90 * s, h: 32 * s });
    this.speed = 14;
  }

  update(dt) {
    this.pos.x -= this.speed * dt;
    if (this.pos.x + this.w < -20) this.pos.x = WORLD_W + 20;
    super.update(dt);
  }

  draw(ctx) {
    const w = this.w;
    const h = this.h;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.ellipse(this.pos.x + w * 0.3, this.pos.y + h * 0.6, w * 0.3, h * 0.42, 0, 0, TAU);
    ctx.ellipse(this.pos.x + w * 0.55, this.pos.y + h * 0.45, w * 0.28, h * 0.5, 0, 0, TAU);
    ctx.ellipse(this.pos.x + w * 0.75, this.pos.y + h * 0.62, w * 0.22, h * 0.36, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

// ------------------------------------------------------------- PlayScene --
// Turns builder level data (plain objects) into a playable game.
// Supports multiple rooms: the goal flag advances to the next room.

export class PlayScene extends Scene {
  constructor(game, rooms, startIndex = 0, effects = {}) {
    super(game);
    this.rooms = rooms;
    this.roomIndex = startIndex;
    const room = rooms[startIndex] || {};
    this.theme = room.theme || 'day';
    const THEME_BG = { day: '#7dd3fc', sunset: '#fb923c', night: '#0f172a', cave: '#1c1917' };
    this.bg = THEME_BG[this.theme] || THEME_BG.day;
    this.effects = effects || {};
    this.debug = false;
    this.time = 0;
    this.fadeT = 1; // fade in from black on room enter
    this.bannerT = 2.2; // "Room N" intro banner
    this.roomName = room.name || `Room ${startIndex + 1}`;
    this.state = 'play'; // play | win | dead
    this.score = 0;
    this.hasKey = false;
    this.message = null;
    this.messageT = 0;
    this.solids = [];
    this.coins = [];
    this.enemies = [];
    this.spikes = [];
    this.springs = [];
    this.doors = [];
    this.signs = [];
    this.actors = [];
    this.labels = [];
    this.bullets = [];
    this.checkpoints = [];
    this.spawnPoint = null; // set by checkpoints; lose() respawns here
    this.invulnT = 0; // mercy invulnerability after a checkpoint respawn
    this.goal = null;
    this.onRestart = null; // replay this room
    this.onAdvance = null; // go to next room
    this.onStop = null; // back to editor

    const objects = rooms[startIndex] ? rooms[startIndex].objects : [];
    let playerData = null;
    for (const o of objects) {
      switch (o.type) {
        case 'wall': {
          const s = new Sprite({ x: o.x, y: o.y, w: o.w, h: o.h, color: o.color || '#475569' });
          s.solid = true;
          this.add(s);
          this.solids.push(s);
          break;
        }
        case 'platform': {
          const p = new MovingPlatform(o);
          this.add(p);
          this.solids.push(p);
          break;
        }
        case 'coin':
          this.coins.push(this.add(new Coin(o)));
          break;
        case 'enemy':
          this.enemies.push(this.add(new Enemy(o)));
          break;
        case 'spikes':
          this.spikes.push(this.add(new Spikes(o)));
          break;
        case 'spring':
          this.springs.push(this.add(new Spring(o)));
          break;
        case 'key':
          this.keys = this.keys || [];
          this.keys.push(this.add(new Key(o)));
          break;
        case 'door': {
          const d = new Door(o);
          this.add(d);
          this.doors.push(d);
          this.solids.push(d);
          break;
        }
        case 'sign':
          this.signs.push(this.add(new Sign(o)));
          break;
        case 'actor':
          this.actors.push(this.add(new Actor(o)));
          break;
        case 'label':
          this.labels.push({
            x: o.x ?? 10,
            y: o.y ?? 10,
            text: o.text ?? 'Label',
            size: o.size ?? 20,
            color: o.color ?? '#ffffff',
          });
          break;
        case 'checkpoint':
          this.checkpoints.push(this.add(new Checkpoint(o)));
          break;
        case 'decor':
          this.add(new Decor(o)); // no collision, just looks nice
          break;
        case 'goal':
          this.goal = this.add(new Goal(o));
          break;
        case 'player':
          playerData = o;
          break;
        default:
          break;
      }
    }
    this.keys = this.keys || [];
    if (!playerData) playerData = { x: 60, y: 60, w: 36, h: 46, color: '#22d3ee' };
    this.player = this.add(new Hero(playerData));
    // Solid actors block the player too
    for (const a of this.actors) {
      if (a.solid) this.solids.push(a);
    }
    this.player.solids = this.solids;
    for (const a of this.actors) a.solids = this.solids;
    this.coinsTotal = this.coins.length;

    for (let i = 0; i < 4; i++) {
      this.add(new Cloud(rand(0, WORLD_W), rand(20, 200), rand(0.7, 1.3)));
    }
    game.camera.follow(this.player, 6);
  }

  get isLastRoom() {
    return this.roomIndex >= this.rooms.length - 1;
  }

  // Spawn a coin or enemy at a world position (used by the 'spawn' action).
  spawnObject(type, cx, cy) {
    if (type === 'enemy') {
      const e = new Enemy({ x: cx - 19, y: cy - 19 });
      this.add(e);
      this.enemies.push(e);
    } else {
      const c = new Coin({ x: cx - 13, y: cy - 13 });
      this.add(c);
      this.coins.push(c);
      this.coinsTotal++;
    }
  }

  // Emit a named particle effect (designed in the Particle Editor).
  emitEffect(name, x, y) {
    const fx = this.effects[name];
    if (!fx) return;
    const v = fx.speed ?? 200;
    this.game.particles.emit(x, y, {
      count: fx.count ?? 20,
      color: [fx.color1 ?? '#ffffff', fx.color2 ?? '#22d3ee'],
      vx: [-v, v],
      vy: [-v, v],
      gravity: fx.gravity ?? 500,
      life: [0.4, fx.life ?? 0.8],
      size: [2, fx.size ?? 5],
      shape: fx.shape || 'circle',
    });
  }

  // Seeded pseudo-random 0..1 for stable theme decorations.
  _srand(i) {
    const x = Math.sin(i * 127.1 + this.roomIndex * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  // Painted sky per room theme. Drawn relative to the camera (like a real
  // infinitely-distant background) so the sun, moon and stars stay in view.
  drawThemeSky(ctx) {
    const cam = this.game.camera;
    const cp = (cam && cam.pos) || { x: 0, y: 0 };
    const ox = cp.x;
    const oy = cp.y;
    const g = ctx.createLinearGradient(0, oy - 40, 0, oy + 580);
    if (this.theme === 'sunset') {
      g.addColorStop(0, '#7c3aed');
      g.addColorStop(0.55, '#f97316');
      g.addColorStop(1, '#fdba74');
    } else if (this.theme === 'night') {
      g.addColorStop(0, '#020617');
      g.addColorStop(1, '#312e81');
    } else if (this.theme === 'cave') {
      g.addColorStop(0, '#0c0a09');
      g.addColorStop(1, '#44403c');
    } else {
      g.addColorStop(0, '#38bdf8');
      g.addColorStop(1, '#e0f2fe');
    }
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(ox - 60, oy - 60, 1080, 660);
    if (this.theme === 'day' || this.theme === 'sunset') {
      // Sun (pinned to the view)
      const sy = oy + (this.theme === 'day' ? 90 : 400);
      const sx = ox + 830;
      const sr = this.theme === 'day' ? 42 : 70;
      ctx.fillStyle = 'rgba(253,224,71,0.35)';
      ctx.beginPath();
      ctx.arc(sx, sy, sr * 1.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, TAU);
      ctx.fill();
      // Drifting clouds
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 3; i++) {
        const bx = this._srand(i + 1) * 900;
        const by = oy + 40 + this._srand(i + 11) * 140;
        const dx = ox + ((bx + this.time * 12) % 1100) - 70;
        const r = 22 + this._srand(i + 21) * 14;
        for (const [px, py, s] of [[-0.9, 0.15, 0.75], [0, 0, 1], [0.9, 0.15, 0.7]]) {
          ctx.beginPath();
          ctx.arc(dx + px * r, by + py * r, r * s, 0, TAU);
          ctx.fill();
        }
      }
    } else if (this.theme === 'night') {
      // Stars
      for (let i = 0; i < 70; i++) {
        const sx = ox + this._srand(i + 1) * 960;
        const sy = oy + this._srand(i + 71) * 420;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 1.5 + i));
        ctx.fillStyle = `rgba(255,255,255,${(0.25 + tw * 0.6).toFixed(2)})`;
        const sr = 1 + this._srand(i + 141) * 1.6;
        ctx.fillRect(sx, sy, sr, sr);
      }
      // Moon (pinned to the view)
      const mx = ox + 830;
      const my = oy + 90;
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(mx, my, 34, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      for (const [cx2, cy2, r] of [[-10, -6, 7], [8, 8, 5], [4, -12, 4]]) {
        ctx.beginPath();
        ctx.arc(mx + cx2, my + cy2, r, 0, TAU);
        ctx.fill();
      }
    } else if (this.theme === 'cave') {
      // Stalactites
      ctx.fillStyle = '#292524';
      for (let i = 0; i < 9; i++) {
        const sx = ox + this._srand(i + 1) * 960;
        const sw = 26 + this._srand(i + 11) * 30;
        const sh = 40 + this._srand(i + 21) * 90;
        ctx.beginPath();
        ctx.moveTo(sx - sw / 2, oy - 60);
        ctx.lineTo(sx + sw / 2, oy - 60);
        ctx.lineTo(sx, oy - 60 + sh);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  draw(ctx) {
    this.drawThemeSky(ctx);
    super.draw(ctx);
  }

  // Fire a bullet from a world position.
  spawnBullet(x, y, vx, vy) {
    const b = new Bullet(x, y, vx, vy);
    this.add(b);
    this.bullets.push(b);
  }

  // Damage an enemy (stomped or shot). Enemies have HP — bosses take
  // multiple hits. Stomping always bounces the player.
  hitEnemy(e, stomp) {
    if (!e.active) return;
    e.hp -= 1;
    e.flash = 0.18;
    if (e.hp <= 0) {
      e.active = false;
      e.visible = false;
      this.score += 1;
      this.game.audio.play('blip');
      this.game.particles.emit(e.cx, e.cy, {
        count: 12,
        color: ['#ef4444', '#fca5a5'],
        vx: [-180, 180],
        vy: [-260, -40],
        gravity: 800,
        life: [0.4, 0.8],
        size: [2, 6],
      });
    } else {
      this.game.audio.play('hit');
      this.game.camera.shake(4, 0.15);
      // Knock the player back a little on a non-killing stomp
      if (stomp && this.player) {
        const p = this.player;
        p.vel.x = p.cx < e.cx ? -260 : 260;
      }
    }
    if (stomp) {
      const p = this.player;
      p.vel.y = -520;
      p.grounded = false;
    }
  }

  lose() {
    if (this.state !== 'play') return;
    const p = this.player;
    if (this.spawnPoint) {
      // Checkpoint: respawn here instead of restarting the room
      p.pos.set(this.spawnPoint.x, this.spawnPoint.y);
      p.vel.set(0, 0);
      p.visible = true;
      this.invulnT = 2;
      this.game.audio.play('hit');
      this.game.camera.shake(8, 0.3);
      this.game.particles.emit(p.cx, p.cy, {
        count: 16,
        color: ['#a78bfa', '#ffffff'],
        vx: [-200, 200],
        vy: [-260, -40],
        gravity: 700,
        life: [0.4, 0.8],
        size: [2, 6],
        shape: 'circle',
      });
      return;
    }
    this.state = 'dead';
    this.game.audio.play('hit');
    this.game.camera.shake(10, 0.4);
    this.game.particles.emit(p.cx, p.cy, {
      count: 24,
      color: [p.color, '#ffffff'],
      vx: [-260, 260],
      vy: [-320, 40],
      gravity: 900,
      life: [0.5, 1],
      size: [3, 7],
      shape: 'circle',
    });
  }

  winGame() {
    if (this.state !== 'play') return;
    this.state = 'win';
    const g = this.goal;
    // Win confetti bursts from the goal flag, or the player if there is none
    // (e.g. a boss room won via a "when cleared" rule)
    const fx = g ? { x: g.cx, y: g.cy - 20 } : this.player ? { x: this.player.cx, y: this.player.cy - 20 } : { x: 480, y: 270 };
    this.game.audio.play('powerup');
    this.game.particles.emit(fx.x, fx.y, {
      count: 40,
      color: ['#22c55e', '#fde047', '#22d3ee', '#f472b6'],
      vx: [-300, 300],
      vy: [-380, -80],
      gravity: 700,
      life: [0.6, 1.2],
      size: [3, 7],
    });
  }

  openDoors() {
    for (const d of this.doors) {
      if (!d.active) continue;
      d.open();
      this.game.particles.emit(d.cx, d.cy, {
        count: 14,
        color: ['#b45309', '#fbbf24'],
        vx: [-160, 160],
        vy: [-220, -40],
        gravity: 600,
        life: [0.4, 0.8],
        size: [2, 6],
      });
    }
    this.game.audio.play('powerup');
  }

  update(dt) {
    super.update(dt);
    this.time += dt;
    if (this.fadeT > 0) this.fadeT = Math.max(0, this.fadeT - dt * 2.5);
    const input = this.game.input;
    if (this.bannerT > 0) this.bannerT -= dt;
    if (this.messageT > 0) {
      this.messageT -= dt;
      if (this.messageT <= 0) this.message = null;
    }

    if (this.state === 'play') {
      const p = this.player;

      // Mercy invulnerability after a checkpoint respawn (player blinks)
      if (this.invulnT > 0) {
        this.invulnT -= dt;
        p.visible = Math.floor(this.invulnT * 12) % 2 === 0;
        if (this.invulnT <= 0) p.visible = true;
      }

      // Springs bounce the player
      for (const s of this.springs) {
        if (s.active && p.vel.y >= 0 && overlaps(p, s)) {
          p.pos.y = s.pos.y - p.size.y;
          p.vel.y = -s.power;
          p.grounded = false;
          s.bounce();
          this.game.audio.play('boing');
        }
      }

      // Coins
      for (const c of this.coins) {
        if (c.active && overlaps(p, c)) {
          c.active = false;
          c.visible = false;
          this.score++;
          this.game.audio.play('coin');
          this.game.particles.emit(c.cx, c.cy, {
            count: 10,
            color: ['#fde047', '#fef9c3'],
            vx: [-140, 140],
            vy: [-200, -40],
            life: [0.3, 0.6],
            size: [2, 5],
            shape: 'circle',
          });
        }
      }

      // Keys open doors
      for (const k of this.keys) {
        if (k.active && overlaps(p, k)) {
          k.active = false;
          k.visible = false;
          this.hasKey = true;
          this.openDoors();
        }
      }

      // Hazards: stomp enemies by landing on them, otherwise they hurt
      for (const e of this.enemies) {
        if (!e.active || !overlaps(p, e)) continue;
        const stomp = p.vel.y > 0 && p.pos.y + p.size.y - e.pos.y < e.size.y * 0.65;
        if (stomp) {
          this.hitEnemy(e, true);
        } else if (this.invulnT <= 0) {
          this.lose();
          return;
        }
      }
      for (const s of this.spikes) {
        if (s.active && overlaps(p, s)) {
          if (this.invulnT > 0) continue;
          this.lose();
          return;
        }
      }

      // Checkpoints set the respawn point
      for (const c of this.checkpoints) {
        if (!c.activated && overlaps(p, c)) {
          c.activated = true;
          this.spawnPoint = {
            x: c.pos.x + c.size.x / 2 - p.size.x / 2,
            y: c.pos.y - p.size.y - 4,
          };
          this.game.audio.play('powerup');
          this.game.particles.emit(c.cx, c.cy - 20, {
            count: 14,
            color: ['#a78bfa', '#ffffff'],
            vx: [-120, 120],
            vy: [-200, -40],
            life: [0.4, 0.8],
            size: [2, 5],
          });
        }
      }

      // Bullets: pop on walls, kill enemies, hurt the player
      for (const b of this.bullets) {
        if (!b.active) continue;
        let dead = false;
        for (const s of this.solids) {
          if (s.active && overlaps(b, s)) {
            dead = true;
            break;
          }
        }
        if (!dead) {
          for (const e of this.enemies) {
            if (e.active && overlaps(b, e)) {
              this.hitEnemy(e, false);
              dead = true;
              break;
            }
          }
        }
        if (!dead && b.age > 0.15 && overlaps(b, p)) {
          dead = true;
          if (this.invulnT <= 0) {
            this.lose();
            return;
          }
        }
        if (dead) {
          b.active = false;
          b.visible = false;
        }
      }
      this.bullets = this.bullets.filter((b) => b.active);

      // Signs show messages
      for (const s of this.signs) {
        if (overlaps(p, s)) {
          this.message = s.message;
          this.messageT = 3;
        }
      }

      // Goal: next room or win
      if (this.goal && overlaps(p, this.goal)) {
        if (this.isLastRoom) {
          this.winGame();
        } else if (this.onAdvance) {
          this.game.audio.play('powerup');
          this.onAdvance();
        }
        return;
      }

      if (p.pos.y > WORLD_H + 360) {
        this.lose();
        return;
      }
      if (input.pressed('KeyR')) {
        if (this.onRestart) this.onRestart();
        return;
      }
    } else if (input.pressed('KeyR') || input.mouse.pressed || input.touch.pressed) {
      if (this.onRestart) this.onRestart();
      return;
    }

    if (input.pressed('Escape') && this.onStop) this.onStop();
  }

  drawUI(ctx) {
    ctx.save();
    // HUD
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(2,6,23,0.55)';
    let label = `Coins ${this.score}/${this.coinsTotal}`;
    if (this.keys.length > 0) label += this.hasKey ? '   🔑' : '   🔒';
    ctx.strokeText(label, 14, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, 14, 12);
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.strokeText('ESC: editor', WORLD_W - 14, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('ESC: editor', WORLD_W - 14, 16);
    ctx.restore();

    // UI labels (pinned to the screen, GUI layer)
    if (this.labels.length > 0) {
      ctx.save();
      for (const l of this.labels) {
        ctx.font = `bold ${l.size}px system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(2,6,23,0.55)';
        ctx.strokeText(l.text, l.x, l.y);
        ctx.fillStyle = l.color;
        ctx.fillText(l.text, l.x, l.y);
      }
      ctx.restore();
    }

    // Debug overlay
    if (this.debug) {
      ctx.save();
      const p = this.player;
      const lines = [
        `fps ${Math.round(this.game.fps)}`,
        `entities ${this.entities.length}`,
        `room ${this.roomName}`,
        `player ${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)}`,
        `vel ${p.vel.x.toFixed(0)},${p.vel.y.toFixed(0)}`,
        `grounded ${p.grounded} score ${this.score}`,
      ];
      ctx.font = '12px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const bw = 200;
      const bh = lines.length * 16 + 12;
      ctx.fillStyle = 'rgba(2,6,23,0.78)';
      rr(ctx, WORLD_W - bw - 10, 44, bw, bh, 8);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      lines.forEach((ln, i) => ctx.fillText(ln, WORLD_W - bw, 50 + i * 16));
      ctx.restore();
    }

    // Room intro banner
    if (this.bannerT > 0 && this.state === 'play') {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.bannerT);
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(2,6,23,0.55)';
      ctx.strokeText(this.roomName, WORLD_W / 2, 90);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(this.roomName, WORLD_W / 2, 90);
      ctx.restore();
    }

    // Sign dialog
    if (this.message) {
      ctx.save();
      const tw = Math.min(560, WORLD_W - 80);
      const tx = WORLD_W / 2 - tw / 2;
      const ty = WORLD_H - 110;
      ctx.fillStyle = 'rgba(15,23,42,0.92)';
      rr(ctx, tx, ty, tw, 76, 12);
      ctx.fill();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      rr(ctx, tx, ty, tw, 76, 12);
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Simple word wrap
      const words = String(this.message).split(' ');
      const lines = [];
      let line = '';
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > tw - 40 && line) {
          lines.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      const shown = lines.slice(0, 3);
      shown.forEach((l, i) => {
        ctx.fillText(l, WORLD_W / 2, ty + 26 + i * 20 - (shown.length - 1) * 0);
      });
      ctx.restore();
    }

    if (this.state === 'win' || this.state === 'dead') {
      ctx.save();
      ctx.fillStyle = 'rgba(2,6,23,0.5)';
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      const pw = 380;
      const ph = 210;
      const px = WORLD_W / 2 - pw / 2;
      const py = WORLD_H / 2 - ph / 2;
      ctx.fillStyle = '#0f172a';
      rr(ctx, px, py, pw, ph, 18);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = this.state === 'win' ? '#4ade80' : '#f87171';
      ctx.font = 'bold 38px system-ui, sans-serif';
      ctx.fillText(this.state === 'win' ? 'You win!' : 'Ouch!', WORLD_W / 2, py + 34);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(`Coins: ${this.score}/${this.coinsTotal}`, WORLD_W / 2, py + 88);
      ctx.fillStyle = '#64748b';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('R / click: play again   •   ESC: editor', WORLD_W / 2, py + 140);
      ctx.restore();
    }
    // Fade in from black on room enter
    if (this.fadeT > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(2,6,23,${this.fadeT.toFixed(3)})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.restore();
    }
  }
}
