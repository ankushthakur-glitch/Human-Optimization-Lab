"use client"

import * as React from "react"

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type Address = {
  line1: string
  line2: string
  country: string
  state: string
  city: string
  zip: string
}

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
  clinical: Address
  billingSameAsClinical: boolean
  billing: Address
  defaultLocation: boolean
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

export const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
]

export const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"]

/* -------------------------------------------------------------------------- */
/*  Sample data                                                                */
/* -------------------------------------------------------------------------- */

/* Fictional practices only. Phone numbers sit in the 555-01xx range that is
   reserved for fiction. */
function practice(
  p: Omit<
    Practice,
    | "tenant"
    | "referralUrl"
    | "billing"
    | "billingSameAsClinical"
    | "defaultLocation"
  > & {
    billing?: Address
  }
): Practice {
  const tenant = tenantFromName(p.name)
  return {
    ...p,
    tenant,
    referralUrl: referralUrlFor(tenant),
    billingSameAsClinical: !p.billing,
    billing: p.billing ?? p.clinical,
    defaultLocation: true,
  }
}

const address = (
  line1: string,
  city: string,
  state: string,
  zip: string,
  line2 = ""
): Address => ({ line1, line2, country: "United States", state, city, zip })

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
    clinical: address(
      "250 Fillmore Street",
      "Denver",
      "Colorado",
      "80206",
      "Suite 400"
    ),
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
    clinical: address("7910 Girard Avenue", "San Diego", "California", "92037"),
    billing: address("PO Box 2291", "San Diego", "California", "92038"),
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
    clinical: address(
      "401 Congress Avenue",
      "Austin",
      "Texas",
      "78701",
      "Floor 12"
    ),
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
    clinical: address(
      "445 North Wells Street",
      "Chicago",
      "Illinois",
      "60654",
      "Suite 200"
    ),
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
    clinical: address("1120 NW Couch Street", "Portland", "Oregon", "97209"),
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
    clinical: address(
      "7014 East Camelback Road",
      "Scottsdale",
      "Arizona",
      "85251",
      "Suite 1150"
    ),
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
    clinical: address(
      "300 Boylston Street",
      "Boston",
      "Massachusetts",
      "02116"
    ),
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
    clinical: address(
      "2200 Abbott Martin Road",
      "Nashville",
      "Tennessee",
      "37215"
    ),
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
  line1: string,
  line2: string,
  city: string,
  state: string,
  zip: string,
  areaCode: string,
  manager?: [firstName: string, lastName: string, gender: string],
]

