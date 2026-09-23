import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

/* The error-state illustrations come from Figma drawn in a fixed blue. To make
   them follow --primary (any accent, light or dark), each one is split in two:

   - <name>.png       the art with every blue pixel turned to grey at the same
                      luminance; everything else (the red stop hand and ✕,
                      white highlights) left as drawn.
   - <name>-tint.png  an alpha mask of where that blue was, and how strongly.

   ErrorState lays a --primary fill over the grey with mix-blend-mode: color,
   clipped to the mask, so the blue comes back as the primary hue with the
   original shading. Source art lives beside this script; run
   `node scripts/gen-error-illustrations.mjs` after replacing any of it. */

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SRC = path.join(PROJECT, "scripts", "illustrations", "errors")
const OUT = path.join(PROJECT, "public", "illustrations", "errors")
fs.mkdirSync(OUT, { recursive: true })

const BLUE_HUE = 220
const clamp = (v) => Math.min(1, Math.max(0, v))

for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith(".png"))) {
  const name = path.basename(file, ".png")
  const { data, info } = await sharp(path.join(SRC, file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const base = Buffer.from(data)
  const tint = Buffer.alloc(data.length)

  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const sat = max === 0 ? 0 : (max - min) / max
    let hue = 0
    if (max !== min) {
      const d = max - min
      if (max === r) hue = ((g - b) / d) % 6
      else if (max === g) hue = (b - r) / d + 2
      else hue = (r - g) / d + 4
      hue = (hue * 60 + 360) % 360
    }

    // How much of this pixel is "the blue": full within ±35° of it, fading
    // out by ±55°, and only once there is some colour to speak of.
    const hueWeight = clamp((55 - Math.abs(hue - BLUE_HUE)) / 20)
    const weight = hueWeight * clamp((sat - 0.02) / 0.08)

    const lum = 0.3 * r + 0.59 * g + 0.11 * b
    base[i] = r + (lum - r) * weight
    base[i + 1] = g + (lum - g) * weight
    base[i + 2] = b + (lum - b) * weight

    // Pale blue washes stay pale: the tint is as strong as the blue was.
    tint[i + 3] = a * weight * clamp(sat / 0.5)
  }

  const raw = { raw: { width: info.width, height: info.height, channels: 4 } }
  await sharp(base, raw).png().toFile(path.join(OUT, `${name}.png`))
  await sharp(tint, raw)
    .resize({ width: 1080 })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, `${name}-tint.png`))
  console.log(`✓ ${name}`)
}
