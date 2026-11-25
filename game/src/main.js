// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play,
// paused and game over.
//
// ?seed=N fixes the order pattern. ?shot=start|play|rush|end (with &seed=N)
// stages that scene instead of running the loop, paints it and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, createInput } from './input.js';
import { createRenderer } from './render.js';
import { createWorld, stepWorld } from './world.js';
import { stageShot, silentAudio } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

if (shot) {
  // Staged screenshot: play the scene forward once, paint it, and say ready.
  const staged = stageShot(shot, seed);
  staged.world.best = readBest();
  renderer.draw(staged.world, 1.2);
  window.__shotReady = true;
  window.__ember = { shot, world: staged.world };
} else {
  const world = createWorld(createRandom(seed));
  const input = createInput(canvas);
  let last = performance.now();
  let accumulator = 0;
  let time = 0;

  // Clicking the title screen starts the shift, like pressing Enter.
  canvas.addEventListener('mousedown', () => {
    if (world.screen === 'title') {
      input.press(ACTION_CONFIRM);
    }
  });

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      stepWorld(world, input, audio, STEP);
      accumulator -= STEP;
    }
    time += elapsed;
    renderer.draw(world, time);
    const screen = world.screen;
    const state = screen === 'play'
      ? `Cooking: ${world.coins} coins, ${world.orders.list.length} orders up, ${Math.max(0, 180 - Math.floor(world.elapsed))} seconds left.`
      : screen === 'over'
        ? `Shift over: ${world.coins} coins, ${world.orders.served} dishes served.`
        : 'Ember and Thyme: a hectic little kitchen. Press Enter to start.';
    if (status.textContent !== state) status.textContent = state;
    requestAnimationFrame(frame);
  }

  window.__ember = { world };
  requestAnimationFrame(frame);
}
