// The world: the screens (title, play, paused, over), the shift timer, strikes,
// particles and floating score popups. It owns the chef, the kitchen and the
// orders, and turns input into events the renderer and the audio can use.
import { BEST_KEY, CHEF, MAX_STRIKES, SHIFT_SECONDS, STARS } from './config.js';
import { createRandom } from './random.js';
import { createChef, moveChef, setTarget } from './chef.js';
import { createKitchen, interact, nearestStation, stationAt, stationFront, updateKitchen } from './kitchen.js';
import { createOrders, servePlate, updateOrders } from './orders.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export const EVENT_SERVED = 1;
export const EVENT_WRONG = 2;
export const EVENT_EXPIRED = 4;
export const EVENT_OVER = 8;

export function createWorld(random) {
  return {
    random,
    screen: SCREEN_TITLE,
    chef: createChef(),
    kitchen: createKitchen(),
    orders: createOrders(random),
    elapsed: 0,
    coins: 0,
    strikes: 0,
    best: readBest(),
    particles: [],
    popups: [],
    message: null,
    messageTime: 0,
    chopSoundAt: 0,
    tickedOrder: null,
    clickTarget: null,
  };
}

export function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

export function startShift(world) {
  const random = world.random;
  world.screen = SCREEN_PLAY;
  world.chef = createChef();
  world.kitchen = createKitchen();
  world.orders = createOrders(random);
  world.elapsed = 0;
  world.coins = 0;
  world.strikes = 0;
  world.particles = [];
  world.popups = [];
  world.message = null;
  world.messageTime = 0;
}

export function endShift(world, reason) {
  world.screen = SCREEN_OVER;
  world.overReason = reason;
  if (world.coins > world.best) {
    world.best = world.coins;
    saveBest(world.coins);
  }
  world.stars = STARS.filter((bar) => world.coins >= bar).length;
}

function burst(world, x, y, color, count, speed = 90) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.random.next() * Math.PI * 2;
    const velocity = speed * (0.4 + world.random.next() * 0.8);
    world.particles.push({
      x, y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - 40,
      life: 0.5 + world.random.next() * 0.4,
      age: 0,
      color,
      size: 3 + world.random.next() * 4,
    });
  }
}

function popup(world, x, y, text, color) {
  world.popups.push({ x, y, text, color, age: 0, life: 1.2 });
}

function showMessage(world, text) {
  world.message = text;
  world.messageTime = 2.2;
}

