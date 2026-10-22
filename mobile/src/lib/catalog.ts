import { addDays } from "@/lib/member"

/* The Care tab's catalog (client deck "Patient Journey_14", screens 52 to
   54, stage 07 "Catalog and ordering"): everything Inlay can order for a
   patient, priced. Nine categories drawn from the vetted partner
   directory, each naming the national partner behind it and the price it
   starts at; every category opens one item, with what it does, what it
   cannot tell you, who writes the order, and one button that orders and
   pays; a test or scan then goes straight to a time.

   Cash prices, nothing billed to insurance; every clinical item needs the
   patient's own physician's order (screen 52's footnote). The multi-cancer
   screening is the client's own copy (screen 53). Every other item's words
   are sample copy for clinical review, in the same plain voice. */

export type Hue = "teal" | "blue" | "amber" | "green" | "red" | "violet" | "neutral"

export type Category = {
  id: string
  title: string
  /** The line under the title: what is in it and who is behind it. */
  meta: string
  /** The price it starts at; `exact` when there is one price ("Sleep"). */
  price: number
  exact?: boolean
  hue: Hue
  /** The item the row opens. */
  item: string
}

/** Screen 52's nine categories, in the client's order. */
export const CATEGORIES: readonly Category[] = [
  { id: "lab", title: "Laboratory", meta: "42 panels · Quest, Labcorp, Boston Heart", price: 89, hue: "teal", item: "blood-panel" },
  { id: "body", title: "Body composition & metabolism", meta: "DEXA, RMR, VO₂ max · Fitnescity", price: 129, hue: "red", item: "dexa" },
  { id: "imaging", title: "Imaging", meta: "MRI, CT, whole-body · SimonMed, RAYUS", price: 699, hue: "teal", item: "whole-body-mri" },
  { id: "cancer", title: "Cancer screening", meta: "Galleri, Shield, hereditary · GRAIL, Guardant", price: 249, hue: "red", item: "multi-cancer" },
  { id: "brain", title: "Brain health", meta: "AD-Detect, ApoE, ATN · Quest, Labcorp", price: 199, hue: "amber", item: "ad-detect" },
  { id: "sleep", title: "Sleep", meta: "Two-night home study · Lofta", price: 299, exact: true, hue: "amber", item: "sleep-study" },
  { id: "devices", title: "Devices & wearables", meta: "CGM, ring, cuff, scale · Dexcom, Oura", price: 99, hue: "teal", item: "cgm" },
  { id: "programmes", title: "Programmes", meta: "SMART, nutrition, movement · Benson–Henry", price: 100, hue: "green", item: "smart" },
  { id: "home", title: "Home & care products", meta: "Supplies, meals, transport · Medline", price: 19, hue: "blue", item: "home-care" },
]

/** A test or scan is booked at a site; a device, a programme or supplies
    are shipped or started, so they have no time to pick. */
export type Fulfil = "visit" | "ship"

export type Item = {
  id: string
  category: string
  name: string
  /** The small badge beside the name: "Screening". */
  tag: string
  /** Who is behind it and how long it takes, one or two sentences. */
  intro: string
  /** What the price card says under the price. */
  priceNote: string
  member: number
  /** The standard price, struck through, when the member price saves. */
  standard?: number
  /** The card's right side: "RESULTS 2–3 wks". */
  when: { label: string; value: string }
  /** `**bold**` marks the words to weigh. */
  does: readonly string[]
  cannot: readonly string[]
  /** What Inlay does after the physician signs: "connects you to GRAIL,
      schedules the draw and carries the result back". */
  inlay: string
  fulfil: Fulfil
  /** A test or scan: the partner whose sites are listed, the word for the
      visit ("draw", "scan"), and what to know about it. */
  site?: string
  visit?: { noun: string; about: string; bring: string }
}

