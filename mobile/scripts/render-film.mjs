/* Renders one of the app's videos (src/components/film-frames.tsx) as
   PNG frames, one per frame, so the clip matches the drawing exactly;
   scripts/encode-video.swift then writes the MP4 from them with
   AVFoundation. Needs the web dev server running:

     node scripts/render-film.mjs <welcome|flourishing> <frames dir> [http://localhost:8082]
     swift scripts/encode-video.swift <frames dir> assets/videos/<film>.mp4 30

   Playwright comes from the portal's node_modules at the repo root. */

import { mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const { chromium } = createRequire(path.join(here, "../../package.json"))("playwright")
const [film, dir, base = "http://localhost:8082"] = process.argv.slice(2)
if (!film || !dir) throw new Error("Pass the film and a directory for the frames")
mkdirSync(dir, { recursive: true })

const FPS = 30
const SCALE = 3

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 400, height: 312 }, deviceScaleFactor: SCALE })
await page.goto(`${base}/film-render?film=${film}`, { waitUntil: "networkidle", timeout: 180000 })
await page.waitForFunction(() => typeof window.filmAt === "function", null, { timeout: 180000 })
await page.evaluate(() => document.fonts.ready)
const seconds = await page.evaluate(() => window.filmSeconds)
const frame = page.locator("#film")

const frames = Math.round(seconds * FPS)
for (let i = 0; i <= frames; i++) {
  await page.evaluate((t) => window.filmAt(t), Math.min(seconds, i / FPS))
  await frame.screenshot({ path: path.join(dir, `${String(i).padStart(5, "0")}.png`) })
  if (i % FPS === 0) process.stdout.write(`\r${i / FPS}s of ${seconds}s`)
}
await browser.close()
console.log(`\n${frames + 1} frames in ${dir}`)
