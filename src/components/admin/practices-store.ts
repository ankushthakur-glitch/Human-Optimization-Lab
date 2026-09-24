"use client"

import * as React from "react"

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type ClinicManager = {
  firstName: string
  middleName: string
  lastName: string
  email: string
  phone: string
  gender: string
  status: "Invited" | "Active"
  invitedAt: string
}

/* The practice's business contact for HOL (contracts, billing, onboarding).
   Not a portal user: the clinic manager is the one who signs in. */
export type PrimaryContact = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export type PracticeStatus = "Active" | "Inactive"

export type Practice = {
  id: string
  name: string
  tenant: string
  referralUrl: string
  locationName: string
  contactNumber: string
  npi: string
  email: string
  fax: string
  website: string
  primaryContact: PrimaryContact
  status: PracticeStatus
  createdAt: string
  clinicians: number
  patients: number
  manager?: ClinicManager
}

/** What the create and edit form collects: everything the admin types. */
export type PracticeInput = Omit<
  Practice,
  "id" | "status" | "createdAt" | "clinicians" | "patients" | "manager"
>

export type ClinicManagerInput = Omit<ClinicManager, "status" | "invitedAt">

/* -------------------------------------------------------------------------- */
/*  Derived values                                                             */
/* -------------------------------------------------------------------------- */

/* The tenant name keys the practice's data, so it is derived from the name
   rather than typed, and fixed once the practice exists. */
export function tenantFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export function referralUrlFor(tenant: string) {
  const slug = tenant ? tenant.replace(/_/g, "-") : "tenant-name"
  return `https://app.humanoptimizationlab.com/${slug}/referral`
}

export function managerName(
  manager: Pick<ClinicManager, "firstName" | "lastName">
) {
  return `${manager.firstName} ${manager.lastName}`.trim()
}

