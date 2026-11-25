// The renderer: everything the player sees, painted on one canvas in 2D. The
// kitchen is drawn from shapes alone — no image files, no fonts fetched — so the
// game runs offline from its own files. Every drawing helper is named for what
// it draws, so the outline shows the kitchen's parts.
import { CHEF, INGREDIENTS, RECIPES, SHIFT_SECONDS, STATIONS, VIEW } from './config.js';
import { grillState, potState, stationById } from './kitchen.js';
import { comboMultiplier } from './orders.js';
import { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

const CREAM = '#fdf6e9';
const INK = '#33241a';
const WOOD = '#8a5a3b';
const WOOD_DARK = '#6e452c';
const COUNTER_TOP = '#f3e2c7';
const FLOOR_A = '#c98f5f';
const FLOOR_B = '#bd8252';
const WALL = '#f6e7c9';
const RED = '#c0392b';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = 'bold', align = 'center') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function bar(ctx, x, y, w, h, fraction, fill, back = 'rgba(0,0,0,0.25)') {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = back;
  ctx.fill();
  if (fraction > 0) {
    roundRect(ctx, x, y, w * Math.max(0, Math.min(1, fraction)), h, h / 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

/** One ingredient's icon, drawn from shapes at (x, y) with the given size. */
export function drawIngredient(ctx, kind, x, y, size) {
  const def = INGREDIENTS[kind];
  if (!def) return;
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  switch (kind) {
    case 'tomato': {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, s * 0.15, s * 0.85, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = def.dark;
      ctx.beginPath(); ctx.arc(-s * 0.3, s * 0.4, s * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2f7d3d';
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        ctx.moveTo(0, -s * 0.6);
        ctx.lineTo(Math.cos(a) * s * 0.5, -s * 0.6 + Math.sin(a) * s * 0.5);
      }
      ctx.fill();
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = def.color;
      for (const [ox, oy, r] of [[-s * 0.4, 0, s * 0.55], [s * 0.4, 0, s * 0.55], [0, -s * 0.35, s * 0.6]]) {
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0.3, Math.PI - 0.3); ctx.stroke();
      break;
    }
    case 'bread': {
      ctx.fillStyle = def.dark;
      roundRect(ctx, -s, -s * 0.7, s * 2, s * 1.4, s * 0.4); ctx.fill();
      ctx.fillStyle = def.color;
      roundRect(ctx, -s * 0.85, -s * 0.55, s * 1.7, s * 1.1, s * 0.3); ctx.fill();
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.3); ctx.lineTo(-s * 0.2, s * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.3, -s * 0.3); ctx.lineTo(s * 0.5, s * 0.2); ctx.stroke();
      break;
    }
    case 'cheese': {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.moveTo(-s, s * 0.6); ctx.lineTo(0, -s * 0.8); ctx.lineTo(s, s * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = def.dark;
      for (const [hx, hy] of [[-s * 0.3, s * 0.2], [s * 0.25, s * 0.3], [0, -s * 0.25]]) {
        ctx.beginPath(); ctx.arc(hx, hy, s * 0.14, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'patty': {
      ctx.fillStyle = def.dark;
      roundRect(ctx, -s, -s * 0.55, s * 2, s * 1.1, s * 0.5); ctx.fill();
      ctx.fillStyle = def.color;
      roundRect(ctx, -s * 0.85, -s * 0.42, s * 1.7, s * 0.84, s * 0.4); ctx.fill();
      break;
    }
    case 'pattyGrilled': {
      ctx.fillStyle = def.dark;
      roundRect(ctx, -s, -s * 0.55, s * 2, s * 1.1, s * 0.5); ctx.fill();
      ctx.fillStyle = def.color;
      roundRect(ctx, -s * 0.85, -s * 0.42, s * 1.7, s * 0.84, s * 0.4); ctx.fill();
      ctx.strokeStyle = '#3a2113';
      ctx.lineWidth = 3;
      for (const ox of [-s * 0.4, 0, s * 0.4]) {
        ctx.beginPath(); ctx.moveTo(ox, -s * 0.4); ctx.lineTo(ox, s * 0.4); ctx.stroke();
      }
      break;
    }
    case 'pattyBurnt': {
      ctx.fillStyle = def.color;
      roundRect(ctx, -s, -s * 0.55, s * 2, s * 1.1, s * 0.5); ctx.fill();
      ctx.strokeStyle = '#5a5a5a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.quadraticCurveTo(s * 0.3, -s * 1.1, 0, -s * 1.4); ctx.stroke();
      break;
    }
    case 'tomatoChopped': {
      ctx.fillStyle = def.color;
      for (const [ox, oy] of [[-s * 0.45, -s * 0.2], [s * 0.4, -s * 0.3], [0, s * 0.4], [s * 0.5, s * 0.35], [-s * 0.1, -s * 0.5]]) {
        roundRect(ctx, ox - s * 0.32, oy - s * 0.28, s * 0.64, s * 0.56, 3); ctx.fill();
      }
      ctx.fillStyle = '#ff8a80';
      ctx.beginPath(); ctx.arc(-s * 0.45, -s * 0.2, s * 0.12, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'lettuceChopped': {
      ctx.strokeStyle = def.color;
      ctx.lineWidth = s * 0.32;
      ctx.lineCap = 'round';
      for (const [x1, y1, x2, y2] of [[-s * 0.6, -s * 0.4, s * 0.5, -s * 0.5], [-s * 0.5, 0, s * 0.6, s * 0.1], [-s * 0.6, s * 0.5, s * 0.4, s * 0.45]]) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      break;
    }
    case 'soup': {
      ctx.fillStyle = '#3a3a3a';
      ctx.beginPath(); ctx.arc(0, s * 0.1, s * 0.85, 0, Math.PI); ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, s * 0.05, s * 0.7, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.5); ctx.quadraticCurveTo(-s * 0.1, -s * 0.9, -s * 0.3, -s * 1.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.25, -s * 0.5); ctx.quadraticCurveTo(s * 0.45, -s * 0.9, s * 0.25, -s * 1.2); ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

/** A white plate, optionally holding small icons of its items. */
export function drawPlate(ctx, items, x, y, size) {
  const s = size / 2;
  ctx.fillStyle = '#e8e8e8';
  ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.78, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c8c8c8';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.78, s * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
  if (items) {
    const n = items.length;
    items.forEach((kind, i) => {
      const ox = n === 1 ? 0 : (i - (n - 1) / 2) * (size * 0.32);
      drawIngredient(ctx, kind, x + ox, y - size * 0.08, size * 0.42);
    });
  }
}

function drawStationBase(ctx, station, top, body, labelColor = INK) {
  roundRect(ctx, station.x, station.y, station.w, station.h, 10);
  ctx.fillStyle = body;
  ctx.fill();
  roundRect(ctx, station.x + 4, station.y + 4, station.w - 8, 26, 7);
  ctx.fillStyle = top;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2;
  roundRect(ctx, station.x, station.y, station.w, station.h, 10);
  ctx.stroke();
  text(ctx, station.label, station.x + station.w / 2, station.y + 17, 13, labelColor);
}

/** A small "READY!" badge floating just above a station. */
function drawReadyBadge(ctx, station, label, color) {
  const cx = station.x + station.w / 2;
  const y = station.y - 12;
  ctx.fillStyle = 'rgba(43,32,24,0.92)';
  roundRect(ctx, cx - 46, y - 11, 92, 22, 11);
  ctx.fill();
  text(ctx, label, cx, y + 1, 12, color);
}

function drawCrate(ctx, station, random) {
  drawStationBase(ctx, station, '#d9a05b', '#a9713f');
  const kind = station.gives;
  const cx = station.x + station.w / 2;
  const cy = station.y + 52;
  drawIngredient(ctx, kind, cx - 26, cy, 34);
  drawIngredient(ctx, kind, cx + 8, cy - 4, 38);
  drawIngredient(ctx, kind, cx + 30, cy + 2, 30);
  void random;
}

function drawBoard(ctx, kitchen) {
  const station = stationById('board');
  drawStationBase(ctx, station, '#f7ead0', '#b98a5e');
  const item = kitchen.board.item;
  if (item) {
    const done = item.progress >= 1;
    drawIngredient(ctx, done ? INGREDIENTS[item.kind].chop : item.kind, station.x + station.w / 2, station.y + 46, 36);
    if (!done) {
      bar(ctx, station.x + 30, station.y + station.h - 16, station.w - 60, 8, item.progress, '#e8b96a');
      text(ctx, 'HOLD E TO CHOP', station.x + station.w / 2, station.y + station.h - 30, 11, '#5a3a22');
    } else {
      text(ctx, 'CHOPPED — TAKE IT!', station.x + station.w / 2, station.y + station.h - 24, 11, '#2f7d3d');
    }
  } else {
    text(ctx, 'bring tomato or lettuce', station.x + station.w / 2, station.y + 58, 12, '#7a5a3a');
  }
}

function drawGrill(ctx, kitchen, time) {
  const station = stationById('grill');
  drawStationBase(ctx, station, '#5a5a5a', '#3d3d3d', '#f3e2c7');
  kitchen.grill.slots.forEach((slot, i) => {
    const cx = station.x + 62 + i * 126;
    const cy = station.y + 58;
    ctx.fillStyle = '#222';
    roundRect(ctx, cx - 52, cy - 24, 104, 48, 8);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    for (let g = -2; g <= 2; g += 1) {
      ctx.beginPath(); ctx.moveTo(cx + g * 18, cy - 22); ctx.lineTo(cx + g * 18, cy + 22); ctx.stroke();
    }
    if (slot) {
      const state = grillState(slot);
      drawIngredient(ctx, state === 'burnt' ? 'pattyBurnt' : 'pattyGrilled', cx, cy, 40);
      const fraction = Math.min(1, slot.seconds / 6);
      const color = state === 'burnt' ? '#e5484d' : state === 'done' ? '#58b368' : '#f7c948';
      bar(ctx, cx - 40, cy + 30, 80, 7, fraction, color);
      if (state === 'done') {
        drawReadyBadge(ctx, station, 'READY!', '#58b368');
      } else if (state === 'burnt') {
        drawReadyBadge(ctx, station, 'BURNT!', '#ff6b61');
      }
      if (state !== 'burnt') {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        const wobble = Math.sin(time * 3 + i * 2) * 4;
        ctx.beginPath(); ctx.arc(cx - 14 + wobble, cy - 34, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 10 - wobble, cy - 40, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  });
}

function drawPot(ctx, kitchen, time) {
  const station = stationById('pot');
  drawStationBase(ctx, station, '#5a6b7a', '#46545f', '#f3e2c7');
  const cx = station.x + station.w / 2;
  const cy = station.y + 58;
  // The pot: a dark vessel with a rim, liquid inside when it holds soup.
  ctx.fillStyle = '#2e2e2e';
  roundRect(ctx, cx - 46, cy - 22, 92, 46, 10);
  ctx.fill();
  ctx.fillStyle = '#4a4a4a';
  ctx.beginPath(); ctx.ellipse(cx, cy - 20, 46, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.ellipse(cx, cy - 20, 38, 7, 0, 0, Math.PI * 2); ctx.fill();
  const item = kitchen.pot.item;
  if (item) {
    const done = potState(item) === 'done';
    ctx.fillStyle = done ? '#d94f30' : '#c98a6a';
    ctx.beginPath(); ctx.ellipse(cx, cy - 20, 32, 6, 0, 0, Math.PI * 2); ctx.fill();
    const fraction = Math.min(1, item.seconds / 5);
    bar(ctx, cx - 40, cy + 30, 80, 7, fraction, done ? '#58b368' : '#e8873a');
    if (done) {
      drawReadyBadge(ctx, station, 'SOUP READY!', '#58b368');
    }
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(cx - 12 + Math.sin(time * 3) * 3, cy - 34, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 12 - Math.sin(time * 3) * 3, cy - 40, 2.5, 0, Math.PI * 2); ctx.fill();
  } else {
    text(ctx, 'needs chopped tomato', cx, cy + 6, 12, '#c8d2d8');
  }
}

function drawCounters(ctx, kitchen) {
  for (const id of ['counter-a', 'counter-b']) {
    const station = stationById(id);
    drawStationBase(ctx, station, COUNTER_TOP, WOOD);
    const counter = kitchen.counters[id];
    if (counter.plate) {
      drawPlate(ctx, counter.plate.items, station.x + station.w / 2, station.y + 62, 64);
    } else if (counter.item) {
      drawIngredient(ctx, counter.item, station.x + station.w / 2, station.y + 58, 42);
    } else {
      text(ctx, 'assemble dishes here', station.x + station.w / 2, station.y + 58, 12, '#7a5a3a');
    }
  }
}

function drawPlatesAndTrash(ctx, kitchen, time) {
  const plates = stationById('plates');
  drawStationBase(ctx, plates, COUNTER_TOP, WOOD);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i === 2 ? '#ffffff' : '#dcdcdc';
    ctx.beginPath(); ctx.ellipse(plates.x + plates.w / 2, plates.y + 48 + i * 8, 40, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b0b0b0';
    ctx.stroke();
  }
  text(ctx, 'take a plate', plates.x + plates.w / 2, plates.y + stationLabelOffset(), 11, '#7a5a3a');

  const trash = stationById('trash');
  drawStationBase(ctx, trash, '#7a7a7a', '#555');
  text(ctx, trash.label, trash.x + trash.w / 2, trash.y + 17, 13, '#f3e2c7');
  ctx.fillStyle = '#2e2e2e';
  roundRect(ctx, trash.x + 38, trash.y + 36, 60, 44, 6);
  ctx.fill();
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(trash.x + 38, trash.y + 44); ctx.lineTo(trash.x + 98, trash.y + 44); ctx.stroke();
  void time;
  void kitchen;
}

function stationLabelOffset() { return 84; }

function drawWindow(ctx, kitchen, time) {
  const station = stationById('window');
  const glow = 0.5 + 0.5 * Math.sin(time * 2);
  ctx.fillStyle = `rgba(247,201,72,${0.12 + glow * 0.1})`;
  roundRect(ctx, station.x - 10, station.y - 10, station.w + 20, station.h + 20, 14);
  ctx.fill();
  drawStationBase(ctx, station, '#f7c948', '#8a5a3b');
  text(ctx, 'serve finished plates here', station.x + station.w / 2, station.y + 44, 12, '#7a5a3a');
  text(ctx, 'E to serve', station.x + station.w / 2, station.y + 68, 12, '#5a3a22');
  void kitchen;
}

function drawChef(ctx, chef, time) {
  const bob = chef.walking ? Math.sin(chef.bob) * 2.5 : Math.sin(time * 2) * 1;
  const x = chef.x;
  const y = chef.y + bob * 0.4;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(x, chef.y + 22, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Body (apron).
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x, y + 6, 19, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3f6fb5';
  roundRect(ctx, x - 12, y - 2, 24, 18, 6);
  ctx.fill();
  // Head.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath(); ctx.arc(x, y - 16, 13, 0, Math.PI * 2); ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x - 8, y - 28, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - 32, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 8, y - 28, 7, 0, Math.PI * 2); ctx.fill();
  roundRect(ctx, x - 13, y - 30, 26, 7, 3);
  ctx.fill();
  // Eyes look where the chef faces.
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(x + chef.facing * 4 - 4, y - 16, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + chef.facing * 4 + 4, y - 16, 1.8, 0, Math.PI * 2); ctx.fill();
  // What the chef carries, held up high.
  if (chef.carry) {
    if (chef.carry.plate) {
      drawPlate(ctx, chef.carry.items, x, y - 52, 52);
    } else {
      drawIngredient(ctx, chef.carry.kind, x, y - 52, 40);
    }
  }
}

function drawOrderBoard(ctx, orders, time) {
  // The board strip across the top.
  ctx.fillStyle = '#3a2e26';
  ctx.fillRect(0, 0, VIEW.width, 96);
  ctx.fillStyle = '#2b211a';
  ctx.fillRect(0, 92, VIEW.width, 4);
  text(ctx, 'ORDER BOARD', 16, 22, 15, '#f7c948', 'bold', 'left');
  text(ctx, 'serve before the bar runs out!', 16, 46, 11, '#d9c8a8', 'normal', 'left');

  const tickets = orders.list;
  tickets.forEach((order, i) => {
    const x = 250 + i * 218;
    const y = 8;
    const w = 206;
    const h = 80;
    const urgent = order.left <= 10;
    const flashAlpha = urgent ? 0.55 + 0.45 * Math.sin(time * 8) : 1;
    ctx.save();
    ctx.globalAlpha = flashAlpha;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = urgent ? '#ffe1de' : CREAM;
    ctx.fill();
    ctx.strokeStyle = urgent ? '#e5484d' : '#d9c8a8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    text(ctx, order.name, x + 12, y + 16, 14, INK, 'bold', 'left');
    text(ctx, `$${order.coins}`, x + w - 12, y + 16, 14, '#2f7d3d', 'bold', 'right');
    order.needs.forEach((kind, j) => {
      drawIngredient(ctx, kind, x + 24 + j * 34, y + 44, 26);
    });
    const fraction = Math.max(0, order.left / order.patience);
    const color = fraction > 0.5 ? '#58b368' : fraction > 0.25 ? '#f7c948' : '#e5484d';
    bar(ctx, x + 12, y + h - 14, w - 24, 7, fraction, color);
    if (urgent) text(ctx, `${Math.ceil(order.left)}s`, x + w - 12, y + 44, 13, '#e5484d', 'bold', 'right');
  });

  if (tickets.length === 0) {
    text(ctx, 'No orders yet — the first ticket is coming…', 360, 48, 14, '#d9c8a8', 'normal', 'left');
  }
}

function drawHud(ctx, world) {
  const timeLeft = Math.max(0, SHIFT_SECONDS - world.elapsed);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = Math.floor(timeLeft % 60);
  // The bottom strip: coins, combo, best, timer, strikes.
  ctx.fillStyle = '#3a2e26';
  ctx.fillRect(0, 716, VIEW.width, 84);
  ctx.fillStyle = '#2b211a';
  ctx.fillRect(0, 716, VIEW.width, 4);
  // Coins.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, 12, 730, 150, 44, 10);
  ctx.fill();
  text(ctx, `🪙 ${world.coins}`, 26, 753, 20, '#f7c948', 'bold', 'left');
  // Combo.
  if (world.orders.combo >= 2) {
    const mult = comboMultiplier(world.orders.combo - 1);
    ctx.fillStyle = '#e8873a';
    roundRect(ctx, 172, 730, 142, 44, 10);
    ctx.fill();
    text(ctx, `COMBO x${world.orders.combo} (${mult.toFixed(2)}×)`, 243, 753, 14, '#fff');
  }
  // Best.
  text(ctx, `Best shift: ${world.best} coins`, 328, 753, 14, '#d9c8a8', 'normal', 'left');
  // Shift timer, right.
  const timerW = 220;
  const tx = VIEW.width - timerW - 12;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, tx, 730, timerW, 44, 10);
  ctx.fill();
  const timeColor = timeLeft <= 30 ? '#ff6b61' : '#ffffff';
  text(ctx, `⏱ ${minutes}:${String(seconds).padStart(2, '0')}`, tx + 14, 753, 19, timeColor, 'bold', 'left');
  // Strikes as hearts.
  for (let i = 0; i < 3; i += 1) {
    const hx = tx - 30 - i * 30;
    text(ctx, i < 3 - world.strikes ? '❤' : '🖤', hx, 753, 18, '#e5484d');
  }
  // Message banner, floating over the open floor between the counters and the window.
  if (world.message && world.messageTime > 0) {
    ctx.fillStyle = 'rgba(51,36,26,0.9)';
    const mw = 560;
    roundRect(ctx, (VIEW.width - mw) / 2, 448, mw, 36, 10);
    ctx.fill();
    text(ctx, world.message, VIEW.width / 2, 467, 15, '#fdf6e9');
  }
}

function drawKitchenFloor(ctx) {
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 96, VIEW.width, VIEW.height - 96);
  // Wood planks.
  for (let row = 0; row < 12; row += 1) {
    ctx.fillStyle = row % 2 === 0 ? FLOOR_A : FLOOR_B;
    ctx.fillRect(190, 96 + row * 51.7, 1070, 51.7);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(190, 96 + row * 51.7); ctx.lineTo(1260, 96 + row * 51.7); ctx.stroke();
  }
  // Wall trim and a rug by the window.
  ctx.fillStyle = '#e8d3ae';
  ctx.fillRect(190, 96, 1070, 10);
  ctx.fillStyle = '#b8452f';
  roundRect(ctx, 500, 448, 280, 44, 12);
  ctx.fill();
  ctx.strokeStyle = '#f7c948';
  ctx.lineWidth = 3;
  roundRect(ctx, 510, 456, 260, 28, 9);
  ctx.stroke();
}

function drawParticles(ctx, world) {
  for (const particle of world.particles) {
    ctx.globalAlpha = 1 - particle.age / particle.life;
    ctx.fillStyle = particle.color;
    ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const item of world.popups) {
    ctx.globalAlpha = 1 - item.age / item.life;
    text(ctx, item.text, item.x, item.y - item.age * 30, 18, item.color);
  }
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, world, time) {
  ctx.fillStyle = 'rgba(43,32,24,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const cx = VIEW.width / 2;
  text(ctx, 'EMBER & THYME', cx, 210, 64, '#f7c948');
  text(ctx, 'a hectic little kitchen', cx, 268, 24, '#fdf6e9', 'normal');
  ctx.fillStyle = CREAM;
  roundRect(ctx, cx - 330, 310, 660, 210, 16);
  ctx.fill();
  ctx.strokeStyle = '#d9a05b';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'HOW TO PLAY', cx, 340, 18, INK);
  const lines = [
    'WASD / arrows — move the chef   •   E / Space — pick up, place, chop',
    'Click a station to walk there and use it   •   M — sound   •   P — pause',
    'Grab ingredients, chop them on the board, grill patties, simmer soup,',
    'stack dishes on a plate and serve them at the window before time runs out!',
  ];
  lines.forEach((line, i) => text(ctx, line, cx, 372 + i * 26, 15, '#5a3a22', 'normal'));
  const pulse = 0.7 + 0.3 * Math.sin(time * 4);
  ctx.globalAlpha = pulse;
  text(ctx, 'Press ENTER or click to start the shift', cx, 566, 22, '#ffffff');
  ctx.globalAlpha = 1;
  if (world.best > 0) text(ctx, `Best shift: ${world.best} coins`, cx, 606, 16, '#f7c948', 'normal');
  text(ctx, '3-minute shifts  •  3 strikes and the shift ends early', cx, 640, 14, 'rgba(255,255,255,0.8)', 'normal');
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(43,32,24,0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'PAUSED', VIEW.width / 2, 360, 54, '#fdf6e9');
  text(ctx, 'Press P to keep cooking — R to restart the shift', VIEW.width / 2, 420, 18, '#f7c948', 'normal');
}

function drawOver(ctx, world) {
  ctx.fillStyle = 'rgba(43,32,24,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const cx = VIEW.width / 2;
  const title = world.overReason === 'strikes' ? 'THE CROWD WALKED OUT!' : 'SHIFT COMPLETE!';
  text(ctx, title, cx, 200, 48, '#f7c948');
  const stars = '★'.repeat(world.stars) + '☆'.repeat(3 - world.stars);
  text(ctx, stars, cx, 268, 44, '#f7c948');
  text(ctx, `${world.coins} coins  •  ${world.orders.served} dishes served`, cx, 330, 24, '#fdf6e9');
  const next = [120, 210, 300].find((bar) => world.coins < bar);
  text(ctx, next ? `${next - world.coins} coins short of the next star` : 'A perfect three-star shift!', cx, 366, 16, '#d9c8a8', 'normal');
  if (world.coins >= world.best && world.coins > 0) text(ctx, '★ New best shift! ★', cx, 402, 18, '#58b368');
  text(ctx, 'Press R to cook another shift', cx, 470, 20, '#ffffff');
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  return {
    draw(world, time) {
      ctx.clearRect(0, 0, VIEW.width, VIEW.height);
      drawKitchenFloor(ctx);
      for (const station of STATIONS) {
        if (station.kind === 'crate') drawCrate(ctx, station, world.random);
      }
      drawBoard(ctx, world.kitchen);
      drawGrill(ctx, world.kitchen, time);
      drawPot(ctx, world.kitchen, time);
      drawCounters(ctx, world.kitchen);
      drawPlatesAndTrash(ctx, world.kitchen, time);
      drawWindow(ctx, world.kitchen, time);
      drawChef(ctx, world.chef, time);
      drawParticles(ctx, world);
      drawOrderBoard(ctx, world.orders, time);
      drawHud(ctx, world);
      if (world.screen === SCREEN_TITLE) drawTitle(ctx, world, time);
      if (world.screen === SCREEN_PAUSED) drawPaused(ctx);
      if (world.screen === SCREEN_OVER) drawOver(ctx, world);
    },
  };
}
