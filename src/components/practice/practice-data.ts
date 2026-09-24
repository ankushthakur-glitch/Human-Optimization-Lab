"use client"

import { withNpiCheckDigit } from "@/components/admin/practices-store"
import { INVITEES } from "@/components/auth/invitees"
import {
  createCollection,
  nextId,
  today,
} from "@/components/practice/collection-store"

/* The practice portal a clinic manager signs in to. The prototype shows one
   practice: Harborview Longevity Clinic, run by Marcus Whitfield, the clinic
   manager the invite flow introduces. Every person and address is fictional;
   phone numbers sit in the 555-01xx range reserved for fiction. */

const manager = INVITEES["clinic-manager"]

export const PRACTICE = {
  id: manager.orgId ?? "954150",
  name: manager.practice ?? "Harborview Longevity Clinic",
  domain: "harborviewlongevity.com",
  manager: {
    name: "Marcus Whitfield",
    email: manager.email,
    initials: "MW",
    photo: "/practice/people/marcus-whitfield.jpg",
  },
}

/* -------------------------------------------------------------------------- */
/*  Shared values                                                              */
/* -------------------------------------------------------------------------- */

export type PersonStatus = "Not invited" | "Invited" | "Active" | "Inactive"
export type LocationStatus = "Active" | "Inactive"

export const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"]
export const SEXES = ["Female", "Male", "Other"]

export const CREDENTIALS = ["MD", "DO", "NP", "PA", "RN"]
export const PROVIDER_ROLES = ["Provider", "Supervising provider"]
export const SPECIALTIES = [
  "Internal Medicine",
  "Family Medicine",
  "Preventive Medicine",
  "Endocrinology",
  "Cardiology",
  "Sports Medicine",
  "Nutrition",
]

/* Non-clinical users are all Staff; the sub role says what they do. */
export const USER_ROLES = ["Front desk", "Nurse", "Care coordinator", "Medical assistant"]

export const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "Mandarin",
  "Vietnamese",
  "Tagalog",
  "Korean",
  "Arabic",
  "Hindi",
  "Portuguese",
]

/* NUCC taxonomy codes for the specialties a concierge practice employs. */
export const TAXONOMY_CODES = [
  "207R00000X Internal Medicine",
  "207Q00000X Family Medicine",
  "2083P0500X Preventive Medicine",
  "207RE0101X Endocrinology",
  "207RC0000X Cardiovascular Disease",
  "207QS0010X Sports Medicine",
  "363LF0000X Family Nurse Practitioner",
  "363A00000X Physician Assistant",
  "163W00000X Registered Nurse",
  "133V00000X Dietitian, Registered",
]

export const TAX_ID_TYPES = ["EIN", "SSN"]
export const LICENSE_TYPES = [
  "State Medical License",
  "DEA Registration",
  "State Controlled Substance",
  "Nursing License",
  "Board Certification",
]

export const GENDER_IDENTITIES = [
  "Woman",
  "Man",
  "Non-binary",
  "Transgender woman",
  "Transgender man",
  "Prefer not to say",
]
export const CONTACT_METHODS = ["Email", "Mobile (SMS)", "Phone call"]
export const RELATIONSHIPS = ["Spouse", "Partner", "Parent", "Child", "Sibling", "Friend", "Other"]

/* CMS place of service codes a concierge practice uses. */
export const PLACES_OF_SERVICE = ["11 Office", "02 Telehealth", "10 Telehealth in home", "12 Home"]

export const SPECIALTY_TYPES = [
  "Primary Care",
  "Internal Medicine",
  "Preventive Medicine",
  "Longevity Medicine",
  "Endocrinology",
  "Cardiology",
  "Sports Medicine",
]
export const TIME_ZONES = [
  "Pacific (PT)",
  "Mountain (MT)",
  "Central (CT)",
  "Eastern (ET)",
]

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type WorkingDay = {
  day: (typeof DAYS)[number]
  open: boolean
  start: string
  end: string
}

export type Location = {
  id: string
  name: string
  placeOfService: string
  phone: string
  email: string
  fax: string
  address1: string
  address2: string
  city: string
  state: string
  zip: string
  timeZone: string
  hours: WorkingDay[]
  contactPerson: string
  specialtyType: string
  specialtyCode: string
  groupNpi: string
  taxonomyCode: string
  ftin: string
  website: string
  /** A data URL, or empty. */
  photo: string
  billingSame: boolean
  billingAddress1: string
  billingAddress2: string
  billingZip: string
  billingCity: string
  billingState: string
  status: LocationStatus
  /** The location the practice was created with. */
  primary?: boolean
}

