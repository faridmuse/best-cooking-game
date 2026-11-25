// Keyboard and mouse input, read fresh every frame. The game polls this, it never
// pushes events into the world: `held` for movement and chopping, `pressed` for the
// one-shot actions (interact, pause, restart), and a click target for mouse walking.
export const ACTION_INTERACT = 'interact';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';
export const ACTION_CONFIRM = 'confirm';

const KEY_ACTIONS = {
  KeyE: ACTION_INTERACT,
  Space: ACTION_INTERACT,
  Enter: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyR: ACTION_RESTART,
  KeyM: ACTION_MUTE,
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let click = null;
  let mouseDown = false;
  let mousePos = { x: 0, y: 0 };
  let downAt = 0;
  let tap = null;
  let interactDownAt = 0;

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    const action = KEY_ACTIONS[event.code];
    if (!action) return;
    // Interact (E / Space) is tap-based like the mouse: a quick press uses the
    // station, a hold chops at the board. Queuing on keyup keeps a hold from
    // picking the item straight back up before the chopping starts.
    if (action === ACTION_INTERACT) {
      interactDownAt = performance.now();
      if (event.code === 'Space') event.preventDefault();
      return;
    }
    pressed.add(action);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    if ((event.code === 'KeyE' || event.code === 'Space') && performance.now() - interactDownAt < 300) {
      pressed.add(ACTION_INTERACT);
    }
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (event) => {
    mouseDown = true;
    downAt = performance.now();
    mousePos = canvasPoint(event);
    click = mousePos;
  });
  window.addEventListener('mouseup', () => {
    // A quick press-and-release is a tap (use the station); a longer hold is
    // for chopping, and records no tap.
    if (mouseDown && performance.now() - downAt < 300) tap = mousePos;
    mouseDown = false;
  });
  canvas.addEventListener('mousemove', (event) => { mousePos = canvasPoint(event); });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** -1/0/1 movement on each axis, from WASD or arrows. */
    move() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      return { x, y };
    },
    /** Is the interact key (E / Space) held down right now? */
    get interactHeld() {
      return keys.has('KeyE') || keys.has('Space') || mouseDown;
    },
    /** Was this action pressed since the last frame? (consumed by takePressed) */
    takePressed(action) {
      if (!pressed.has(action)) return false;
      pressed.delete(action);
      return true;
    },
    /** The latest click point, if any since the last frame. A new click voids an old tap. */
    takeClick() {
      const point = click;
      click = null;
      if (point) tap = null;
      return point;
    },
    /** A completed quick tap, if any since the last frame. */
    takeTap() {
      const point = tap;
      tap = null;
      return point;
    },
    /** Is the mouse button held down right now? (holding skips click-to-use.) */
    get mouseHeld() { return mouseDown; },
    get mouse() { return mousePos; },
    /** Queue an action press from outside the keyboard (title-screen click). */
    press(action) { pressed.add(action); },
    /** For the autopilot: pretend keys are held. */
    inject(keysDown, clickPoint) {
      keys.clear();
      for (const code of keysDown) keys.add(code);
      if (clickPoint) click = clickPoint;
    },
  };
}
