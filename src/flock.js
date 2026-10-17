// FlockBuilder — flock.js
// Public entry point. Import everything from here:
//
//   import { Game, Scene, Sprite } from './src/flock.js';

export { Game, VERSION } from './engine.js';
export { Entity } from './entity.js';
export { Sprite } from './sprite.js';
export { Scene } from './scene.js';
export { Input } from './input.js';
export { Camera } from './camera.js';
export { AudioEngine } from './audio.js';
export { ParticleSystem } from './particles.js';
export { Text } from './text.js';
export {
  Vector2,
  clamp,
  lerp,
  rand,
  randInt,
  deg2rad,
  TAU,
  aabbOverlap,
} from './utils.js';
export { applyGravity, moveAndCollide, overlaps } from './physics.js';
