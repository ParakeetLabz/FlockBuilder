// FlockBuilder — utils.js
// Math helpers and a tiny 2D vector class used across the engine.

export const TAU = Math.PI * 2;

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (min, max) => min + Math.random() * (max - min);
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const deg2rad = (d) => (d * Math.PI) / 180;

export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }
  clone() {
    return new Vector2(this.x, this.y);
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }
  scale(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }
  length() {
    return Math.hypot(this.x, this.y);
  }
  normalize() {
    const l = this.length() || 1;
    return this.scale(1 / l);
  }
  distanceTo(v) {
    return Math.hypot(this.x - v.x, this.y - v.y);
  }
  static add(a, b) {
    return new Vector2(a.x + b.x, a.y + b.y);
  }
  static sub(a, b) {
    return new Vector2(a.x - b.x, a.y - b.y);
  }
}

// Axis-aligned bounding-box overlap. Boxes are { x, y, w, h }.
export function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
