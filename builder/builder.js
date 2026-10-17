// FlockBuilder — builder/builder.js
// The visual, code-free Game Builder: multiple rooms, 11 object types,
// click-to-place, drag-to-move, properties panel, instant Play mode.
// Levels auto-save to localStorage and can be exported as JSON.

import { Game, Scene, Sprite } from '../src/flock.js';
import { PlayScene, WORLD_W, WORLD_H, validObj, normalizeRooms } from './game-objects.js';

const STORE_KEY = 'flockbuilder-builder-level-v1';
const SNAP = 10;

const DEFAULTS = {
  player: { w: 36, h: 46, color: '#22d3ee', label: 'Player — you. Arrows/AD to move, Space to jump.' },
  wall: { w: 140, h: 30, color: '#475569', label: 'Wall — solid platform.' },
  coin: { w: 26, h: 26, color: '#fde047', label: 'Coin — collect for points.' },
  enemy: { w: 38, h: 38, color: '#ef4444', range: 160, speed: 130, label: 'Enemy — patrols, avoid it.' },
  goal: { w: 54, h: 70, color: '#22c55e', label: 'Goal — reach the flag for the next room.' },
  platform: { w: 120, h: 24, color: '#8b5cf6', range: 200, speed: 100, axis: 'x', label: 'Moving platform — rides you along.' },
  spikes: { w: 80, h: 24, color: '#f97316', label: 'Spikes — ouch.' },
  spring: { w: 44, h: 28, color: '#a3e635', power: 1100, label: 'Spring — bounces you sky-high.' },
  key: { w: 26, h: 30, color: '#fbbf24', label: 'Key — opens every door in the room.' },
  door: { w: 44, h: 76, color: '#b45309', label: 'Door — solid until you grab a key.' },
  sign: { w: 34, h: 44, color: '#d6a35c', message: 'Hello!', label: 'Sign — shows a message when touched.' },
  actor: { w: 40, h: 40, color: '#38bdf8', label: 'Actor — blank slate. Give it rules below and it comes alive.' },
};

const TOOL_HINTS = {
  select: 'Click an object to select it, drag to move, Delete to remove.',
  eraser: 'Click an object to delete it.',
};

let uidc = 1;
const nid = () => 'o' + uidc++ + Date.now().toString(36);
const snap = (v) => Math.round(v / SNAP) * SNAP;

const editor = {
  tool: 'select',
  rooms: [{ name: 'Room 1', objects: [] }],
  roomIndex: 0,
  selectedId: null,
  playing: false,
};

const curRoom = () => editor.rooms[editor.roomIndex];
const objs = () => curRoom().objects;

// ------------------------------------------------------------ persistence

function loadRooms() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return normalizeRooms(JSON.parse(raw));
  } catch (e) {
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ app: 'flockbuilder-builder', version: 2, rooms: editor.rooms })
    );
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

// ------------------------------------------------------------------ setup

const canvas = document.getElementById('board');
const game = new Game({ width: WORLD_W, height: WORLD_H, canvas });

