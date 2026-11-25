// The kitchen: station state and what E (or a click) does at each one. The chef
// carries one thing: a loose ingredient, or a plate holding up to four items.
// Plates are assembled on counters; the grill and the pot cook on their own timers.
import { CHEF, CHOP_SECONDS, FLOOR, GRILL_BURN_SECONDS, GRILL_COOK_SECONDS, INGREDIENTS, SOUP_SECONDS, STATIONS } from './config.js';

export function stationById(id) {
  return STATIONS.find((station) => station.id === id);
}

export function stationAt(x, y) {
  return STATIONS.find((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) ?? null;
}

/** The point on a station's edge the chef walks to when clicking it, kept on the floor. */
export function stationFront(station) {
  const x = Math.max(
    FLOOR.x + CHEF.radius + 4,
    Math.min(FLOOR.x + FLOOR.w - CHEF.radius - 4, station.x + station.w / 2),
  );
  const y = Math.max(
    FLOOR.y + CHEF.radius + 4,
    Math.min(FLOOR.y + FLOOR.h - CHEF.radius - 4, station.y + station.h + 34),
  );
  return { x, y };
}

export function createKitchen() {
  return {
    board: { item: null },
    grill: { slots: [null, null] },
    pot: { item: null },
    counters: { 'counter-a': { plate: null, item: null }, 'counter-b': { plate: null, item: null } },
  };
}

/** Is the chef close enough to use this station? */
export function inReach(chef, station, reach) {
  const cx = Math.max(station.x, Math.min(chef.x, station.x + station.w));
  const cy = Math.max(station.y, Math.min(chef.y, station.y + station.h));
  const dx = chef.x - cx;
  const dy = chef.y - cy;
  return dx * dx + dy * dy <= reach * reach;
}

export function nearestStation(chef, reach) {
  let best = null;
  let bestDistance = Infinity;
  for (const station of STATIONS) {
    const cx = Math.max(station.x, Math.min(chef.x, station.x + station.w));
    const cy = Math.max(station.y, Math.min(chef.y, station.y + station.h));
    const distance = (chef.x - cx) ** 2 + (chef.y - cy) ** 2;
    if (distance <= reach * reach && distance < bestDistance) {
      best = station;
      bestDistance = distance;
    }
  }
  return best;
}

function isPlate(carry) {
  return carry !== null && carry.plate === true;
}

/**
 * One press of E at `station`. Returns a small event for sound/feedback:
 * { type: 'pickup' | 'place' | 'trash' | 'serve' | 'wrong' | 'none', ... }.
 * Chopping itself is not a press: it runs while E is held (see updateKitchen).
 */
export function interact(kitchen, chef, station) {
  const carry = chef.carry;
  switch (station.kind) {
    case 'crate': {
      if (carry) return { type: 'none' };
      chef.carry = { kind: station.gives };
      return { type: 'pickup', kind: station.gives };
    }
    case 'plates': {
      if (carry) return { type: 'none' };
      chef.carry = { plate: true, items: [] };
      return { type: 'pickup', kind: 'plate' };
    }
    case 'trash': {
      if (!carry) return { type: 'none' };
      chef.carry = null;
      return { type: 'trash' };
    }
    case 'board': {
      const board = kitchen.board;
      if (!board.item && carry && !isPlate(carry) && INGREDIENTS[carry.kind].chop) {
        board.item = { kind: carry.kind, progress: 0 };
        chef.carry = null;
        return { type: 'place', kind: board.item.kind };
      }
      if (board.item && !carry) {
        const done = board.item.progress >= 1;
        const kind = done ? INGREDIENTS[board.item.kind].chop : board.item.kind;
        chef.carry = { kind };
        kitchen.board.item = null;
        return { type: 'pickup', kind };
      }
      return { type: 'none' };
    }
    case 'grill': {
      const grill = kitchen.grill;
      if (carry && !isPlate(carry) && carry.kind === 'patty') {
        const slot = grill.slots.findIndex((item) => item === null);
        if (slot === -1) return { type: 'none' };
        grill.slots[slot] = { kind: 'patty', seconds: 0 };
        chef.carry = null;
        return { type: 'place', kind: 'patty' };
      }
      if (!carry) {
        const slot = grill.slots.findIndex((item) => item !== null);
        if (slot === -1) return { type: 'none' };
        const item = grill.slots[slot];
        grill.slots[slot] = null;
        const kind = item.seconds >= GRILL_BURN_SECONDS ? 'pattyBurnt' : 'pattyGrilled';
        chef.carry = { kind };
        return { type: 'pickup', kind };
      }
      return { type: 'none' };
    }
    case 'pot': {
      const pot = kitchen.pot;
      if (!pot.item && carry && !isPlate(carry) && carry.kind === 'tomatoChopped') {
        pot.item = { kind: 'tomatoChopped', seconds: 0 };
        chef.carry = null;
        return { type: 'place', kind: 'tomatoChopped' };
      }
      if (pot.item && !carry && pot.item.seconds >= SOUP_SECONDS) {
        kitchen.pot.item = null;
        chef.carry = { kind: 'soup' };
        return { type: 'pickup', kind: 'soup' };
      }
      return { type: 'none' };
    }
    case 'counter': {
      const counter = kitchen.counters[station.id];
      if (counter.plate && carry && !isPlate(carry) && counter.plate.items.length < 4) {
        counter.plate.items.push(carry.kind);
        chef.carry = null;
        return { type: 'place', kind: 'plate' };
      }
      if (!counter.plate && counter.item && isPlate(carry) && carry.items.length < 4) {
        carry.items.push(counter.item);
        counter.item = null;
        return { type: 'place', kind: 'plate' };
      }
      if (counter.plate && !carry) {
        chef.carry = counter.plate;
        counter.plate = null;
        return { type: 'pickup', kind: 'plate' };
      }
      if (!counter.plate && !counter.item && isPlate(carry)) {
        counter.plate = carry;
        chef.carry = null;
        return { type: 'place', kind: 'plate' };
      }
      if (!counter.plate && !counter.item && carry && !isPlate(carry)) {
        counter.item = carry.kind;
        chef.carry = null;
        return { type: 'place', kind: carry.kind };
      }
      if (!counter.plate && counter.item && !carry) {
        chef.carry = { kind: counter.item };
        counter.item = null;
        return { type: 'pickup', kind: chef.carry.kind };
      }
      return { type: 'none' };
    }
    case 'window': {
      if (isPlate(carry)) return { type: 'serve', plate: carry };
      return { type: 'none' };
    }
    default:
      return { type: 'none' };
  }
}

/** Advance the grill, the pot and the chopping board by dt seconds. */
export function updateKitchen(kitchen, chef, dt, interactHeld, onChop) {
  for (const slot of kitchen.grill.slots) {
    if (slot) slot.seconds += dt;
  }
  if (kitchen.pot.item) kitchen.pot.item.seconds += dt;

  const board = kitchen.board;
  if (board.item && board.item.progress < 1) {
    const station = stationById('board');
    if (interactHeld && inReach(chef, station, 90)) {
      board.item.progress += dt / CHOP_SECONDS;
      if (board.item.progress >= 1) board.item.progress = 1;
      else if (onChop) onChop();
    }
  }
}

/** Grill slot state: 'cooking' | 'done' | 'burnt'. */
export function grillState(slot) {
  if (!slot) return null;
  if (slot.seconds >= GRILL_BURN_SECONDS) return 'burnt';
  if (slot.seconds >= GRILL_COOK_SECONDS) return 'done';
  return 'cooking';
}

/** Pot state: 'cooking' | 'done'. */
export function potState(item) {
  if (!item) return null;
  return item.seconds >= SOUP_SECONDS ? 'done' : 'cooking';
}
