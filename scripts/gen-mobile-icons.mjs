// Renders the patient app's icon, splash and in-app logo from the brand SVGs.
//
//   node scripts/gen-mobile-icons.mjs
//
// The mobile app (mobile/) cannot use the SVGs directly: launchers and the
// splash screen want PNGs at fixed sizes. Playwright's Chromium (already here
// for the e2e tests) rasterises them, so the app icon is always the same Inlay
// app icon the web favicon is drawn from. Re-run after a logo change, then
// `npx expo prebuild --clean` in mobile/ to push the new icons into android/.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "mobile", "assets")

const read = (f) => fs.readFileSync(path.join(ROOT, "public/brand/inlay", f), "utf8")
// The app icon is the symbol on a petrol tile; the tile's rounded corners
// vanish on a petrol background where a launcher wants a full square.
const appIcon = read("app-icon.svg")
const mark = read("mark-light.svg")
// One porcelain silhouette of the symbol, for the petrol header in the app.
const markWhite = mark.replace(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="#F7F4EE"')
const lockup = read("lockup-light.svg")
const PETROL = "#173E45"

/* Each asset: canvas size, background, how much of the canvas the art fills,
   and an optional CSS filter. Android's adaptive icon crops the foreground to
   a circle or squircle inside the middle 66%, so its art sits smaller. */
const ASSETS = [
  { file: "icon.png", w: 1024, h: 1024, bg: PETROL, scale: 1, svg: appIcon },
  { file: "android-icon-foreground.png", w: 1024, h: 1024, scale: 0.41, svg: appIcon },
  { file: "android-icon-background.png", w: 1024, h: 1024, bg: PETROL, scale: 0 },
  // Themed icons (Android 13+) read only the alpha, so a black silhouette.
  { file: "android-icon-monochrome.png", w: 1024, h: 1024, scale: 0.4, svg: mark, filter: "brightness(0)" },
  { file: "splash-icon.png", w: 1024, h: 1024, scale: 0.8, svg: mark },
  { file: "favicon.png", w: 48, h: 48, scale: 1, svg: appIcon },
  // The porcelain symbol, shown on petrol inside the app.
  { file: "logo-mark-white.png", w: 160, h: 192, scale: 1, svg: markWhite },
  // The lockup for the sign-in header, at 3x its 220pt on-screen width.
  { file: "logo-lockup.png", w: 660, h: 165, scale: 1, svg: lockup },
  // The web build's install icons (public/ is copied to the site as is).
  { file: "../public/icon-192.png", w: 192, h: 192, scale: 1, svg: appIcon },
  { file: "../public/icon-512.png", w: 512, h: 512, scale: 1, svg: appIcon },
  { file: "../public/icon-maskable-512.png", w: 512, h: 512, bg: PETROL, scale: 1, svg: appIcon },
  { file: "../public/apple-touch-icon.png", w: 180, h: 180, bg: PETROL, scale: 1, svg: appIcon },
]

const browser = await chromium.launch()
const page = await browser.newPage()

for (const a of ASSETS) {
  const art = a.scale
    ? `<div style="width:${a.w * a.scale}px;height:${a.h * a.scale}px;filter:${a.filter ?? "none"}">${a.svg.replace(/width="[\d.]+" height="[\d.]+"/, 'width="100%" height="100%"')}</div>`
    : ""
  await page.setViewportSize({ width: a.w, height: a.h })
  await page.setContent(
    `<html><body style="margin:0;width:${a.w}px;height:${a.h}px;display:flex;align-items:center;justify-content:center;background:${a.bg ?? "transparent"}">${art}</body></html>`
  )
  await page.screenshot({ path: path.join(OUT, a.file), omitBackground: !a.bg })
  console.log(`${path.relative(ROOT, path.join(OUT, a.file))}  ${a.w}x${a.h}`)
}

await browser.close()
