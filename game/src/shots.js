// Screenshot scenes: each one plays the real game forward with a small autopilot
// (walk to stations, pick up, chop, cook, serve) and freezes it at a moment worth
// showing. `?shot=start|play|rush|end&seed=N` stages that scene instead of
// running the loop, then sets window.__shotReady for the screenshot tool.
// Nothing here is fake: every frame is the real rules, the real kitchen.
import { createRandom } from './random.js';
import { GRILL_COOK_SECONDS } from './config.js';
import { createWorld, endShift, startShift, stepWorld, SCREEN_PLAY, SCREEN_TITLE } from './world.js';
import { setTarget } from './chef.js';
import { interact, stationById, stationFront } from './kitchen.js';
import { RECIPES } from './config.js';

const STEP = 1 / 60;

/** An audio object that does nothing: shots run headless, with no gesture. */
export const silentAudio = {
  unlock() {}, click() {}, pickup() {}, place() {}, chop() {},
  sizzleStart() {}, stopSizzle() {}, ding() {}, serve() {}, fail() {},
  tick() {}, expired() {}, toggleMute() { return true; },
};

/** A fake input the autopilot drives: it presses E and holds it to chop. */
function createPilotInput() {
  const queued = new Set();
  return {
    held: false,
    press(action) { queued.add(action); },
    move() { return { x: 0, y: 0 }; },
    get interactHeld() { return this.held; },
    takePressed(action) {
      if (!queued.has(action)) return false;
      queued.delete(action);
      return true;
    },
    takeClick() { return null; },
    takeTap() { return null; },
  };
}

/**
 * Run the world forward with a task list. Each task is:
 * { go: stationId } — walk to a station's front,
 * { press: stationId } — use the station once (the chef must already be there),
 * { chop: true } — hold E at the board until the item is chopped,
 * { hold: seconds } — hold E for that long (a half-chopped board),
 * { wait: seconds } — stand still.
 * The pilot stops early if the shift ends.
 */
export function runAutopilot(world, tasks, maxSeconds) {
  const input = createPilotInput();
  let taskIndex = 0;
  let waitLeft = 0;
  for (let step = 0; step < maxSeconds / STEP; step += 1) {
    if (world.screen !== SCREEN_PLAY) break;
    const task = tasks[taskIndex];
    if (!task) break;
    input.held = false;
    if (task.go) {
      const station = stationById(task.go);
      const front = stationFront(station);
      const distance = Math.hypot(world.chef.x - front.x, world.chef.y - front.y);
      if (!world.chef.target && distance < 26) {
        taskIndex += 1;
      } else if (!world.chef.target) {
        setTarget(world.chef, front);
      }
    } else if (task.press) {
      const station = stationById(task.press);
      interact(world.kitchen, world.chef, station);
      // Serving goes through the world's own serve path, so the coins are real.
      if (station.kind === 'window' && world.chef.carry && world.chef.carry.plate) {
        input.press('interact');
      }
      taskIndex += 1;
    } else if (task.chop) {
      const board = world.kitchen.board.item;
      if (!board || board.progress >= 1) {
        taskIndex += 1;
      } else {
        input.held = true;
      }
    } else if (task.hold !== undefined) {
      if (waitLeft <= 0) waitLeft = task.hold;
      input.held = true;
      waitLeft -= STEP;
      if (waitLeft <= 0) {
        waitLeft = 0;
        taskIndex += 1;
      }
    } else if (task.wait !== undefined) {
      if (waitLeft <= 0) waitLeft = task.wait;
      waitLeft -= STEP;
      if (waitLeft <= 0) {
        waitLeft = 0;
        taskIndex += 1;
      }
    } else {
      taskIndex += 1;
    }
    stepWorld(world, input, silentAudio, STEP);
  }
}

/** Put hand-made tickets on the board: deterministic, no expiry mid-shot. */
function setBoard(world, specs) {
  world.orders.list = specs.map((spec, i) => {
    const recipe = RECIPES[spec.recipe];
    const patience = spec.patience ?? 55;
    return {
      id: 100 + i,
      recipe: spec.recipe,
      name: recipe.name,
      needs: recipe.needs.slice(),
      coins: recipe.coins,
      patience,
      left: spec.left ?? patience,
      flash: 0,
    };
  });
  world.orders.spawnIn = 999;
}

/** No tickets spawn or expire while a scene is staged. */
function freezeOrders(world) {
  world.orders.list = [];
  world.orders.spawnIn = 999;
}

/** Seed one ticket the autopilot can actually serve, so its coins are real. */
function seedTicket(world, recipeKey, patience = 120) {
  const recipe = RECIPES[recipeKey];
  world.orders.list.push({
    id: 50,
    recipe: recipeKey,
    name: recipe.name,
    needs: recipe.needs.slice(),
    coins: recipe.coins,
    patience,
    left: patience,
    flash: 0,
  });
}

