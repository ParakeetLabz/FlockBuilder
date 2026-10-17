// FlockBuilder — builder/builder.js
// The visual, code-free Game Builder: multiple rooms, 15 object types,
// click-to-place, drag-to-move, properties panel, instant Play mode.
// Levels auto-save to localStorage and can be exported as JSON.

import { Game, Scene, Sprite } from '../src/flock.js';
import { PlayScene, WORLD_W, WORLD_H, validObj, normalizeRooms, parsePLL, rulesToPLL, Decor } from './game-objects.js';

const STORE_KEY = 'flockbuilder-builder-level-v1';
const PREFAB_KEY = 'flockbuilder-prefabs-v1';
const SNAP = 10;

const DEFAULTS = {
  player: { w: 36, h: 46, color: '#22d3ee', label: 'Player — you. Arrows/AD to move, Space to jump.' },
  wall: { w: 140, h: 30, color: '#475569', label: 'Wall — solid platform.' },
  coin: { w: 26, h: 26, color: '#fde047', label: 'Coin — collect for points.' },
  enemy: { w: 38, h: 38, color: '#ef4444', range: 160, speed: 130, hp: 1, label: 'Enemy — patrols. Stomp it!' },
  goal: { w: 54, h: 70, color: '#22c55e', label: 'Goal — reach the flag for the next room.' },
  platform: { w: 120, h: 24, color: '#8b5cf6', range: 200, speed: 100, axis: 'x', label: 'Moving platform — rides you along.' },
  spikes: { w: 80, h: 24, color: '#f97316', label: 'Spikes — ouch.' },
  spring: { w: 44, h: 28, color: '#a3e635', power: 1100, label: 'Spring — bounces you sky-high.' },
  key: { w: 26, h: 30, color: '#fbbf24', label: 'Key — opens every door in the room.' },
  door: { w: 44, h: 76, color: '#b45309', label: 'Door — solid until you grab a key.' },
  sign: { w: 34, h: 44, color: '#d6a35c', message: 'Hello!', label: 'Sign — shows a message when touched.' },
  actor: { w: 40, h: 40, color: '#38bdf8', label: 'Actor — blank slate. Give it rules below and it comes alive.' },
  label: { w: 140, h: 30, color: '#ffffff', text: 'Hello!', size: 20, label: 'Label — text pinned to the screen (UI layer).' },
  checkpoint: { w: 40, h: 64, color: '#a78bfa', label: 'Checkpoint — touch to set your respawn point.' },
  decor: { w: 44, h: 44, color: '#4ade80', variant: 'flower', label: 'Decor — pretty, no collision. Change the style in Properties.' },
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
  debug: false,
  effects: {},
};

const curRoom = () => editor.rooms[editor.roomIndex];
const objs = () => curRoom().objects;

// ------------------------------------------------------------ persistence

function loadProject() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function loadRooms() {
  const data = loadProject();
  return data ? normalizeRooms(data) : null;
}

function loadEffects() {
  const data = loadProject();
  return data && data.effects && typeof data.effects === 'object' ? data.effects : {};
}