export type Provider = {
  id: string
  credential: string
  firstName: string
  middleName: string
  lastName: string
  dob: string
  gender: string
  npi: string
  specialty: string
  role: string
  taxonomyCode: string
  languages: string[]
  /** Stored whole; every screen shows only the last four digits. */
  ssn: string
  /** A data URL, or empty. */
  photo: string
  address1: string
  address2: string
  zip: string
  city: string
  state: string
  telephone: string
  /** Mobile number. */
  phone: string
  fax: string
  email: string
  timeZone: string
  federalTaxId: string
  taxIdType: string
  registrationDate: string
  nonBilling: boolean
  /** Primary service locations. */
  locationIds: string[]
  supervisorIds: string[]
  education: string
  licenses: License[]
  /** A data URL of the drawn signature, or empty. */
  signature: string
  status: PersonStatus
  invitedAt: string
  lastLogin: string
}

export type License = {
  type: string
  state: string
  number: string
  expiry: string
}

export type StaffUser = {
  id: string
  firstName: string
  lastName: string
  role: string
  email: string
  phone: string
  locationIds: string[]
  status: PersonStatus
  invitedAt: string
  lastActive: string
  photo: string
  /** The signed-in clinic manager: listed, but not editable from here. */
  self?: boolean
}

export type Patient = {
  id: string
  firstName: string
  middleName: string
  lastName: string
  preferredName: string
  dob: string
  sex: string
  genderIdentity: string
  languages: string[]
  photo: string
  address1: string
  address2: string
  zip: string
  city: string
  state: string
  /** Mobile number. */
  phone: string
  homePhone: string
  email: string
  preferredContact: string
  timeZone: string
  locationId: string
  providerId: string
  registrationDate: string
  emergencyName: string
  emergencyRelationship: string
  emergencyPhone: string
  status: PersonStatus
  invitedAt: string
  source: "Manual" | "Bulk import"
}

export type LocationInput = Omit<Location, "id" | "status" | "primary">
export type ProviderInput = Omit<
  Provider,
  "id" | "status" | "invitedAt" | "lastLogin"
>
export type StaffUserInput = Omit<
  StaffUser,
  "id" | "status" | "invitedAt" | "lastActive" | "self"
>
export type PatientInput = Omit<
  Patient,
  "id" | "status" | "invitedAt" | "source"
>

/* -------------------------------------------------------------------------- */
/*  Formatting                                                                 */
/* -------------------------------------------------------------------------- */

export function fullName(p: {
  firstName: string
  middleName?: string
  lastName: string
}) {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ")
}

export function providerName(p: Provider) {
  return `${fullName({ firstName: p.firstName, lastName: p.lastName })}, ${p.credential}`
}

/** ***-**-1234: the only way an SSN is ever shown. */
export function maskSsn(ssn: string) {
  const d = ssn.replace(/\D/g, "")
  return d.length === 9 ? `***-**-${d.slice(5)}` : ""
}