/** A salad, from crates to a served plate, the way a player does it. */
const SALAD_TASKS = [
  { go: 'crate-tomato' }, { press: 'crate-tomato' },
  { go: 'board' }, { press: 'board' }, { chop: true }, { press: 'board' },
  { go: 'counter-a' }, { press: 'counter-a' },
  { go: 'crate-lettuce' }, { press: 'crate-lettuce' },
  { go: 'board' }, { press: 'board' }, { chop: true }, { press: 'board' },
  { go: 'counter-b' }, { press: 'counter-b' },
  { go: 'plates' }, { press: 'plates' },
  { go: 'counter-a' }, { press: 'counter-a' },
  { go: 'counter-b' }, { press: 'counter-b' },
  { go: 'window' }, { press: 'window' },
];

/** A burger, grilled and stacked, with a soup simmering in the pot. */
const RUSH_TASKS = [
  { go: 'crate-bread' }, { press: 'crate-bread' },
  { go: 'counter-b' }, { press: 'counter-b' },
  { go: 'crate-patty' }, { press: 'crate-patty' },
  { go: 'grill' }, { press: 'grill' },
  { wait: GRILL_COOK_SECONDS + 0.6 },
  { press: 'grill' },
  { go: 'counter-a' }, { press: 'counter-a' },
  { go: 'crate-tomato' }, { press: 'crate-tomato' },
  { go: 'board' }, { press: 'board' }, { chop: true }, { press: 'board' },
  { go: 'pot' }, { press: 'pot' },
  { go: 'plates' }, { press: 'plates' },
  { go: 'counter-b' }, { press: 'counter-b' },
  { go: 'counter-a' }, { press: 'counter-a' },
  { go: 'counter-b' }, { press: 'counter-b' },
  { go: 'crate-cheese' }, { press: 'crate-cheese' },
  { go: 'counter-b' }, { press: 'counter-b' },
  { go: 'counter-b' }, { press: 'counter-b' },
  { go: 'window' },
];

export function stageShot(name, seed) {
  const random = createRandom(seed);
  const world = createWorld(random);
  startShift(world);
  freezeOrders(world);

  if (name === 'start') {
    // A kitchen already mid-morning: a patty on the grill, bread and cheese on
    // the counters, tickets up — then the title screen over it.
    runAutopilot(world, [
      { go: 'crate-patty' }, { press: 'crate-patty' },
      { go: 'grill' }, { press: 'grill' },
      { go: 'crate-bread' }, { press: 'crate-bread' },
      { go: 'counter-a' }, { press: 'counter-a' },
      { go: 'crate-cheese' }, { press: 'crate-cheese' },
      { go: 'counter-b' }, { press: 'counter-b' },
    ], 40);
    setBoard(world, [
      { recipe: 'burger', left: 48 },
      { recipe: 'salad', left: 38 },
      { recipe: 'soup', left: 52 },
    ]);
    world.chef.x = 640;
    world.chef.y = 500;
    world.chef.carry = null;
    world.screen = SCREEN_TITLE;
    return { world, screen: SCREEN_TITLE };
  }

  if (name === 'play') {
    // One salad served for real, then a burger built and waiting on the counter
    // while the chef is half-way through chopping lettuce for the next dish.
    seedTicket(world, 'salad');
    runAutopilot(world, SALAD_TASKS, 90);
    runAutopilot(world, RUSH_TASKS, 150);
    runAutopilot(world, [
      { go: 'counter-a' }, { press: 'counter-a' },
      { go: 'crate-lettuce' }, { press: 'crate-lettuce' },
      { go: 'board' }, { press: 'board' }, { hold: 0.9 },
    ], 40);
    setBoard(world, [
      { recipe: 'salad', left: 41 },
      { recipe: 'burger', left: 52 },
    ]);
    world.elapsed = 62;
    world.screen = SCREEN_PLAY;
    return { world, screen: SCREEN_PLAY };
  }

  if (name === 'rush') {
    // The service rush: four tickets, one about to walk out, a finished burger
    // in the chef's hands at the window, soup on the stove.
    seedTicket(world, 'salad');
    runAutopilot(world, SALAD_TASKS, 90);
    runAutopilot(world, RUSH_TASKS, 150);
    setBoard(world, [
      { recipe: 'burger', left: 6, patience: 55 },
      { recipe: 'stack', left: 34 },
      { recipe: 'soup', left: 44 },
      { recipe: 'salad', left: 27 },
    ]);
    world.elapsed = 104;
    world.orders.served = 5;
    world.orders.combo = 3;
    world.strikes = 1;
    world.screen = SCREEN_PLAY;
    return { world, screen: SCREEN_PLAY };
  }

  // end: the results screen after a strong shift.
  seedTicket(world, 'salad');
  runAutopilot(world, SALAD_TASKS, 90);
  world.popups = [];
  world.particles = [];
  world.coins = 247;
  world.orders.served = 9;
  world.orders.earned = 247;
  world.elapsed = 180;
  endShift(world, 'time');
  return { world, screen: world.screen };
}