// Custom sounds for builder games
game.audio.define('boing', (a) => a.tone(180, 0.28, 'square', 0.3, 820));

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
    // Enemy + platform paths
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    for (const o of objs()) {
      if (o.type === 'enemy') {
        ctx.strokeStyle = 'rgba(239,68,68,0.5)';
        const y = o.y + o.h / 2;
        ctx.beginPath();
        ctx.moveTo(o.x, y);
        ctx.lineTo(o.x + (o.range ?? 160), y);
        ctx.stroke();
      } else if (o.type === 'platform') {
        ctx.strokeStyle = 'rgba(139,92,246,0.55)';
        if ((o.axis || 'x') === 'x') {
          const y = o.y + o.h / 2;
          ctx.beginPath();
          ctx.moveTo(o.x, y);
          ctx.lineTo(o.x + (o.range ?? 200), y);
          ctx.stroke();
        } else {
          const x = o.x + o.w / 2;
          ctx.beginPath();
          ctx.moveTo(x, o.y);
          ctx.lineTo(x, o.y + (o.range ?? 200));
          ctx.stroke();
        }
      }
    }
    ctx.setLineDash([]);
    // Type labels
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    for (const o of objs()) {
      ctx.fillStyle = 'rgba(226,232,240,0.75)';
      ctx.fillText(o.type, o.x + 2, o.y - 4 < 10 ? o.y + 12 : o.y - 4);
    }
    // Selection outline
    const sel = objs().find((o) => o.id === editor.selectedId);
    if (sel) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3;
      ctx.strokeRect(sel.x - 4, sel.y - 4, sel.w + 8, sel.h + 8);
    }
    // Hint
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.font = '13px system-ui, sans-serif';
    const hint = TOOL_HINTS[editor.tool] || (DEFAULTS[editor.tool] ? DEFAULTS[editor.tool].label : '');
    ctx.fillText(hint, 12, WORLD_H - 12);
    ctx.restore();
  }
}

const editScene = new EditorScene(game);

function refreshEditor() {
  editScene.clear();
  for (const o of objs()) {
    const s = new Sprite({
      x: o.x,
      y: o.y,
      w: o.w,
      h: o.h,
      color: o.color,
      shape: o.type === 'coin' || o.type === 'key' ? 'circle' : 'rect',
    });
    editScene.add(s);
  }
  renderRoomTabs();
  updateCounts();
}

function afterEdit() {
  refreshEditor();
  renderProps();
  save();
}

// ------------------------------------------------------------------ tools

function byId(id) {
  return objs().find((o) => o.id === id) || null;
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
  } else if (type === 'platform') {
    o.range = d.range;
    o.speed = d.speed;
    o.axis = d.axis;
  } else if (type === 'spring') {
    o.power = d.power;
  } else if (type === 'sign') {
    o.message = d.message;
  } else if (type === 'actor') {
    o.gravity = true;
    o.solid = false;
    o.rules = [];
  }
  return o;
}

const SINGLETONS = ['player', 'goal'];

function placeTool(type, x, y) {
  if (SINGLETONS.includes(type)) {
    const existing = objs().find((o) => o.type === type);
    if (existing) {
      existing.x = snap(x - existing.w / 2);
      existing.y = snap(y - existing.h / 2);
      editor.selectedId = existing.id;
    } else {
      const o = makeObj(type, x, y);
      objs().push(o);
      editor.selectedId = o.id;
    }
  } else {
    const o = makeObj(type, x, y);
    objs().push(o);
    editor.selectedId = o.id;
  }
  afterEdit();
}

function deleteObj(id) {
  const room = curRoom();
  room.objects = room.objects.filter((o) => o.id !== id);
  if (editor.selectedId === id) editor.selectedId = null;
  afterEdit();
}

function hitTest(p) {
  const list = objs();
  for (let i = list.length - 1; i >= 0; i--) {
    const o = list[i];
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
  renderToolDesc();
});

function renderToolDesc() {
  const el = document.getElementById('tool-desc');
  el.textContent = TOOL_HINTS[editor.tool] || (DEFAULTS[editor.tool] ? DEFAULTS[editor.tool].label : '');
}

function updateCounts() {
  const el = document.getElementById('obj-count');
  if (el) {
    const n = objs().length;
    el.textContent = `${curRoom().name} · ` + (n === 1 ? '1 object' : `${n} objects`);
  }
}

// ---------------------------------------------------------- room tabs

