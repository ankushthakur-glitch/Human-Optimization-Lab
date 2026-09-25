// Bakes the patient app's error-state illustrations from the portal's.
//
//   node scripts/gen-mobile-error-illustrations.mjs
//
// The portal draws each one as grey art with --primary laid over it through a
// mask in mix-blend-mode: color (see gen-error-illustrations.mjs). React
// Native has no blend modes, and the app has one accent, so this does that
// blend once, here, and writes flat PNGs to mobile/assets/illustrations/errors.
// The crash state has no portal counterpart; its art is an SVG drawn in the
// same style (illustrations/errors-mobile) and is only rasterised here.
// Re-run after gen-error-illustrations.mjs, or if the app's primary changes.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SRC = path.join(ROOT, "public", "illustrations", "errors")
const OWN = path.join(ROOT, "scripts", "illustrations", "errors-mobile")
const OUT = path.join(ROOT, "mobile", "assets", "illustrations", "errors")
fs.mkdirSync(OUT, { recursive: true })

/* mobile/src/lib/theme.ts color.primary */
const PRIMARY = [0x01, 0x83, 0x7e]
/* Shown at up to 372 wide on a phone: 3x that, rounded. */
const WIDTH = 1080

/* The W3C "color" blend: the source's hue and saturation at the backdrop's
   luminance, clipped back into gamut. */
const lum = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b
function clip(c) {
  const l = lum(c)
  const n = Math.min(...c)
  const x = Math.max(...c)
  let out = c
  if (n < 0) out = out.map((v) => l + ((v - l) * l) / (l - n))
  if (x > 255) out = out.map((v) => l + ((v - l) * (255 - l)) / (x - l))
  return out
}
const setLum = (c, l) => clip(c.map((v) => v + (l - lum(c))))

/* Permission denied is left out: a patient has one role, so it never shows. */
const names = ["not-found", "offline", "session-expired"]
const png = (image) => image.png({ compressionLevel: 9, palette: true, quality: 90 })

for (const name of names) {
  const load = (file) =>
    sharp(path.join(SRC, file)).resize({ width: WIDTH }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { data: base, info } = await load(`${name}.png`)
  const { data: mask } = await load(`${name}-tint.png`)

  const out = Buffer.from(base)
  for (let i = 0; i < base.length; i += 4) {
    const m = mask[i + 3] / 255
    if (!m) continue
    const blended = setLum(PRIMARY, lum([base[i], base[i + 1], base[i + 2]]))
    for (let k = 0; k < 3; k++) out[i + k] = Math.round(base[i + k] * (1 - m) + blended[k] * m)
  }

  await png(sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })).toFile(path.join(OUT, `${name}.png`))
  console.log(`✓ ${name}`)
}

for (const file of fs.readdirSync(OWN).filter((f) => f.endsWith(".svg"))) {
  const name = path.basename(file, ".svg")
  await png(sharp(path.join(OWN, file)).resize({ width: WIDTH })).toFile(path.join(OUT, `${name}.png`))
  console.log(`✓ ${name}`)
}
