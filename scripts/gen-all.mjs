import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SCRATCH = path.join(PROJECT, "scripts", ".cache")
fs.mkdirSync(SCRATCH, { recursive: true })

import { execFileSync } from "node:child_process"

import {
  encodePreset,
  DEFAULT_PRESET_CONFIG,
  PRESET_BASE_COLORS,
  PRESET_THEMES,
  PRESET_RADII,
} from "shadcn/preset"

const CSS = path.join(PROJECT, "src/app/globals.css")
const ORIGINAL = path.join(SCRATCH, "globals.ORIGINAL.css")

// Variables driven by the accent theme; everything else belongs to the base palette.
const THEME_VARS = new Set([
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
])

const FIXED = {
  ...DEFAULT_PRESET_CONFIG,
  style: "luma",
  iconLibrary: "remixicon",
  radius: "small",
  menuAccent: "bold",
  menuColor: "default-translucent",
  font: "inter",
  fontHeading: "inherit",
}

function extractBlock(css, selector) {
  const re = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`, "m")
  const m = css.match(re)
  if (!m) return null
  const vars = {}
  for (const line of m[1].split("\n")) {
    const mm = line.match(/^\s*(--[\w-]+):\s*(.+?);\s*$/)
    if (mm) vars[mm[1]] = mm[2]
  }
  return vars
}

function apply(config) {
  const code = encodePreset({ ...FIXED, ...config })
  fs.copyFileSync(ORIGINAL, CSS)
  execFileSync("npx", ["--yes", "shadcn@latest", "apply", "--preset", code, "--only", "theme", "-y"], {
    cwd: PROJECT,
    stdio: "ignore",
  })
  const css = fs.readFileSync(CSS, "utf8")
  return { code, light: extractBlock(css, ":root"), dark: extractBlock(css, ".dark") }
}

const pick = (vars, wanted) =>
  Object.fromEntries(Object.entries(vars).filter(([k]) => wanted.has(k) === true))
const omit = (vars, unwanted) =>
  Object.fromEntries(Object.entries(vars).filter(([k]) => unwanted.has(k) === false))

const result = { bases: {}, themes: {}, radii: {} }

const failed = []

function tryApply(label, config, onSuccess) {
  // The registry rejects a neutral-family color used as an accent unless the
  // base color matches it, so try that pairing first.
  for (const baseColor of [config.theme, config.baseColor, "zinc", "gray"]) {
    try {
      const r = apply({ ...config, baseColor })
      onSuccess(r)
      console.error(`${label} -> ${r.code}${baseColor === config.baseColor ? "" : ` (via ${baseColor})`}`)
      return true
    } catch {
      // Registry rejects some baseColor/theme pairs; retry on another base.
    }
  }
  failed.push(label)
  console.error(`${label} -> FAILED`)
  return false
}

// Accent themes: vary theme on a fixed base.
for (const theme of PRESET_THEMES) {
  tryApply(`theme  ${theme}`, { baseColor: "neutral", theme, chartColor: theme }, (r) => {
    result.themes[theme] = {
      light: pick(r.light, THEME_VARS),
      dark: pick(r.dark, THEME_VARS),
    }
  })
}

// Base palettes: vary baseColor on a fixed theme.
for (const baseColor of PRESET_BASE_COLORS) {
  const config = { baseColor, theme: "blue", chartColor: "blue" }
  try {
    const r = apply(config)
    result.bases[baseColor] = {
      light: omit(r.light, THEME_VARS),
      dark: omit(r.dark, THEME_VARS),
    }
    console.error(`base   ${baseColor} -> ${r.code}`)
  } catch {
    failed.push(`base ${baseColor}`)
    console.error(`base   ${baseColor} -> FAILED`)
  }
}

// Radius scale.
for (const radius of PRESET_RADII) {
  try {
    const r = apply({ baseColor: "neutral", theme: "blue", chartColor: "blue", radius })
    result.radii[radius] = r.light["--radius"]
    console.error(`radius ${radius} -> ${r.light["--radius"]}`)
  } catch {
    failed.push(`radius ${radius}`)
    console.error(`radius ${radius} -> FAILED`)
  }
}

console.error(`\nfailed: ${failed.length ? failed.join(", ") : "none"}`)

fs.copyFileSync(ORIGINAL, CSS)
fs.writeFileSync(path.join(SCRATCH, "themes-all.json"), JSON.stringify(result, null, 2))
console.error("done; globals.css restored")
