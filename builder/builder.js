// FlockBuilder — builder/builder.js
// The visual, code-free Game Builder: place players, walls, coins, enemies
// and goals with clicks, drag them around, tweak properties, then press
// Play. Levels auto-save to localStorage and can be exported as JSON.

import { Game, Scene, Sprite } from '../src/flock.js';
import { PlayScene, WORLD_W, WORLD_H } from './game-objects.js';

const STORE_KEY = 'flockbuilder-builder-level-v1';
const SNAP = 10;

const DEFAULTS = {
  player: { w: 36, h: 46, color: '#22d3ee', label: 'Player — you. Arrows/AD to move, Space to jump.' },
  wall: { w: 140, h: 30, color: '#475569', label: 'Wall — solid platform.' },
  coin: { w: 26, h: 26, color: '#fde047', label: 'Coin — collect for points.' },
  enemy: { w: 38, h: 38, color: '#ef4444', range: 160, speed: 130, label: 'Enemy — patrols, avoid it.' },
  goal: { w: 54, h: 70, color: '#22c55e', label: 'Goal — reach the flag to win.' },
};

const TOOL_HINTS = {
  select: 'Click an object to select it, drag to move, Delete to remove.',
  player: 'Click to place the player (only one per level).',
  wall: 'Click to place a wall/platform.',
  coin: 'Click to place a coin.',
  enemy: 'Click to place a patrolling enemy.',
  goal: 'Click to place the goal flag (only one per level).',
  eraser: 'Click an object to delete it.',
};

let uidc = 1;
const nid = () => 'o' + uidc++ + Date.now().toString(36);
const snap = (v) => Math.round(v / SNAP) * SNAP;

const editor = {
  tool: 'select',
  objects: [],
  selectedId: null,
  playing: false,
};

// ------------------------------------------------------------ persistence

function validObj(o) {
  return (
    o &&
    typeof o === 'object' &&
    ['player', 'wall', 'coin', 'enemy', 'goal'].includes(o.type) &&
    Number.isFinite(o.x) &&
    Number.isFinite(o.y) &&
    Number.isFinite(o.w) &&
    Number.isFinite(o.h)
  );
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(editor.objects));
    const el = document.getElementById('save-state');
    if (el) {
      el.textContent = 'Saved ✓';
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 600);
    }
  } catch (e) {
    /* storage unavailable — the builder still works for this session */
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return false;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return false;
    editor.objects = arr.filter(validObj);
    return true;
  } catch (e) {
    return false;
  }
}

// ------------------------------------------------------------------ setup

const canvas = document.getElementById('board');
const game = new Game({ width: WORLD_W, height: WORLD_H, canvas });

class EditorScene extends Scene {
  constructor(g) {
    super(g);
    this.bg = '#0b1020';
  }

  drawUI(ctx) {
    ctx.save();
    // Grid
    ctx.strokeStyle = 'rgba(148,163,184,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= WORLD_W; x += 40) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, WORLD_H);
    }
    for (let y = 0; y <= WORLD_H; y += 40) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(WORLD_W, y + 0.5);
    }
    ctx.stroke();
    // Enemy patrol ranges
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(239,68,68,0.5)';
    ctx.lineWidth = 2;
    for (const o of editor.objects) {
      if (o.type !== 'enemy') continue;
      const y = o.y + o.h / 2;
      ctx.beginPath();
      ctx.moveTo(o.x, y);
      ctx.lineTo(o.x + (o.range ?? 160), y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Type labels
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    for (const o of editor.objects) {
      ctx.fillStyle = 'rgba(226,232,240,0.75)';
      ctx.fillText(o.type, o.x + 2, o.y - 4 < 10 ? o.y + 12 : o.y - 4);
    }
    // Selection outline
    const sel = editor.objects.find((o) => o.id === editor.selectedId);
    if (sel) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3;
      ctx.strokeRect(sel.x - 4, sel.y - 4, sel.w + 8, sel.h + 8);
    }
    // Hint
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(TOOL_HINTS[editor.tool] || '', 12, WORLD_H - 12);
    ctx.restore();
  }
}

const editScene = new EditorScene(game);

function refreshEditor() {
  editScene.clear();
  for (const o of editor.objects) {
    const s = new Sprite({
      x: o.x,
      y: o.y,
      w: o.w,
      h: o.h,
      color: o.color,
      shape: o.type === 'coin' ? 'circle' : 'rect',
    });
    s.data.oid = o.id;
    editScene.add(s);
  }
  updateCounts();
}

function afterEdit() {
  refreshEditor();
  renderProps();
  save();
}

// ------------------------------------------------------------------ tools

function byId(id) {
  return editor.objects.find((o) => o.id === id) || null;
}

function makeObj(type, cx, cy) {
  const d = DEFAULTS[type];
  const o = {
    id: nid(),
    type,
    x: snap(cx - d.w / 2),
    y: snap(cy - d.h / 2),
    w: d.w,
    h: d.h,
    color: d.color,
  };
  if (type === 'enemy') {
    o.range = d.range;
    o.speed = d.speed;
  }
  return o;
}

