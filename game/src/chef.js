// The chef: movement, collision with the stations and the walls, and the walk
// target a mouse click sets. The chef is a circle; stations are rectangles.
// Click-to-walk routes around the stations with a small A* over a grid of the
// floor, so the chef never gets wedged walking straight through a counter.
import { CHEF, FLOOR, SPAWN, STATIONS } from './config.js';

const CELL = 32;
const COLS = Math.ceil(FLOOR.w / CELL);
const ROWS = Math.ceil(FLOOR.h / CELL);

export function createChef() {
  return {
    x: SPAWN.x,
    y: SPAWN.y,
    facing: 1,
    walking: false,
    carry: null,
    target: null,
    path: null,
    bob: 0,
  };
}

function cellCenter(col, row) {
  return { x: FLOOR.x + (col + 0.5) * CELL, y: FLOOR.y + (row + 0.5) * CELL };
}

function pointToCell(x, y) {
  return {
    col: Math.max(0, Math.min(COLS - 1, Math.floor((x - FLOOR.x) / CELL))),
    row: Math.max(0, Math.min(ROWS - 1, Math.floor((y - FLOOR.y) / CELL))),
  };
}

/** Is a point clear of every station, with the chef's radius to spare? */
function pointClear(x, y) {
  for (const station of STATIONS) {
    const cx = Math.max(station.x, Math.min(x, station.x + station.w));
    const cy = Math.max(station.y, Math.min(y, station.y + station.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < (CHEF.radius + 2) * (CHEF.radius + 2)) return false;
  }
  return true;
}

function cellFree(col, row) {
  const point = cellCenter(col, row);
  return pointClear(point.x, point.y);
}

/** Does the straight segment between two points clip a station? */
function segmentClear(a, b) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8));
  for (let i = 0; i <= steps; i += 1) {
    const x = a.x + ((b.x - a.x) * i) / steps;
    const y = a.y + ((b.y - a.y) * i) / steps;
    if (!pointClear(x, y)) return false;
  }
  return true;
}

/** A* over the floor grid, 8-way, no cutting corners. Returns cell centres. */
function findPath(from, to) {
  const start = pointToCell(from.x, from.y);
  let goal = pointToCell(to.x, to.y);
  // The goal cell itself may sit inside a station's margin (a front point just
  // past a counter's edge): aim for the nearest free cell instead.
  if (!cellFree(goal.col, goal.row)) {
    let found = null;
    for (let radius = 1; radius <= 4 && !found; radius += 1) {
      for (let dc = -radius; dc <= radius && !found; dc += 1) {
        for (let dr = -radius; dr <= radius && !found; dr += 1) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius) continue;
          const col = goal.col + dc;
          const row = goal.row + dr;
          if (col < 0 || row < 0 || col >= COLS || row >= ROWS) continue;
          if (cellFree(col, row)) found = { col, row };
        }
      }
    }
    if (!found) return null;
    goal = found;
  }
  const key = (col, row) => row * COLS + col;
  const open = [{ col: start.col, row: start.row, g: 0, f: 0, parent: null }];
  const best = new Map([[key(start.col, start.row), 0]]);
  const closed = new Set();
  const heuristic = (col, row) => Math.hypot(col - goal.col, row - goal.row);
  let found = null;
  while (open.length > 0) {
    let bestIndex = 0;
    for (let i = 1; i < open.length; i += 1) {
      if (open[i].f < open[bestIndex].f) bestIndex = i;
    }
    const node = open.splice(bestIndex, 1)[0];
    const nodeKey = key(node.col, node.row);
    if (closed.has(nodeKey)) continue;
    closed.add(nodeKey);
    if (node.col === goal.col && node.row === goal.row) {
      found = node;
      break;
    }
    for (let dc = -1; dc <= 1; dc += 1) {
      for (let dr = -1; dr <= 1; dr += 1) {
        if (dc === 0 && dr === 0) continue;
        const col = node.col + dc;
        const row = node.row + dr;
        if (col < 0 || row < 0 || col >= COLS || row >= ROWS) continue;
        if (!cellFree(col, row)) continue;
        // No cutting corners: a diagonal needs both orthogonal neighbours free.
        if (dc !== 0 && dr !== 0 && (!cellFree(node.col + dc, node.row) || !cellFree(node.col, node.row + dr))) continue;
        const stepCost = dc !== 0 && dr !== 0 ? 1.414 : 1;
        const g = node.g + stepCost;
        const childKey = key(col, row);
        if (best.has(childKey) && best.get(childKey) <= g) continue;
        best.set(childKey, g);
        open.push({ col, row, g, f: g + heuristic(col, row), parent: node });
      }
    }
  }
  if (!found) return null;
  const cells = [];
  let node = found;
  while (node) {
    cells.push(cellCenter(node.col, node.row));
    node = node.parent;
  }
  cells.reverse();
  // Smooth: skip ahead to the farthest waypoint visible in a straight line.
  const smooth = [];
  let index = 0;
  let current = { x: from.x, y: from.y };
  while (index < cells.length) {
    let far = index;
    for (let i = cells.length - 1; i > index; i -= 1) {
      if (segmentClear(current, cells[i])) {
        far = i;
        break;
      }
    }
    smooth.push(cells[far]);
    current = cells[far];
    index = far + 1;
  }
  smooth.push({ x: to.x, y: to.y });
  return smooth;
}

