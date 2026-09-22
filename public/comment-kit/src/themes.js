/**
 * READY-MADE PALETTES, AND THE MACHINERY THAT APPLIES ONE.
 *
 * The stylesheet is complete on its own: every value it uses has a literal
 * fallback, so a host that configures no theme at all gets a neutral light
 * layer that looks deliberate rather than unfinished. This file is for the two
 * cases past that.
 *
 * A HOST THAT IS DARK. Dropping a white sidebar onto a dark app is the single
 * most jarring thing this kit could do, and asking every such host to write
 * out fourteen custom properties to fix it would mean most of them do not.
 * `theme: 'dark'` is those fourteen values.
 *
 * A HOST WITH ITS OWN TOKENS. `theme: { brand: 'var(--color-primary)' }` —
 * because the values are written into CSS verbatim, a token reference works
 * exactly as well as a hex code, and the kit then follows whatever that token
 * does, including the host's own dark-mode swap. That is the best outcome
 * available and it costs one line.
 *
 * WHY :root AND NOT THE LAYER'S OWN ELEMENT. The variables have to be
 * inheritable from above the layer so that a host can equally well set them in
 * its own stylesheet and never touch the config at all. Two ways in, one place
 * they land.
 */

/** The role names a theme may set. Anything else is ignored, loudly. */
export const ROLES = [
  'surface', 'sunken', 'hover',
  'text', 'muted', 'faint', 'on-brand',
  'line', 'line-strong',
  'brand', 'brand-hover', 'brand-tint',
  'ok', 'ok-tint', 'warn', 'warn-tint', 'unread',
  'font', 'shadow', 'shadow-sm',
  'radius-sm', 'radius', 'radius-lg', 'z',
];

/**
 * The dark palette.
 *
 * Not the light one inverted. Two things change in kind rather than in value:
 * the panel sits ABOVE the page rather than on it, so its surface is lighter
 * than the ground instead of darker, and the shadows carry almost no weight —
 * on a dark ground a drop shadow reads as smudge, and the separation has to
 * come from the surface step and the border instead.
 */
const DARK = {
  surface: '#1c1c1f',
  sunken: '#141416',
  hover: '#26262b',
  text: '#f4f4f5',
  muted: '#a1a1aa',
  faint: '#8b8b93',
  'on-brand': '#ffffff',
  line: '#2e2e34',
  'line-strong': '#3f3f46',
  brand: '#6366f1',
  'brand-hover': '#7c7ff2',
  'brand-tint': '#2a2a45',
  ok: '#4ade80',
  'ok-tint': '#16301f',
  warn: '#fbbf24',
  'warn-tint': '#3a2a10',
  unread: '#f87171',
  shadow: '0 16px 40px -8px rgb(0 0 0 / 0.55), 0 2px 6px rgb(0 0 0 / 0.4)',
  'shadow-sm': '0 6px 18px -4px rgb(0 0 0 / 0.5), 0 1px 3px rgb(0 0 0 / 0.35)',
};

/** The light palette is the stylesheet's own fallbacks, so it sets nothing. */
const PRESETS = { light: {}, dark: DARK };

const STYLE_ID = 'comment-kit-theme';

/**
 * Put a theme on the page.
 *
 * A <style> element rather than inline styles on documentElement, so that the
 * host's own `:root { --ck-… }` rule — written in a stylesheet, with the same
 * specificity — can still be the thing that wins if it comes later. Inline
 * styles would beat it, and silently: the host would edit its CSS and see
 * nothing change.
 */
export function applyTheme(theme) {
  if (!theme) return;

  const values = typeof theme === 'string' ? PRESETS[theme] : theme;
  if (!values) {
    console.warn(`[comment-kit] unknown theme "${theme}" — using the light default`);
    return;
  }

  const declarations = Object.entries(values)
    .filter(([role]) => {
      if (ROLES.includes(role)) return true;
      /* Named out loud, because a typo in a theme is otherwise invisible: the
         fallback is a perfectly good colour, so the layer looks fine and looks
         wrong at the same time. */
      console.warn(`[comment-kit] theme role "${role}" is not one the kit reads`);
      return false;
    })
    .map(([role, value]) => `  --ck-${role}: ${value};`);

  if (!declarations.length) return;

  const style = document.getElementById(STYLE_ID) || document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `:root {\n${declarations.join('\n')}\n}`;
  if (!style.isConnected) document.head.append(style);
}
