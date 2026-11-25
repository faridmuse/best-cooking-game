// Ember & Thyme — tuning, ingredients and recipes. One clear job: every number
// that shapes the game lives here, so balancing never touches the logic.
export const VIEW = { width: 1280, height: 800 };
export const STEP = 1 / 60;
export const SHIFT_SECONDS = 180;
export const MAX_STRIKES = 3;
export const MAX_ORDERS = 4;
export const BEST_KEY = 'ember-thyme-best';

/** Chef movement, in pixels per second, and how close a station must be to use. */
export const CHEF = { speed: 265, radius: 20, reach: 78 };

/** Chopping: hold E (or hold the mouse on the board) to chop. */
export const CHOP_SECONDS = 1.6;
/** Grill: a patty is done after COOK, burnt after BURN. */
export const GRILL_COOK_SECONDS = 6;
export const GRILL_BURN_SECONDS = 13;
/** Pot: chopped tomato becomes soup after SOUP seconds. */
export const SOUP_SECONDS = 5;

/** Order pacing: a new ticket every SPAWN seconds, shrinking as the shift goes on. */
export const ORDER_SPAWN_START = 13;
export const ORDER_SPAWN_END = 8.5;
/** Patience of a fresh ticket, in seconds (longer dishes wait a little longer). */
export const ORDER_PATIENCE = { base: 52, perIngredient: 6 };

/** Stars on the results screen, by coins earned in one shift. */
export const STARS = [120, 210, 300];

/**
 * Ingredients. `chop` means the board turns it into `chopped`; `grill` means the
 * grill turns it into `grilled`; `pot` means the pot turns the chopped form into soup.
 * `color` is the icon's main colour, `dark` its shade.
 */
export const INGREDIENTS = {
  tomato: { name: 'Tomato', chop: 'tomatoChopped', color: '#e5484d', dark: '#b02e33', emoji: '' },
  lettuce: { name: 'Lettuce', chop: 'lettuceChopped', color: '#58b368', dark: '#2f7d3d', emoji: '' },
  bread: { name: 'Bread', color: '#e8b96a', dark: '#b98a3e', emoji: '' },
  cheese: { name: 'Cheese', color: '#f7c948', dark: '#d9a514', emoji: '' },
  patty: { name: 'Patty', grill: 'pattyGrilled', color: '#8a5a3b', dark: '#5f3a24', emoji: '' },
  tomatoChopped: { name: 'Chopped Tomato', color: '#e5484d', dark: '#b02e33', chopped: true },
  lettuceChopped: { name: 'Chopped Lettuce', color: '#7ccb8a', dark: '#4a9a58', chopped: true },
  pattyGrilled: { name: 'Grilled Patty', color: '#7a4a2e', dark: '#54301c', grilled: true },
  pattyBurnt: { name: 'Burnt Patty', color: '#2e2019', dark: '#1a120c', burnt: true },
  soup: { name: 'Tomato Soup', color: '#d94f30', dark: '#a83620', soup: true },
};

/** Recipes: what a ticket asks for, the coins it pays, and its display name. */
export const RECIPES = {
  salad: {
    name: 'Garden Salad', coins: 22,
    needs: ['tomatoChopped', 'lettuceChopped'],
  },
  burger: {
    name: 'Ember Burger', coins: 36,
    needs: ['bread', 'pattyGrilled', 'cheese'],
  },
  stack: {
    name: 'Garden Stack', coins: 46,
    needs: ['bread', 'tomatoChopped', 'lettuceChopped', 'cheese'],
  },
  soup: {
    name: 'Tomato Soup', coins: 30,
    needs: ['soup'],
  },
};

/** The order tickets appear in this cycle, shuffled per shift. */
export const RECIPE_CYCLE = ['salad', 'burger', 'soup', 'stack', 'burger', 'salad', 'stack', 'soup'];

/** Combo: each serve in a row adds this much to the multiplier, capped at COMBO_MAX. */
export const COMBO_STEP = 0.25;
export const COMBO_MAX = 2;
/** Tip: up to half the dish price again for serving with patience to spare. */
export const TIP_MAX = 0.5;

/** Station rectangles, in canvas pixels. `kind` decides how E/click treats it. */
export const STATIONS = [
  { id: 'crate-tomato', kind: 'crate', gives: 'tomato', x: 24, y: 150, w: 150, h: 76, label: 'Tomatoes' },
  { id: 'crate-lettuce', kind: 'crate', gives: 'lettuce', x: 24, y: 242, w: 150, h: 76, label: 'Lettuce' },
  { id: 'crate-bread', kind: 'crate', gives: 'bread', x: 24, y: 334, w: 150, h: 76, label: 'Bread' },
  { id: 'crate-cheese', kind: 'crate', gives: 'cheese', x: 24, y: 426, w: 150, h: 76, label: 'Cheese' },
  { id: 'crate-patty', kind: 'crate', gives: 'patty', x: 24, y: 518, w: 150, h: 76, label: 'Patties' },
  { id: 'board', kind: 'board', x: 250, y: 128, w: 220, h: 96, label: 'Chopping Board' },
  { id: 'grill', kind: 'grill', x: 560, y: 128, w: 250, h: 96, label: 'Grill' },
  { id: 'pot', kind: 'pot', x: 900, y: 128, w: 220, h: 96, label: 'Soup Pot' },
  { id: 'counter-a', kind: 'counter', x: 250, y: 330, w: 220, h: 96, label: 'Counter' },
  { id: 'counter-b', kind: 'counter', x: 560, y: 330, w: 250, h: 96, label: 'Counter' },
  { id: 'plates', kind: 'plates', x: 1120, y: 128, w: 136, h: 96, label: 'Plates' },
  { id: 'trash', kind: 'trash', x: 1120, y: 330, w: 136, h: 96, label: 'Trash' },
  { id: 'window', kind: 'window', x: 470, y: 560, w: 340, h: 92, label: 'Serving Window' },
];

/** Where the chef spawns, and the floor the chef may walk on. */
export const SPAWN = { x: 640, y: 500 };
export const FLOOR = { x: 190, y: 96, w: 1070, h: 620 };