export const ITEMS: readonly Item[] = [
  {
    id: "blood-panel",
    category: "lab",
    name: "Comprehensive blood panel",
    tag: "Laboratory",
    intro: "Quest Diagnostics. One blood draw, results in a few days.",
    priceNote: "Member price · drawn at any Quest site",
    member: 89,
    when: { label: "Results", value: "1–3 days" },
    does: [
      "Measures **blood sugar, cholesterol, and kidney and liver markers** in one draw.",
      "The result lands in your longitudinal record and is read beside everything else, not in isolation.",
    ],
    cannot: [
      "**It is not a diagnosis.** A value outside its range is a reason to look closer, not an answer.",
      "**It shows one day.** Food, sleep and illness can move a single result.",
    ],
    inlay: "connects you to Quest, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes.", bring: "Fasting, if needed, is on your physician's order." },
  },
  {
    id: "dexa",
    category: "body",
    name: "DEXA body composition scan",
    tag: "Body composition",
    intro: "Fitnescity. One scan, results the same day.",
    priceNote: "Member price · done at any Fitnescity site",
    member: 129,
    when: { label: "Results", value: "Same day" },
    does: [
      "Measures **body fat, lean mass and bone density** in one short scan.",
      "Shows where fat sits, so progress is more than the number on a scale.",
    ],
    cannot: [
      "**It does not diagnose bone disease** on its own. Your physician reads it with your history.",
      "**Small changes between scans can be noise.** Compare scans a few months apart.",
    ],
    inlay: "connects you to Fitnescity, schedules the scan and carries the result back",
    fulfil: "visit",
    site: "Fitnescity",
    visit: { noun: "scan", about: "One visit, about fifteen minutes.", bring: "Wear clothes without metal." },
  },
  {
    id: "whole-body-mri",
    category: "imaging",
    name: "Whole-body MRI",
    tag: "Imaging",
    intro: "SimonMed. One scan with no radiation, read by a radiologist.",
    priceNote: "Member price · done at any SimonMed site",
    member: 699,
    when: { label: "Results", value: "1–2 wks" },
    does: [
      "Looks at **organs and soft tissue** from head to pelvis without radiation.",
      "A radiologist reads it and your physician goes through it with you.",
    ],
    cannot: [
      "**It does not rule disease out.** A clear scan is not a clean bill of health.",
      "**Findings are common and most are harmless**, but some need follow-up tests.",
    ],
    inlay: "connects you to SimonMed, schedules the scan and carries the result back",
    fulfil: "visit",
    site: "SimonMed",
    visit: { noun: "scan", about: "One visit, about an hour.", bring: "Nothing metal on you." },
  },
  {
    id: "multi-cancer",
    category: "cancer",
    name: "Multi-cancer blood screening",
    tag: "Screening",
    intro: "Galleri, by GRAIL. One blood draw, results in two to three weeks.",
    priceNote: "Member price · drawn at any Quest site",
    member: 854,
    standard: 949,
    when: { label: "Results", value: "2–3 wks" },
    does: [
      "Looks for a DNA signal shed by tumours, shared by **more than fifty cancers** — many of which have no routine screening test at all.",
      "When a signal is found, the report **predicts where it came from**, so your physician knows which follow-up to order first.",
      "The result lands in your longitudinal record and is read beside everything else, not in isolation.",
    ],
    cannot: [
      "**It does not rule cancer out.** A negative result is not a clean bill of health, and it never will be.",
      "**A positive signal is not a diagnosis.** It is a reason to investigate, and some signals turn out to be nothing.",
      "It **does not replace** mammography, colonoscopy or any screening your physician already recommends.",
    ],
    inlay: "connects you to GRAIL, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes, no fasting.", bring: "Quest has the order before you arrive." },
  },
  {
    id: "ad-detect",
    category: "brain",
    name: "Alzheimer’s blood biomarker",
    tag: "Brain health",
    intro: "Quest AD-Detect. One blood draw, results in one to two weeks.",
    priceNote: "Member price · drawn at any Quest site",
    member: 199,
    when: { label: "Results", value: "1–2 wks" },
    does: [
      "Looks for **blood markers linked to Alzheimer's disease** years before memory changes show.",
      "Gives your physician a baseline to track over time.",
    ],
    cannot: [
      "**It does not diagnose dementia.** It is one input for your physician, not a verdict.",
      "**A normal result does not mean you are protected** in the years ahead.",
    ],
    inlay: "connects you to Quest, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes, no fasting.", bring: "Quest has the order before you arrive." },
  },
  {
    id: "sleep-study",
    category: "sleep",
    name: "Two-night home sleep study",
    tag: "Sleep",
    intro: "Lofta. A small kit you wear in your own bed, results in about a week.",
    priceNote: "Member price · sent to your door",
    member: 299,
    when: { label: "Results", value: "About 1 wk" },
    does: [
      "Records **breathing, oxygen and sleep stages** across two nights at home.",
      "Comes with simple set-up steps, so there is nothing to book.",
    ],
    cannot: [
      "**It does not replace an overnight lab study** if your physician wants one.",
      "**Two nights are a snapshot.** One unusual night can skew the picture.",
    ],
    inlay: "connects you to Lofta, sends the kit and carries the result back",
    fulfil: "ship",
  },
  {
    id: "cgm",
    category: "devices",
    name: "Continuous glucose monitor",
    tag: "Devices",
    intro: "Dexcom. A small sensor on your arm that reads glucose day and night.",
    priceNote: "Member price · sent to your door",
    member: 99,
    when: { label: "Arrives", value: "3–5 days" },
    does: [
      "Reads **glucose around the clock**, with no finger sticks.",
      "Shows how meals, sleep and movement move your glucose, beside the rest of your record.",
    ],
    cannot: [
      "**It does not diagnose diabetes.** Your physician does that with a blood test.",
      "**Readings can lag the blood by several minutes.**",
    ],
    inlay: "connects you to Dexcom, sends the sensor and brings the readings into your record",
    fulfil: "ship",
  },
  {
    id: "smart",
    category: "programmes",
    name: "SMART mind–body programme",
    tag: "Programme",
    intro: "Benson–Henry. Short guided sessions you do on your own time.",
    priceNote: "Member price · starts in the app",
    member: 100,
    when: { label: "Starts", value: "This week" },
    does: [
      "Teaches **stress, sleep and movement skills** in short guided sessions.",
      "Your progress shows up beside the rest of your health data.",
    ],
    cannot: [
      "**It is not treatment** for a medical condition.",
      "**It works through practice.** What you get depends on showing up.",
    ],
    inlay: "connects you to Benson–Henry and starts the programme in the app",
    fulfil: "ship",
  },
  {
    id: "home-care",
    category: "home",
    name: "Home and care supplies",
    tag: "Home & care",
    intro: "Medline. Everyday supplies, meals and transport, sent to you.",
    priceNote: "Member price · sent to your door",
    member: 19,
    when: { label: "Arrives", value: "2–4 days" },
    does: [
      "Brings **everyday care supplies, meals and transport** from one vetted partner.",
      "Order what you need, when you need it, with no calls.",
    ],
    cannot: [
      "**It is not medical advice.** Ask your physician what suits you.",
      "**Stock and delivery times vary** by item and address.",
    ],
    inlay: "connects you to Medline and sends your order",
    fulfil: "ship",
  },
]

