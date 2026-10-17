# FlockBuilder

A tiny 2D game engine for the web. No dependencies, no build step — just ES modules and a canvas.

Made by [Parakeet Labz](https://parakeetlabz.vercel.app) · MIT licensed.

## What's inside

| Module | What it does |
|---|---|
| `Game` | Canvas setup, fixed-timestep loop, scene stack, FPS counter |
| `Scene` | Entity container with background color + screen-space UI hook |
| `Entity` | Position, velocity, size, rotation, tags, child hierarchy |
| `Sprite` | Rect / circle / image rendering, spritesheet animation |
| `Input` | Keyboard, mouse, touch with per-frame edge detection |
| `Physics` | Gravity + move-and-collide AABB resolution |
| `Camera` | Pan, zoom, smooth follow, screen shake |
| `AudioEngine` | Synthesized SFX (zero assets), named sounds, volume/mute |
| `ParticleSystem` | Fire-and-forget bursts with gravity, drag, fading |
| `Text` | Canvas text with alignment and outline |

## Quick start

Serve the folder over HTTP (ES modules don't run from `file://`):

```bash
npx serve .
```

Then open `index.html`, or write your own game:

```html
<script type="module">
import { Game, Scene, Sprite } from './src/flock.js';

const game = new Game({ width: 800, height: 600 });
const scene = new Scene(game);
scene.add(new Sprite({ x: 100, y: 100, w: 40, h: 40, shape: 'circle', color: '#22d3ee' }));
game.pushScene(scene);
game.start();
</script>
```

## Demo

**[Flock](examples/flock-game/)** — a Flappy-style game starring Pip the parakeet,
built entirely with the engine: gravity, collision, particles, camera shake,
synthesized audio, and a game-over UI. Open `examples/flock-game/index.html`
(served over HTTP) and press Space / click / tap to flap.

## Project structure

```
src/               # The engine (import from src/flock.js)
  engine.js        # Game class + fixed-timestep loop
  entity.js        # Base game object
  sprite.js        # Drawable entity
  scene.js         # Entity container + UI hook
  input.js         # Keyboard / mouse / touch
  physics.js       # Gravity + AABB collision
  camera.js        # Pan / zoom / follow / shake
  audio.js         # WebAudio synthesized SFX
  particles.js     # Particle bursts
  text.js          # Canvas text
  utils.js         # Vector2 + math helpers
examples/
  flock-game/      # Demo game built with the engine
docs/
  getting-started.md
```

## Docs

Read [docs/getting-started.md](docs/getting-started.md) for the full API tour.

## License

MIT — see [LICENSE](LICENSE).
