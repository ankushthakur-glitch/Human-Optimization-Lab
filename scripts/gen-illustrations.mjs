// Exports the portal's spot illustrations for the handoff page
// (/screens/handoff/illustrations). Runs in `prebuild`, so downloads and the
// "where it is used" list never drift from the code.
//
// Reads  src/components/illustrations/art.generated.ts
// Writes public/illustrations/hol/svg/<name>.svg     themed: --il-* tokens with
//                                                   HOL light values as fallback
//        public/illustrations/hol/light/<name>.svg   flat hex, light theme
//        public/illustrations/hol/dark/<name>.svg    flat hex, dark theme
//        public/illustrations/hol/hol-illustrations.zip   all three sets
//        src/components/illustrations/usage.generated.json  name → file:line
//
//   node scripts/gen-illustrations.mjs

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { deflateRawSync } from "node:zlib"

const ROOT = fileURLToPath(new URL("..", import.meta.url))
const SRC = join(ROOT, "src")
const ART = join(SRC, "components/illustrations/art.generated.ts")
const OUT = join(ROOT, "public/illustrations/hol")
const USAGE = join(SRC, "components/illustrations/usage.generated.json")

// ── Colour: the --il-* tokens as globals.css derives them, for the default
//    brand-teal accent on the default base. ─────────────────────────────────

function oklchToOklab([l, c, h]) {
  const r = (h * Math.PI) / 180
  return [l, c * Math.cos(r), c * Math.sin(r)]
}
function oklabToHex([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return (
    "#" +
    lin
      .map((v) => {
        const x = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
        return Math.round(Math.min(1, Math.max(0, x)) * 255)
          .toString(16)
          .padStart(2, "0")
      })
      .join("")
      .toUpperCase()
  )
}
const lab = (lch) => oklchToOklab(lch)
/** color-mix(in oklab, a p%, b) */
const mix = (a, p, b) => a.map((v, i) => v * (p / 100) + b[i] * (1 - p / 100))
const hex = (x) => oklabToHex(x)

function tokens(dark) {
  const fg = lab(dark ? [0.985, 0, 0] : [0.145, 0.008, 326])
  const bg = lab(dark ? [0.145, 0.008, 326] : [1, 0, 0])
  const card = lab(dark ? [0.212, 0.019, 322.12] : [1, 0, 0])
  const mutedFg = lab(dark ? [0.711, 0.019, 323.02] : [0.5, 0.034, 322.5])
  const accent = lab(dark ? [0.85, 0.105, 190] : [0.551, 0.095, 190])
  const base = dark ? bg : card
  return {
    ghost: hex(mix(fg, dark ? 4 : 3, bg)),
    panel: hex(mix(fg, dark ? 5 : 4.5, base)),
    "panel-top": hex(mix(fg, dark ? 8 : 1.5, base)),
    line: hex(mix(fg, dark ? 26 : 30, base)),
    surface: dark ? hex(mix(fg, 12, bg)) : hex(card),
    stroke: hex(fg),
    "stroke-soft": hex(mutedFg),
    fill: hex(mix(fg, dark ? 22 : 16, base)),
    "fill-soft": hex(mix(fg, dark ? 11 : 9, base)),
    accent: hex(accent),
    "shadow-c": dark ? "#000000" : hex(lab([0.24, 0.012, 322])),
    "shadow-o": dark ? "0.55" : "0.14",
  }
}
const LIGHT = tokens(false)
const DARK = tokens(true)

const VAR = /var\(--il-([a-z-]+), ?([^)]+)\)/g
const themed = (svg) => svg.replace(VAR, (_, k) => `var(--il-${k}, ${LIGHT[k]})`)
const flat = (svg, t) => svg.replace(VAR, (_, k) => t[k])

// ── Read the art ─────────────────────────────────────────────────────────

const art = readFileSync(ART, "utf8")
const labelsAt = art.indexOf("ILLUSTRATION_LABELS")
const items = []
for (const m of art.slice(0, labelsAt).matchAll(/^ {2}"([a-z0-9-]+)": (".*"),$/gm)) {
  items.push({ name: m[1], svg: JSON.parse(m[2]) })
}
const labels = Object.fromEntries(
  [...art.slice(labelsAt).matchAll(/^ {2}"([a-z0-9-]+)": (".*"),$/gm)].map((m) => [m[1], JSON.parse(m[2])])
)

/** The motion vocabulary, carried inside every exported file so it animates
    on its own (in a browser, <img>, or another codebase). */