function renderRoomTabs() {
  const bar = document.getElementById('room-tabs');
  bar.innerHTML = '';
  editor.rooms.forEach((room, i) => {
    const tab = document.createElement('button');
    tab.className = 'room-tab' + (i === editor.roomIndex ? ' active' : '');
    const label = document.createElement('span');
    label.textContent = room.name;
    label.title = 'Double-click to rename';
    tab.appendChild(label);
    if (editor.rooms.length > 1) {
      const x = document.createElement('span');
      x.className = 'room-x';
      x.textContent = '×';
      x.title = 'Delete room';
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        if (editor.playing) return;
        if (window.confirm(`Delete "${room.name}" and everything in it?`)) {
          editor.rooms.splice(i, 1);
          if (editor.roomIndex >= editor.rooms.length) editor.roomIndex = editor.rooms.length - 1;
          editor.selectedId = null;
          afterEdit();
        }
      });
      tab.appendChild(x);
    }
    tab.addEventListener('click', () => {
      if (editor.playing || i === editor.roomIndex) return;
      editor.roomIndex = i;
      editor.selectedId = null;
      afterEdit();
    });
    tab.addEventListener('dblclick', () => {
      if (editor.playing) return;
      const name = window.prompt('Room name:', room.name);
      if (name && name.trim()) {
        room.name = name.trim().slice(0, 24);
        afterEdit();
      }
    });
    bar.appendChild(tab);
  });
  const add = document.createElement('button');
  add.className = 'room-tab add';
  add.textContent = '+ Room';
  add.title = 'Add a room';
  add.addEventListener('click', () => {
    if (editor.playing) return;
    editor.rooms.push({ name: `Room ${editor.rooms.length + 1}`, objects: [] });
    editor.roomIndex = editor.rooms.length - 1;
    editor.selectedId = null;
    afterEdit();
  });
  bar.appendChild(add);
}

// ---------------------------------------------------------- properties

function renderProps() {
  const box = document.getElementById('props-body');
  const o = byId(editor.selectedId);
  if (!o) {
    box.innerHTML = '<p class="muted">Select an object on the canvas to edit its size, color, and behavior.</p>';
    return;
  }
  const d = DEFAULTS[o.type];
  box.innerHTML = `
    <h3>${o.type}</h3>
    <p class="muted small">${d.label}</p>
    <div class="row"><label>X<input id="px" type="number" value="${o.x}" step="10"></label>
    <label>Y<input id="py" type="number" value="${o.y}" step="10}"></label></div>
    <div class="row"><label>Width<input id="pw" type="number" value="${o.w}" step="2" min="8"></label>
    <label>Height<input id="ph" type="number" value="${o.h}" step="2" min="8"></label></div>
    <label class="color">Color <input id="pc" type="color" value="${o.color}"></label>
    ${
      o.type === 'enemy' || o.type === 'platform'
        ? `<label>${o.type === 'enemy' ? 'Patrol' : 'Travel'} distance <span id="prv">${o.range}</span><input id="pr" type="range" min="0" max="600" step="10" value="${o.range}"></label>
           <label>Speed <span id="psv">${o.speed}</span><input id="ps" type="range" min="20" max="400" step="10" value="${o.speed}"></label>`
        : ''
    }
    ${o.type === 'platform' ? `<label>Direction <select id="paxis"><option value="x">Horizontal</option><option value="y">Vertical</option></select></label>` : ''}
    ${o.type === 'spring' ? `<label>Bounce power <span id="ppv">${o.power}</span><input id="pp" type="range" min="600" max="1600" step="50" value="${o.power}"></label>` : ''}
    ${o.type === 'sign' ? `<label>Message<input id="pmsg" type="text" maxlength="120" value="${String(o.message || '').replace(/"/g, '&quot;')}"></label>` : ''}
    ${o.type === 'actor' ? `
      <label class="check"><input id="pgrv" type="checkbox" ${o.gravity !== false ? 'checked' : ''}> Affected by gravity</label>
      <label class="check"><input id="psol" type="checkbox" ${o.solid ? 'checked' : ''}> Solid (blocks the player)</label>
      <div id="rules-wrap"><h4>Rules <span class="muted small">— when / then</span></h4><div id="rules-list"></div><button id="rule-add" type="button">+ Add rule</button></div>
    ` : ''}
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
  const rangeSpeed = (rid, rvid, key) => {
    const el = document.getElementById(rid);
    if (!el) return;
    el.addEventListener('input', (e) => {
      o[key] = parseFloat(e.target.value);
      document.getElementById(rvid).textContent = o[key];
      refreshEditor();
      save();
    });
  };
  rangeSpeed('pr', 'prv', 'range');
  rangeSpeed('ps', 'psv', 'speed');
  rangeSpeed('pp', 'ppv', 'power');
  const axisEl = document.getElementById('paxis');
  if (axisEl) {
    axisEl.value = o.axis || 'x';
    axisEl.addEventListener('change', (e) => {
      o.axis = e.target.value;
      refreshEditor();
      save();
    });
  }
  const msgEl = document.getElementById('pmsg');
  if (msgEl) {
    msgEl.addEventListener('input', (e) => {
      o.message = e.target.value.slice(0, 120);
      save();
    });
  }
  document.getElementById('pdel').addEventListener('click', () => deleteObj(o.id));

  if (o.type === 'actor') wireActorProps(o);
}
// Visual scripting: WHEN [trigger] THEN [action], no code.

