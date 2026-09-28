# Motion

Every illustration ships animated. Not decorated with movement: **acted out.**

> **Animate the verb, not the noun.**

The static illustration already shows the nouns: the record, the list, the
connector, the lock. Motion is where the feature's *verb* lives. A file drops
into the drop zone. Data flows along the sync link. A lock closes over a record.
A search lens scans a list. A check pops once the work is done.

If the animation could be lifted off this illustration and pasted onto another
without anyone noticing, it is not meaningful. Decorative wiggle, a card that
bobs because bobbing looks nice, a shimmer across the panel: all defects.

The vocabulary is `assets/motion.css`. Seventeen verbs, one class each, tuned by
four custom properties. Don't write new keyframes for a single illustration; if
a verb is genuinely missing, add it to `motion.css` for the whole family.

## Choosing the verb

Start from the relationship you chose in `metaphor.md`. The relationship names
the verb.

| Feature relationship | Verb | What moves, for example |
|---|---|---|
| Grouping, adding a member | `ila-slide`, `ila-rise` | The raised row slides into the group; rows rise in one after another |
| Connecting, syncing | `ila-flow`, `ila-spin` | Dashes flow along the connector toward the hub; sync arrows turn |
| Uploading, importing | `ila-drop`, `ila-grow` | The file drops into the drop zone; the progress bar fills |
| Searching, filtering | `ila-scan` | The lens travels across the rows and back |
| Sending, inviting, sharing | `ila-send` | The envelope or invite chip leaves toward the recipient, then returns |
| Merging, deduplicating | `ila-slide` (paired `--x`) | Two cards move together from opposite sides |
| Locking, deactivating, archiving | `ila-close` + `ila-dim` | The shackle comes down; the record under it goes quiet |
| Completing, approving | `ila-pop` | The check appears once the work is done, never before |
| Selecting, choosing | `ila-pop` | The selection highlight pops onto the chosen pill or card |
| Waiting, pending, loading | `ila-blink`, `ila-spin`, `ila-grow` | The caret waits; the spinner turns; the row loads |
| Errors, conflicts, failure | `ila-shake` | The failing field shakes once after a rest |
| Notifications, alerts | `ila-drop`, `ila-swing` | The new card drops onto the stack; the bell rings |
| Attention, "act here" | `ila-pulse` | A ring spreads from the accent dot |
| Empty state, add the first | `ila-pulse`, `ila-float` | The add target pulses; the lone chip hovers, ready |
| Metrics, growth, reports | `ila-grow-y` | Chart columns rise from the baseline, staggered |
| Ready, attached, available | `ila-float` | The lifted element breathes. The quietest verb; use it only when nothing else fits |

`ila-float` is the fallback, not the default. If you reach for it first, go back
to the relationship and ask what the feature *does*.

## Rules

- **One to three moving parts.** One is the norm. Two when the story has a cause
  and an effect (the arrow travels, then the check pops). Three is the ceiling,
  and only for a staggered sequence of the same verb (three rows rising).
- **One story.** Every moving part serves the same verb. An arrow that scans
  while an unrelated avatar floats is two stories.
- **Loops of 4 to 6 seconds: a clear move, then a short rest.** The motion has to
  be noticed. People glance at an empty state for a second or two; if nothing
  visibly happens in that time, the animation isn't doing its job. Subtle is the
  common failure, not busy.
- **Stagger with `--d` to show sequence.** Rows rise 0.25 to 0.4s apart. A cause
  leads its effect: give the effect a delay so it lands after the cause.
- **Visible distances.** At 112 to 144px on screen, one grid unit is under a
  pixel, so a 2 unit move is invisible. motion.css multiplies gesture distances
  by `--ila-k` (1.8): a drop of 12 travels about 22, a slide of 8 about 14, and
  float, rise, shake, swing and the lock's shackle are sized to read at a
  glance. Write `--x`/`--y` as the design distance and let `--ila-k` scale it.
  `ila-scan` is the exception: it moves to a destination (a lens onto a row, a
  pen onto a line), so give it the exact distance to land there.
