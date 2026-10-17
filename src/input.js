// FlockBuilder — input.js
// Unified keyboard, mouse, and touch input with per-frame edge detection.
// Check `pressed()` / `released()` for one-frame events, `down()` for held state.

export class Input {
  constructor() {
    this.keys = new Set(); // held KeyboardEvent.code values
    this._pressed = new Set();
    this._released = new Set();
    this.mouse = { x: 0, y: 0, down: false, pressed: false, released: false };
    this.touch = { x: 0, y: 0, active: false, pressed: false };
    this._canvas = null;
    this._onKeyDown = (e) => {
      if (!this.keys.has(e.code)) this._pressed.add(e.code);
      this.keys.add(e.code);
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.code);
      this._released.add(e.code);
    };
    this._onMouseMove = (e) => {
      const p = this._toCanvas(e.clientX, e.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
    };
    this._onMouseDown = (e) => {
      const p = this._toCanvas(e.clientX, e.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      if (!this.mouse.down) this.mouse.pressed = true;
      this.mouse.down = true;
    };
    this._onMouseUp = () => {
      if (this.mouse.down) this.mouse.released = true;
      this.mouse.down = false;
    };
    this._onTouchStart = (e) => {
      const t = e.changedTouches[0];
      const p = this._toCanvas(t.clientX, t.clientY);
      this.touch.x = p.x;
      this.touch.y = p.y;
      if (!this.touch.active) this.touch.pressed = true;
      this.touch.active = true;
    };
    this._onTouchMove = (e) => {
      const t = e.changedTouches[0];
      const p = this._toCanvas(t.clientX, t.clientY);
      this.touch.x = p.x;
      this.touch.y = p.y;
      if (e.cancelable) e.preventDefault();
    };
    this._onTouchEnd = () => {
      this.touch.active = false;
    };
  }

  attach(canvas) {
    this.detach();
    this._canvas = canvas;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('touchstart', this._onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this._onTouchEnd);
    canvas.addEventListener('touchcancel', this._onTouchEnd);
  }

  detach() {
    if (!this._canvas) return;
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this._canvas.removeEventListener('mousemove', this._onMouseMove);
    this._canvas.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    this._canvas.removeEventListener('touchstart', this._onTouchStart);
    this._canvas.removeEventListener('touchmove', this._onTouchMove);
    this._canvas.removeEventListener('touchend', this._onTouchEnd);
    this._canvas.removeEventListener('touchcancel', this._onTouchEnd);
    this._canvas = null;
  }

  _toCanvas(clientX, clientY) {
    const r = this._canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * this._canvas.width,
      y: ((clientY - r.top) / r.height) * this._canvas.height,
    };
  }

  // Call once at the end of each frame (the Game loop does this for you).
  postUpdate() {
    this._pressed.clear();
    this._released.clear();
    this.mouse.pressed = false;
    this.mouse.released = false;
    this.touch.pressed = false;
  }

  down(code) {
    return this.keys.has(code);
  }
  pressed(code) {
    return this._pressed.has(code);
  }
  released(code) {
    return this._released.has(code);
  }

  // -1 / 0 / 1 movement axis from two key codes, e.g. axis('ArrowLeft', 'ArrowRight')
  axis(negCode, posCode) {
    return (this.down(posCode) ? 1 : 0) - (this.down(negCode) ? 1 : 0);
  }

  // True on the frame the player taps/clicks/presses space — handy for "flap" style games.
  get tapped() {
    return (
      this.mouse.pressed ||
      this.touch.pressed ||
      this.pressed('Space') ||
      this.pressed('ArrowUp') ||
      this.pressed('KeyW')
    );
  }
}