const TRIGGERS = {
  start: 'On game start',
  touch: 'Touches the player',
  key: 'Key is pressed',
  timer: 'Every few seconds',
  destroyed: 'When destroyed',
};
const ACTIONS = {
  move: 'Move',
  jump: 'Jump',
  destroy: 'Destroy itself',
  score: 'Add score',
  sound: 'Play a sound',
  win: 'Win the game',
  lose: 'Lose the game',
  message: 'Show a message',
  teleport: 'Teleport',
  spawn: 'Spawn something',
};
const RULE_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyF'];
const RULE_SOUNDS = ['blip', 'jump', 'coin', 'hit', 'powerup', 'boing'];
const RULE_DIRS = { left: 'Left', right: 'Right', up: 'Up', down: 'Down', toward: 'Toward the player', away: 'Away from player' };

function selHtml(f, i, options, value) {
  const opts = Object.entries(options)
    .map(([v, l]) => `<option value="${v}"${v === value ? ' selected' : ''}>${l}</option>`)
    .join('');
  return `<select data-i="${i}" data-f="${f}">${opts}</select>`;
}

function numHtml(f, i, value, min, max, step) {
  return `<input type="number" data-i="${i}" data-f="${f}" value="${value ?? ''}"${
    min !== undefined ? ` min="${min}"` : ''
  }${max !== undefined ? ` max="${max}"` : ''} step="${step || 1}">`;
}

function triggerParams(r, i) {
  if (r.trigger === 'key') {
    return selHtml('key', i, Object.fromEntries(RULE_KEYS.map((k) => [k, k])), r.key || 'Space');
  }
  if (r.trigger === 'timer') {
    return numHtml('seconds', i, r.seconds ?? 2, 0.2, 60, 0.1) + ' sec';
  }
  return '';
}

function actionParams(r, i) {
  switch (r.action) {
    case 'move':
      return selHtml('direction', i, RULE_DIRS, r.direction || 'right') + ' ' + numHtml('speed', i, r.speed ?? 200, 0, 1000, 10);
    case 'jump':
      return 'power ' + numHtml('power', i, r.power ?? 600, 100, 1500, 50);
    case 'score':
      return '+ ' + numHtml('amount', i, r.amount ?? 1, 1, 100);
    case 'sound':
      return selHtml('sound', i, Object.fromEntries(RULE_SOUNDS.map((s) => [s, s])), r.sound || 'blip');
    case 'message':
      return `<input type="text" data-i="${i}" data-f="text" value="${String(r.text || '').replace(/"/g, '&quot;')}" maxlength="120" style="width:100%">`;
    case 'teleport':
      return 'x ' + numHtml('tx', i, r.tx ?? 0, 0, 960, 10) + ' y ' + numHtml('ty', i, r.ty ?? 0, 0, 540, 10);
    case 'spawn':
      return selHtml('spawn', i, { coin: 'Coin', enemy: 'Enemy' }, r.spawn || 'coin');
    default:
      return '';
  }
}

