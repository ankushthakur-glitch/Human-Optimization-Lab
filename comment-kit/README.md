# Comment Kit

A drop-in design-review layer for any web page: a button in the corner, pins
dropped on the thing being talked about, and threads in a sidebar — floating
over an app that does not know it is there.

The button can be dragged anywhere on the screen and stays where it was left
(per browser), because it is the one part of the layer that is always visible:
sooner or later it covers the very thing being reviewed — a host app's own
floating control, a framework's dev overlay in the same corner — and a button
fixed to one corner makes that permanent. A press that travels less than a few
pixels is still a click, and the panel opens from wherever the button now is.

It adds **nothing to any page's markup**. Removing it again is deleting a
script tag, not unpicking fifty HTML files.

No build step, no dependencies, no framework. Native ES modules and one
stylesheet. It works from a `file://` copy.

> **In this project** the runtime files (`comment-kit.js`, `comment-kit.css`,
> `src/`, `demo/`) are served from `public/comment-kit/`, and the kit is
> mounted once by a `<script type="module">` in `src/app/layout.tsx`. It reads
> `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (set in
> `.env.local` and in the Vercel project). This folder keeps `schema.sql` and
> the docs. The paths below describe the kit as it ships.

---

## Install

Copy the `comment-kit/` folder into your project. That is the install.

```
comment-kit/
  comment-kit.js      the entry point — the only file a host imports
  comment-kit.css     the layer's styles, fetched by the layer itself
  schema.sql          run once in Supabase, if you want shared comments
  SETUP-GUIDE.docx    the same install as numbered steps, for handing to someone
  demo/index.html     a working page to try it on
  src/                settings, store, anchoring, rendering, icons, themes
```

If you would rather follow numbered steps than read this file, open
`SETUP-GUIDE.docx`. It covers the same ground as nine steps with a
check-it-worked at each one, and adds a troubleshooting table — it is the thing
to send to whoever is doing the install, if that is not you.

## Use it — pick one of two

**A script tag**, for a project with no bootstrap module of its own:

```html
<script type="module" src="/comment-kit/comment-kit.js"
        data-namespace="acme"
        data-product="app"
        data-brand-words="Acme,Acme Health"
        data-supabase-url="https://xxxx.supabase.co"
        data-supabase-key="eyJhbGci…"></script>
```

**An import**, as soon as any setting is computed rather than typed:

```js
import { mountComments } from './comment-kit/comment-kit.js';

