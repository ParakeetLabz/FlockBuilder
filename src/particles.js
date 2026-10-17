// FlockBuilder — particles.js
// ParticleSystem: fire-and-forget particles for explosions, sparkles,
// trails, and confetti. Emits in world space.

import { rand } from './utils.js';

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, opts = {}) {
    const n = opts.count ?? 12;
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x,
        y,
        vx: rand(opts.vx ? opts.vx[0] : -120, opts.vx ? opts.vx[1] : 120),
        vy: rand(opts.vy ? opts.vy[0] : -120, opts.vy ? opts.vy[1] : 120),
        life: 0,
        maxLife: rand(opts.life ? opts.life[0] : 0.4, opts.life ? opts.life[1] : 0.8),
        size: rand(opts.size ? opts.size[0] : 2, opts.size ? opts.size[1] : 5),
        color: Array.isArray(opts.color)
          ? opts.color[Math.floor(Math.random() * opts.color.length)]
          : opts.color ?? '#ffffff',
        gravity: opts.gravity ?? 0,
        drag: opts.drag ?? 0,
        shape: opts.shape ?? 'rect', // 'rect' | 'circle'
      });
    }
  }

  update(dt) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        ps.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      if (p.drag > 0) {
        const d = Math.max(0, 1 - p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    const ps = this.particles;
    if (ps.length === 0) return;
    for (const p of ps) {
      const t = 1 - p.life / p.maxLife;
      ctx.globalAlpha = t;
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.particles.length = 0;
  }
}