function renderRulesList(o) {
  const list = document.getElementById('rules-list');
  if (!list) return;
  list.innerHTML = '';
  (o.rules || []).forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'rule';
    row.innerHTML =
      `<div class="rule-row"><b>WHEN</b>&nbsp;${selHtml('trigger', i, TRIGGERS, r.trigger)} ${triggerParams(r, i)}</div>` +
      `<div class="rule-row"><b>THEN</b>&nbsp;${selHtml('action', i, ACTIONS, r.action)} ${actionParams(r, i)}</div>` +
      `<button class="rule-x" data-i="${i}" title="Delete rule">×</button>`;
    list.appendChild(row);
  });
}

function wireRules(o) {
  const list = document.getElementById('rules-list');
  if (!list) return;
  if (!Array.isArray(o.rules)) o.rules = [];
  list.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.dataset || !('i' in t.dataset)) return;
    const i = +t.dataset.i;
    const f = t.dataset.f;
    let v = t.value;
    if (t.type === 'number') {
      v = parseFloat(v);
      if (Number.isNaN(v)) v = 0;
    }
    o.rules[i][f] = v;
    if (f === 'trigger' || f === 'action') renderRulesList(o); // parameter fields changed
    save();
  });
  list.addEventListener('click', (e) => {
    const x = e.target.closest('.rule-x');
    if (x) {
      o.rules.splice(+x.dataset.i, 1);
      renderRulesList(o);
      save();
    }
  });
  document.getElementById('rule-add').addEventListener('click', () => {
    o.rules.push({ trigger: 'touch', action: 'destroy' });
    renderRulesList(o);
    save();
  });
}

function wireActorProps(o) {
  document.getElementById('pgrv').addEventListener('change', (e) => {
    o.gravity = e.target.checked;
    save();
  });
  document.getElementById('psol').addEventListener('change', (e) => {
    o.solid = e.target.checked;
    refreshEditor();
    save();
  });
  renderRulesList(o);
  wireRules(o);
}

// ------------------------------------------------------------------ play

const playBtn = document.getElementById('play-btn');

function startPlay(roomIndex) {
  if (editor.playing) return;
  editor.playing = true;
  document.body.classList.add('playing');
  playBtn.innerHTML = '⏹ Stop';
  playBtn.classList.add('stop');
  const scene = new PlayScene(game, editor.rooms, roomIndex);
  scene.onRestart = () => {
    game.popScene();
    editor.playing = false;
    startPlay(roomIndex);
  };
  scene.onAdvance = () => {
    game.popScene();
    editor.playing = false;
    startPlay(roomIndex + 1);
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
  else startPlay(editor.roomIndex);
});

// -------------------------------------------------- level actions

function wall(x, y, w, h, color) {
  return { id: nid(), type: 'wall', x, y, w, h, color: color || DEFAULTS.wall.color };
}

function defaultRooms() {
  const p = makeObj('player', 0, 0);
  p.x = 60;
  p.y = WORLD_H - 40 - p.h;
  return [{ name: 'Room 1', objects: [wall(0, WORLD_H - 40, WORLD_W, 40), p] }];
}

