// Order tickets: spawning, patience, matching a served plate, and the coins,
// tip and combo a serve earns. A ticket that runs out of patience is a strike.
import { COMBO_MAX, COMBO_STEP, MAX_ORDERS, ORDER_PATIENCE, ORDER_SPAWN_END, ORDER_SPAWN_START, RECIPES, RECIPE_CYCLE, TIP_MAX } from './config.js';

export function createOrders(random) {
  const cycle = random.shuffle(RECIPE_CYCLE);
  return {
    list: [],
    cycle,
    cycleIndex: 0,
    spawnIn: 2,
    combo: 0,
    served: 0,
    earned: 0,
  };
}

function patienceFor(recipe) {
  return ORDER_PATIENCE.base + ORDER_PATIENCE.perIngredient * recipe.needs.length;
}

function spawnOrder(orders) {
  const key = orders.cycle[orders.cycleIndex % orders.cycle.length];
  orders.cycleIndex += 1;
  const recipe = RECIPES[key];
  orders.list.push({
    id: orders.cycleIndex,
    recipe: key,
    name: recipe.name,
    needs: recipe.needs.slice(),
    coins: recipe.coins,
    patience: patienceFor(recipe),
    left: patienceFor(recipe),
    flash: 0,
  });
}

/** Plate contents match a ticket when they hold the same items, any order. */
export function plateMatches(plateItems, needs) {
  if (plateItems.length !== needs.length) return false;
  const rest = needs.slice();
  for (const item of plateItems) {
    const index = rest.indexOf(item);
    if (index === -1) return false;
    rest.splice(index, 1);
  }
  return rest.length === 0;
}

export function findMatchingOrder(orders, plateItems) {
  return orders.list.find((order) => plateMatches(plateItems, order.needs)) ?? null;
}

/**
 * Serve a plate. Returns { ok, order, coins, tip, combo } — or { ok: false } when
 * no ticket wants this dish.
 */
export function servePlate(orders, plateItems) {
  const order = findMatchingOrder(orders, plateItems);
  if (!order) {
    orders.combo = 0;
    return { ok: false };
  }
  orders.list.splice(orders.list.indexOf(order), 1);
  const tip = Math.round(order.coins * TIP_MAX * (order.left / order.patience));
  const multiplier = 1 + Math.min(orders.combo, 4) * COMBO_STEP;
  const coins = Math.round((order.coins + tip) * multiplier);
  orders.combo += 1;
  orders.served += 1;
  orders.earned += coins;
  return { ok: true, order, coins, tip, combo: orders.combo, multiplier: Math.min(1 + (orders.combo - 1) * COMBO_STEP, 1 + 4 * COMBO_STEP) };
}

/** Advance timers; returns the orders that just expired. */
export function updateOrders(orders, dt, elapsed) {
  const expired = [];
  for (const order of orders.list) {
    order.left -= dt;
    if (order.left <= 10) order.flash += dt;
    if (order.left <= 0) expired.push(order);
  }
  for (const order of expired) orders.list.splice(orders.list.indexOf(order), 1);
  if (expired.length > 0) orders.combo = 0;

  if (orders.list.length < MAX_ORDERS) {
    orders.spawnIn -= dt;
    if (orders.spawnIn <= 0) {
      spawnOrder(orders);
      const progress = Math.min(1, elapsed / 120);
      orders.spawnIn = ORDER_SPAWN_START + (ORDER_SPAWN_END - ORDER_SPAWN_START) * progress;
    }
  }
  return expired;
}

export function comboMultiplier(combo) {
  return Math.min(1 + Math.max(0, combo) * COMBO_STEP, 1 + 4 * COMBO_STEP);
}
