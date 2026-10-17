// FlockBuilder — scene.js
// Scene: a container for entities with a background color and an optional
// screen-space UI hook (drawUI) for HUDs and menus.

export class Scene {
  constructor(game) {
    this.game = game;
    this.entities = [];
    this.bg = '#0b1020';
  }

  add(e) {
    this.entities.push(e);
    return e;
  }

  remove(e) {
    const i = this.entities.indexOf(e);
    if (i >= 0) this.entities.splice(i, 1);
    return e;
  }

  find(tag) {
    return this.entities.filter((e) => typeof e.hasTag === 'function' && e.hasTag(tag));
  }

  clear() {
    this.entities.length = 0;
  }

  update(dt) {
    for (const e of this.entities) {
      if (e.active) e.update(dt, this.game);
    }
  }

  draw(ctx) {
    for (const e of this.entities) {
      if (e.visible) e.draw(ctx, this.game);
    }
  }

  // Override for HUD / menus drawn in screen space (no camera transform).
  drawUI(ctx) {}

  onEnter() {}
  onExit() {}
}