/** One fixed step of play. Returns a bitmask of events for sound/feedback. */
export function stepWorld(world, input, audio, dt) {
  let events = 0;

  if (input.takePressed('confirm') && world.screen === SCREEN_TITLE) {
    startShift(world);
    audio.unlock();
    audio.click();
  }
  if (input.takePressed('restart') && (world.screen === SCREEN_OVER || world.screen === SCREEN_PAUSED)) {
    startShift(world);
    audio.click();
  }
  if (input.takePressed('pause') && (world.screen === SCREEN_PLAY || world.screen === SCREEN_PAUSED)) {
    world.screen = world.screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
    audio.click();
  }
  if (input.takePressed('mute')) {
    const muted = audio.toggleMute();
    showMessage(world, muted ? 'Sound off (M to turn back on)' : 'Sound on');
  }

  if (world.screen !== SCREEN_PLAY) return events;

  world.elapsed += dt;
  const timeLeft = SHIFT_SECONDS - world.elapsed;
  if (timeLeft <= 0) {
    endShift(world, 'time');
    return events | EVENT_OVER;
  }

  // Mouse: click a station to walk there and use it; click the floor to walk.
  const click = input.takeClick();
  if (click) {
    const station = stationAt(click.x, click.y);
    if (station) {
      world.clickTarget = { point: stationFront(station), station };
      setTarget(world.chef, world.clickTarget.point);
    } else {
      world.clickTarget = null;
      setTarget(world.chef, { x: click.x, y: click.y });
    }
    audio.unlock();
  }
  // Arrived at a clicked station: use it once, when the click completed as a
  // quick tap. A held mouse is for chopping, not for using the station — while
  // the button is still down, keep waiting: releasing soon still counts.
  if (world.clickTarget && !world.chef.target) {
    const tap = input.takeTap();
    if (tap) {
      const station = world.clickTarget.station;
      world.clickTarget = null;
      const event = interact(world.kitchen, world.chef, station);
      events |= handleInteractEvent(world, audio, event, station);
    } else if (!input.mouseHeld) {
      // The click is over and no tap is coming: forget the station.
      world.clickTarget = null;
    }
  }

  // Keyboard: E / Space uses the nearest station in reach.
  if (input.takePressed('interact')) {
    const station = nearestStation(world.chef, CHEF.reach);
    if (station) {
      const event = interact(world.kitchen, world.chef, station);
      events |= handleInteractEvent(world, audio, event, station);
    }
  }

  moveChef(world.chef, input.move(), dt);

  updateKitchen(world.kitchen, world.chef, dt, input.interactHeld, () => {
    world.chopSoundAt += dt;
    if (world.chopSoundAt > 0.22) {
      world.chopSoundAt = 0;
      audio.chop();
      const board = world.kitchen.board.item;
      if (board) burst(world, 360, 176, '#e8b96a', 2, 50);
    }
  });

  const grilling = world.kitchen.grill.slots.some((slot) => slot !== null);
  if (grilling) audio.sizzleStart();
  else audio.stopSizzle();

  const expired = updateOrders(world.orders, dt, world.elapsed);
  for (const order of expired) {
    world.strikes += 1;
    audio.expired();
    showMessage(world, `Too slow — ${order.name} walked out!`);
    events |= EVENT_EXPIRED;
    if (world.strikes >= MAX_STRIKES) {
      endShift(world, 'strikes');
      return events | EVENT_OVER;
    }
  }
  // A ticket about to run out ticks, so the player feels it.
  const urgent = world.orders.list.find((order) => order.left <= 5);
  if (urgent && world.tickedOrder !== urgent.id) {
    world.tickedOrder = urgent.id;
    audio.tick();
  } else if (!urgent) {
    world.tickedOrder = null;
  }

  // Particles and popups age out.
  for (const particle of world.particles) {
    particle.age += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 160 * dt;
  }
  world.particles = world.particles.filter((p) => p.age < p.life);
  for (const item of world.popups) item.age += dt;
  world.popups = world.popups.filter((p) => p.age < p.life);
  if (world.messageTime > 0) world.messageTime -= dt;

  return events;
}

function handleInteractEvent(world, audio, event, station) {
  switch (event.type) {
    case 'pickup':
      audio.pickup();
      return 0;
    case 'place':
      audio.place();
      return 0;
    case 'trash':
      audio.place();
      burst(world, station.x + station.w / 2, station.y + station.h / 2, '#9aa0a6', 8, 60);
      return 0;
    case 'serve': {
      const result = servePlate(world.orders, event.plate.items);
      if (!result.ok) {
        audio.fail();
        showMessage(world, 'Nobody ordered that — check the board!');
        return EVENT_WRONG;
      }
      world.coins += result.coins;
      world.chef.carry = null;
      audio.serve();
      burst(world, station.x + station.w / 2, station.y + 20, '#f7c948', 16, 120);
      popup(world, station.x + station.w / 2, station.y - 8, `+${result.coins} coins`, '#2f7d3d');
      if (result.tip > 0) popup(world, station.x + station.w / 2, station.y + 16, `tip +${result.tip}`, '#b98a3e');
      if (result.combo >= 2) showMessage(world, `Combo x${result.combo} — the crowd loves it!`);
      return EVENT_SERVED;
    }
    default:
      return 0;
  }
}
