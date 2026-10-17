// FlockBuilder — entity.js
// Entity: the base building block of every game object.
// Position, velocity, size, rotation, tags, and a child hierarchy.

import { Vector2 } from './utils.js';

export class Entity {
  constructor(opts = {}) {
    this.pos = new Vector2(opts.x ?? 0, opts.y ?? 0);
    this.vel = new Vector2(opts.vx ?? 0, opts.vy ?? 0);
    this.size = new Vector2(opts.w ?? 32, opts.h ?? 32);
    this.rotation = opts.rotation ?? 0; // radians
    this.visible = opts.visible ?? true;
    this.active = opts.active ?? true;
    this.solid = opts.solid ?? false; // participates in physics collisions
    this.tags = new Set(opts.tags ?? []);
    this.children = [];
    this.parent = null;
    this.data = {}; // freeform scratch space for game logic
  }

  // Convenience accessors
  get x() {
    return this.pos.x;
  }
  set x(v) {
    this.pos.x = v;
  }
  get y() {
    return this.pos.y;
  }
  set y(v) {
    this.pos.y = v;
  }
  get w() {
    return this.size.x;
  }
  get h() {
    return this.size.y;
  }
  get cx() {
    return this.pos.x + this.size.x / 2;
  }
  get cy() {
    return this.pos.y + this.size.y / 2;
  }

  get bounds() {
    return { x: this.pos.x, y: this.pos.y, w: this.size.x, h: this.size.y };
  }

  hasTag(t) {
    return this.tags.has(t);
  }
  addTag(t) {
    this.tags.add(t);
    return this;
  }

  add(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  remove(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) {
      this.children.splice(i, 1);
      child.parent = null;
    }
    return child;
  }

  update(dt, game) {
    for (const c of this.children) {
      if (c.active) c.update(dt, game);
    }
  }

  draw(ctx, game) {
    for (const c of this.children) {
      if (c.visible) c.draw(ctx, game);
    }
  }
}
