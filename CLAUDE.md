# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arkanoid/Breakout clone built with plain HTML, CSS and JavaScript — zero dependencies (no build tool, no bundler, no package manager, no test framework). The game is implemented and playable: open `index.html` directly in a browser (no server or build step required).

## Architecture

- `index.html` — canvas, HUD, and all overlay markup (level-complete, game-complete, game-over, pause/level-select); loads the scripts below in order.
- `levels.js` — hardcoded list of level definitions (block color patterns, ball speed multiplier per level).
- `game.js` (~390 lines) — the entire game: state machine, main loop (`requestAnimationFrame`-driven), paddle/ball physics, collision, block-break explosion animations, sound triggering, HUD/overlay updates.
- `style.css` — layout and overlay styling.
- `assets/` — sprite sheet, sprite helpers, and sound effects (see below).

## Spec-driven workflow

This repo uses two custom skills (installed under `.claude/skills/` and mirrored in `.agents/skills/`, tracked via `skills-lock.json` pointing at `Klerith/fernando-skills`) to drive feature work:

- **`/spec <feature>`** — guided spec designer. Clarifies requirements through Q&A, then writes the spec section by section into `specs/NN-slug.md`. New specs are saved in `Draft` state and must be manually flipped to `Approved` (`aprobado`) by a human before implementation.
- **`/spec-impl <NN-spec-name>`** — implements an approved spec. Refuses to proceed unless the target spec's status means "Approved" (in any language). On success it creates/switches to a branch named `spec-NN-slug`, echoes the spec's objective/scope/plan/acceptance criteria, then implements the plan one step at a time, pausing for review after each step.
- Branch auto-creation is controlled by `specs/.spec-config.yml` (`AutoCreateBranch: true` by default); `/spec` seeds this file with defaults the first time it creates a spec, and never overwrites it afterward.

When asked to plan or build a feature for this game, prefer this existing `/spec` → (human approval) → `/spec-impl` flow over ad hoc planning.

**Existing specs** (in `specs/`, numbered in implementation order):

1. `01-mvp-arkanoid.md` — single-level MVP: paddle/ball physics, lives, score, win/lose overlays. Status: Implementado.
2. `02-block-destroy-animation.md` — 4-frame explosion animation on block break, sourced from the spritesheet. Status: Implementado.
3. `03-sound-and-levels.md` — bounce/break sound effects plus a 3-level progressive system (same grid, new color pattern and +15% ball speed per level) with transition overlays. Status: aprobado in the spec file, but the feature is already implemented on `main` — flag this status/code mismatch to the user rather than silently editing the spec.

## Game assets already available

- `assets/spritesheet-breakout.png` — sprite sheet image.
- `assets/spritesheet.js` — plain browser script (no module system) exposing:
  - `SPRITES` — pixel coordinates/sizes for `paddle`, `ball`, and `blocks.<color>` (gray/red/yellow/cyan/magenta/hotpink/green).
  - `EXPLOSION_FRAMES` — 4-frame explosion animation per block color, plus `EXPLOSION_DURATION` (ms per frame, 150).
  - `loadSpritesheet(cb)` — loads the PNG onto an offscreen canvas once and invokes queued callbacks; safe to call multiple times before load completes.
  - `drawSprite(ctx, name, x, y, w, h)` — draws a sprite by name onto a canvas context; block sprites are addressed as `block_<color>` (e.g. `block_red`).
  - `drawFrame(ctx, frame, x, y, w, h)` — draws a single explosion animation frame object (`{sx, sy, sw, sh}`).
- `assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3` — sound effects for ball/paddle bounce and block break.

Future game code should load and use these existing assets/helpers rather than introducing new sprite or sound-loading systems.
