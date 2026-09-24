/** The demo gallery's name and the accent it opens in. */
export const DME_NAME = "Lakeside Sleep Center"
export const DME_ACCENT = "brand-cyan"

/** Where the picked primary colour is kept, per browser. */
export const DME_ACCENT_KEY = "dme-accent"

/**
 * The primary colours the demo's customizer offers, cyan first as the
 * default; authored in app/dme-themes.css.
 */
export const DME_ACCENTS = [
  { name: "brand-cyan", label: "Cyan", swatch: "oklch(0.555 0.102 222)" },
  { name: "dme-ocean", label: "Ocean", swatch: "oklch(0.55 0.17 252)" },
  { name: "dme-indigo", label: "Indigo", swatch: "oklch(0.52 0.19 278)" },
  { name: "dme-violet", label: "Violet", swatch: "oklch(0.53 0.21 300)" },
  { name: "dme-emerald", label: "Emerald", swatch: "oklch(0.55 0.13 162)" },
  { name: "dme-coral", label: "Coral", swatch: "oklch(0.57 0.17 33)" },
  { name: "dme-rose", label: "Rose", swatch: "oklch(0.55 0.2 8)" },
  { name: "dme-plum", label: "Plum", swatch: "oklch(0.47 0.115 329)" },
] as const

export function isDmeAccent(name: unknown): name is string {
  return DME_ACCENTS.some((accent) => accent.name === name)
}

/** Paints the stored pick before hydration so the default never flashes. */
export const PAINT_ACCENT = `(function(){var a=${JSON.stringify(DME_ACCENT)};try{var s=localStorage.getItem(${JSON.stringify(DME_ACCENT_KEY)});if(${JSON.stringify(DME_ACCENTS.map((x) => x.name))}.indexOf(s)>=0)a=s}catch(e){}document.documentElement.setAttribute("data-accent",a)})()`