- **Only content moves.** Never the panel, backdrop, plate, offset sheet, fade
  mask or gradient. The frame is the stage; the actors move on it.
- **Accent motion only on accent elements.** A pulse ring is accent because the
  dot it spreads from is accent. Don't animate a neutral element into the accent
  colour, and don't pulse something that isn't the one accent.
- **The resting frame is the static illustration.** Reduced motion removes every
  animation, and what remains must be the complete, correct illustration. Never
  hide something in the static drawing that only appears mid-animation.
- **A pulse ring is a copy of the accent dot, drawn beneath it.** Same centre,
  same radius, same fill, emitted before the dot in document order. The dot
  stays; the copy spreads and fades.

## Mechanics

Wrap the animated markup in a group that carries the verb and its tuning:

```svg
<g class="ila-drop" style="--d:0.4s;--y:-10px">
  … the card or icon that drops …
</g>
```

`build.py` has `anim(inner, verb, **vars)` that does exactly this:
`anim(card_markup, 'drop', d=0.4, y=-10)`.

- **Never put an `ila-` class on an element with a `transform` attribute.**
  Phosphor icons are `<g transform="translate(…) scale(…)">`. A CSS `transform`
  from the animation *replaces* the attribute, and the icon flies to the corner
  at 256× size. Always wrap.
- **Never put an `ila-` class on an element with a `filter`.** The lifted card is
  `<g filter="url(#lift-…)">`; wrap outside it so the shadow travels with the card.
- **`ila-flow` goes on the dashed path itself**, not a wrapper: it animates
  `stroke-dashoffset`. The dash must be `stroke-dasharray="2.4 3"`; the keyframes
  run to `-10.8`, two whole periods, so the loop is seamless. Dashes travel in
  the path's drawing direction, so draw connectors *toward* the thing they feed.
- **`transform-box: fill-box` is set by the base rule** (`:where(svg)
  [class*="ila-"]`), so scale and rotate happen around the wrapped element's own
  centre, not the SVG origin. `ila-grow` pivots on the left edge, `ila-grow-y` on
  the bottom and `ila-swing` on the top.
- **Tuning lives in CSS variables**: `--d` delay, `--t` duration, `--x` / `--y`
  distance. Include units (`0.4s`, `-10px`); in SVG, px is one user unit.
- **Inline SVG needs `motion.css` on the page.** Load it next to
  `illustration.css`. A standalone `.svg` file (opened directly, or used via
  `<img>`) has no page, so it must embed the CSS in a `<style>` inside the SVG;
  `build.py`'s `svg()` does this. Animations inside `<img>` SVGs do run, but they
  cannot see the page's reduced-motion rules, only their own embedded copy.
- **Reduced motion** is handled by the `prefers-reduced-motion` block at the end
  of `motion.css`: every `ila-` animation is removed, leaving the resting frame.

## Verifying

Motion bugs don't show in the source. Render it and look.

Capture frames at roughly **0.3s, 1.3s, 2.3s, 3.3s and 4.6s** (for example with
Playwright: load the page, `waitForTimeout`, `screenshot`, repeat) and read every
frame. Also capture once with `reducedMotion: 'reduce'` and compare it to the
static illustration.

Common failures:

| Symptom | Cause |
|---|---|
| An icon flies to the top-left corner, huge | The `ila-` class is on the icon's own `<g transform>`; wrap it |
| An element scales or spins around the wrong point | Missing wrapper, or `transform-box` overridden; the base rule must apply |
| The whole illustration shifts or pulses | Motion is on the panel, backdrop or fade group |
| The shadow stays behind while the card moves | The class is inside the `filter` group instead of around it |
| Dashes flow away from the hub | The connector path is drawn from the hub outward; reverse it |
| Flow stutters once per loop | Dash array is not `2.4 3`, so `-10.8` is not a whole number of periods |
| Busy, restless screen | Too many moving parts, or a loop without a rest |
| Reduced-motion frame is missing something | The static drawing relies on a mid-animation state |
| The animation could be swapped onto another illustration | It isn't meaningful; go back to the verb |