function placeTool(type, x, y) {
  if (type === 'player' || type === 'goal') {
    const existing = editor.objects.find((o) => o.type === type);
    if (existing) {
      existing.x = snap(x - existing.w / 2);
      existing.y = snap(y - existing.h / 2);
      editor.selectedId = existing.id;
    } else {
      const o = makeObj(type, x, y);
      editor.objects.push(o);
      editor.selectedId = o.id;
    }
  } else {
    const o = makeObj(type, x, y);
    editor.objects.push(o);
    editor.selectedId = o.id;
  }
  afterEdit();
}

function deleteObj(id) {
  editor.objects = editor.objects.filter((o) => o.id !== id);
  if (editor.selectedId === id) editor.selectedId = null;
  afterEdit();
}

function hitTest(p) {
  for (let i = editor.objects.length - 1; i >= 0; i--) {
    const o = editor.objects[i];
    if (p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + o.h) return o;
  }
  return null;
}

function evtPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * WORLD_W,
    y: ((e.clientY - r.top) / r.height) * WORLD_H,
  };
}

let drag = null;

canvas.addEventListener('pointerdown', (e) => {
  if (editor.playing) return;
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch (err) {
    /* noop */
  }
  const p = evtPos(e);
  if (editor.tool === 'select') {
    const o = hitTest(p);
    editor.selectedId = o ? o.id : null;
    drag = o ? { id: o.id, dx: p.x - o.x, dy: p.y - o.y, moved: false } : null;
    refreshEditor();
    renderProps();
  } else if (editor.tool === 'eraser') {
    const o = hitTest(p);
    if (o) deleteObj(o.id);
  } else {
    placeTool(editor.tool, p.x, p.y);
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag || editor.playing) return;
  const o = byId(drag.id);
  if (!o) {
    drag = null;
    return;
  }
  const p = evtPos(e);
  o.x = snap(p.x - drag.dx);
  o.y = snap(p.y - drag.dy);
  drag.moved = true;
  refreshEditor();
});

canvas.addEventListener('pointerup', () => {
  if (drag && drag.moved) {
    save();
    renderProps();
  }
  drag = null;
});

window.addEventListener('keydown', (e) => {
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  const typing = tag === 'INPUT' || tag === 'TEXTAREA';
  if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && !editor.playing) {
    if (editor.selectedId) {
      e.preventDefault();
      deleteObj(editor.selectedId);
    }
  }
  if (e.key === 'Escape' && !editor.playing && !typing) {
    editor.selectedId = null;
    refreshEditor();
    renderProps();
  }
});

// ---------------------------------------------------------- toolbar / UI

const toolbar = document.getElementById('toolbar');
toolbar.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-tool]');
  if (!btn || editor.playing) return;
  editor.tool = btn.dataset.tool;
  for (const b of toolbar.querySelectorAll('[data-tool]')) {
    b.classList.toggle('active', b === btn);
  }
  document.getElementById('tool-desc').textContent = DEFAULTS[editor.tool]
    ? DEFAULTS[editor.tool].label
    : TOOL_HINTS[editor.tool];
});

function updateCounts() {
  const el = document.getElementById('obj-count');
  if (el) {
    const n = editor.objects.length;
    el.textContent = n === 1 ? '1 object' : `${n} objects`;
  }
}

// ---------------------------------------------------------- properties

function renderProps() {
  const box = document.getElementById('props-body');
  const o = byId(editor.selectedId);
  if (!o) {
    box.innerHTML = '<p class="muted">Select an object on the canvas to edit its size, color, and behavior.</p>';
    return;
  }
  box.innerHTML = `
    <h3>${o.type}</h3>
    <p class="muted small">${DEFAULTS[o.type].label}</p>
    <div class="row"><label>X<input id="px" type="number" value="${o.x}" step="10"></label>
    <label>Y<input id="py" type="number" value="${o.y}" step="10}"></label></div>
    <div class="row"><label>Width<input id="pw" type="number" value="${o.w}" step="2" min="8"></label>
    <label>Height<input id="ph" type="number" value="${o.h}" step="2" min="8"></label></div>
    <label class="color">Color <input id="pc" type="color" value="${o.color}"></label>
    ${
      o.type === 'enemy'
        ? `<label>Patrol distance <span id="prv">${o.range}</span><input id="pr" type="range" min="0" max="600" step="10" value="${o.range}"></label>
           <label>Patrol speed <span id="psv">${o.speed}</span><input id="ps" type="range" min="20" max="400" step="10" value="${o.speed}"></label>`
        : ''
    }
    <button id="pdel" class="danger">Delete object</button>
  `;
  const num = (id, key) => {
    document.getElementById(id).addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (Number.isFinite(v)) {
        o[key] = key === 'w' || key === 'h' ? Math.max(8, v) : v;
        refreshEditor();
        save();
      }
    });
  };
  num('px', 'x');
  num('py', 'y');
  num('pw', 'w');
  num('ph', 'h');
  document.getElementById('pc').addEventListener('input', (e) => {
    o.color = e.target.value;
    refreshEditor();
    save();
  });
  if (o.type === 'enemy') {
    document.getElementById('pr').addEventListener('input', (e) => {
      o.range = parseFloat(e.target.value);
      document.getElementById('prv').textContent = o.range;
      refreshEditor();
      save();
    });
    document.getElementById('ps').addEventListener('input', (e) => {
      o.speed = parseFloat(e.target.value);
      document.getElementById('psv').textContent = o.speed;
      save();
    });
  }
  document.getElementById('pdel').addEventListener('click', () => deleteObj(o.id));
}

