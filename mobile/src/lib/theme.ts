/* The patient app's tokens: the web portal's design system (src/app/globals.css
   with the brand teal accent), resolved to the colours the portal renders so
   the app and the portal read as one product. The app is light only for now,
   like the invitation email. */

export const color = {
  /** --primary: the brand teal, the portal primary */
  primary: "#01837E",
  /** The teal ramp two steps from white: the focus halo. */
  primaryHalo: "#94E6E0",
  /** --primary-hover, the portal's button hover; used for pressed. */
  primaryPressed: "#016D69",
  onPrimary: "#FFFFFF",
  /** --foreground */
  text: "#0A0A0A",
  /** --muted-foreground: secondary text and placeholders */
  muted: "#67656B",
  placeholder: "#67656B",
  /** --border / --input */
  border: "#E5E5E5",
  /** --input at 50%: the portal's filled inputs */
  inputFill: "#F2F2F2",
  /** The outlined inputs' resting border, a grey tinted toward the brand. */
  inputBorder: "#D0E3E1",
  /** --ring and --ring at 30%: the focus border and its halo */
  ring: "#A1A1A1",
  ringHalo: "#E2E2E2",
  /** --muted: pressed outline buttons */
  surface: "#F5F5F5",
  background: "#FFFFFF",
  /** --destructive, at 20% for the invalid halo, at 10% for message tints */
  error: "#B70000",
  errorHalo: "#F8D3CE",
  errorTint: "#FCE9E6",
  /** The onboarding screens' soft grey ground for cards and tracks. */
  canvas: "#F6F6F4",
  /** HOL Primary/00 (Figma "Hol", 5 Oct): the tint behind an icon, a date
      block, a small action, a chosen segment, the ask button. */
  primaryTint: "#F2F7F7",
  /** HOL Primary/01: the tile on a teal tinted card, the tab bar's edge. */
  primarySoft: "#E6F3F2",
  /** HOL Primary/02: the edge of a small action, the ask button and a
      teal tinted card. */
  primaryEdge: "#C2E1E0",
  /** HOL Primary/03: a trend line, the orb's ring. */
  primaryLine: "#92CAC8",
  /** HOL Primary/07: "See all". */
  primaryText: "#016F6B",
  /** Result flags, tint plus text as the portal draws them. */
  high: "#C72B32",
  highTint: "#FDECEE",
  low: "#B25A12",
  lowTint: "#FEF4E5",
  ok: "#2F7F4D",
  okTint: "#E9FAEF",
  /** The signed-in record's cool ground, under white cards: the far end of
      the page gradient (Figma: 158deg, #F8F8F8 to #F1F5F9). */
  page: "#F1F5F9",
  pageFrom: "#F8F8F8",
  /** Section labels and card meta on the record screens. */
  label: "#505050",
  /** Category hues for icon tiles, each an ink on its tint. */
  blue: "#3056D3",
  blueTint: "#E8EEFF",
  amber: "#C8641B",
  amberTint: "#FEF4E5",
  amberEdge: "#FCE1BE",
  violet: "#7A3FD1",
  violetTint: "#F3EBFF",
} as const

/** The chart kit's colours (components/charts.tsx), one meaning each, from
    the requirements catalog (7.3). The patient's data is always teal;
    status colours sit only on small marks (a dot, a ring, the latest point),
    never on a line, a fill or text; grey is reference (a goal, a rule, a
    tick). Contrast figures are against white. */
