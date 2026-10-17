// FlockBuilder — physics.js
// Tiny AABB physics: gravity and move-and-collide resolution.

import { aabbOverlap } from './utils.js';

export function applyGravity(e, g, dt, maxFall = 1500) {
  e.vel.y = Math.min(e.vel.y + g * dt, maxFall);
}

// Moves an entity by its velocity, resolving against solid entities.
// Returns { x: -1|0|1, y: -1|0|1 } hit flags. Zeroes velocity on the hit axis.
// Also sets e.groundRef to the solid the entity landed on (or null).
export function moveAndCollide(e, solids, dt) {
  const hits = { x: 0, y: 0 };
  e.groundRef = null;

  e.pos.x += e.vel.x * dt;
  for (const s of solids) {
    if (s === e || !s.solid || !s.active) continue;
    if (aabbOverlap(e.bounds, s.bounds)) {
      if (e.vel.x > 0) {
        e.pos.x = s.pos.x - e.size.x;
        hits.x = 1;
      } else if (e.vel.x < 0) {
        e.pos.x = s.pos.x + s.size.x;
        hits.x = -1;
      } else {
        // Overlapping without horizontal motion: push out along the smaller axis
        const pushLeft = e.pos.x + e.size.x - s.pos.x;
        const pushRight = s.pos.x + s.size.x - e.pos.x;
        e.pos.x += pushLeft < pushRight ? -pushLeft : pushRight;
        hits.x = pushLeft < pushRight ? -1 : 1;
      }
      e.vel.x = 0;
    }
  }

  e.pos.y += e.vel.y * dt;
  for (const s of solids) {
    if (s === e || !s.solid || !s.active) continue;
    if (aabbOverlap(e.bounds, s.bounds)) {
      if (e.vel.y > 0) {
        e.pos.y = s.pos.y - e.size.y;
        hits.y = 1;
      } else if (e.vel.y < 0) {
        e.pos.y = s.pos.y + s.size.y;
        hits.y = -1;
      } else {
        const pushUp = e.pos.y + e.size.y - s.pos.y;
        const pushDown = s.pos.y + s.size.y - e.pos.y;
        e.pos.y += pushUp < pushDown ? -pushUp : pushDown;
        hits.y = pushUp < pushDown ? -1 : 1;
      }
      e.vel.y = 0;
      e.groundRef = s;
    }
  }

  return hits;
}

// Simple overlap test between two entities (uses their bounds).
export function overlaps(a, b) {
  return aabbOverlap(a.bounds, b.bounds);
}