export function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/* The phone mask the reference uses: (123)-456-7890. */
export function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 10)
  if (d.length === 0) return ""
  if (d.length <= 3) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 3)})-${d.slice(3)}`
  return `(${d.slice(0, 3)})-${d.slice(3, 6)}-${d.slice(6)}`
}

export const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"]

/* -------------------------------------------------------------------------- */
/*  Sample data                                                                */
/* -------------------------------------------------------------------------- */

/* Contacts for practices that have no clinic manager yet. */
const CONTACTS: [firstName: string, lastName: string][] = [
  ["Rachel", "Moreau"],
  ["Thomas", "Albright"],
  ["Nina", "Castellano"],
  ["Victor", "Huang"],
  ["Laura", "Kimball"],
  ["Peter", "Osei"],
]

function practice(
  p: Omit<Practice, "tenant" | "referralUrl" | "primaryContact">
): Practice {
  const tenant = tenantFromName(p.name)
  const seed = Number(p.id)
  const domain = p.email.split("@")[1] ?? `${tenant.replace(/_/g, "")}.com`
  const [firstName, lastName] = p.manager
    ? [p.manager.firstName, p.manager.lastName]
    : CONTACTS[seed % CONTACTS.length]
  return {
    ...p,
    tenant,
    referralUrl: referralUrlFor(tenant),
    primaryContact: {
      firstName,
      lastName,
      email:
        p.manager?.email || `${firstName}.${lastName}@${domain}`.toLowerCase(),
      phone: p.manager?.phone || p.contactNumber,
    },
  }
}

/* Fictional practices only. Phone numbers sit in the 555-01xx range that is
   reserved for fiction. */
const HAND_WRITTEN: Practice[] = [
  practice({
    id: "593892",
    name: "Summit Concierge Medicine",
    locationName: "Cherry Creek",
    contactNumber: "(303)-555-0142",
    npi: "1497852036",
    email: "frontdesk@summitconcierge.com",
    fax: "(303)-555-0143",
    website: "https://www.summitconcierge.com",
    status: "Active",
    createdAt: "2026-09-23",
    clinicians: 6,
    patients: 214,
    manager: {
      firstName: "Hannah",
      middleName: "",
      lastName: "Brooks",
      email: "hannah.brooks@summitconcierge.com",
      phone: "(303)-555-0150",
      gender: "Female",
      status: "Active",
      invitedAt: "2026-09-23",
    },
  }),
  practice({
    id: "954150",
    name: "Harborview Longevity Clinic",
    locationName: "La Jolla",
    contactNumber: "(858)-555-0118",
    npi: "1760493218",
    email: "care@harborviewlongevity.com",
    fax: "",
    website: "https://www.harborviewlongevity.com",
    status: "Active",
    createdAt: "2026-09-22",
    clinicians: 4,
    patients: 131,
    manager: {
      firstName: "Marcus",
      middleName: "J",
      lastName: "Whitfield",
      email: "marcus.whitfield@harborviewlongevity.com",
      phone: "(858)-555-0121",
      gender: "Male",
      status: "Invited",
      invitedAt: "2026-09-22",
    },
  }),
  practice({
    id: "232276",
    name: "Lakeshore Precision Health",
    locationName: "Downtown Austin",
    contactNumber: "(512)-555-0164",
    npi: "1356820471",
    email: "hello@lakeshoreprecision.com",
    fax: "(512)-555-0165",
    website: "",
    status: "Inactive",
    createdAt: "2026-09-08",
    clinicians: 2,
    patients: 38,
  }),
  practice({
    id: "076436",
    name: "Northfield Executive Health",
    locationName: "River North",
    contactNumber: "(312)-555-0187",
    npi: "1932057846",
    email: "office@northfieldexec.com",
    fax: "(312)-555-0188",
    website: "https://www.northfieldexec.com",
    status: "Active",
    createdAt: "2026-09-01",
    clinicians: 9,
    patients: 402,
    manager: {
      firstName: "Priya",
      middleName: "",
      lastName: "Natarajan",
      email: "priya.natarajan@northfieldexec.com",
      phone: "(312)-555-0190",
      gender: "Female",
      status: "Active",
      invitedAt: "2026-09-01",
    },
  }),
  practice({
    id: "428549",
    name: "Cedar and Pine Family Concierge",
    locationName: "Pearl District",
    contactNumber: "(503)-555-0109",
    npi: "1285730964",
    email: "team@cedarpineconcierge.com",
    fax: "",
    website: "https://www.cedarpineconcierge.com",
    status: "Active",
    createdAt: "2026-08-21",
    clinicians: 3,
    patients: 97,
  }),
  practice({
    id: "530919",
    name: "Meridian Performance Medicine",
    locationName: "Old Town",
    contactNumber: "(480)-555-0133",
    npi: "1649208375",
    email: "concierge@meridianperformance.com",
    fax: "(480)-555-0134",
    website: "https://www.meridianperformance.com",
    status: "Active",
    createdAt: "2026-08-19",
    clinicians: 5,
    patients: 176,
    manager: {
      firstName: "Daniel",
      middleName: "",
      lastName: "Okafor",
      email: "daniel.okafor@meridianperformance.com",
      phone: "(480)-555-0139",
      gender: "Male",
      status: "Active",
      invitedAt: "2026-08-19",
    },
  }),
  practice({
    id: "042069",
    name: "Brightwater Internal Medicine",
    locationName: "Back Bay",
    contactNumber: "(617)-555-0172",
    npi: "1174689302",
    email: "info@brightwatermed.com",
    fax: "(617)-555-0173",
    website: "https://www.brightwatermed.com",
    status: "Active",
    createdAt: "2026-08-19",
    clinicians: 7,
    patients: 288,
    manager: {
      firstName: "Elena",
      middleName: "",
      lastName: "Vasquez",
      email: "elena.vasquez@brightwatermed.com",
      phone: "",
      gender: "",
      status: "Invited",
      invitedAt: "2026-09-20",
    },
  }),
  practice({
    id: "343459",
    name: "Oakridge Health Partners",
    locationName: "Green Hills",
    contactNumber: "(615)-555-0126",
    npi: "1528391740",
    email: "",
    fax: "",
    website: "",
    status: "Active",
    createdAt: "2026-08-18",
    clinicians: 1,
    patients: 0,
  }),
]

/* A longer tail of sample practices so the list has enough rows to page,
   search and filter. Each row is the typed parts; everything else (ids,
   phones, NPIs, dates, counts) is derived from its position so the data is
   stable across reloads. */
type SampleRow = [
  name: string,
  locationName: string,
  areaCode: string,
  manager?: [firstName: string, lastName: string, gender: string],
]

const SAMPLE_ROWS: SampleRow[] = [
  [
    "Aspen Ridge Concierge Health",
    "Aspen Core",
    "970",
    ["Olivia", "Grant", "Female"],
  ],
  [
    "Bayside Vitality Medicine",
    "Marina District",
    "415",
    ["Ethan", "Park", "Male"],
  ],
  ["Blue Heron Integrative Health", "Midtown", "404"],
  [
    "Canyon Crest Longevity",
    "Summerlin",
    "702",
    ["Sofia", "Delgado", "Female"],
  ],
  [
    "Copperline Executive Medicine",
    "Uptown",
    "214",
    ["Noah", "Bennett", "Male"],
  ],
  ["Driftwood Family Concierge", "Coconut Grove", "305"],
  [
    "Evergreen Precision Care",
    "Capitol Hill",
    "206",
    ["Maya", "Lindqvist", "Female"],
  ],
  [
    "Fairhaven Primary Concierge",
    "Buckhead",
    "404",
    ["James", "Holloway", "Male"],
  ],
  ["Foxglove Metabolic Health", "South End", "704"],
  [
    "Granite Peak Performance",
    "Sugar House",
    "801",
    ["Ava", "Christensen", "Female"],
  ],
  [
    "Hawthorne Preventive Medicine",
    "Upper East Side",
    "212",
    ["Benjamin", "Adler", "Male"],
  ],
  ["Highland Park Concierge Physicians", "Highland Park", "214"],
  [
    "Ironwood Longevity Institute",
    "Paradise Valley",
    "480",
    ["Isabella", "Moreno", "Female"],
  ],
  [
    "Juniper Wellness Medicine",
    "Old Town",
    "703",
    ["Lucas", "Shepherd", "Male"],
  ],
  ["Keystone Executive Health", "Rittenhouse", "215"],
  [
    "Lighthouse Concierge Medicine",
    "Bellevue Avenue",
    "401",
    ["Grace", "Donnelly", "Female"],
  ],
  [
    "Magnolia Internal Medicine",
    "Garden District",
    "504",
    ["Henry", "Broussard", "Male"],
  ],
  ["Maple Grove Family Health", "Edina", "952"],
  [
    "Mesa Verde Precision Health",
    "Nob Hill",
    "505",
    ["Camila", "Archuleta", "Female"],
  ],
  [
    "Northstar Metabolic Clinic",
    "Downtown Minneapolis",
    "612",
    ["Samuel", "Berg", "Male"],
  ],
  ["Oceanside Performance Medicine", "Del Mar", "858"],
  [
    "Palisade Longevity Partners",
    "Pacific Palisades",
    "310",
    ["Chloe", "Nakamura", "Female"],
  ],
  ["Pinecrest Concierge Care", "Pinecrest", "305", ["Mateo", "Rivera", "Male"]],
  ["Prairie Sky Internal Medicine", "Leawood", "913"],
  [
    "Quail Hollow Health Partners",
    "SouthPark",
    "704",
    ["Zoe", "Whitaker", "Female"],
  ],
  [
    "Redwood Executive Physicians",
    "University Avenue",
    "650",
    ["Arjun", "Mehta", "Male"],
  ],
  ["Riverbend Precision Medicine", "Riverside", "904"],
  [
    "Sagebrush Vitality Clinic",
    "Downtown Boise",
    "208",
    ["Lily", "Hansen", "Female"],
  ],
  [
    "Saltwater Family Concierge",
    "Mount Pleasant",
    "843",
    ["William", "Pinckney", "Male"],
  ],
  ["Silver Lake Preventive Health", "Silver Lake", "323"],
  [
    "Stonebridge Concierge Medicine",
    "Frontenac",
    "314",
    ["Nora", "Fitzgerald", "Female"],
  ],
  [
    "Sunridge Hormone and Metabolic Health",
    "Arcadia",
    "602",
    ["Gabriel", "Soto", "Male"],
  ],
  ["Tidewater Longevity Clinic", "Ghent", "757"],
  [
    "Timberline Performance Health",
    "Lake Oswego",
    "503",
    ["Emma", "Sorensen", "Female"],
  ],
  [
    "Trailhead Executive Medicine",
    "Cherry Hills",
    "303",
    ["Owen", "Caldwell", "Male"],
  ],
  ["Twin Oaks Internal Medicine", "Westlake", "512"],
  [
    "Valley Forge Concierge Physicians",
    "Wayne",
    "610",
    ["Leah", "Kaplan", "Female"],
  ],
  [
    "Waterstone Precision Care",
    "Brickell",
    "305",
    ["Diego", "Castillo", "Male"],
  ],
  ["Westbrook Family Medicine", "West Hartford Center", "860"],
  [
    "Whitestone Metabolic Health",
    "Bethesda Row",
    "301",
    ["Aisha", "Rahman", "Female"],
  ],
  [
    "Wildflower Integrative Medicine",
    "East Nashville",
    "615",
    ["Caleb", "Dawson", "Male"],
  ],
  ["Willow Creek Longevity", "Downtown Bellevue", "425"],
  [
    "Windward Concierge Health",
    "Kailua",
    "808",
    ["Leilani", "Kahale", "Female"],
  ],
  [
    "Arborview Preventive Care",
    "State Street",
    "734",
    ["Nathan", "Brenner", "Male"],
  ],
  ["Beacon Hill Executive Health", "Beacon Hill", "617"],
  [
    "Clearwater Performance Medicine",
    "Clearwater Beach",
    "727",
    ["Harper", "Quinn", "Female"],
  ],
  [
    "Crestview Hormone Health",
    "Short North",
    "614",
    ["Elijah", "Warren", "Male"],
  ],
  ["Deer Valley Concierge Medicine", "Park City", "435"],
  [
    "Elmwood Primary Concierge",
    "Elmwood Village",
    "716",
    ["Claire", "Novak", "Female"],
  ],
  [
    "Glen Echo Longevity Partners",
    "Chevy Chase",
    "301",
    ["Julian", "Ashford", "Male"],
  ],
]

/* NPIs carry a Luhn check digit computed over the "80840" prefix plus the
   first nine digits, so the samples pass the same validation real ones do. */
function withNpiCheckDigit(base9: string) {
  const digits = `80840${base9}`.split("").map(Number)
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = digits[digits.length - 1 - i]
    if (i % 2 === 0) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return `${base9}${(10 - (sum % 10)) % 10}`
}

function generatedPractices(): Practice[] {
  const inboxes = ["frontdesk", "care", "hello", "office", "concierge", "info"]
  const pad = (n: number, width: number) => String(n).padStart(width, "0")
  /* Newest first, starting the day before the oldest hand written practice. */
  const start = Date.UTC(2026, 7, 17)

  return SAMPLE_ROWS.map((row, i) => {
    const [name, locationName, area, mgr] = row
    const domain = `${name.toLowerCase().split(" ").slice(0, 2).join("")}.com`
    const createdAt = new Date(start - i * 2 * 86_400_000)
      .toISOString()
      .slice(0, 10)
    const status: PracticeStatus = i % 7 === 3 ? "Inactive" : "Active"
    const clinicians = status === "Inactive" ? 1 + (i % 2) : 1 + ((i * 5) % 9)

    return practice({
      id: pad((612_345 + i * 48_271) % 1_000_000, 6),
      name,
      locationName,
      contactNumber: `(${area})-555-${pad(100 + i, 4)}`,
      npi: withNpiCheckDigit(
        `1${pad((i * 7_654_321 + 13_579_246) % 100_000_000, 8)}`
      ),
      email: `${inboxes[i % inboxes.length]}@${domain}`,
      fax: i % 3 === 0 ? "" : `(${area})-555-${pad(150 + i, 4)}`,
      website: i % 5 === 4 ? "" : `https://www.${domain}`,
      status,
      createdAt,
      clinicians,
      patients: clinicians * (18 + ((i * 13) % 40)),
      manager: mgr && {
        firstName: mgr[0],
        middleName: "",
        lastName: mgr[1],
        email: `${mgr[0]}.${mgr[1]}@${domain}`.toLowerCase(),
        phone: i % 4 === 1 ? "" : `(${area})-555-${pad(199 - i, 4)}`,
        gender: mgr[2],
        status: i % 3 === 1 ? "Invited" : "Active",
        invitedAt: createdAt,
      },
    })
  })
}