/** Set a walk target: routes around the stations, or straight there if clear. */
export function setTarget(chef, point) {
  chef.target = { x: point.x, y: point.y };
  if (segmentClear(chef, point)) {
    chef.path = [{ x: point.x, y: point.y }];
  } else {
    chef.path = findPath(chef, point) ?? [{ x: point.x, y: point.y }];
  }
}

function circleHitsStation(x, y) {
  for (const station of STATIONS) {
    const cx = Math.max(station.x, Math.min(x, station.x + station.w));
    const cy = Math.max(station.y, Math.min(y, station.y + station.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < CHEF.radius * CHEF.radius) return true;
  }
  return false;
}

/**
 * Move the chef one step. Keyboard input steers directly (and cancels a walk
 * target); a walk target is followed waypoint by waypoint. Movement is axis
 * separated, so the chef slides along a counter instead of sticking to it.
 */
export function moveChef(chef, move, dt) {
  let dx = move.x;
  let dy = move.y;
  const keyboard = Math.hypot(dx, dy) > 0.01;
  if (keyboard) {
    chef.target = null;
    chef.path = null;
  } else if (chef.target && chef.path && chef.path.length > 0) {
    const waypoint = chef.path[0];
    const tx = waypoint.x - chef.x;
    const ty = waypoint.y - chef.y;
    const distance = Math.hypot(tx, ty);
    if (distance < 12) {
      chef.path.shift();
      if (chef.path.length === 0) chef.target = null;
    } else {
      dx = tx / distance;
      dy = ty / distance;
    }
  }
  const length = Math.hypot(dx, dy);
  if (length > 0.01) {
    dx /= Math.max(1, length);
    dy /= Math.max(1, length);
    const stepX = dx * CHEF.speed * dt;
    const stepY = dy * CHEF.speed * dt;
    if (!circleHitsStation(chef.x + stepX, chef.y)) chef.x += stepX;
    if (!circleHitsStation(chef.x, chef.y + stepY)) chef.y += stepY;
    if (Math.abs(dx) > 0.1) chef.facing = dx > 0 ? 1 : -1;
    chef.walking = true;
    chef.bob += dt * 12;
  } else {
    chef.walking = false;
  }
  chef.x = Math.max(FLOOR.x + CHEF.radius, Math.min(FLOOR.x + FLOOR.w - CHEF.radius, chef.x));
  chef.y = Math.max(FLOOR.y + CHEF.radius, Math.min(FLOOR.y + FLOOR.h - CHEF.radius, chef.y));
}