function save() {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ app: 'flockbuilder-builder', version: 2, rooms: editor.rooms, effects: editor.effects })
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
    // Selection outline (glow)
    const sel = objs().find((o) => o.id === editor.selectedId);
    if (sel) {
      ctx.save();
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(sel.x - 4, sel.y - 4, sel.w + 8, sel.h + 8);
      ctx.restore();
      // Resize handle
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(sel.x + sel.w - 2, sel.y + sel.h - 2, 10, 10);
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
    if (o.type === 'label') {
      // Labels preview as text, like they appear in the game UI layer
      s.draw = (ctx) => {
        ctx.save();
        ctx.font = `bold ${o.size || 20}px system-ui, sans-serif`;
        ctx.fillStyle = o.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(o.text || 'Label', o.x, o.y);
        ctx.restore();
      };
    } else if (o.type === 'actor' && o.image) {
      const img = new Image();
      img.src = o.image;
      const drawShape = s.draw.bind(s);
      s.draw = (ctx) => {
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, o.x, o.y, o.w, o.h);
        } else {
          drawShape(ctx);
        }
      };
    } else if (o.type === 'decor') {
      // Preview the decor glyph, like it appears in the game
      const d = new Decor(o);
      s.draw = (ctx) => d.draw(ctx);
    } else if (o.type === 'enemy' && (o.hp ?? 1) > 1) {
      // Boss badge: show HP above the preview
      const drawShape = s.draw.bind(s);
      s.draw = (ctx) => {
        drawShape(ctx);
        ctx.save();
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`❤${o.hp}`, o.x + o.w / 2, o.y - 4);
        ctx.restore();
      };
    }
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
    o.hp = d.hp ?? 1;
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
  } else if (type === 'label') {
    o.text = d.text;
    o.size = d.size;
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
  // Theme picker for the current room
  const themeWrap = document.createElement('span');
  themeWrap.className = 'theme-wrap';
  themeWrap.title = 'Room theme (sky)';
  const themeSel = document.createElement('select');
  themeSel.className = 'theme-sel';
  for (const [v, label] of [['day', '☀️ Day'], ['sunset', '🌇 Sunset'], ['night', '🌙 Night'], ['cave', '🕳️ Cave']]) {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = label;
    themeSel.appendChild(opt);
  }
  themeSel.value = editor.rooms[editor.roomIndex].theme || 'day';
  themeSel.addEventListener('change', () => {
    if (editor.playing) return;
    editor.rooms[editor.roomIndex].theme = themeSel.value;
    save();
  });
  themeWrap.appendChild(themeSel);
  bar.appendChild(themeWrap);
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
    ${o.type === 'enemy' ? `<label>HP (hits to beat)<input id="php" type="number" value="${o.hp ?? 1}" min="1" max="20" step="1"></label>` : ''}
    ${o.type === 'decor' ? `<label>Style <select id="pvariant">${['flower', 'grass', 'bush', 'rock', 'cloud', 'star'].map((v) => `<option value="${v}"${(o.variant || 'flower') === v ? ' selected' : ''}>${v[0].toUpperCase() + v.slice(1)}</option>`).join('')}</select></label>` : ''}
    ${o.type === 'label' ? `
      <label>Text<input id="plabel" type="text" maxlength="80" value="${String(o.text || '').replace(/"/g, '&quot;')}"></label>
      <label>Size<input id="psize" type="number" value="${o.size || 20}" min="8" max="72" step="1"></label>
    ` : ''}
    ${o.type === 'actor' ? `
      <label class="check"><input id="pgrv" type="checkbox" ${o.gravity !== false ? 'checked' : ''}> Affected by gravity</label>
      <label class="check"><input id="psol" type="checkbox" ${o.solid ? 'checked' : ''}> Solid (blocks the player)</label>
      <label>Sprite image <input id="pimg" type="file" accept="image/*"></label>
      <div id="imgprev">${o.image ? `<img src="${o.image}" alt="sprite preview" style="max-width:100%;border-radius:6px;display:block;margin-bottom:4px"><button id="pimgdel" type="button">Remove image</button>` : '<span class="muted small">No image — the colored shape is used.</span>'}</div>
      <div class="tabs"><button id="tab-visual" class="tabbtn active" type="button">PLL Visual</button><button id="tab-code" class="tabbtn" type="button">PLL Code</button></div>
      <div id="rules-wrap"><h4>Rules <span class="muted small">— when / then</span></h4><div id="rules-list"></div><button id="rule-add" type="button">+ Add rule</button></div>
      <div id="plc-wrap" style="display:none">
        <textarea id="plc-text" rows="11" spellcheck="false" placeholder="when timer 1.5 then jump 700"></textarea>
        <div class="row"><button id="plc-apply" type="button">Apply PLL</button><button id="plc-revert" type="button">Revert</button></div>
        <div id="plc-errors"></div>
        <p class="muted small">PLL — Parakeet Labz Language. One rule per line:<br><code>when &lt;trigger&gt; then &lt;action&gt;</code><br>e.g. <code>when key E then move right 200</code><br><a href="https://github.com/ParakeetLabz/FlockBuilder/blob/main/docs/pll.md" target="_blank" rel="noopener" style="color:#38bdf8">📖 PLL guide</a></p>
      </div>
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
  const hpEl = document.getElementById('php');
  if (hpEl) {
    hpEl.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      if (Number.isFinite(v)) {
        o.hp = Math.max(1, Math.min(20, v));
        refreshEditor();
        save();
      }
    });
  }
  const variantEl = document.getElementById('pvariant');
  if (variantEl) {
    variantEl.addEventListener('change', (e) => {
      o.variant = e.target.value;
      refreshEditor();
      save();
    });
  }
  const labelEl = document.getElementById('plabel');
  if (labelEl) {
    labelEl.addEventListener('input', (e) => {
      o.text = e.target.value.slice(0, 80);
      refreshEditor();
      save();
    });
  }
  const sizeEl = document.getElementById('psize');
  if (sizeEl) {
    sizeEl.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (Number.isFinite(v)) {
        o.size = Math.max(8, Math.min(72, v));
        refreshEditor();
        save();
      }
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
  score: 'Score reaches',
  cleared: 'All enemies beaten',
  destroyed: 'When destroyed',
};
const ACTIONS = {
  move: 'Move',
  jump: 'Jump',
  shoot: 'Shoot',
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
  if (r.trigger === 'score') {
    return 'reaches ' + numHtml('score', i, r.score ?? 5, 1, 999, 1);
  }
  return '';
}

function actionParams(r, i) {
  switch (r.action) {
    case 'move':
      return selHtml('direction', i, RULE_DIRS, r.direction || 'right') + ' ' + numHtml('speed', i, r.speed ?? 200, 0, 1000, 10);
    case 'shoot':
      return selHtml('direction', i, RULE_DIRS, r.direction || 'right') + ' ' + numHtml('speed', i, r.speed ?? 500, 100, 1200, 25);
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
    case 'fx': {
      const names = Object.keys(editor.effects);
      if (!names.length) return '<span class="muted small">no effects yet — open the FX editor</span>';
      return selHtml('fx', i, Object.fromEntries(names.map((n) => [n, n])), r.fx || names[0]);
    }
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

  // Sprite image upload
  const imgInput = document.getElementById('pimg');
  imgInput.addEventListener('change', () => {
    const f = imgInput.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      o.image = rd.result;
      save();
      refreshEditor();
      renderProps();
    };
    rd.readAsDataURL(f);
  });
  const imgDel = document.getElementById('pimgdel');
  if (imgDel) {
    imgDel.addEventListener('click', () => {
      o.image = null;
      save();
      refreshEditor();
      renderProps();
    });
  }

  // PLL Visual / PLL Code tabs
  const showTab = (code) => {
    document.getElementById('rules-wrap').style.display = code ? 'none' : '';
    document.getElementById('plc-wrap').style.display = code ? '' : 'none';
    document.getElementById('tab-visual').classList.toggle('active', !code);
    document.getElementById('tab-code').classList.toggle('active', code);
    if (code) {
      document.getElementById('plc-text').value = rulesToPLL(o.rules);
      document.getElementById('plc-errors').innerHTML = '';
    }
  };
  document.getElementById('tab-visual').addEventListener('click', () => showTab(false));
  document.getElementById('tab-code').addEventListener('click', () => showTab(true));
  document.getElementById('plc-revert').addEventListener('click', () => {
    document.getElementById('plc-text').value = rulesToPLL(o.rules);
    document.getElementById('plc-errors').innerHTML = '';
  });
  document.getElementById('plc-apply').addEventListener('click', () => {
    const { rules, errors } = parsePLL(document.getElementById('plc-text').value);
    const errBox = document.getElementById('plc-errors');
    if (errors.length > 0) {
      errBox.innerHTML = errors.map((e) => `<div class="plc-err">Line ${e.line}: ${e.message}</div>`).join('');
    } else {
      errBox.innerHTML = '';
      o.rules = rules;
      save();
      renderRulesList(o);
      showTab(false);
    }
  });

  renderRulesList(o);
  wireRules(o);
}

// ------------------------------------------------------------------ modal

const modalBack = document.getElementById('modal-back');
const modalBox = document.getElementById('modal-box');

function openModal(html) {
  modalBox.innerHTML = html;
  modalBack.style.display = 'flex';
}

function closeModal() {
  modalBack.style.display = 'none';
  modalBox.innerHTML = '';
}

modalBack.addEventListener('click', (e) => {
  if (e.target === modalBack) closeModal();
});
document.getElementById('modal-x').addEventListener('click', closeModal);

// ---------------------------------------------------------- prefab library

function loadPrefabs() {
  try {
    const raw = localStorage.getItem(PREFAB_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((p) => p && p.name && p.obj && validObj(p.obj)) : [];
  } catch (e) {
    return [];
  }
}

function savePrefabs(list) {
  try {
    localStorage.setItem(PREFAB_KEY, JSON.stringify(list));
  } catch (e) {
    /* ignore */
  }
}

function openPrefabModal() {
  const render = () => {
    const list = loadPrefabs();
    const sel = byId(editor.selectedId);
    openModal(`
      <h2>Prefab Library</h2>
      <p class="muted">Save any object as a reusable prefab, then stamp copies into any room.</p>
      <div id="prefab-list">
        ${list.length === 0 ? '<p class="muted">No prefabs yet — select an object and save it below.</p>' : ''}
        ${list
          .map(
            (p, i) => `
          <div class="prefab-row">
            <span class="dot" style="background:${p.obj.color || '#888'}"></span>
            <b>${String(p.name).replace(/</g, '&lt;')}</b>
            <span class="muted small">${p.obj.type}</span>
            <span class="spacer"></span>
            <button data-stamp="${i}" type="button">Stamp</button>
            <button data-delprefab="${i}" type="button" class="danger">Delete</button>
          </div>`
          )
          .join('')}
      </div>
      <div class="row" style="margin-top:12px">
        <input id="prefab-name" type="text" placeholder="Prefab name" maxlength="30" style="flex:1">
        <button id="prefab-save" type="button" ${sel ? '' : 'disabled'}>Save selected as prefab</button>
      </div>
      ${sel ? '' : '<p class="muted small">Select an object on the canvas to save it.</p>'}
    `);
    modalBox.querySelectorAll('[data-stamp]').forEach((b) =>
      b.addEventListener('click', () => {
        const p = loadPrefabs()[+b.dataset.stamp];
        if (!p) return;
        const copy = JSON.parse(JSON.stringify(p.obj));
        copy.id = nid();
        copy.x = snap(WORLD_W / 2 - copy.w / 2);
        copy.y = snap(WORLD_H / 2 - copy.h / 2);
        objs().push(copy);
        editor.selectedId = copy.id;
        closeModal();
        afterEdit();
      })
    );
    modalBox.querySelectorAll('[data-delprefab]').forEach((b) =>
      b.addEventListener('click', () => {
        const l = loadPrefabs();
        l.splice(+b.dataset.delprefab, 1);
        savePrefabs(l);
        render();
      })
    );
    const saveBtn = modalBox.querySelector('#prefab-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const s = byId(editor.selectedId);
        const name = modalBox.querySelector('#prefab-name').value.trim().slice(0, 30);
        if (!s || !name) return;
        const l = loadPrefabs();
        l.push({ name, obj: JSON.parse(JSON.stringify(s)) });
        savePrefabs(l);
        render();
      });
    }
  };
  render();
}

document.getElementById('btn-prefabs').addEventListener('click', () => {
  if (!editor.playing) openPrefabModal();
});

// ------------------------------------------------------- particle FX editor

const FX_DEFAULTS = {
  count: 24, color1: '#ffffff', color2: '#22d3ee',
  speed: 220, gravity: 500, life: 0.8, size: 5, shape: 'circle',
};

function fxPreviewBurst(canvas, fx) {
  const ctx = canvas.getContext('2d');
  const parts = [];
  for (let i = 0; i < fx.count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = fx.speed * (0.3 + Math.random() * 0.7);
    parts.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: fx.life * (0.6 + Math.random() * 0.4),
      t: 0,
      size: Math.max(1, fx.size * (0.6 + Math.random() * 0.6)),
      color: Math.random() < 0.5 ? fx.color1 : fx.color2,
    });
  }
  if (fxPreviewBurst._raf) cancelAnimationFrame(fxPreviewBurst._raf);
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of parts) {
      p.t += dt;
      if (p.t >= p.life) continue;
      alive = true;
      p.vy += fx.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.fillStyle = p.color;
      if (fx.shape === 'square') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, 7);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (alive) fxPreviewBurst._raf = requestAnimationFrame(tick);
  };
  fxPreviewBurst._raf = requestAnimationFrame(tick);
}

function openFxModal() {
  const cur = { ...FX_DEFAULTS };
  const sliders = [
    ['count', 'Particles', 5, 100, 1],
    ['speed', 'Speed', 50, 600, 10],
    ['gravity', 'Gravity', 0, 1500, 25],
    ['life', 'Life (sec)', 0.2, 2, 0.1],
    ['size', 'Size', 2, 12, 1],
  ];
  openModal(`
    <h2>Particle FX</h2>
    <p class="muted">Design an effect, save it, then trigger it from any actor with PLL: <code>then fx name</code>.</p>
    <canvas id="fx-preview" width="320" height="170" style="width:100%;border-radius:8px;background:#020617;border:1px solid #1e293b"></canvas>
    <div id="fx-controls">
      ${sliders
        .map(
          ([k, label, min, max, step]) => `
        <label>${label} <span id="fxv-${k}">${cur[k]}</span>
        <input type="range" id="fx-${k}" min="${min}" max="${max}" step="${step}" value="${cur[k]}"></label>`
        )
        .join('')}
      <div class="row">
        <label>Color 1 <input type="color" id="fx-color1" value="${cur.color1}"></label>
        <label>Color 2 <input type="color" id="fx-color2" value="${cur.color2}"></label>
        <label>Shape <select id="fx-shape"><option value="circle">Circle</option><option value="square">Square</option></select></label>
      </div>
    </div>
    <div class="row" style="margin-top:10px">
      <button id="fx-burst" type="button">Burst preview</button>
      <input id="fx-name" type="text" placeholder="Effect name" maxlength="24" style="flex:1">
      <button id="fx-save" type="button">Save effect</button>
    </div>
    <div id="fx-list" style="margin-top:10px"></div>
  `);
  const preview = modalBox.querySelector('#fx-preview');
  for (const [k] of sliders) {
    modalBox.querySelector(`#fx-${k}`).addEventListener('input', (e) => {
      cur[k] = parseFloat(e.target.value);
      modalBox.querySelector(`#fxv-${k}`).textContent = cur[k];
    });
  }
  modalBox.querySelector('#fx-color1').addEventListener('input', (e) => (cur.color1 = e.target.value));
  modalBox.querySelector('#fx-color2').addEventListener('input', (e) => (cur.color2 = e.target.value));
  modalBox.querySelector('#fx-shape').addEventListener('change', (e) => (cur.shape = e.target.value));
  modalBox.querySelector('#fx-burst').addEventListener('click', () => fxPreviewBurst(preview, cur));

  const renderList = () => {
    const names = Object.keys(editor.effects);
    modalBox.querySelector('#fx-list').innerHTML =
      names.length === 0
        ? '<p class="muted small">No saved effects yet.</p>'
        : names
            .map(
              (n) => `
          <div class="prefab-row">
            <b>${String(n).replace(/</g, '&lt;')}</b>
            <span class="spacer"></span>
            <button data-fxtest="${String(n).replace(/"/g, '&quot;')}" type="button">Test</button>
            <button data-fxdel="${String(n).replace(/"/g, '&quot;')}" type="button" class="danger">Delete</button>
          </div>`
            )
            .join('');
    modalBox.querySelectorAll('[data-fxtest]').forEach((b) =>
      b.addEventListener('click', () => fxPreviewBurst(preview, editor.effects[b.dataset.fxtest]))
    );
    modalBox.querySelectorAll('[data-fxdel]').forEach((b) =>
      b.addEventListener('click', () => {
        delete editor.effects[b.dataset.fxdel];
        save();
        renderList();
      })
    );
  };
  modalBox.querySelector('#fx-save').addEventListener('click', () => {
    const name = modalBox.querySelector('#fx-name').value.trim().slice(0, 24);
    if (!name) return;
    editor.effects[name] = { ...cur };
    save();
    modalBox.querySelector('#fx-name').value = '';
    renderList();
  });
  renderList();
  fxPreviewBurst(preview, cur);
}

