# Clinic EHR — Component Library

A themeable base layer for a content-heavy clinical SaaS product. Built on shadcn
(the `luma` style, which runs on **Base UI**, not Radix) with Tailwind v4 and Next.js.

Ships 62 components with every variant, 24 accent palettes, 7 neutral palettes,
10 typefaces, and 6,031 Hugeicons — all switchable at runtime.

This repository is the **library and its gallery**, nothing else. It is the
starting point a product gets built on top of.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts: `npm run build`, `npm run typecheck`, `npm run format`, `npm test`.

## The gallery

| Route | Contents |
| --- | --- |
| `/` | Overview, principles, component index |
| `/foundations` | Color, typography, radius, spacing, elevation, icon sizes |
| `/icons` | Stroke weights, sizes, the design-system set, full icon search |
| `/patterns/navigation` | 11 navigation patterns, from app shells to steppers |
| `/patterns/data` | 15 data segregation patterns for dense clinical data |
| `/layouts` | Screen assembler — 6 shells × 4 content layouts, live |
| `/components/[slug]` | One page per component: description, guidance, every variant |

## Structure

Anything reusable lives in `src/design-system` — that is the single source of
truth. `src/app/(design-system)` is only the gallery that documents it.

```
src/
  design-system/          The library
    ui/                   The 62 shadcn components
    examples/             Official shadcn demos, one per component
    providers/            Theme + design-system state
    tokens/               themes.ts, fonts.ts  (themes.ts is GENERATED)
    icons.tsx             GENERATED Hugeicons wrappers
    component-icons.ts    GENERATED slug -> icon map
    theme-customizer.tsx  The Customize panel

  app/
    (design-system)/      The gallery — /, /foundations, /icons, /patterns, /layouts, /components
    layout.tsx            Root: fonts + providers only
    globals.css           Hand-written tokens
    themes.css            GENERATED palettes — do not edit

  components/             Gallery chrome only (the sidebar shell)
  lib/                    examples.ts (gallery catalogue), brand.ts, utils.ts
  hooks/
scripts/                  Generators
```

`(design-system)` is a route group: the parentheses give the gallery its own
layout **without** affecting URLs. Add a sibling group — `(app)`, say — for
product screens and it gets its own chrome while the gallery keeps its sidebar.

### Where does new code go?

| Building… | Put it in |
| --- | --- |
| A component the product could reuse | `src/design-system/ui/` |
| A product screen | a new route group under `src/app/` |
| A new design token | `src/app/globals.css` |
| Docs about the system | `src/app/(design-system)/` |

The product name lives in one place, `src/lib/brand.ts`. Change `BRAND_NAME`
there and every title and header follows.

## Brand assets

Served from `public/brand/` — `favicon/` (light/dark at 16/32/48/180 plus the
512 marks) and `logo/` (the lockup in both tones).

The product name is one constant, `BRAND_NAME` in [src/lib/brand.ts](src/lib/brand.ts),
alongside `LOGO` with the two lockup paths. Nothing hardcodes the name. The
favicon is declared through Next's metadata API in [src/app/layout.tsx](src/app/layout.tsx);
`src/app/favicon.ico` is a multi-resolution fallback built from the light mark.

### What the artwork can and cannot do

Measured across all 141,750 pixels of the supplied lockup, not assumed:

- **It is dark-background only.** 81% of its opaque ink is near-white, so on a
  light page the wordmark and most of the H disappear and leave the spokes
  floating alone. `logo-lockup-light.png` is a **luminance inversion generated
  as a stopgap** — clean only because the artwork is pure grayscale, but not a
  design deliverable. Ask design for a real light lockup.
- **It carries zero chroma** (max RGB spread across the whole image is 1). There
  is no brand hue to derive an accent from, which is why the design system is
  still on its own `cyan` accent.
- **It is raster, 750×189.** A primary logo should be resolution-independent;
  the favicon especially wants vector source.
- **At 16px the mark aliases** — the fan of ~20 spokes becomes a grey smudge.
  The H and the disc still read. A fix needs a reduced-detail glyph drawn for
  small sizes, not a rescale. Most browsers reach for the 32px asset anyway.

The mark is duotone, so it cannot sit on transparency and stay legible against
both light and dark browser chrome. Two favicon variants ship and the browser
picks with `prefers-color-scheme`. The header does the same swap in CSS, because
next-themes toggles a class rather than following the OS setting.

## Theming

Everything is driven by CSS variables on `<html>`, set by
`src/design-system/providers/design-system-provider.tsx` and persisted to `localStorage`:

`data-base` · `data-accent` · `data-font` · `data-heading` · `data-radius` · `data-icon-stroke`

Base palettes and accent palettes touch **disjoint** variables, which is why they
compose independently instead of needing one block per combination.

### Rules worth knowing

- **Never hardcode a color.** Always use a semantic token, or theming breaks.
- **`--accent` is not a hover tint here.** In this preset it equals `--primary`
  (the full brand color). Use `bg-surface-hover` / `bg-surface-selected` instead.
- **Dark-mode `--primary` is darker than light-mode.** It fails contrast as text
  on dark surfaces, so accents use `--primary-tint`, which resolves to `--chart-1`
  (the light end of the accent ramp) in dark mode.
- **Primary is a signal, not decoration** — reserve it for actions, selection and
  focus. Light painted fills use `--primary-surface`.
- **Tailwind v4 cannot see dynamic class names** (`` `bg-${x}` ``). Always write
  literal class strings.

## Design-review comments

Every page carries [Comment Kit](comment-kit/README.md): a button in the
bottom-left corner, pins on the element being discussed, threads in a sidebar.
Comments are shared through Supabase (`dc_comments` table, `comment-images`
bucket, from `comment-kit/schema.sql`).

- Runtime files are static, in `public/comment-kit/`; mounted in `src/app/layout.tsx`.
- Needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  Without them it still works, storing comments in the browser only.
- The table's RLS is **open to anyone with the link** by design. Keep patient
  data and anything confidential out of comments and screenshots.
- `?comments=off` hides it (sticky); `?comments=on` brings it back.

## Generated files

These are produced by `scripts/` and should not be hand-edited:

| Script | Output |
| --- | --- |
| `gen-all.mjs` | `scripts/.cache/themes-all.json` (calls the shadcn registry) |
| `gen-css.mjs` | `src/app/themes.css`, `src/design-system/tokens/themes.ts` |
| `map-icons.mjs` | `scripts/.cache/icon-map.json` |
| `gen-icons.mjs` | `src/design-system/icons.tsx` |
| `gen-component-icons.mjs` | `src/design-system/component-icons.ts` |

Run with `node scripts/<name>.mjs`. Paths resolve relative to the repo, so the
project can live anywhere.

## Gotchas

- `src/design-system/examples/example.tsx` is a **local** gallery-friendly rewrite. Any
  `npx shadcn add -o` reverts it to the registry's full-page version — restore it.
- `shadcn add -o` also reverts the `spinner.tsx` type fix and re-adds
  `strokeWidth={2}` to icons, which overrides the global stroke token. Strip both.
- `form` is an empty stub in this style; `field` replaces it.
- Only Hugeicons **Stroke Rounded** is installed. The other eight styles require a
  paid Hugeicons Pro licence and are not on public npm.
- ESLint is currently broken repo-wide: the `react/display-name` rule crashes on
  ESLint 10. Inherited from the scaffold; does not affect dev or build.
