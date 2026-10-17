// Flock — a FlockBuilder demo game.
// You are Pip the parakeet. Flap through the vines, don't touch anything.
// Demonstrates: game loop, input, gravity, AABB collision, particles,
// camera shake, synthesized audio, scenes, and screen-space UI.

import {
  Game,
  Scene,
  Sprite,
  Text,
  Entity,
  applyGravity,
  overlaps,
  rand,
  clamp,
  TAU,
} from '../../src/flock.js';

const W = 480;
const H = 640;
const GROUND_H = 90;
const GRAVITY = 2000;
const FLAP_VY = -560;
const PIPE_SPEED = 210;
const PIPE_GAP = 175;
const PIPE_W = 70;
const SPAWN_EVERY = 1.5;

// ---------------------------------------------------------------- Bird ---

class Bird extends Entity {
  constructor() {
    super({ x: 110, y: H / 2 - 100, w: 46, h: 36 });
    this.wingT = 0;
    this.flapBoost = 0;
  }

  flap() {
    this.vel.y = FLAP_VY;
    this.flapBoost = 1;
  }

  update(dt, game) {
    super.update(dt, game);
    this.wingT += dt;
    this.flapBoost = Math.max(0, this.flapBoost - dt * 3);
    // Tilt with vertical velocity
    const target = clamp(this.vel.y / 1100, -0.45, 1.1);
    this.rotation += (target - this.rotation) * Math.min(1, dt * 10);
  }

  draw(ctx) {
    if (!this.visible) return;
    const w = this.w;
    const h = this.h;
    ctx.save();
    ctx.translate(this.pos.x + w / 2, this.pos.y + h / 2);
    ctx.rotate(this.rotation);

    // Tail
    ctx.fillStyle = '#0891b2';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, -5);
    ctx.lineTo(-w / 2 - 12, -11);
    ctx.lineTo(-w / 2 - 12, 7);
    ctx.lineTo(-w / 2 + 4, 5);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU);
    ctx.fill();

    // Belly
    ctx.fillStyle = '#a5f3fc';
    ctx.beginPath();
    ctx.ellipse(3, 9, w / 3.2, h / 4.2, 0, 0, TAU);
    ctx.fill();

    // Wing (flaps)
    const flapAmp = 0.25 + 0.65 * this.flapBoost;
    const flapAngle = -0.5 + Math.sin(this.wingT * 22) * flapAmp;
    ctx.save();
    ctx.translate(-3, -1);
    ctx.rotate(flapAngle);
    ctx.fillStyle = '#0e7490';
    ctx.beginPath();
    ctx.ellipse(-9, 0, 15, 8.5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(11, -8, 7.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(13, -8, 3.6, 0, TAU);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 3, -6);
    ctx.lineTo(w / 2 + 11, -1);
    ctx.lineTo(w / 2 - 3, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    super.draw(ctx);
  }
}

// ---------------------------------------------------------------- Clouds --

