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

// Rounded-rect path helper (with fallback for older canvas implementations).
export function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

// ---------------------------------------------------------------- Hero ----
// The player character: runs with arrows/AD, jumps with Space/W/Up.

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
  }

  update(dt) {
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
// Reaching the flag wins the level.

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

// ---------------------------------------------------------------- PlayScene
// Turns builder level data (plain objects) into a playable game.

export class PlayScene extends Scene {
  constructor(game, objects = []) {
    super(game);
    this.bg = '#7dd3fc';
    this.state = 'play'; // play | win | dead
    this.score = 0;
    this.solids = [];
    this.coins = [];
    this.enemies = [];
    this.goal = null;
    this.onRestart = null; // called when the player asks to replay
    this.onStop = null; // called when the player presses ESC

    let playerData = null;
    for (const o of objects) {
      if (o.type === 'wall') {
        const s = new Sprite({
          x: o.x, y: o.y, w: o.w, h: o.h, color: o.color || '#475569',
        });
        s.solid = true;
        this.add(s);
        this.solids.push(s);
      } else if (o.type === 'coin') {
        const c = new Coin(o);
        this.add(c);
        this.coins.push(c);
      } else if (o.type === 'enemy') {
        const e = new Enemy(o);
        this.add(e);
        this.enemies.push(e);
      } else if (o.type === 'goal') {
        this.goal = this.add(new Goal(o));
      } else if (o.type === 'player') {
        playerData = o;
      }
    }
    if (!playerData) playerData = { x: 60, y: 60, w: 36, h: 46, color: '#22d3ee' };
    this.player = this.add(new Hero(playerData));
    this.player.solids = this.solids;
    this.coinsTotal = this.coins.length;

    for (let i = 0; i < 4; i++) {
      this.add(new Cloud(rand(0, WORLD_W), rand(20, 200), rand(0.7, 1.3)));
    }
    game.camera.follow(this.player, 6);
  }

  lose() {
    if (this.state !== 'play') return;
    this.state = 'dead';
    const p = this.player;
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

  win() {
    if (this.state !== 'play') return;
    this.state = 'win';
    const g = this.goal;
    this.game.audio.play('powerup');
    this.game.particles.emit(g.cx, g.cy - 20, {
      count: 40,
      color: ['#22c55e', '#fde047', '#22d3ee', '#f472b6'],
      vx: [-300, 300],
      vy: [-380, -80],
      gravity: 700,
      life: [0.6, 1.2],
      size: [3, 7],
    });
  }

  update(dt) {
    super.update(dt);
    const input = this.game.input;

    if (this.state === 'play') {
      const p = this.player;
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
      for (const e of this.enemies) {
        if (overlaps(p, e)) {
          this.lose();
          return;
        }
      }
      if (this.goal && overlaps(p, this.goal)) {
        this.win();
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
    const label = `Coins ${this.score}/${this.coinsTotal}`;
    ctx.strokeText(label, 14, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, 14, 12);
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.strokeText('ESC: editor', WORLD_W - 14, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('ESC: editor', WORLD_W - 14, 16);
    ctx.restore();

    if (this.state === 'win' || this.state === 'dead') {
      ctx.save();
      ctx.fillStyle = 'rgba(2,6,23,0.5)';
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      const pw = 340;
      const ph = 200;
      const px = WORLD_W / 2 - pw / 2;
      const py = WORLD_H / 2 - ph / 2;
      ctx.fillStyle = '#0f172a';
      rr(ctx, px, py, pw, ph, 18);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = this.state === 'win' ? '#4ade80' : '#f87171';
      ctx.font = 'bold 38px system-ui, sans-serif';
      ctx.fillText(this.state === 'win' ? 'You win!' : 'Ouch!', WORLD_W / 2, py + 32);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(`Coins: ${this.score}/${this.coinsTotal}`, WORLD_W / 2, py + 88);
      ctx.fillStyle = '#64748b';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('R / click: play again   •   ESC: editor', WORLD_W / 2, py + 138);
      ctx.restore();
    }
  }
}
