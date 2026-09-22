export type FontOption = {
  name: string
  label: string
  note: string
}

export const BODY_FONTS: FontOption[] = [
  { name: "inter", label: "Inter", note: "Neutral UI workhorse — the SaaS default" },
  { name: "roboto", label: "Roboto", note: "Familiar, slightly narrower, dense-table friendly" },
  { name: "noto-sans", label: "Noto Sans", note: "Widest language coverage" },
  { name: "ibm-plex-sans", label: "IBM Plex Sans", note: "Institutional, strong at small sizes" },
  { name: "source-sans-3", label: "Source Sans 3", note: "Humanist, long-form reading" },
  { name: "public-sans", label: "Public Sans", note: "Government-grade legibility" },
  { name: "dm-sans", label: "DM Sans", note: "Geometric, modern product feel" },
  { name: "figtree", label: "Figtree", note: "Friendly geometric" },
  { name: "manrope", label: "Manrope", note: "Semi-condensed, good for dense UI" },
  { name: "geist", label: "Geist", note: "Vercel's neutral grotesque" },
]

export const HEADING_FONTS: FontOption[] = [
  { name: "inherit", label: "Same as body", note: "Single-family system — most cohesive" },
  ...BODY_FONTS,
]