mountComments({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  namespace: 'acme',
  theme: { brand: 'var(--color-primary)' },
});
```

Every `data-` attribute is the kebab-case form of an option below; numbers,
booleans, comma-lists and JSON objects are all understood. There is also a
`window.COMMENT_KIT_CONFIG = { … }` global for a page that can write an inline
classic script but not a data attribute — a server-rendered template, a CMS.

**With no backend configured it still works.** Comments go to this browser's
localStorage, one reviewer sees their own notes, and the sidebar says out loud
that they are only on this machine. That is the right behaviour for a page
opened off disk, and it means you can try the kit before provisioning
anything.

## Share the comments — Supabase

1. Create a Supabase project (the free tier is more than enough).
2. SQL Editor → New query → paste `schema.sql` → Run. It is re-runnable.
3. Settings → API → copy the **Project URL** and the **anon / publishable**
   key into the config.

That key is designed to live in client code. What it is allowed to do is
decided by the row-level security policies in `schema.sql`, and those policies
are **wide open on purpose** — anyone with the link can read, write and delete
every comment. It is the right trade for a review whose participants do not
have accounts and whose identity is a name typed into a box. So:

> **Give the kit its own Supabase project, and keep customer data,
> credentials and anything confidential out of comments and screenshots.**

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `supabaseUrl` | `''` | Project URL. Empty ⇒ local-only mode. |
| `supabaseKey` | `''` | The publishable ("anon") key. |
| `table` | `dc_comments` | Table from `schema.sql`. |
| `bucket` | `comment-images` | Storage bucket for attached images. |
| `namespace` | `comment-kit` | Prefix for this app's localStorage keys. |
| `product` | `app` | First half of every screen key. |
| `pollMs` | `15000` | How often to re-read while the panel is open. |
| `brandWords` | `[]` | Words to drop from `<title>` when naming a screen. |
| `anchorTags` | `[]` | Extra selectors a pin may attach to. |
| `disableUnderAutomation` | `true` | Stay unmounted for Playwright et al. |
| `theme` | `null` | `'light'`, `'dark'`, or a map of role → CSS value. |
| `screenId` | `null` | `({path, slug}) => string` — for apps that route. |
| `screenLabel` | `null` | `({slug, title}) => string`. |

### The three that matter most on a first install

**`namespace`** separates two apps served from the same origin. Two kits
sharing an origin *and* a namespace would silently share their author, their
read state and their offline mirror.

**`anchorTags`** if your design system is built out of custom elements.
A pin snaps up to the nearest element a person would name — a button, a cell,
a heading — so it rides that element through any reflow instead of sitting at
a fraction across a 1100px column. The kit recognises every standard tag and
ARIA role on its own, but `<acme-button>` is invisible to it:

```js
anchorTags: ['acme-button', 'acme-chip', 'acme-card']
```

**`screenId`** if your app routes several screens through one URL. The default
reads the pathname, which *is* the identity in a multi-page app; a SPA would
otherwise file every comment ever left under one key.

```js
screenId: () => `app:${router.currentRoute.value.name}`
```

## Theming

Every colour and shape resolves through a `--ck-*` custom property with a
literal fallback, so the kit is complete on a page that has never heard of it
and re-skinnable by one that has. Two equivalent ways in:

```css
:root { --ck-brand: #4f46e5; --ck-surface: #fff; }
```

```js
mountComments({ theme: { brand: '#4f46e5' } })
```

Values are written into CSS verbatim, so a host with its own token layer can
hand its tokens straight over — `{ brand: 'var(--color-primary)' }` — and the
kit will follow whatever that token does, including the host's own dark-mode
swap. `theme: 'dark'` is a ready-made palette for a dark host.

Roles: `surface` `sunken` `hover` · `text` `muted` `faint` `on-brand` ·
`line` `line-strong` · `brand` `brand-hover` `brand-tint` ·
`ok` `ok-tint` `warn` `warn-tint` `unread` · `font` `shadow` `shadow-sm` ·
`radius-sm` `radius` `radius-lg` `z`.

Sizes are deliberately **not** themeable. This is not product UI, it is the
reviewer's instrument, and it should be the same instrument at the same size
whichever screen it is measuring.

## Turning it off

| | |
| --- | --- |
| `?comments=off` | Hides it, stickily — for a stakeholder demo or a screenshot. Survives navigation. |
| `?comments=on` | Clears that, and forces it on under automation. |
| Under automation | `navigator.webdriver` ⇒ unmounted, so it cannot invalidate visual-regression baselines. Set `disableUnderAutomation: false` to opt out. |
| Printing | Handled in CSS, so a printed page carries no pins. |

## How it works

**Which screen.** `screenIdentity()` in `src/anchor.js` turns the pathname into
a key like `app:scheduler`. The `product` prefix in front of it matters as soon
as one deployment serves two surfaces: both have a dashboard, and they are not
the same page.

**Which view of it.** A screen is not one screen — a page may be sixteen
modules behind one rail on one URL. So the anchor also records which tabs were
open when the comment was written (read from `aria-selected` and
`aria-current`, the only markup every tab strip has in common), and a pin is
drawn only when those tabs are open again. The sidebar row for a comment in
another view says which one, and pressing it presses the tabs back.

**Where on the screen.** Not an x/y pair, which lands in the middle of nothing
at a different window width. The click is snapped up to the nearest nameable
element and stored as a CSS path plus a 0–1 fraction inside that element's box,
with the raw coordinates kept as the fallback for when the element is genuinely
gone. A pin that resolves that way is marked *detached* rather than silently
drawn somewhere plausible.

**Offline.** Every write goes to the local mirror first and to the network
second, and anything the server has not acknowledged stays on a pending
register that each successful read retries. A comment written on a train posts
itself when the signal comes back. A review tool that loses a typed comment
because a request timed out is worse than no review tool.

**Images.** Attached screenshots are resized and re-encoded as WebP in a canvas
before upload — typically 4 MB to 200 KB — and carried inside the comment as a
data URL if no bucket is configured.

## Requirements

Any browser with ES modules and `URL`/`fetch` — Chrome, Edge, Firefox, Safari
of the last several years. Nothing to install, nothing to build, no runtime
dependency.