class Cloud extends Entity {
  constructor(x, y, s) {
    super({ x, y, w: 90 * s, h: 34 * s });
    this.speed = rand(12, 30);
  }
  update(dt) {
    this.pos.x -= this.speed * dt;
    if (this.pos.x + this.w < -20) {
      this.pos.x = W + 20;
      this.pos.y = rand(30, H / 2);
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const w = this.w;
    const h = this.h;
    ctx.beginPath();
    ctx.ellipse(this.pos.x + w * 0.3, this.pos.y + h * 0.6, w * 0.3, h * 0.42, 0, 0, TAU);
    ctx.ellipse(this.pos.x + w * 0.55, this.pos.y + h * 0.45, w * 0.28, h * 0.5, 0, 0, TAU);
    ctx.ellipse(this.pos.x + w * 0.75, this.pos.y + h * 0.62, w * 0.22, h * 0.36, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Scene ---

class FlockScene extends Scene {
  constructor(game) {
    super(game);
    this.bg = '#0ea5e9';
    this.state = 'ready'; // ready | play | dead
    this.score = 0;
    this.best = parseInt(localStorage.getItem('flockbuilder-flock-best') || '0', 10);
    this.spawnT = 0;
    this.hoverT = 0;

    // Clouds (decor)
    for (let i = 0; i < 5; i++) {
      this.add(new Cloud(rand(0, W), rand(30, H / 2), rand(0.7, 1.4)));
    }

    // Ground
    this.ground = this.add(
      new Sprite({ x: 0, y: H - GROUND_H, w: W, h: GROUND_H, color: '#4d7c0f' })
    );
    this.ground.solid = true;
    this.add(
      new Sprite({ x: 0, y: H - GROUND_H, w: W, h: 12, color: '#65a30d' })
    );

    this.bird = this.add(new Bird());

    // HUD
    this.scoreText = new Text('0', {
      x: W / 2, y: 24, font: 'bold 56px system-ui, sans-serif',
      color: '#ffffff', align: 'center', outline: '#0c4a6e',
    });
    this.hintText = new Text('Tap, click, or press Space to flap', {
      x: W / 2, y: H / 2 + 90, font: '20px system-ui, sans-serif',
      color: '#ffffff', align: 'center', outline: '#0c4a6e',
    });
    this.titleText = new Text('FLOCK', {
      x: W / 2, y: H / 2 - 160, font: 'bold 64px system-ui, sans-serif',
      color: '#ffffff', align: 'center', outline: '#0c4a6e',
    });
  }

  reset() {
    for (const p of this.find('pipe')) this.remove(p);
    this.bird.pos.set(110, H / 2 - 100);
    this.bird.vel.set(0, 0);
    this.bird.rotation = 0;
    this.score = 0;
    this.spawnT = 0;
    this.state = 'ready';
    this.game.particles.clear();
  }

  spawnPipes() {
    const margin = 90;
    const gapY = rand(margin + PIPE_GAP / 2, H - GROUND_H - margin - PIPE_GAP / 2);
    const topH = gapY - PIPE_GAP / 2;
    const botY = gapY + PIPE_GAP / 2;
    const top = new Sprite({ x: W + 10, y: 0, w: PIPE_W, h: topH, color: '#16a34a' });
    const bot = new Sprite({ x: W + 10, y: botY, w: PIPE_W, h: H - GROUND_H - botY, color: '#16a34a' });
    top.addTag('pipe');
    bot.addTag('pipe');
    top.data.isTop = true;
    this.add(top);
    this.add(bot);
  }

  die() {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.game.audio.play('hit');
    this.game.camera.shake(9, 0.45);
    this.game.particles.emit(this.bird.cx, this.bird.cy, {
      count: 26,
      color: ['#22d3ee', '#a5f3fc', '#f59e0b', '#ffffff'],
      vx: [-260, 260], vy: [-320, 60],
      gravity: 900, life: [0.5, 1.1], size: [3, 8],
      shape: 'circle',
    });
    for (const p of this.find('pipe')) p.active = false;
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem('flockbuilder-flock-best', String(this.best));
    }
  }

  update(dt) {
    const input = this.game.input;
    super.update(dt);

    if (this.state === 'ready') {
      this.hoverT += dt;
      this.bird.pos.y = H / 2 - 100 + Math.sin(this.hoverT * 4) * 10;
      if (input.tapped) {
        this.state = 'play';
        this.bird.flap();
        this.game.audio.play('flap');
      }
      return;
    }

    if (this.state === 'dead') {
      // Bird tumbles to the ground
      applyGravity(this.bird, GRAVITY, dt);
      this.bird.pos.y += this.bird.vel.y * dt;
      const floor = H - GROUND_H - this.bird.h;
      if (this.bird.pos.y >= floor) {
        this.bird.pos.y = floor;
        this.bird.vel.y = 0;
      }
      if (input.tapped) this.reset();
      return;
    }

    // --- play state ---
    if (input.tapped) {
      this.bird.flap();
      this.game.audio.play('flap');
      this.game.particles.emit(this.bird.x + 6, this.bird.y + this.bird.h - 4, {
        count: 5, color: '#e0f2fe', vx: [-60, 60], vy: [40, 140],
        life: [0.25, 0.5], size: [2, 5], shape: 'circle',
      });
    }

    applyGravity(this.bird, GRAVITY, dt);
    this.bird.pos.y += this.bird.vel.y * dt;
    if (this.bird.pos.y < 0) {
      this.bird.pos.y = 0;
      this.bird.vel.y = 0;
    }

    // Pipes
    this.spawnT += dt;
    if (this.spawnT >= SPAWN_EVERY) {
      this.spawnT = 0;
      this.spawnPipes();
    }
    for (const p of this.find('pipe')) {
      p.pos.x -= PIPE_SPEED * dt;
      if (p.data.isTop && !p.data.scored && p.pos.x + p.w < this.bird.pos.x) {
        p.data.scored = true;
        this.score++;
        this.scoreText.text = String(this.score);
        this.game.audio.play('score');
        this.game.particles.emit(this.bird.cx, this.bird.cy - 30, {
          count: 8, color: '#fde047', vx: [-120, 120], vy: [-160, -40],
          life: [0.3, 0.6], size: [2, 5], shape: 'circle',
        });
      }
      if (p.pos.x + p.w < -20) this.remove(p);
      if (overlaps(this.bird, p)) {
        this.die();
        return;
      }
    }

    // Ground hit
    if (this.bird.pos.y + this.bird.h >= H - GROUND_H) {
      this.bird.pos.y = H - GROUND_H - this.bird.h;
      this.die();
    }
  }

  drawUI(ctx) {
    this.scoreText.draw(ctx);
    // FPS (tiny, bottom-left)
    ctx.save();
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'left';
    ctx.fillText(this.game.fps + ' fps', 8, H - 8);
    ctx.restore();

    if (this.state === 'ready') {
      this.titleText.draw(ctx);
      this.hintText.draw(ctx);
    } else if (this.state === 'dead') {
      // Dim + panel
      ctx.save();
      ctx.fillStyle = 'rgba(2,6,23,0.45)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#0f172a';
      const pw = 300;
      const ph = 210;
      const px = W / 2 - pw / 2;
      const py = H / 2 - ph / 2;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 18);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.fillText('Game Over', W / 2, py + 34);
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillStyle = '#a5f3fc';
      ctx.fillText('Score: ' + this.score, W / 2, py + 84);
      ctx.fillText('Best: ' + this.best, W / 2, py + 118);
      ctx.fillStyle = '#64748b';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('tap to try again', W / 2, py + 164);
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------- Boot ----

const canvas = document.getElementById('game');
const game = new Game({ width: W, height: H, canvas });

// Custom sounds for this game
game.audio.define('flap', (a) => a.tone(520, 0.1, 'square', 0.22, 920));
game.audio.define('score', (a) => {
  a.tone(988, 0.08, 'square', 0.22);
  setTimeout(() => a.tone(1319, 0.14, 'square', 0.22), 80);
});
game.audio.define('hit', (a) => {
  a.noise(0.3, 0.5, 500);
  a.tone(200, 0.35, 'sawtooth', 0.3, 50);
});

game.pushScene(new FlockScene(game));
game.start();