const SEED: Practice[] = [...HAND_WRITTEN, ...generatedPractices()]

/* -------------------------------------------------------------------------- */
/*  Store                                                                      */
/* -------------------------------------------------------------------------- */

/* A prototype has no backend, so the practices live in a module-level store
   that the list and the details page share. It is mirrored to sessionStorage
   so a practice created a moment ago still opens after a reload. Storage is
   read after mount rather than during render, so the server and the first
   client render agree on the sample data. The saved copy is stamped with the
   sample data it grew from, so changing the samples discards stale sessions
   instead of letting them replace the new rows after mount. */

const STORAGE_KEY = "hol-admin-practices"
/* Bump the schema tag whenever the Practice shape changes, so sessions saved
   before the change don't load rows missing the new fields. */
const SEED_VERSION = `v5:${SEED.map((p) => p.id).join(",")}`

let practices: Practice[] = SEED
let hydrated = false
const listeners = new Set<() => void>()

function emit() {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ seed: SEED_VERSION, practices })
    )
  } catch {
    // Private windows and blocked storage: the session simply won't persist.
  }
  listeners.forEach((listener) => listener())
}

function hydrate() {
  if (hydrated) return
  hydrated = true
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    const parsed = saved
      ? (JSON.parse(saved) as { seed?: string; practices?: Practice[] })
      : null
    if (parsed?.seed === SEED_VERSION && parsed.practices) {
      practices = parsed.practices
    }
  } catch {
    // Fall back to the sample data.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function update(next: Practice[]) {
  practices = next
  emit()
}