const MOTION = readFileSync(join(SRC, "components/illustrations/motion.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .trim()

/** A standalone file: its own ids, a label, and an explicit size so it opens
    at a sensible scale in a browser, Figma or a design tool. */
function standalone({ name, svg }) {
  return (
    svg
      .replaceAll("__UID__", "hol")
      .replace(
        ' aria-hidden="true" focusable="false"',
        ` width="320" height="320" role="img" aria-label="${labels[name] ?? name}"`
      )
      .replace(/<defs>/, `<style>${MOTION}</style><defs>`) + "\n"
  )
}

// ── Write the files ──────────────────────────────────────────────────────

const files = []
for (const kind of ["svg", "light", "dark"]) mkdirSync(join(OUT, kind), { recursive: true })
for (const it of items) {
  const base = standalone(it)
  const sets = { svg: themed(base), light: flat(base, LIGHT), dark: flat(base, DARK) }
  for (const [kind, body] of Object.entries(sets)) {
    writeFileSync(join(OUT, kind, `${it.name}.svg`), body)
    files.push({ path: `hol-illustrations/${kind === "svg" ? "themed" : kind}/${it.name}.svg`, body })
  }
}

// A zip needs no dependency: local headers, a central directory, deflate.
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function zip(entries) {
  const parts = []
  const central = []
  let offset = 0
  for (const { path, body } of entries) {
    const name = Buffer.from(path)
    const data = Buffer.from(body)
    const packed = deflateRawSync(data)
    const crc = crc32(data)
    const head = Buffer.alloc(30)
    head.writeUInt32LE(0x04034b50, 0)
    head.writeUInt16LE(20, 4)
    head.writeUInt16LE(8, 8)
    head.writeUInt32LE(crc, 14)
    head.writeUInt32LE(packed.length, 18)
    head.writeUInt32LE(data.length, 22)
    head.writeUInt16LE(name.length, 26)
    const dir = Buffer.alloc(46)
    dir.writeUInt32LE(0x02014b50, 0)
    dir.writeUInt16LE(20, 4)
    dir.writeUInt16LE(20, 6)
    dir.writeUInt16LE(8, 10)
    dir.writeUInt32LE(crc, 16)
    dir.writeUInt32LE(packed.length, 20)
    dir.writeUInt32LE(data.length, 24)
    dir.writeUInt16LE(name.length, 28)
    dir.writeUInt32LE(offset, 42)
    parts.push(head, name, packed)
    central.push(dir, name)
    offset += head.length + name.length + packed.length
  }
  const cd = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(cd.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...parts, cd, end])
}
writeFileSync(join(OUT, "hol-illustrations.zip"), zip(files))

// ── Where each one is used ───────────────────────────────────────────────

/** Where to see a component's illustrations, for components rendered by more
    than one route. Files under src/app map to their own route. */
const ROUTES = {
  "components/ehr-shell.tsx": ["/screens/practice/patients"],
  "components/admin/practices-list.tsx": ["/screens/admin/practices"],
  "components/admin/practice-actions.tsx": ["/screens/admin/practices"],
  "components/admin/practice-details.tsx": ["/screens/admin/practices/232276"],
  "components/admin/practice-adoption-view.tsx": ["/screens/admin/practices/593892"],
  "components/admin/provider-adoption.tsx": ["/screens/admin/practices/593892/providers/PR4775"],
  "components/practice/directory.tsx": ["/screens/practice/users", "/screens/practice/patients", "/screens/practice/locations"],
  "components/practice/users.tsx": ["/screens/practice/users"],
  "components/practice/providers.tsx": ["/screens/practice/users"],
  "components/practice/patients.tsx": ["/screens/practice/patients", "/screens/patients"],
  "components/practice/locations.tsx": ["/screens/practice/locations"],
  "components/practice/patient-record.tsx": ["/screens/practice/patients/P10240"],
  "components/practice/provider-record.tsx": ["/screens/practice/users/providers/PR3132"],
  "components/practice/location-record.tsx": ["/screens/practice/locations/LOC1001"],
  "components/practice/health-record-view.tsx": ["/screens/patients/P10240?section=labs&tab=trends"],
  "components/provider/patient-chart.tsx": ["/screens/patients/P10257", "/screens/patients/P10750", "/screens/patients/P10665"],
  "components/practice/duplicates.tsx": ["/screens/practice/patients/duplicates"],
  "components/practice/bulk-import.tsx": ["/screens/practice/patients"],
}
/** Pages that show every illustration and would list them all. */
const IGNORE = ["app/(design-system)/illustrations/", "app/screens/handoff/", "components/illustrations/"]

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith(".tsx")) out.push(p)
  }
  return out
}
function routeOfApp(rel) {
  const parts = rel.split("/").slice(1, -1).filter((s) => !s.startsWith("("))
  return "/" + parts.join("/")
}

const names = new Set(items.map((i) => i.name))
const usage = Object.fromEntries(items.map((i) => [i.name, []]))
for (const file of walk(SRC)) {
  const rel = relative(SRC, file).split(sep).join("/")
  if (IGNORE.some((p) => rel.startsWith(p))) continue
  const lines = readFileSync(file, "utf8").split("\n")
  lines.forEach((line, i) => {
    // Only where an illustration is being chosen: a name like "new-password"
    // is also an autoComplete value.
    const near = lines.slice(Math.max(0, i - 4), i + 1).join("\n")
    if (!/llustration/.test(near)) return
    for (const m of line.matchAll(/"([a-z0-9-]+)"/g)) {
      if (!names.has(m[1])) continue
      const routes = rel.startsWith("app/") ? [routeOfApp(rel)] : (ROUTES[rel] ?? [])
      usage[m[1]].push({ file: `src/${rel}`, line: i + 1, routes })
    }
  })
}
writeFileSync(USAGE, JSON.stringify(usage, null, 2) + "\n")

const placed = Object.values(usage).filter((u) => u.length).length
console.log(`illustrations: ${items.length} exported (${placed} placed), zip and usage written`)
