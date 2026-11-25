# Ember & Thyme — a hectic little kitchen

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/faridmuse/best-cooking-game/rank.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/faridmuse/best-cooking-game/reward.svg)](https://make.fun/c/best-cooking-game-20261125-0137)

A complete, original cooking game for the [make.fun best cooking game bounty](https://make.fun/c/best-cooking-game-20261125-0137). One chef, one tiny kitchen, three-minute shifts, and a crowd that will not wait.

## How it plays

You are the chef of **Ember & Thyme**, a little neighbourhood kitchen. Tickets land on the order board with a patience bar; serve the dish before the bar runs out or the customer walks out (three walk-outs ends the shift early).

- **Grab ingredients** from the crates: tomato, lettuce, bread, cheese, patties.
- **Chop** tomatoes and lettuce on the chopping board — hold E and listen for the knife.
- **Grill** patties on the grill — golden at 6 seconds, burnt at 13. Burnt goes in the trash.
- **Simmer** chopped tomato in the soup pot for a bowl of tomato soup.
- **Assemble** dishes on the counters: stack ingredients on a plate, then **serve** it at the window.
- **Combos**: serve in a row and the multiplier climbs; serve with patience to spare and earn a tip.

Four recipes to learn — Garden Salad, Ember Burger, Garden Stack, Tomato Soup — with orders arriving faster as the shift goes on. Three stars at 300 coins.

## Controls

| Input | Does |
|---|---|
| WASD / arrow keys | Move the chef |
| E / Space | Pick up, place, chop (hold), serve |
| Mouse | Click a station to walk there and use it |
| P | Pause · R | Restart · M | Sound on/off |

## Play it

No build step, no network: the game is plain static files under `game/`.

```sh
node serve.ts
# open http://localhost:8080
```

Node 22.18+ and a desktop browser are all it needs. Sound is synthesised with WebAudio — no audio files.

## Layout

- `game/index.html` — the page, one canvas, no external references
- `game/src/config.js` — tuning, ingredients, recipes, station layout
- `game/src/random.js` — seeded random (deterministic screenshots)
- `game/src/audio.js` — synthesised WebAudio sounds
- `game/src/input.js` — keyboard and mouse
- `game/src/kitchen.js` — stations and what E does at each one
- `game/src/orders.js` — tickets, patience, matching, coins, combos
- `game/src/chef.js` — movement and collision
- `game/src/world.js` — screens, shift timer, strikes, particles
- `game/src/render.js` — all canvas drawing
- `game/src/shots.js` — staged screenshot scenes (real gameplay, autopilot)
- `game/src/main.js` — boot and the fixed-step loop
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `screenshots/` — four real renders of the game running in headless Chromium

## Screenshots

The cover shows the title over a kitchen already mid-morning; the rest show a salad coming together, the service rush with a finished burger at the window, and a three-star shift. Staged with `?shot=start|play|rush|end&seed=1` — see `shots.json`.

## License

MIT — see [LICENSE](LICENSE).