/* The admin's local date, not UTC, so a practice created in the evening in
   the US is not stamped with tomorrow's date. */
function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function newId() {
  let id = ""
  do {
    id = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")
  } while (practices.some((p) => p.id === id))
  return id
}

export const practiceStore = {
  create(input: PracticeInput): Practice {
    const created: Practice = {
      ...input,
      id: newId(),
      status: "Active",
      createdAt: today(),
      clinicians: 0,
      patients: 0,
    }
    update([created, ...practices])
    return created
  },
  edit(id: string, input: PracticeInput) {
    update(practices.map((p) => (p.id === id ? { ...p, ...input } : p)))
  },
  setStatus(id: string, status: PracticeStatus) {
    update(practices.map((p) => (p.id === id ? { ...p, status } : p)))
  },
  remove(id: string) {
    update(practices.filter((p) => p.id !== id))
  },
  inviteManager(id: string, input: ClinicManagerInput) {
    const manager: ClinicManager = {
      ...input,
      status: "Invited",
      invitedAt: today(),
    }
    update(practices.map((p) => (p.id === id ? { ...p, manager } : p)))
  },
}

/** Every practice, newest first, plus whether saved changes have loaded. */
export function usePractices() {
  const list = React.useSyncExternalStore(
    subscribe,
    () => practices,
    () => SEED
  )
  const ready = React.useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false
  )
  React.useEffect(hydrate, [])
  return { practices: list, ready }
}