export const item = (id: string) => ITEMS.find((i) => i.id === id)

/** "$854" */
export const money = (n: number) => `$${n.toLocaleString("en-US")}`

/** "Multi-cancer blood screening" as "Multi-cancer blood screening"; the
    page title over an item: its category. */
export const categoryOf = (it: Item) => CATEGORIES.find((c) => c.id === it.category)

/** Matches a search: the category's words and its item's. */
export function matches(c: Category, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const it = item(c.item)
  return [c.title, c.meta, it?.name, it?.intro].some((s) => s?.toLowerCase().includes(q))
}

/* ------------------------------------------------------------- booking -- */

/** Where a test or scan can be done: the three nearest sites of its
    partner, as the deck draws them (screen 54, sample addresses). `soonest`
    is the days until its next opening. */
export type Site = { id: string; town: string; address: string; miles: number; soonest: number }

export const SITES: readonly Site[] = [
  { id: "clarkston", town: "Clarkston", address: "6880 Dixie Hwy", miles: 2.1, soonest: 1 },
  { id: "waterford", town: "Waterford", address: "5885 Highland Rd", miles: 4.8, soonest: 2 },
  { id: "auburn-hills", town: "Auburn Hills", address: "3100 Walton Blvd", miles: 9.3, soonest: 0 },
]

/** The times a site offers each morning. */
export const SLOTS = ["7:00", "7:30", "8:00", "8:15", "9:00", "9:45", "10:30", "11:15"] as const

/** Times already taken, by day: they stay on the grid, shown as gone. */
const GONE: readonly (readonly string[])[] = [["7:00", "7:30", "8:00"], ["7:00", "7:30"], [], ["9:45"]]

export const goneOn = (day: number, time: string) => GONE[day % GONE.length].includes(time)

/** A day counted from today, moved off a Sunday, when the sites are
    closed. */
export function openDay(days: number, now: Date = new Date()) {
  const day = addDays(now, days)
  return day.getDay() === 0 ? addDays(day, 1) : day
}

/** The four days offered from a site's first opening, Sundays skipped. */
export function bookingDays(site: Site, now: Date = new Date()): Date[] {
  const days: Date[] = [openDay(site.soonest, now)]
  while (days.length < 4) {
    const next = addDays(days[days.length - 1], 1)
    days.push(next.getDay() === 0 ? addDays(next, 1) : next)
  }
  return days
}

/** "Today", "Tomorrow", or the weekday. */
export function nextWord(site: Site, now: Date = new Date()) {
  const day = openDay(site.soonest, now)
  const diff = Math.round((new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000)
  return diff <= 0 ? "Today" : diff === 1 ? "Tomorrow" : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day.getDay()]
}

/** The first time still open on a day, or none. */
export const firstOpen = (day: number) => SLOTS.find((t) => !goneOn(day, t))

/** A day and a "8:15" as a date. */
export function atSlot(day: Date, time: string) {
  const [h, m] = time.split(":").map(Number)
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m)
}