export const chart = {
  /** Lines, dots, rings, progress: the patient's data (4.65:1). */
  data: "#01837E",
  /** The selected or today's bar, a ring's second lap (8.52:1). */
  dataStrong: "#005350",
  /** Past days in weekly bars (3.63:1). */
  dataPast: "#2A9F9A",
  /** Ring and gauge tracks. */
  dataTrack: "#CEF4F1",
  /** Earlier score columns: teal at 35% on white. */
  dataSoft: "#A6D4D2",
  /** The body of a blood pressure capsule: teal at 22% on white. */
  dataWash: "#C7E4E3",
  /** Earlier dots in a trend tile. */
  history: "#81C6C1",
  /** The faint join between a trend tile's dots. */
  connector: "#B8D9D6",
  /** The patient's range behind trends and tiles. */
  band: "#E9FAEF",
  /** The 1 pt edge on a closed side of the band. */
  bandEdge: "#CBDFD3",
  /** The range zone on the range bar: "aim here". */
  targetZone: "#C5EFD5",
  /** Bar tracks, the range bar's outer zones, gridlines. */
  track: "#EEF1F4",
  /** A goal or target: a solid 1 pt hairline, always labelled. */
  goal: "#94A3B8",
  /** The selection rule, rug ticks, a "No reading" dot. */
  rule: "#CBD5E1",
  /** Ticks, dates and units (5.75:1). */
  muted: "#67656B",
  /** Status, on small marks only: in range (4.93:1). */
  inRange: "#2F7F4D",
  /** Borderline, always a ring: orange, so green, orange and red read as
      one scale from normal to borderline to abnormal. */
  borderline: "#F28A1E",
  /** Out of range, always a filled dot (5.50:1). Charts and badges read it
      through outOfRangeColor(), so the review can swap it. */
  outside: "#C72B32",
  /** The clay the client may choose for out of range instead (Q-06, decided
      on 5 Oct): shown only on /demo/kit's "Clay for out of range". */
  outsideClay: "#B4602A",
  /** The range bar's three clinical zones, soft fills for in range,
      borderline and out of range. */
  zoneIn: "#BFEBCF",
  zoneBorderline: "#FCDDB8",
  zoneOut: "#F8C4C6",
  /** A result measured another way: hollow, never joined (4.97:1). */
  other: "#667085",
  /** The forecast side of the progress chart. */
  future: "#F7F9FA",
  /** The flourishing speedometer's soft bands, never red: still growing,
      and doing well. */
  gaugeLow: "#F2D89A",
  gaugeHigh: "#AEDDC0",
  /** A chart tile's 1 pt edge, the record kit's card edge. */
  edge: "#EAECF0",
} as const

export const font = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
} as const

/** --radius (0.45rem) as the portal renders it; fields and buttons on a
    phone use the rounder, taller touch size. */
export const radius = 7.2
export const touchRadius = 12
export const buttonRadius = 999
/** Onboarding's page gutter. The signed-in screens use space.gutter. */
export const gutter = 24

/** Every card after onboarding: the white card, a trend tile, the hero, a
    banner (catalog V-10). The record kit's CARD_RADIUS is this. */
export const cardRadius = 8

/* ------------------------------------------- after onboarding (Figma) -- */

/* The signed-in screens follow the Frontline patient app's foundations
   (Figma "Frontline - New RPM Project", measured 1 Oct 2026): its text
   greys and type hierarchy, its spacing, in Inlay teal where Frontline
   uses its blue. Onboarding keeps everything above unchanged. */

/** Frontline's text greys and inks, one job each. Every one passes WCAG AA
    (4.5:1) for small text on white and on the page. */
export const ink = {
  /** Grey/10: screen and block titles, numbers, names (14.2:1 on white). */
  strong: "#2B2B2B",
  /** Grey/09: row and card titles, sentences, chips, status words, a key's
      value (11.6:1). */
  content: "#393939",
  /** Grey/08: detail lines, the neutral trend arrow; the same grey as
      color.label (8.1:1). */
  detail: "#505050",
  /** Grey/07, the workhorse: the line under a title, section labels, units,
      chart labels (6.3:1, 5.7 on the page). */
  secondary: "#606060",
  /** Frontline's Grey/06 (#818181) fails AA at 3.9:1; this is the nearest
      grey that passes on white (4.95:1) and on the page (4.52:1): dates,
      sources, counts, quiet words. */
  tertiary: "#707070",
  /** Teal at text size, where Frontline uses its darker Primary/08: the
      word on a small pill action, a chosen chip, a teal badge, and teal
      words at 12 pt (a note in a row, a link inside a line of meta). The
      brand teal walked darker at the same hue (7.2:1 on white, 6.6 on the
      page, 6.7 on the teal tint). Links and text buttons at 14 pt, the
      primary button, icons, edges and focus stay color.primary (4.6:1 on
      white). */
  primary: "#015D59",
  /** Green words on the green tint ("Done", "Met"): Frontline's Success/08
      (6.8:1 on white, 6.3 on the tint). Green marks stay chart.inRange. */
  good: "#24673D",
  /** Words on teal, on the hero's gradient and on the dark toast. */
  onColor: "#FFFFFF",
} as const

