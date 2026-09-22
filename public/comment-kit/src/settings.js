/**
 * WHERE THE KIT'S CONFIGURATION LIVES.
 *
 * The version of this layer that this kit was lifted from kept its Supabase
 * credentials in a committed module, because it served exactly one prototype
 * and there was nothing to vary. A drop-in kit cannot do that: the host
 * project supplies the backend, the localStorage namespace and the theme, and
 * it supplies them at runtime because there is still no build step to bake
 * them in at.
 *
 * So configuration is a small mutable record with sane defaults, written once
 * by configure() before the layer mounts and read — always through settings(),
 * never captured into a module-level constant — by everything downstream. That
 * last rule is the whole reason this file exists as a module rather than as an
 * options object threaded through six files: store.js is imported the moment
 * the entry point is, which is before the host has had a chance to say
 * anything, so a constant computed at import time would be a constant computed
 * from the defaults.
 *
 * NOTHING HERE IS SECRET, and nothing here should be. A Supabase publishable
 * key is designed to sit in client code; what it is allowed to do is decided
 * by the row-level security policies in schema.sql, not by hiding it. Leave
 * the URL and key empty and the layer still works — it falls back to this
 * browser's localStorage, which is also what happens on a file:// page.
 */

/**
 * @typedef {object} CommentKitSettings
 * @property {string}  supabaseUrl   Project URL. Empty = local-only mode.
 * @property {string}  supabaseKey   Publishable ("anon") key.
 * @property {string}  table         Table from schema.sql.
 * @property {string}  bucket        Storage bucket for attached images.
 * @property {string}  namespace     Prefix for this app's localStorage keys.
 * @property {string}  product       Prefix on every screen key. See below.
 * @property {number}  pollMs        How often to re-read while the panel is open.
 * @property {string[]} brandWords   Words to drop from <title> when naming a screen.
 * @property {string[]} anchorTags   Extra selectors a pin may attach itself to.
 * @property {boolean} disableUnderAutomation  Stay unmounted for Playwright et al.
 * @property {string|object|null} theme  'light' | 'dark' | a map of role -> CSS value.
 * @property {((info: {path: string, slug: string}) => string)|null} screenId
 * @property {((info: {slug: string, title: string}) => string)|null} screenLabel
 */

/** @type {CommentKitSettings} */
const current = {
  supabaseUrl: '',
  supabaseKey: '',
  table: 'dc_comments',
  bucket: 'comment-images',

  /* Namespacing the localStorage keys is what lets two apps served from the
     same origin — a marketing site and the app it links into, say — keep
     separate authors, separate read state and separate offline mirrors. Two
     kits sharing an origin and a namespace would silently share all three. */
  namespace: 'comment-kit',

  /* The first half of every screen key. It matters as soon as one deployment
     serves more than one surface: two products both have a /dashboard, and
     they are not the same page. A single-app install can leave it as it is. */
  product: 'app',

  pollMs: 15000,

  /* Page titles are usually "Brand — Page" or "Page | Brand", and the useful
     half is whichever one is not the branding. Tell the kit your brand words
     and the sidebar lists "Scheduler" instead of "Acme Health — Scheduler". */
  brandWords: [],

  /* A click is snapped up to the nearest element a person would name before
     it is recorded, so the pin rides a button rather than a fraction of a
     1100px column. The built-in list is all roles and standard tags; a design
     system whose controls are custom elements should name them here —
     ['ui-button', 'ui-chip'] — or its pins will anchor to the layout div. */
  anchorTags: [],

  /* Automated browsers set navigator.webdriver. A visual-regression baseline
     taken without a green button in the corner is invalidated by a green
     button in the corner, and no screenshot test is about the review layer —
     so it stays out of the way by default. ?comments=on overrides it for the
     spec that does want to exercise it. */
  disableUnderAutomation: true,

  theme: null,
  screenId: null,
  screenLabel: null,
};

/** The live record. Read it per call; never hoist a field out of it. */
export function settings() {
  return current;
}

/**
 * Fold a host's options in over the defaults.
 *
 * Merging rather than replacing, and ignoring undefined, so that passing a
 * partial record — which is what every caller passes — does not blank the
 * fields it said nothing about.
 */
export function configure(options = {}) {
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) current[key] = value;
  }
  return current;
}

/** One of this install's localStorage keys, e.g. "acme.comments.author". */
export function storageKey(name) {
  return `${current.namespace}.comments.${name}`;
}