// ------------------------------------------------------------------ play

const playBtn = document.getElementById('play-btn');

function startPlay() {
  if (editor.playing) return;
  editor.playing = true;
  document.body.classList.add('playing');
  playBtn.innerHTML = '⏹ Stop';
  playBtn.classList.add('stop');
  const scene = new PlayScene(game, editor.objects);
  scene.onRestart = () => {
    game.popScene();
    editor.playing = false;
    startPlay();
  };
  scene.onStop = () => stopPlay();
  game.pushScene(scene);
}

function stopPlay() {
  if (!editor.playing) return;
  editor.playing = false;
  document.body.classList.remove('playing');
  playBtn.innerHTML = '▶ Play';
  playBtn.classList.remove('stop');
  game.popScene();
  game.camera.unfollow();
  game.camera.pos.set(0, 0);
}

playBtn.addEventListener('click', () => {
  if (editor.playing) stopPlay();
  else startPlay();
});

// -------------------------------------------------- level actions

function wall(x, y, w, h, color) {
  return { id: nid(), type: 'wall', x, y, w, h, color: color || DEFAULTS.wall.color };
}

function defaultObjects() {
  return [
    wall(0, WORLD_H - 40, WORLD_W, 40),
    { ...makeObj('player', 90, WORLD_H - 120), x: 60, y: WORLD_H - 40 - 46 },
  ];
}

function sampleObjects() {
  const objs = [];
  objs.push(wall(0, WORLD_H - 40, WORLD_W, 40));
  objs.push(wall(120, 400, 150, 24));
  objs.push(wall(350, 315, 150, 24));
  objs.push(wall(580, 400, 150, 24));
  objs.push(wall(770, 300, 130, 24));
  const p = makeObj('player', 0, 0);
  p.x = 60;
  p.y = WORLD_H - 40 - p.h;
  objs.push(p);
  for (const [cx, cy] of [[195, 360], [425, 275], [655, 360], [835, 260], [500, 180]]) {
    const c = makeObj('coin', cx, cy);
    objs.push(c);
  }
  const e1 = makeObj('enemy', 0, 0);
  e1.x = 300;
  e1.y = WORLD_H - 40 - e1.h;
  e1.range = 180;
  objs.push(e1);
  const e2 = makeObj('enemy', 0, 0);
  e2.x = 620;
  e2.y = WORLD_H - 40 - e2.h;
  e2.range = 110;
  e2.speed = 180;
  objs.push(e2);
  const g = makeObj('goal', 0, 0);
  g.x = 800;
  g.y = 300 - g.h;
  objs.push(g);
  return objs;
}

document.getElementById('btn-sample').addEventListener('click', () => {
  if (editor.playing) return;
  editor.objects = sampleObjects();
  editor.selectedId = null;
  afterEdit();
});

document.getElementById('btn-clear').addEventListener('click', () => {
  if (editor.playing) return;
  if (editor.objects.length === 0) return;
  if (window.confirm('Clear the whole level?')) {
    editor.objects = [];
    editor.selectedId = null;
    afterEdit();
  }
});

document.getElementById('btn-export').addEventListener('click', () => {
  const blob = new Blob(
    [JSON.stringify({ app: 'flockbuilder-builder', version: 1, objects: editor.objects }, null, 2)],
    { type: 'application/json' }
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'flockbuilder-level.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});

const importInput = document.getElementById('import-file');
document.getElementById('btn-import').addEventListener('click', () => {
  if (!editor.playing) importInput.click();
});
importInput.addEventListener('change', () => {
  const f = importInput.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const arr = Array.isArray(data) ? data : data.objects;
      if (!Array.isArray(arr)) throw new Error('bad file');
      const objs = arr.filter(validObj);
      if (objs.length === 0) throw new Error('empty');
      editor.objects = objs;
      editor.selectedId = null;
      afterEdit();
    } catch (err) {
      window.alert('Could not import that file — it is not a FlockBuilder level.');
    }
    importInput.value = '';
  };
  reader.readAsText(f);
});

// ------------------------------------------------------------------ boot

if (!load() || editor.objects.length === 0) {
  editor.objects = defaultObjects();
  save();
}
refreshEditor();
renderProps();
game.pushScene(editScene);
game.start();