export function personAddress(p: {
  address1: string
  address2: string
  city: string
  state: string
  zip: string
}) {
  return [p.address1, p.address2, p.city, [p.state, p.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ")
}

/** ISO date to MM/DD/YYYY, the format US practices read and type. */
export function usDate(iso: string) {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${m}/${d}/${y}`
}

export function shortDate(iso: string) {
  if (!iso) return ""
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function time12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  const suffix = h >= 12 ? "PM" : "AM"
  return `${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`
}

export function addressLine(l: Location) {
  return [
    [l.address1, l.address2].filter(Boolean).join(", "),
    l.city,
    [l.state, l.zip].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ")
}

export function ageFrom(iso: string) {
  const dob = new Date(`${iso}T12:00:00`)
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
  return age
}

export function emptyProvider(): ProviderInput {
  return {
    credential: "",
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "",
    gender: "",
    npi: "",
    specialty: "",
    role: "Provider",
    taxonomyCode: "",
    languages: ["English"],
    ssn: "",
    photo: "",
    address1: "",
    address2: "",
    zip: "",
    city: "",
    state: "CA",
    telephone: "",
    phone: "",
    fax: "",
    email: "",
    timeZone: "Pacific (PT)",
    federalTaxId: "",
    taxIdType: "EIN",
    registrationDate: "",
    nonBilling: false,
    locationIds: [],
    supervisorIds: [],
    education: "",
    licenses: [{ type: "", state: "CA", number: "", expiry: "" }],
    signature: "",
  }
}

export function emptyLocation(): LocationInput {
  return {
    name: "",
    placeOfService: "11 Office",
    phone: "",
    email: "",
    fax: "",
    address1: "",
    address2: "",
    city: "",
    state: "CA",
    zip: "",
    timeZone: "Pacific (PT)",
    hours: defaultHours(),
    contactPerson: "",
    specialtyType: "",
    specialtyCode: "",
    groupNpi: "",
    taxonomyCode: "",
    ftin: "",
    website: "",
    photo: "",
    billingSame: true,
    billingAddress1: "",
    billingAddress2: "",
    billingZip: "",
    billingCity: "",
    billingState: "CA",
  }
}

export function emptyPatient(): PatientInput {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    preferredName: "",
    dob: "",
    sex: "",
    genderIdentity: "",
    languages: ["English"],
    photo: "",
    address1: "",
    address2: "",
    zip: "",
    city: "",
    state: "CA",
    phone: "",
    homePhone: "",
    email: "",
    preferredContact: "Email",
    timeZone: "Pacific (PT)",
    locationId: "",
    providerId: "",
    registrationDate: "",
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
  }
}

/* -------------------------------------------------------------------------- */
/*  Sample data                                                                */
/* -------------------------------------------------------------------------- */

export function defaultHours(): WorkingDay[] {
  return DAYS.map((day) => ({
    day,
    open: day !== "Saturday" && day !== "Sunday",
    start: "08:00",
    end: "17:00",
  }))
}

/* Seed pictures, served from public/practice: a headshot per provider and
   staff user, and a pool of headshots the patients cycle through. */
const slug = (name: string) => name.toLowerCase().replace(/\s+/g, "-")

const headshot = (first: string, last: string) =>
  `/practice/people/${slug(`${first} ${last}`)}.jpg`
const PATIENT_HEADSHOTS = { Female: 13, Male: 14 }
const patientHeadshot = (sex: string, i: number) => {
  const key = sex === "Female" || (sex === "Other" && i % 2) ? "Female" : "Male"
  return `/practice/people/patient-${key === "Female" ? "w" : "m"}${
    1 + (i % PATIENT_HEADSHOTS[key])
  }.jpg`
}

const LOCATION_BASE: Omit<Location, LocationExtra>[] = [
  {
    id: "LOC1001",
    name: "La Jolla",
    placeOfService: "Office",
    phone: "(858)-555-0118",
    email: `care@${PRACTICE.domain}`,
    fax: "(858)-555-0119",
    address1: "7910 Girard Ave",
    address2: "Suite 200",
    city: "La Jolla",
    state: "CA",
    zip: "92037",
    timeZone: "Pacific (PT)",
    hours: defaultHours(),
    status: "Active",
    primary: true,
  },
  {
    id: "LOC1002",
    name: "Del Mar",
    placeOfService: "Office",
    phone: "(858)-555-0124",
    email: `delmar@${PRACTICE.domain}`,
    fax: "",
    address1: "1201 Camino Del Mar",
    address2: "Suite 104",
    city: "Del Mar",
    state: "CA",
    zip: "92014",
    timeZone: "Pacific (PT)",
    hours: defaultHours().map((d) =>
      d.day === "Saturday" ? { ...d, open: true, start: "09:00", end: "13:00" } : d
    ),
    status: "Active",
  },
  {
    id: "LOC1003",
    name: "Carlsbad",
    placeOfService: "Office",
    phone: "(760)-555-0131",
    email: `carlsbad@${PRACTICE.domain}`,
    fax: "(760)-555-0132",
    address1: "2755 Jefferson St",
    address2: "Suite 310",
    city: "Carlsbad",
    state: "CA",
    zip: "92008",
    timeZone: "Pacific (PT)",
    hours: defaultHours(),
    status: "Active",
  },
  {
    id: "LOC1004",
    name: "Virtual Care",
    placeOfService: "Telehealth",
    phone: "(858)-555-0137",
    email: `virtual@${PRACTICE.domain}`,
    fax: "",
    address1: "7910 Girard Ave",
    address2: "Suite 200",
    city: "La Jolla",
    state: "CA",
    zip: "92037",
    timeZone: "Pacific (PT)",
    hours: defaultHours().map((d) => ({ ...d, start: "07:00", end: "19:00" })),
    status: "Active",
  },
  {
    id: "LOC1005",
    name: "Rancho Santa Fe",
    placeOfService: "Office",
    phone: "(858)-555-0142",
    email: "",
    fax: "",
    address1: "6009 Paseo Delicias",
    address2: "",
    city: "Rancho Santa Fe",
    state: "CA",
    zip: "92067",
    timeZone: "Pacific (PT)",
    hours: defaultHours(),
    status: "Inactive",
  },
]

type LocationExtra =
  | "contactPerson" | "specialtyType" | "specialtyCode" | "groupNpi" | "taxonomyCode"
  | "ftin" | "website" | "photo" | "billingSame" | "billingAddress1" | "billingAddress2"
  | "billingZip" | "billingCity" | "billingState"

const CONTACT_PEOPLE = ["Marcus Whitfield", "Janelle Ortega", "Imani Caldwell", "Graham Pellegrini", "Victor Lindqvist"]

const LOCATIONS: Location[] = LOCATION_BASE.map((l, i) => ({
  ...l,
  placeOfService: l.placeOfService === "Telehealth" ? "02 Telehealth" : "11 Office",
  contactPerson: CONTACT_PEOPLE[i % CONTACT_PEOPLE.length],
  specialtyType: ["Longevity Medicine", "Primary Care", "Preventive Medicine", "Internal Medicine", "Primary Care"][i],
  specialtyCode: ["2083P0500X", "261QP2300X", "2083P0500X", "207R00000X", "261QP2300X"][i],
  groupNpi: withNpiCheckDigit(`1760${String(493_21 + i * 7).padStart(5, "0")}`),
  taxonomyCode: "261QP2300X",
  ftin: `33-${String(4_102_870 + i * 11).padStart(7, "0")}`,
  website: i === 0 ? "https://www.harborviewlongevity.com" : "",
  photo: `/practice/locations/${slug(l.name)}.jpg`,
  billingSame: i !== 2,
  billingAddress1: i === 2 ? "PO Box 2210" : l.address1,
  billingAddress2: i === 2 ? "" : l.address2,
  billingZip: i === 2 ? "92018" : l.zip,
  billingCity: i === 2 ? "Carlsbad" : l.city,
  billingState: l.state,
}))

type ProviderRow = [
  credential: string,
  first: string,
  last: string,
  specialty: string,
  role: string,
  locations: string[],
  status: PersonStatus,
  gender: string,
]

const PROVIDER_ROWS: ProviderRow[] = [
  ["MD", "Elise", "Harrington", "Internal Medicine", "Supervising provider", ["LOC1001", "LOC1004"], "Active", "Female"],
  ["MD", "Rafael", "Quintero", "Endocrinology", "Provider", ["LOC1001", "LOC1002"], "Active", "Male"],
  ["DO", "Naomi", "Feldstein", "Preventive Medicine", "Provider", ["LOC1002"], "Active", "Female"],
  ["NP", "Tessa", "Moriarty", "Family Medicine", "Provider", ["LOC1003", "LOC1004"], "Active", "Female"],
  ["MD", "Kenji", "Albrecht", "Cardiology", "Supervising provider", ["LOC1001"], "Active", "Male"],
  ["PA", "Dominic", "Ashworth", "Sports Medicine", "Provider", ["LOC1003"], "Invited", "Male"],
  ["RN", "Priscilla", "Vance", "Nutrition", "Provider", ["LOC1004"], "Invited", "Female"],
  ["MD", "Colin", "Merriweather", "Internal Medicine", "Provider", ["LOC1005"], "Inactive", "Male"],
]

const pad = (n: number, width: number) => String(n).padStart(width, "0")

function isoDaysAgo(days: number) {
  return new Date(Date.UTC(2026, 8, 24) - days * 86_400_000)
    .toISOString()
    .slice(0, 10)
}

const TAXONOMY_BY_SPECIALTY: Record<string, string> = {
  "Internal Medicine": TAXONOMY_CODES[0],
  "Family Medicine": TAXONOMY_CODES[1],
  "Preventive Medicine": TAXONOMY_CODES[2],
  Endocrinology: TAXONOMY_CODES[3],
  Cardiology: TAXONOMY_CODES[4],
  "Sports Medicine": TAXONOMY_CODES[5],
  NP: TAXONOMY_CODES[6],
  PA: TAXONOMY_CODES[7],
  RN: TAXONOMY_CODES[8],
}

const PROVIDERS: Provider[] = PROVIDER_ROWS.map((row, i) => {
  const [credential, firstName, lastName, specialty, role, locationIds, status, gender] = row
  return {
    id: `PR${3132 + i}`,
    credential,
    firstName,
    middleName: "",
    lastName,
    dob: `19${70 + ((i * 7) % 20)}-${pad(1 + ((i * 5) % 12), 2)}-${pad(3 + ((i * 11) % 25), 2)}`,
    gender,
    npi: withNpiCheckDigit(`1${pad((i * 3_141_593 + 27_182_818) % 100_000_000, 8)}`),
    specialty,
    role,
    taxonomyCode: TAXONOMY_BY_SPECIALTY[credential === "MD" || credential === "DO" ? specialty : credential],
    languages: i % 3 === 0 ? ["English", "Spanish"] : ["English"],
    ssn: `${pad(521 + i * 7, 3)}-${pad(40 + i, 2)}-${pad(1_842 + i * 311, 4)}`,
    photo: headshot(firstName, lastName),
    address1: `${1_200 + i * 45} ${["Prospect St", "Torrey Pines Rd", "Coast Blvd", "Via de la Valle"][i % 4]}`,
    address2: i % 2 ? `Apt ${i + 2}B` : "",
    zip: ["92037", "92014", "92008", "92037"][i % 4],
    city: ["La Jolla", "Del Mar", "Carlsbad", "La Jolla"][i % 4],
    state: "CA",
    telephone: `(858)-555-${pad(170 + i, 4)}`,
    phone: `(858)-555-${pad(160 + i, 4)}`,
    fax: i % 2 ? "" : "(858)-555-0119",
    email: `${firstName}.${lastName}@${PRACTICE.domain}`.toLowerCase(),
    timeZone: "Pacific (PT)",
    federalTaxId: `${pad(33 + i, 2)}-${pad(4_102_870 + i * 1_311, 7)}`,
    taxIdType: "EIN",
    registrationDate: isoDaysAgo(30 + i * 9),
    nonBilling: credential === "RN",
    locationIds,
    supervisorIds: role === "Provider" ? [i % 2 ? "PR3136" : "PR3132"] : [],
    education:
      credential === "MD" || credential === "DO"
        ? `Residency in ${specialty}; ${6 + i} years in outpatient and concierge practice.`
        : `${credential} program graduate; ${3 + i} years in preventive and lifestyle care.`,
    licenses: [
      {
        type: credential === "RN" || credential === "NP" ? "Nursing License" : "State Medical License",
        state: "CA",
        number: credential === "RN" ? `RN${pad(845_210 + i * 37, 6)}` : `A${pad(128_400 + i * 913, 6)}`,
        expiry: `20${27 + (i % 3)}-${pad(1 + ((i * 4) % 12), 2)}-30`,
      },
      ...(credential === "MD" || credential === "DO"
        ? [{ type: "DEA Registration", state: "CA", number: `F${lastName[0]}${pad(410_233 + i * 71, 7)}`, expiry: `2028-${pad(2 + i, 2)}-28` }]
        : []),
    ],
    signature: "",
    status,
    invitedAt: isoDaysAgo(2 + i),
    lastLogin: status === "Active" ? isoDaysAgo(i % 3) : "",
  }
})

const USERS: StaffUser[] = [
  {
    id: "U45560",
    firstName: "Marcus",
    lastName: "Whitfield",
    role: "Clinic manager",
    email: PRACTICE.manager.email,
    phone: "(858)-555-0121",
    locationIds: LOCATIONS.map((l) => l.id),
    status: "Active",
    invitedAt: "2026-09-22",
    lastActive: "2026-09-24",
    photo: PRACTICE.manager.photo,
    self: true,
  },
  {
    id: "U45564",
    firstName: "Janelle",
    lastName: "Ortega",
    role: "Front desk",
    email: `janelle.ortega@${PRACTICE.domain}`,
    phone: "(858)-555-0154",
    locationIds: ["LOC1001"],
    status: "Active",
    invitedAt: "2026-09-22",
    lastActive: "2026-09-24",
    photo: headshot("Janelle", "Ortega"),
  },
  {
    id: "U53165",
    firstName: "Graham",
    lastName: "Pellegrini",
    role: "Nurse",
    email: `graham.pellegrini@${PRACTICE.domain}`,
    phone: "(858)-555-0155",
    locationIds: ["LOC1001", "LOC1002"],
    status: "Active",
    invitedAt: "2026-09-22",
    lastActive: "2026-09-23",
    photo: headshot("Graham", "Pellegrini"),
  },
  {
    id: "U16455",
    firstName: "Imani",
    lastName: "Caldwell",
    role: "Care coordinator",
    email: `imani.caldwell@${PRACTICE.domain}`,
    phone: "(760)-555-0157",
    locationIds: ["LOC1003", "LOC1004"],
    status: "Invited",
    invitedAt: "2026-09-23",
    lastActive: "",
    photo: headshot("Imani", "Caldwell"),
  },
  {
    id: "U56464",
    firstName: "Victor",
    lastName: "Lindqvist",
    role: "Medical assistant",
    email: `victor.lindqvist@${PRACTICE.domain}`,
    phone: "(858)-555-0159",
    locationIds: ["LOC1001"],
    status: "Inactive",
    invitedAt: "2026-09-10",
    lastActive: "2026-09-15",
    photo: headshot("Victor", "Lindqvist"),
  },
]

const FIRST_NAMES = [
  "Amelia", "Benjamin", "Charlotte", "Daniel", "Eleanor", "Felix", "Gabriela",
  "Harrison", "Isla", "Jonah", "Keira", "Leonardo", "Madeline", "Nolan",
  "Ophelia", "Preston", "Quinn", "Rosalind", "Sebastian", "Tamsin", "Ulrich",
  "Vivian", "Wesley", "Ximena", "Yusuf", "Zara", "Adrian", "Beatrice",
  "Cyrus", "Delphine", "Emmett", "Fiona", "Gideon",
]
const LAST_NAMES = [
  "Abernathy", "Bellweather", "Castellanos", "Dunmore", "Ellsworth",
  "Fairbanks", "Galloway", "Hollister", "Ingram", "Jardine", "Kensington",
  "Lockhart", "Montague", "Northcott", "Oyelaran", "Pemberton", "Quayle",
  "Rutherford", "Sinclair", "Thackeray", "Underhill", "Valdivia", "Whitlock",
  "Yardley", "Zimmerman", "Achebe", "Brightman", "Coventry", "Delacroix",
]

const FEMALE = new Set([
  "Amelia", "Charlotte", "Eleanor", "Gabriela", "Isla", "Keira", "Madeline",
  "Ophelia", "Rosalind", "Tamsin", "Vivian", "Ximena", "Zara", "Beatrice",
  "Delphine", "Fiona",
])

function sexFor(name: string) {
  if (name === "Quinn") return "Other"
  return FEMALE.has(name) ? "Female" : "Male"
}

/* 131 patients, matching the count the admin console shows for the practice.
   Every value is derived from the row's position, so the list is stable. */
const PATIENTS: Patient[] = Array.from({ length: 131 }, (_, i) => {
  const firstName = FIRST_NAMES[(i * 7) % FIRST_NAMES.length]
  const lastName = LAST_NAMES[(i * 11 + 3) % LAST_NAMES.length]
  const active = PROVIDERS.filter((p) => p.status === "Active")
  const provider = active[i % active.length]
  const locationId = provider.locationIds[i % provider.locationIds.length]
  const status: PersonStatus =
    i % 9 === 4 ? "Inactive" : i % 4 === 1 ? "Invited" : "Active"
  const area = locationId === "LOC1003" ? "760" : "858"
  return {
    id: `P${pad(10_240 + i * 17, 5)}`,
    firstName,
    middleName: "",
    lastName,
    preferredName: "",
    dob: `19${45 + ((i * 13) % 50)}-${pad(1 + ((i * 7) % 12), 2)}-${pad(1 + ((i * 5) % 28), 2)}`,
    sex: sexFor(firstName),
    genderIdentity: "",
    languages: i % 6 === 0 ? ["English", "Spanish"] : ["English"],
    photo: patientHeadshot(sexFor(firstName), i),
    address1: `${100 + i * 13} ${["Pearl St", "Ocean Ave", "Camino Real", "Olive Ave", "El Paseo"][i % 5]}`,
    address2: "",
    zip: area === "760" ? "92008" : ["92037", "92014"][i % 2],
    city: area === "760" ? "Carlsbad" : ["La Jolla", "Del Mar"][i % 2],
    state: "CA",
    phone: `(${area})-555-${pad(100 + (i % 100), 4)}`,
    homePhone: "",
    email: `${firstName}.${lastName}${i > 60 ? i : ""}@example.com`.toLowerCase(),
    preferredContact: CONTACT_METHODS[i % 3],
    timeZone: "Pacific (PT)",
    locationId,
    providerId: provider.id,
    registrationDate: isoDaysAgo(Math.floor(i / 3)),
    emergencyName: i % 3 === 0 ? "" : `${FIRST_NAMES[(i * 5 + 2) % FIRST_NAMES.length]} ${lastName}`,
    emergencyRelationship: i % 3 === 0 ? "" : RELATIONSHIPS[i % 4],
    emergencyPhone: i % 3 === 0 ? "" : `(${area})-555-${pad(150 + (i % 50), 4)}`,
    status,
    invitedAt: isoDaysAgo(Math.floor(i / 3)),
    source: i % 5 === 2 ? "Bulk import" : "Manual",
  }
})

/* -------------------------------------------------------------------------- */
/*  Stores                                                                     */
/* -------------------------------------------------------------------------- */

const VERSION = "v7"

export const locations = createCollection("hol-practice-locations", LOCATIONS, VERSION)
export const providers = createCollection("hol-practice-providers", PROVIDERS, VERSION)
export const users = createCollection("hol-practice-users", USERS, VERSION)
export const patients = createCollection("hol-practice-patients", PATIENTS, VERSION)

export function createLocation(input: LocationInput) {
  const location: Location = {
    ...input,
    id: nextId("LOC", locations.get(), 4),
    status: "Active",
  }
  locations.add([location])
  return location
}

export function inviteProviders(inputs: ProviderInput[]) {
  const taken = [...providers.get()]
  const created = inputs.map((input) => {
    const provider: Provider = {
      ...input,
      id: nextId("PR", taken, 4),
      status: "Invited",
      invitedAt: today(),
      lastLogin: "",
    }
    taken.push(provider)
    return provider
  })
  providers.add(created)
  return created
}

export function inviteUser(input: StaffUserInput) {
  const user: StaffUser = {
    ...input,
    id: nextId("U", users.get()),
    status: "Invited",
    invitedAt: today(),
    lastActive: "",
  }
  users.add([user])
  return user
}

/* Adding a patient never emails them: the portal invite is always sent by
   hand afterwards, from the list or the profile (sendPatientInvites). */
export function addPatients(
  inputs: PatientInput[],
  source: Patient["source"]
) {
  const taken = [...patients.get()]
  const created = inputs.map((input) => {
    const patient: Patient = {
      ...input,
      id: nextId("P", taken),
      status: "Not invited",
      invitedAt: "",
      source,
    }
    taken.push(patient)
    return patient
  })
  patients.add(created)
  return created
}

/** Emails the patient portal invite to patients added without one. */
export function sendPatientInvites(ids: string[]) {
  for (const id of ids) {
    patients.patch(id, { status: "Invited", invitedAt: today() })
  }
}

/* Lookups the lists use to show names for stored ids. */

export function useLocationLookup() {
  const { items } = locations.use()
  return {
    all: items,
    active: items.filter((l) => l.status === "Active"),
    name: (id: string) => items.find((l) => l.id === id)?.name ?? "",
    idFor: (name: string) =>
      items.find((l) => l.name.toLowerCase() === name.trim().toLowerCase())?.id,
  }
}

export function useProviderLookup() {
  const { items } = providers.use()
  return {
    all: items,
    active: items.filter((p) => p.status !== "Inactive"),
    name: (id: string) => {
      const p = items.find((x) => x.id === id)
      return p ? providerName(p) : ""
    },
  }
}