document.getElementById('btn-fx').addEventListener('click', () => {
  if (!editor.playing) openFxModal();
});

// ------------------------------------------------------------------ play

const playBtn = document.getElementById('play-btn');

function startPlay(roomIndex) {
  if (editor.playing) return;
  editor.playing = true;
  document.body.classList.add('playing');
  playBtn.innerHTML = '⏹ Stop';
  playBtn.classList.add('stop');
  // Drop keyboard focus so Space (jump) doesn't re-trigger the button
  if (document.activeElement) document.activeElement.blur();
  const scene = new PlayScene(game, editor.rooms, roomIndex, editor.effects);
  scene.debug = editor.debug;
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

// ------------------------------------------------------------ debug toggle

const debugBtn = document.getElementById('btn-debug');
debugBtn.addEventListener('click', () => {
  editor.debug = !editor.debug;
  debugBtn.classList.toggle('on', editor.debug);
});

// ------------------------------------------------------ publish standalone
// Builds a single self-contained HTML5 file: the engine + the game data,
// no server or build step needed. It runs anywhere a browser runs.

const BUNDLE_FILES = [
  '../src/utils.js',
  '../src/entity.js',
  '../src/sprite.js',
  '../src/scene.js',
  '../src/input.js',
  '../src/physics.js',
  '../src/camera.js',
  '../src/audio.js',
  '../src/particles.js',
  '../src/text.js',
  '../src/engine.js',
  './game-objects.js',
];

async function buildStandalone() {
  let bundle = '';
  for (const f of BUNDLE_FILES) {
    const res = await fetch(f);
    if (!res.ok) throw new Error('could not load ' + f);
    let code = await res.text();
    code = code
      .replace(/^import\b[\s\S]*?\bfrom\s*['"][^'"]*['"];?/gm, '')
      .replace(/\bimport\s*{[^}]*}\s*from\s*['"][^'"]*['"];?/g, '')
      .replace(/\bexport\s+(?=(?:class|function|const|let|var)\b)/g, '');
    bundle += `\n// ---- ${f} ----\n` + code;
  }
  const data = JSON.stringify({ rooms: editor.rooms, effects: editor.effects }).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My FlockBuilder Game</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#020617; min-height:100vh; display:flex; align-items:center; justify-content:center; }
  canvas { max-width:100vw; max-height:100vh; }
</style>
</head>
<body>
<canvas id="game"></canvas>
<script>
${bundle}
const GAME_DATA = ${data};
(function () {
  const game = new Game({ width: 960, height: 540, canvas: document.getElementById('game') });
  game.audio.define('boing', (a) => a.tone(180, 0.28, 'square', 0.3, 820));
  function runRoom(i) {
    const scene = new PlayScene(game, GAME_DATA.rooms, i, GAME_DATA.effects || {});
    scene.onRestart = () => { game.popScene(); runRoom(i); };
    scene.onAdvance = () => { game.popScene(); runRoom(i + 1); };
    scene.onStop = () => {};
    game.pushScene(scene);
  }
  runRoom(0);
  game.start();
})();
<\/script>
</body>
</html>`;
}

document.getElementById('btn-publish').addEventListener('click', async () => {
  if (editor.playing) return;
  const btn = document.getElementById('btn-publish');
  btn.disabled = true;
  const old = btn.textContent;
  btn.textContent = 'Building…';
  try {
    const html = await buildStandalone();
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'my-flockbuilder-game.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch (err) {
    window.alert('Could not build the game file: ' + err.message);
  }
  btn.disabled = false;
  btn.textContent = old;
});

// -------------------------------------------------- level actions

function wall(x, y, w, h, color) {
  return { id: nid(), type: 'wall', x, y, w, h, color: color || DEFAULTS.wall.color };
}

// mk: like makeObj but with top-left (x, y) instead of centering —
// handy for laying out the sample game on a grid.
function mk(type, x, y) {
  const o = makeObj(type, 0, 0);
  o.x = snap(x);
  o.y = snap(y);
  return o;
}

function defaultRooms() {
  const p = makeObj('player', 0, 0);
  p.x = 60;
  p.y = WORLD_H - 40 - p.h;
  return [{ name: 'Room 1', theme: 'day', objects: [wall(0, WORLD_H - 40, WORLD_W, 40), p] }];
}

function sampleRooms() {
  // Pip's Adventure — a 3-room showcase: meadow tutorial, sunset cliffs,
  // and a night boss fight. Shows off themes, decor, PLL, checkpoints,
  // stomping, turrets, and the boss's 5 HP.
  const G = WORLD_H - 40;

  // ------------------------------------------------ Room 1: Sunny Meadow
  const r1 = [];
  r1.push(wall(0, G, WORLD_W, 40));
  r1.push(wall(150, 410, 150, 24));
  r1.push(wall(380, 330, 150, 24));
  r1.push(wall(620, 410, 150, 24));
  r1.push(mk('player', 60, G - 46));
  const spr = mk('spring', 300, G - 24); r1.push(spr);
  for (const [cx, cy] of [[225, 370], [455, 290], [695, 370], [500, 200]]) r1.push(mk('coin', cx, cy));
  const e1 = mk('enemy', 480, G - 38); e1.range = 120; r1.push(e1);
  r1.push(mk('checkpoint', 350, G - 64));
  r1.push(mk('goal', 870, G - 70));
  const s1 = mk('sign', 120, G - 44); s1.message = "Welcome to Pip's Adventure! Arrows move, Space jumps."; r1.push(s1);
  const s2 = mk('sign', 420, G - 44); s2.message = 'Land on red guys to stomp them!'; r1.push(s2);
  const l1 = mk('label', 20, 16); l1.text = '🌼 Sunny Meadow'; l1.size = 28; r1.push(l1);
  for (const [dx, v] of [[80, 'flower'], [200, 'grass'], [550, 'flower'], [700, 'bush'], [900, 'grass']]) {
    const d = mk('decor', dx, G - 40); d.variant = v; r1.push(d);
  }
  for (const [dx, dy] of [[150, 80], [500, 60], [800, 120]]) {
    const d = mk('decor', dx, dy); d.variant = 'cloud'; r1.push(d);
  }

  // ------------------------------------------------ Room 2: Sunset Cliffs
  const r2 = [];
  r2.push(wall(0, G, 300, 40));
  r2.push(wall(380, G, 220, 40));
  r2.push(wall(680, G, 280, 40));
  r2.push(wall(120, 380, 140, 24));
  r2.push(wall(420, 300, 140, 24));
  r2.push(wall(700, 380, 140, 24));
  r2.push(mk('player', 60, G - 46));
  r2.push(mk('spikes', 450, G - 24));
  const e2a = mk('enemy', 150, G - 38); e2a.range = 100; r2.push(e2a);
  const e2b = mk('enemy', 730, G - 38); e2b.range = 100; r2.push(e2b);
  r2.push(mk('checkpoint', 400, G - 64));
  r2.push(mk('goal', 880, G - 70));
  for (const [cx, cy] of [[190, 340], [490, 260], [770, 340]]) r2.push(mk('coin', cx, cy));
  // Turret: shoots AT the player on a timer
  const t1 = mk('actor', 620, 200); t1.gravity = false;
  t1.rules = [{ trigger: 'timer', seconds: 1.8, action: 'shoot', direction: 'toward', speed: 350 }];
  r2.push(t1);
  const s3 = mk('sign', 60, G - 44); s3.message = 'A turret guards the cliffs — keep moving!'; r2.push(s3);
  const s4 = mk('sign', 700, G - 44); s4.message = 'Jump the gaps!'; r2.push(s4);
  const l2 = mk('label', 20, 16); l2.text = '🌇 Sunset Cliffs'; l2.size = 28; r2.push(l2);
  for (const [dx, v] of [[100, 'grass'], [250, 'rock'], [640, 'rock'], [850, 'grass']]) {
    const d = mk('decor', dx, G - 40); d.variant = v; r2.push(d);
  }
  const dc2 = mk('decor', 300, 70); dc2.variant = 'cloud'; r2.push(dc2);

  // ------------------------------------------------ Room 3: Night Boss
  const r3 = [];
  r3.push(wall(0, G, WORLD_W, 40));
  r3.push(wall(0, 0, 24, G));
  r3.push(wall(WORLD_W - 24, 0, 24, G));
  r3.push(mk('player', 80, G - 46));
  r3.push(mk('checkpoint', 150, G - 64));
  // The boss: big, fast, 5 HP
  const boss = mk('enemy', 600, G - 70); boss.w = 70; boss.h = 70; boss.hp = 5;
  boss.speed = 200; boss.range = 250; r3.push(boss);
  // Turret guards: one of them declares victory when the room is cleared
  const t2 = mk('actor', 250, 150); t2.gravity = false;
  t2.rules = [
    { trigger: 'timer', seconds: 2.2, action: 'shoot', direction: 'toward', speed: 320 },
    { trigger: 'cleared', action: 'win' },
  ];
  r3.push(t2);
  const t3 = mk('actor', 710, 150); t3.gravity = false;
  t3.rules = [{ trigger: 'timer', seconds: 2.8, action: 'shoot', direction: 'toward', speed: 320 }];
  r3.push(t3);
  const s5 = mk('sign', 220, G - 44); s5.message = 'The boss takes 5 hits. Dodge the turrets!'; r3.push(s5);
  const l3 = mk('label', 20, 16); l3.text = '👑 Night Boss'; l3.size = 28; r3.push(l3);
  const l4 = mk('label', 330, 60); l4.text = 'Stomp or shoot him 5 times!'; l4.size = 20; r3.push(l4);
  for (const [dx, dy] of [[200, 100], [400, 80], [600, 120], [800, 90], [100, 150], [500, 200]]) {
    const d = mk('decor', dx, dy); d.variant = 'star'; r3.push(d);
  }

  return [
    { name: 'Sunny Meadow', theme: 'day', objects: r1 },
    { name: 'Sunset Cliffs', theme: 'sunset', objects: r2 },
    { name: 'Night Boss', theme: 'night', objects: r3 },
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
    [JSON.stringify({ app: 'flockbuilder-builder', version: 2, rooms: editor.rooms, effects: editor.effects }, null, 2)],
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
      const rooms = normalizeRooms(data);
      if (!rooms) throw new Error('bad file');
      editor.rooms = rooms;
      if (data.effects && typeof data.effects === 'object' && !Array.isArray(data.effects)) {
        editor.effects = data.effects;
      }
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
editor.effects = loadEffects();
editor.roomIndex = 0;
refreshEditor();
renderProps();
renderToolDesc();
game.pushScene(editScene);
game.start();