/** Frontline's hairlines: a card's edge (chart.edge), the rule between rows
    inside a card, and the edge of an outlined pill, chip or field. */
export const hairline = { edge: "#EAECF0", rule: "#F2F2F7", outline: "#DFDFE4" } as const

/** Figma "Hol" (5 Oct 2026): every card is white at 60% on the page
    gradient, radius 8, 12 inside, lifted by the softest shadow; small
    controls take the xs shadow. Chevrons and resting tab icons are
    Grey/06. */
export const card = {
  fill: "rgba(255, 255, 255, 0.6)",
  shadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
  shadowXs: "0 1px 2px rgba(16, 24, 40, 0.05)",
  chevron: "#818181",
} as const

/** Frontline's quiet surfaces: an inset panel inside a white card, and the
    dark confirmation pill. */
export const surface = { inset: "#F7F7FA", toast: "#2B2B2B" } as const

/** The signed-in screens' spacing, on Frontline's scale (2, 4, 6, 8, 10,
    12, 16, 20, 24), by role. Use the role that fits; component metrics
    with no role (a pill's height, a tile's size) stay numbers on the
    scale. */
export const space = {
  /** The page's side margin on every signed-in screen and in the kit
      (Frontline: 16 on every screen and sheet). */
  gutter: 16,
  /** Between a screen's sections (Frontline: 16 on lists, 20 on its tool
      screens; 20 between rounder cards). */
  section: 20,
  /** Between cards in a list, a heading and its content, and things side
      by side: buttons, tiles (Frontline 12). */
  item: 12,
  /** Inside a card, and between rows that have no rule (Frontline 12 at
      radius 8, 16 in its form cards and its radius 20 home sheet). */
  card: 12,
  /** Inside a compact block: a banner, a trend tile, an inset panel
      (Frontline's flat card, 12). */
  compact: 12,
  /** A row's top and bottom inside a Group: its words sit 12 from the
      edge and the rule, as in Frontline's grouped lists. */
  rowY: 12,
  /** A Group's sides: the card's padding. */
  rowX: 12,
  /** A tile, a date block or an avatar to the words beside it. */
  lead: 12,
  /** An 18 to 24 pt icon, or a label, to what it labels; chips in a row
      (Frontline 8). */
  inline: 8,
  /** A dot, a check or a 14 to 16 pt icon to its word, inside a pill or a
      chip (Frontline 6). */
  mark: 6,
  /** A 16 pt title to the line under it; a value to its unit; lines in a
      three line row; a 12 pt icon to its word (Frontline 4). */
  stack: 4,
  /** A 14 pt title to the line under it; the greeting to the name
      (Frontline 2). */
  line: 2,
} as const

/** The type scale after onboarding: Frontline's hierarchy by role. Inter
    with no tracking; Medium is the title weight at every level, Regular
    is reading text, SemiBold marks a number; levels part by size and by
    grey. Every block keeps a title, a primary line, a label, a value and
    meta that look different. Spread one into a style:
    `[type.title, { flex: 1 }]`. Onboarding and the frozen components
    (Button, ListRow, Sheet, chat bubbles) keep their own sizes. */