const SAMPLE_ROWS: SampleRow[] = [
  [
    "Aspen Ridge Concierge Health",
    "Aspen Core",
    "400 East Hyman Avenue",
    "Suite 210",
    "Aspen",
    "Colorado",
    "81611",
    "970",
    ["Olivia", "Grant", "Female"],
  ],
  [
    "Bayside Vitality Medicine",
    "Marina District",
    "2100 Chestnut Street",
    "",
    "San Francisco",
    "California",
    "94123",
    "415",
    ["Ethan", "Park", "Male"],
  ],
  [
    "Blue Heron Integrative Health",
    "Midtown",
    "1450 Peachtree Street NE",
    "Suite 300",
    "Atlanta",
    "Georgia",
    "30309",
    "404",
  ],
  [
    "Canyon Crest Longevity",
    "Summerlin",
    "1980 Festival Plaza Drive",
    "Suite 520",
    "Las Vegas",
    "Nevada",
    "89135",
    "702",
    ["Sofia", "Delgado", "Female"],
  ],
  [
    "Copperline Executive Medicine",
    "Uptown",
    "1717 McKinney Avenue",
    "Suite 900",
    "Dallas",
    "Texas",
    "75202",
    "214",
    ["Noah", "Bennett", "Male"],
  ],
  [
    "Driftwood Family Concierge",
    "Coconut Grove",
    "2980 McFarlane Road",
    "",
    "Miami",
    "Florida",
    "33133",
    "305",
  ],
  [
    "Evergreen Precision Care",
    "Capitol Hill",
    "1100 Broadway East",
    "",
    "Seattle",
    "Washington",
    "98102",
    "206",
    ["Maya", "Lindqvist", "Female"],
  ],
  [
    "Fairhaven Primary Concierge",
    "Buckhead",
    "3280 Peachtree Road NE",
    "Suite 150",
    "Atlanta",
    "Georgia",
    "30305",
    "404",
    ["James", "Holloway", "Male"],
  ],
  [
    "Foxglove Metabolic Health",
    "South End",
    "1500 South Tryon Street",
    "",
    "Charlotte",
    "North Carolina",
    "28203",
    "704",
  ],
  [
    "Granite Peak Performance",
    "Sugar House",
    "2100 South Highland Drive",
    "",
    "Salt Lake City",
    "Utah",
    "84106",
    "801",
    ["Ava", "Christensen", "Female"],
  ],
  [
    "Hawthorne Preventive Medicine",
    "Upper East Side",
    "145 East 72nd Street",
    "Floor 3",
    "New York",
    "New York",
    "10021",
    "212",
    ["Benjamin", "Adler", "Male"],
  ],
  [
    "Highland Park Concierge Physicians",
    "Highland Park",
    "4500 Mockingbird Lane",
    "",
    "Dallas",
    "Texas",
    "75205",
    "214",
  ],
  [
    "Ironwood Longevity Institute",
    "Paradise Valley",
    "6900 East Lincoln Drive",
    "Suite 110",
    "Scottsdale",
    "Arizona",
    "85253",
    "480",
    ["Isabella", "Moreno", "Female"],
  ],
  [
    "Juniper Wellness Medicine",
    "Old Town",
    "700 King Street",
    "",
    "Alexandria",
    "Virginia",
    "22314",
    "703",
    ["Lucas", "Shepherd", "Male"],
  ],
  [
    "Keystone Executive Health",
    "Rittenhouse",
    "1800 Walnut Street",
    "Suite 700",
    "Philadelphia",
    "Pennsylvania",
    "19103",
    "215",
  ],
  [
    "Lighthouse Concierge Medicine",
    "Bellevue Avenue",
    "120 Bellevue Avenue",
    "",
    "Newport",
    "Rhode Island",
    "02840",
    "401",
    ["Grace", "Donnelly", "Female"],
  ],
  [
    "Magnolia Internal Medicine",
    "Garden District",
    "2700 Prytania Street",
    "",
    "New Orleans",
    "Louisiana",
    "70130",
    "504",
    ["Henry", "Broussard", "Male"],
  ],
  [
    "Maple Grove Family Health",
    "Edina",
    "3400 West 66th Street",
    "Suite 250",
    "Edina",
    "Minnesota",
    "55435",
    "952",
  ],
  [
    "Mesa Verde Precision Health",
    "Nob Hill",
    "3500 Central Avenue SE",
    "",
    "Albuquerque",
    "New Mexico",
    "87106",
    "505",
    ["Camila", "Archuleta", "Female"],
  ],
  [
    "Northstar Metabolic Clinic",
    "Downtown Minneapolis",
    "800 Nicollet Mall",
    "Suite 1200",
    "Minneapolis",
    "Minnesota",
    "55402",
    "612",
    ["Samuel", "Berg", "Male"],
  ],
  [
    "Oceanside Performance Medicine",
    "Del Mar",
    "1555 Camino Del Mar",
    "Suite 205",
    "Del Mar",
    "California",
    "92014",
    "858",
  ],
  [
    "Palisade Longevity Partners",
    "Pacific Palisades",
    "15200 Sunset Boulevard",
    "Suite 101",
    "Los Angeles",
    "California",
    "90272",
    "310",
    ["Chloe", "Nakamura", "Female"],
  ],
  [
    "Pinecrest Concierge Care",
    "Pinecrest",
    "12000 South Dixie Highway",
    "",
    "Miami",
    "Florida",
    "33156",
    "305",
    ["Mateo", "Rivera", "Male"],
  ],
  [
    "Prairie Sky Internal Medicine",
    "Leawood",
    "4600 West 135th Street",
    "",
    "Leawood",
    "Kansas",
    "66224",
    "913",
  ],
  [
    "Quail Hollow Health Partners",
    "SouthPark",
    "4400 Sharon Road",
    "Suite 300",
    "Charlotte",
    "North Carolina",
    "28211",
    "704",
    ["Zoe", "Whitaker", "Female"],
  ],
  [
    "Redwood Executive Physicians",
    "University Avenue",
    "530 University Avenue",
    "",
    "Palo Alto",
    "California",
    "94301",
    "650",
    ["Arjun", "Mehta", "Male"],
  ],
  [
    "Riverbend Precision Medicine",
    "Riverside",
    "1200 Riverside Avenue",
    "",
    "Jacksonville",
    "Florida",
    "32204",
    "904",
  ],
  [
    "Sagebrush Vitality Clinic",
    "Downtown Boise",
    "950 West Bannock Street",
    "Suite 800",
    "Boise",
    "Idaho",
    "83702",
    "208",
    ["Lily", "Hansen", "Female"],
  ],
  [
    "Saltwater Family Concierge",
    "Mount Pleasant",
    "1000 Johnnie Dodds Boulevard",
    "",
    "Mount Pleasant",
    "South Carolina",
    "29464",
    "843",
    ["William", "Pinckney", "Male"],
  ],
  [
    "Silver Lake Preventive Health",
    "Silver Lake",
    "3900 Sunset Boulevard",
    "",
    "Los Angeles",
    "California",
    "90029",
    "323",
  ],
  [
    "Stonebridge Concierge Medicine",
    "Frontenac",
    "10435 Clayton Road",
    "",
    "St. Louis",
    "Missouri",
    "63131",
    "314",
    ["Nora", "Fitzgerald", "Female"],
  ],
  [
    "Sunridge Hormone and Metabolic Health",
    "Arcadia",
    "4250 East Camelback Road",
    "Suite 300",
    "Phoenix",
    "Arizona",
    "85018",
    "602",
    ["Gabriel", "Soto", "Male"],
  ],
  [
    "Tidewater Longevity Clinic",
    "Ghent",
    "700 West 21st Street",
    "",
    "Norfolk",
    "Virginia",
    "23517",
    "757",
  ],
  [
    "Timberline Performance Health",
    "Lake Oswego",
    "5 Centerpointe Drive",
    "Suite 400",
    "Lake Oswego",
    "Oregon",
    "97035",
    "503",
    ["Emma", "Sorensen", "Female"],
  ],
  [
    "Trailhead Executive Medicine",
    "Cherry Hills",
    "3600 South Colorado Boulevard",
    "",
    "Denver",
    "Colorado",
    "80210",
    "303",
    ["Owen", "Caldwell", "Male"],
  ],
  [
    "Twin Oaks Internal Medicine",
    "Westlake",
    "3801 North Capital of Texas Highway",
    "Suite 100",
    "Austin",
    "Texas",
    "78746",
    "512",
  ],
  [
    "Valley Forge Concierge Physicians",
    "Wayne",
    "150 West Lancaster Avenue",
    "",
    "Wayne",
    "Pennsylvania",
    "19087",
    "610",
    ["Leah", "Kaplan", "Female"],
  ],
  [
    "Waterstone Precision Care",
    "Brickell",
    "1200 Brickell Avenue",
    "Suite 1500",
    "Miami",
    "Florida",
    "33131",
    "305",
    ["Diego", "Castillo", "Male"],
  ],
  [
    "Westbrook Family Medicine",
    "West Hartford Center",
    "45 South Main Street",
    "",
    "West Hartford",
    "Connecticut",
    "06107",
    "860",
  ],
  [
    "Whitestone Metabolic Health",
    "Bethesda Row",
    "7500 Wisconsin Avenue",
    "Suite 600",
    "Bethesda",
    "Maryland",
    "20814",
    "301",
    ["Aisha", "Rahman", "Female"],
  ],
  [
    "Wildflower Integrative Medicine",
    "East Nashville",
    "1000 Main Street",
    "",
    "Nashville",
    "Tennessee",
    "37206",
    "615",
    ["Caleb", "Dawson", "Male"],
  ],
  [
    "Willow Creek Longevity",
    "Downtown Bellevue",
    "10500 NE 8th Street",
    "Suite 900",
    "Bellevue",
    "Washington",
    "98004",
    "425",
  ],
  [
    "Windward Concierge Health",
    "Kailua",
    "600 Kailua Road",
    "",
    "Kailua",
    "Hawaii",
    "96734",
    "808",
    ["Leilani", "Kahale", "Female"],
  ],
  [
    "Arborview Preventive Care",
    "State Street",
    "300 South State Street",
    "",
    "Ann Arbor",
    "Michigan",
    "48104",
    "734",
    ["Nathan", "Brenner", "Male"],
  ],
  [
    "Beacon Hill Executive Health",
    "Beacon Hill",
    "45 Charles Street",
    "",
    "Boston",
    "Massachusetts",
    "02114",
    "617",
  ],
  [
    "Clearwater Performance Medicine",
    "Clearwater Beach",
    "400 Mandalay Avenue",
    "",
    "Clearwater",
    "Florida",
    "33767",
    "727",
    ["Harper", "Quinn", "Female"],
  ],
  [
    "Crestview Hormone Health",
    "Short North",
    "800 North High Street",
    "",
    "Columbus",
    "Ohio",
    "43215",
    "614",
    ["Elijah", "Warren", "Male"],
  ],
  [
    "Deer Valley Concierge Medicine",
    "Park City",
    "1375 Deer Valley Drive",
    "",
    "Park City",
    "Utah",
    "84060",
    "435",
  ],
  [
    "Elmwood Primary Concierge",
    "Elmwood Village",
    "700 Elmwood Avenue",
    "",
    "Buffalo",
    "New York",
    "14222",
    "716",
    ["Claire", "Novak", "Female"],
  ],
  [
    "Glen Echo Longevity Partners",
    "Chevy Chase",
    "5454 Wisconsin Avenue",
    "Suite 1100",
    "Chevy Chase",
    "Maryland",
    "20815",
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
    const [name, locationName, line1, line2, city, state, zip, area, mgr] = row
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
      clinical: address(line1, city, state, zip, line2),
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
const SEED_VERSION = SEED.map((p) => p.id).join(",")

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
