/**
 * COMMENT KIT — the one file a host project imports.
 *
 * A drop-in design-review layer: a button in the corner, pins dropped on the
 * thing being talked about, threads in a sidebar, all of it floating over an
 * app that does not know it is there. It adds nothing to any page's markup, so
 * removing it again is deleting the script tag rather than unpicking fifty
 * HTML files.
 *
 * TWO WAYS IN, and they are for two different situations.
 *
 * 1. THE SCRIPT TAG, for a project with no module of its own to hang this off
 *    — a static site, a prototype, a page you were handed:
 *
 *      <script type="module" src="/comment-kit/comment-kit.js"
 *              data-namespace="acme"
 *              data-product="app"
 *              data-supabase-url="https://xxxx.supabase.co"
 *              data-supabase-key="eyJhbGci…"></script>
 *
 *    Every setting in settings.js can be given as a data- attribute in
 *    kebab-case; numbers, booleans, comma-lists and JSON objects are all
 *    understood. The layer mounts itself.
 *
 * 2. THE IMPORT, when the host has a bootstrap file and wants the settings in
 *    code — which it will as soon as any of them is computed:
 *
 *      import { mountComments } from '../comment-kit/comment-kit.js';
 *      mountComments({
 *        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
 *        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
 *        namespace: 'acme',
 *        theme: { brand: 'var(--color-primary)' },
 *        screenId: () => router.currentRoute.value.name,
 *      });
 *
 * WITH NO BACKEND CONFIGURED AT ALL it still works, and that is deliberate
 * rather than a degraded mode: comments go to this browser's localStorage, one
 * reviewer sees their own notes, and the sidebar says out loud that they are
 * only on this machine. It is the right behaviour for a page opened off disk,
 * and it means the kit can be tried before anyone provisions anything.
 *
 * WHEN IT DOES NOT MOUNT, and why each case earns its exception:
 *
 *   Under automation. navigator.webdriver is true in a driven browser, and a
 *   visual-regression baseline taken without a button in the corner is
 *   invalidated by a button in the corner — for a layer no screenshot test is
 *   about. A spec that does want to exercise commenting asks for it with
 *   ?comments=on. Turn the whole rule off with disableUnderAutomation: false.
 *
 *   With ?comments=off in the address. The escape hatch for showing the work
 *   to someone who should not see the review furniture — a stakeholder demo, a
 *   screenshot for a deck. Sticky, because a demo is several clicks long and
 *   the flag would be lost on the first navigation; ?comments=on clears it.
 *
 *   On the print stylesheet's terms. Handled in CSS rather than here, so a
 *   printed page carries no pins.
 */

import { configure, settings, storageKey } from './src/settings.js';
import { applyTheme } from './src/themes.js';
import { CommentLayer } from './src/layer.js';

export { configure, settings } from './src/settings.js';

/** The mounted layer, if there is one. Guards against mounting twice. */
let mounted = null;

/**
 * Configure and start the layer.
 *
 * @param {Partial<import('./src/settings.js').CommentKitSettings>} [options]
 * @returns {CommentLayer|null} null when the layer declined to mount.
 */
export function mountComments(options = {}) {
  if (mounted) {
    /* Calling twice is a wiring mistake — two entry points both bootstrapping
       — and the visible symptom would be two buttons and doubled pins, which
       is a confusing thing to debug from. Say so and hand back the one that
       exists. */
    console.warn('[comment-kit] already mounted; ignoring the second call');
    return mounted;
  }

  configure({ ...readGlobal(), ...readScriptTag(findScriptTag()), ...options });

  const choice = preference();
  if (choice === 'off') return null;
  if (choice !== 'on' && settings().disableUnderAutomation && navigator.webdriver) return null;

  installStylesheet();
  applyTheme(settings().theme);

  const layer = new CommentLayer();
  mounted = layer;

  const start = () => layer.mount();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  return layer;
}

/* ==========================================================================
   THE ON/OFF SWITCH IN THE ADDRESS BAR
   ========================================================================== */