export const type = {
  /** A dial's centre: the score gauge and the day page's ring. Frontline
      draws no dial; this is its file's largest style (32/40), semibold as
      every number is. */
  display: { fontFamily: font.semibold, fontSize: 32, lineHeight: 40, letterSpacing: 0, color: ink.strong },
  /** The one big number a page or card leads with: the marker readout
      ("5.9"), "11 lb", a ring's centre at 96 (Frontline's captured
      reading, 20/28). */
  hero: { fontFamily: font.semibold, fontSize: 20, lineHeight: 28, letterSpacing: 0, color: ink.strong },
  /** The screen title: a tab's pinned title and a page's beside its back
      button (Frontline H2, 18/26 medium). */
  tabTitle: { fontFamily: font.medium, fontSize: 18, lineHeight: 26, letterSpacing: 0, color: ink.content },
  /** A number on a card or a tile: tile values, the doors, a chart's
      readout, a price (Frontline's reading on a card, 16 semibold). */
  stat: { fontFamily: font.semibold, fontSize: 16, lineHeight: 20, letterSpacing: 0, color: ink.strong },
  /** A block's title: a card's title, a home section's title, the name on
      the home header, a sheet's title, an empty state's title (Frontline
      H3, 16/24 medium). */
  section: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, letterSpacing: 0, color: ink.strong },
  /** The quiet label over a group, outside its card: "Next step", "Every
      result" (Frontline's section heading, 14/20 medium in Grey/07). */
  sectionLabel: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, letterSpacing: 0, color: ink.secondary },
  /** A number in a row: the "80" in "80 of 110 g", a result's value
      (14 semibold). */
  value: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, letterSpacing: 0, color: ink.strong },
  /** Row and card titles, door labels, a banner's title (Frontline's row
      title, 14/20 medium). */
  title: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, letterSpacing: 0, color: ink.content },
  /** Sentences: takeaways, explanations, a quoted why (Frontline
      Body/14, 14/22). */
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, letterSpacing: 0, color: ink.detail },
  /** The line under a title, a key's label, a legend (Frontline's second
      line, 12/16 in Grey/07). */
  label: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, letterSpacing: 0, color: ink.secondary },
  /** Dates, sources, counts, the quietest words (Frontline's tertiary
      meta, nudged to pass AA). */
  meta: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, letterSpacing: 0, color: ink.tertiary },
  /** Status words beside their mark, a key's value, a small group label
      (12 medium). */
  metaStrong: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0, color: ink.content },
  /** Chart labels: ticks, edges, dates under a plot (Frontline's chart
      labels, 12/16 in Grey/07). */
  axis: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, letterSpacing: 0, color: ink.secondary },
  /** A unit after a value or a stat: "%", "mg/dL", "kcal". */
  unit: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, letterSpacing: 0, color: ink.secondary },
  /** A unit after a hero or display number (Frontline: 14 after its
      largest readings). */
  unitLarge: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0, color: ink.secondary },
  /** A link or a text button: "See all", "Not now" (Frontline Button/14,
      no underline, no container). Teal for the one action. */
  link: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, letterSpacing: 0, color: ink.primary },
  /** "See all" beside a section label, with a caret (Figma Button/12 in
      Primary/07). */
  seeAll: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0, color: color.primaryText },
  /** The word on a small pill action: "Book", "Save", "Renew" (Frontline's
      small actions, 12 medium in the text teal). */
  action: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0, color: ink.primary },
  /** A filter chip's word (Frontline, 14 regular); a chosen chip turns
      ink.primary. */
  chip: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0, color: ink.content },
  /** A badge's word, in its tone's ink: "Overdue", "Booked", "New"
      (Frontline Badge sm, 12/14 medium). */
  tag: { fontFamily: font.medium, fontSize: 10, lineHeight: 14, letterSpacing: 0, color: ink.secondary },
  /** The smallest words: a ring's caption, a mini track's dates
      (Frontline Captions/10). */
  caption: { fontFamily: font.regular, fontSize: 10, lineHeight: 14, letterSpacing: 0, color: ink.secondary },
  /** Captions in medium: a date block's weekday, a count badge, a mini
      track's steps. */
  captionStrong: { fontFamily: font.medium, fontSize: 10, lineHeight: 14, letterSpacing: 0, color: ink.content },
} as const

/* The out of range mark's colour. Red by default; the client decides red or
   clay on 5 Oct (Q-06), so /demo/kit can swap it for the whole page. */
let outOfRange: string = chart.outside

/** The out of range mark's colour, read at render by the chart and record
    kits (never captured once at import, so a swap reaches every mark). */
export function outOfRangeColor(): string {
  return outOfRange
}

/** Swaps the out of range mark's colour. Only /demo/kit calls it, then
    remounts its gallery so every mark draws again. */
export function setOutOfRangeColor(hex: string): void {
  outOfRange = hex
}