function sampleRooms() {
  // Room 1 — basics: platforms, spring, coins, enemy, sign, goal
  const r1 = [];
  r1.push(wall(0, WORLD_H - 40, WORLD_W, 40));
  r1.push(wall(150, 410, 150, 24));
  r1.push(wall(380, 330, 150, 24));
  r1.push(wall(620, 410, 150, 24));
  const p1 = makeObj('player', 0, 0);
  p1.x = 60;
  p1.y = WORLD_H - 40 - p1.h;
  r1.push(p1);
  const spr = makeObj('spring', 0, 0);
  spr.x = 300;
  spr.y = WORLD_H - 40 - spr.h;
  r1.push(spr);
  for (const [cx, cy] of [[225, 370], [455, 290], [695, 370], [500, 200]]) {
    r1.push(makeObj('coin', cx, cy));
  }
  const e1 = makeObj('enemy', 0, 0);
  e1.x = 480;
  e1.y = WORLD_H - 40 - e1.h;
  e1.range = 120;
  r1.push(e1);
  const g1 = makeObj('goal', 0, 0);
  g1.x = 660;
  g1.y = 410 - g1.h;
  r1.push(g1);
  const s1 = makeObj('sign', 0, 0);
  s1.x = 120;
  s1.y = WORLD_H - 40 - s1.h;
  s1.message = 'Arrows move, Space jumps. Grab coins, dodge red guys, touch the flag!';
  r1.push(s1);

  // Room 2 — keys, doors, spikes, moving platforms
  const r2 = [];
  r2.push(wall(0, WORLD_H - 40, WORLD_W, 40));
  r2.push(wall(0, 300, 180, 24));
  r2.push(wall(780, 300, 180, 24));
  const p2 = makeObj('player', 0, 0);
  p2.x = 60;
  p2.y = 300 - p2.h;
  r2.push(p2);
  const plat = makeObj('platform', 0, 0);
  plat.x = 380;
  plat.y = 380;
  plat.range = 200;
  plat.axis = 'x';
  r2.push(plat);
  const key = makeObj('key', 0, 0);
  key.x = 850;
  key.y = 300 - key.h - 6;
  r2.push(key);
  const door = makeObj('door', 0, 0);
  door.x = 700;
  door.y = WORLD_H - 40 - door.h;
  r2.push(door);
  const sp = makeObj('spikes', 0, 0);
  sp.x = 420;
  sp.y = WORLD_H - 40 - sp.h;
  sp.w = 160;
  r2.push(sp);
  const g2 = makeObj('goal', 0, 0);
  g2.x = 880;
  g2.y = WORLD_H - 40 - g2.h;
  r2.push(g2);
  const s2 = makeObj('sign', 0, 0);
  s2.x = 120;
  s2.y = 300 - s2.h;
  s2.message = 'Grab the key to open the door. Watch the spikes!';
  r2.push(s2);
  // A scripted actor: bounces on a timer, gives bonus points when touched
  const blob = makeObj('actor', 0, 0);
  blob.x = 250;
  blob.y = 300 - blob.h;
  blob.rules = [
    { trigger: 'timer', seconds: 1.6, action: 'jump', power: 750 },
    { trigger: 'touch', action: 'score', amount: 5 },
    { trigger: 'touch', action: 'destroy' },
    { trigger: 'destroyed', action: 'sound', sound: 'coin' },
  ];
  r2.push(blob);
  const s3 = makeObj('sign', 0, 0);
  s3.x = 330;
  s3.y = 300 - s3.h;
  s3.message = 'The blue blob runs on RULES — select it and check Properties!';
  r2.push(s3);

  return [
    { name: 'Room 1', objects: r1 },
    { name: 'Room 2', objects: r2 },
  ];
}

document.getElementById('btn-sample').addEventListener('click', () => {
  if (editor.playing) return;
  editor.rooms = sampleRooms();
  editor.roomIndex = 0;
  editor.selectedId = null;
  afterEdit();
});

document.getElementById('btn-clear').addEventListener('click', () => {
  if (editor.playing) return;
  if (window.confirm(`Clear "${curRoom().name}"?`)) {
    curRoom().objects = [];
    editor.selectedId = null;
    afterEdit();
  }
});

document.getElementById('btn-export').addEventListener('click', () => {
  const blob = new Blob(
    [JSON.stringify({ app: 'flockbuilder-builder', version: 2, rooms: editor.rooms }, null, 2)],
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
      const rooms = normalizeRooms(JSON.parse(reader.result));
      if (!rooms) throw new Error('bad file');
      editor.rooms = rooms;
      editor.roomIndex = 0;
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

const loaded = loadRooms();
if (loaded && loaded.length > 0) {
  editor.rooms = loaded;
} else {
  editor.rooms = defaultRooms();
  save();
}
editor.roomIndex = 0;
refreshEditor();
renderProps();
renderToolDesc();
game.pushScene(editScene);
game.start();