/** @returns {'on'|'off'|'auto'} */
function preference() {
  const flag = new URLSearchParams(location.search).get('comments');
  if (flag === 'off' || flag === 'on') {
    try {
      if (flag === 'off') localStorage.setItem(storageKey('off'), '1');
      else localStorage.removeItem(storageKey('off'));
    } catch {
      /* A locked-down browser still honours the flag for this page, which is
         the case that matters — the demo about to be given. */
    }
    return flag;
  }
  try {
    return localStorage.getItem(storageKey('off')) === '1' ? 'off' : 'auto';
  } catch {
    return 'auto';
  }
}

/* ==========================================================================
   THE STYLESHEET
   ========================================================================== */

/**
 * The layer's CSS, fetched by the layer rather than linked by each page.
 *
 * A stylesheet a page's own markup depends on belongs in that page as a
 * <link>. This one is different in kind: no page's markup uses these classes,
 * and a <link> in every file of a fifty-page app would be fifty chances to
 * miss one — with the failure showing up as an unstyled review tool on exactly
 * the screen nobody checked. Resolved against import.meta.url, so the kit can
 * be dropped at any depth in any project and still find its own file.
 */
function installStylesheet() {
  const href = new URL('./comment-kit.css', import.meta.url).href;
  if (document.querySelector(`link[href="${href}"]`)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.append(link);
}

/* ==========================================================================
   CONFIGURATION FOUND ON THE PAGE

   document.currentScript is null in a module, so the tag has to be found by
   its src — which is exactly the URL import.meta.url holds. Comparing resolved
   pathnames rather than the attribute text, because the tag may well have been
   written with a relative path, a query string, or both.
   ========================================================================== */

/** Settings whose value is a list, given comma-separated in an attribute. */
const LIST_SETTINGS = new Set(['brandWords', 'anchorTags']);

function findScriptTag() {
  const mine = new URL(import.meta.url).pathname;
  return [...document.querySelectorAll('script[src]')].find(
    (el) => new URL(el.src, location.href).pathname === mine
  ) || null;
}

function readScriptTag(tag) {
  if (!tag) return {};
  const out = {};
  for (const [name, raw] of Object.entries(tag.dataset)) out[name] = coerce(name, raw);
  return out;
}

/**
 * An HTML attribute is a string and half these settings are not.
 *
 * The order matters. A list setting is a list even when it holds one item and
 * would otherwise be read as a bare string. "false" has to become a boolean
 * before anything else looks at it, because a non-empty string is truthy and
 * data-disable-under-automation="false" would then mean precisely its
 * opposite — the worst kind of bug, one where the configuration is present and
 * ignored.
 */
function coerce(name, raw) {
  if (LIST_SETTINGS.has(name)) {
    return raw.split(',').map((part) => part.trim()).filter(Boolean);
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw.startsWith('{') || raw.startsWith('[')) {
    try {
      return JSON.parse(raw);
    } catch {
      console.warn(`[comment-kit] data-${name} looks like JSON but does not parse`);
      return raw;
    }
  }
  /* Numeric last, and guarded against the empty string, which Number() calls
     zero. A namespace of "2024" is a string; pollMs of "3000" is not. */
  if (raw.trim() !== '' && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

/**
 * The global, for a page that cannot write data- attributes but can write a
 * classic <script> — a template with an inline block above the app bundle, a
 * CMS, a server rendering the key into the page. Read before the attributes so
 * that a data- attribute on the tag itself, being the more specific of the
 * two, is the one that wins.
 */
function readGlobal() {
  const value = globalThis.COMMENT_KIT_CONFIG;
  return value && typeof value === 'object' ? value : null;
}

/* ==========================================================================
   MOUNTING ITSELF

   Only when the page actually asked for it by loading this file directly —
   a <script src> pointing here, or a COMMENT_KIT_CONFIG global. A host that
   imported the module from its own bootstrap did not ask for it: it is about
   to call mountComments() with real settings, and starting the layer out from
   under it with the defaults would mean an unconfigured layer, a warning about
   mounting twice, and comments filed in the wrong namespace.

   Deferred by a microtask even so, so that a host doing both — a script tag
   for the file, a module that configures it — still gets its call in first.
   ========================================================================== */

queueMicrotask(() => {
  if (mounted) return;
  const tag = findScriptTag();
  if (!tag && !readGlobal()) return;
  mountComments();
});
