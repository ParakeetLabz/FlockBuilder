# Getting started with FlockBuilder

FlockBuilder is a tiny 2D game engine: ES modules, one canvas, no dependencies.
Import everything from a single entry point:

```js
import { Game, Scene, Sprite } from './src/flock.js';
```

> ES modules require HTTP — serve the folder (`npx serve .`) instead of
> opening the HTML file directly.

## Your first game

```html
<canvas id="game"></canvas>
<script type="module">
import { Game, Scene, Sprite } from './src/flock.js';

const game = new Game({ width: 800, height: 600, canvas: document.getElementById('game') });
const scene = new Scene(game);
scene.bg = '#0b1020';

const player = scene.add(new Sprite({ x: 380, y: 280, w: 40, h: 40, color: '#22d3ee' }));

scene.update = function (dt) {
  Scene.prototype.update.call(this, dt); // keep default entity updates
  const speed = 300;
  player.pos.x += game.input.axis('ArrowLeft', 'ArrowRight') * speed * dt;
  player.pos.y += game.input.axis('ArrowUp', 'ArrowDown') * speed * dt;
};

game.pushScene(scene);
game.start();
</script>
```

## Core concepts

**Game** — owns the canvas and the loop. Updates run on a fixed timestep
(60 Hz default) so gameplay is identical on 60 Hz and 144 Hz screens.

```js
const game = new Game({ width: 960, height: 540 });
game.pushScene(menuScene);   // stack scenes
game.replaceScene(playScene); // swap scenes
game.camera.follow(player);   // smooth camera follow
game.camera.shake(8, 0.4);    // screen shake
```

**Scene** — holds entities. Override `update(dt)` for game logic and
`drawUI(ctx)` for HUDs/menus drawn in screen space (no camera transform).

**Entity / Sprite** — everything in the world. `Entity` gives you position,
velocity, size, rotation, tags, and children. `Sprite` draws itself:

```js
new Sprite({ x, y, w, h, color: '#22d3ee' });            // rect
new Sprite({ x, y, w, h, shape: 'circle', color });      // circle
new Sprite({ x, y, w, h, image: 'hero.png' });          // image
new Sprite({ image: 'run.png', frameW: 32, frameH: 32, frames: 6, animFps: 10 }); // spritesheet
```

Extend `Entity` and override `draw(ctx)` for custom art (see the Bird in
`examples/flock-game/game.js`).

**Input** — `game.input.down('ArrowLeft')` for held keys,
`game.input.pressed('Space')` for one-frame presses,
`game.input.tapped` for click/tap/Space (great for menus and flappy-style games),
`game.input.mouse` / `game.input.touch` for pointer positions.

**Physics** —

```js
import { applyGravity, moveAndCollide, overlaps } from './src/flock.js';

applyGravity(player, 2000, dt);
const hits = moveAndCollide(player, solids, dt); // { x, y } hit flags
if (hits.y === 1) player.grounded = true;        // landed
if (overlaps(player, coin)) collect(coin);
```

Mark collidable entities with `entity.solid = true`.

**Audio** — synthesized, no assets needed. The context unlocks on the first
user gesture automatically.

```js
game.audio.play('coin');   // built-ins: blip, jump, coin, hit, powerup
game.audio.define('laser', a => a.tone(880, 0.12, 'sawtooth', 0.3, 220));
game.audio.setVolume(0.7);
game.audio.setMuted(true);
```

**Particles** —

```js
game.particles.emit(x, y, {
  count: 20, color: ['#22d3ee', '#ffffff'],
  vx: [-200, 200], vy: [-300, 0],
  gravity: 800, life: [0.4, 0.9], size: [2, 6], shape: 'circle',
});
```

**Text** —

```js
scene.add(new Text('Score: 0', { x: 16, y: 16, font: 'bold 24px system-ui', outline: '#000' }));
```

## Next steps

- Read the demo source: `examples/flock-game/game.js` — a complete game in ~300 lines.
- Check each module's header comment for its full API.
