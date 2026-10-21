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
/* A patient is invited the moment they're added (14 Oct call): Invited
   until they join, Active once consented, Declined when they turn the
   invite down (the link is only in the final reminder), Inactive when the
   record is closed. Declined patients stay eligible and can be invited
   again; an Inactive record comes back only with fresh consent. */
export const PATIENT_STATUSES = [
  "Invited",
  "Active",
  "Declined",
  "Inactive",
] as const
export type PatientStatus = (typeof PATIENT_STATUSES)[number]
/** Why an Inactive record closed: the patient withdrew consent, left the
    practice, or staff deactivated it. */
export type InactiveReason =
  "Consent withdrawn" | "Discharged" | "Deactivated" | "Transferred"
export const REACTIVATABLE: readonly PatientStatus[] = ["Inactive"]

/* -------------------------------------------------------------------------- */
/*  Invite reminders                                                           */
/* -------------------------------------------------------------------------- */

/* The invite goes on the day the patient is added, then four reminders
   over 30 days. Only the final one carries the decline link. SMS goes
   first when there's a mobile number, then email. */
export const INVITE_STEPS = [
  { day: 0, label: "Invite sent" },
  { day: 7, label: "Reminder 1" },
  { day: 14, label: "Reminder 2" },
  { day: 21, label: "Reminder 3" },
  { day: 30, label: "Final reminder", decline: true },
] as const

export type InviteStep = {
  label: string
  /** Local "2026-10-12" the message goes or went. */
  date: string
  channels: string[]
  decline: boolean
  state: "sent" | "next" | "scheduled" | "skipped"
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** The invite and its reminders for one patient, with where each stands. */
export function inviteTimeline(p: Patient): InviteStep[] {
  if (!p.invitedAt) return []
  const now = new Date().toISOString().slice(0, 10)
  /* An answer stops the reminders that hadn't gone yet. */
  const stop = p.status === "Invited" ? undefined : p.respondedAt || now
  const channels = p.phone ? ["SMS", "email"] : ["Email"]
  let nextSet = false
  return INVITE_STEPS.map((step) => {
    const date = addDays(p.invitedAt, step.day)
    let state: InviteStep["state"]
    if (date <= now && (!stop || date <= stop)) state = "sent"
    else if (stop) state = "skipped"
    else if (!nextSet) {
      state = "next"
      nextSet = true
    } else state = "scheduled"
    return {
      label: step.label,
      date,
      channels,
      decline: "decline" in step && step.decline,
      state,
    }
  })
}

/** "Reminder 2 of 4 sent" style progress for an Invited patient. */
export function remindersSent(p: Patient) {
  return Math.max(
    0,
    inviteTimeline(p).filter((s) => s.state === "sent").length - 1
  )
}

/* A patient's clinical risk, read from their record. Every patient on the
   list has one; the sample panel spreads it by ID, most of it low, so the
   list's first page holds a few high, some moderate and then low. */
export const RISK_LEVELS = ["High", "Moderate", "Low"] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

/* Marcus Hale and Olivia Bennett, the patients the dashboard and the app
   are built around, lead the list as high risk. */
export const PINNED_PATIENTS = ["P10318", "P10240"]

export function riskLevel(p: { id: string }): RiskLevel {
  if (PINNED_PATIENTS.includes(p.id)) return "High"
  const n = [...p.id].reduce((sum, c) => sum * 31 + c.charCodeAt(0), 7) % 100
  return n < 5 ? "High" : n < 10 ? "Moderate" : "Low"
}

export type LocationStatus = "Active" | "Inactive"

export const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"]
export const SEXES = ["Female", "Male", "Other"]

export const CREDENTIALS = ["MD", "DO", "NP", "PA", "RN"]
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
export const USER_ROLES = [
  "Front desk",
  "Nurse",
  "Care coordinator",
  "Medical assistant",
]

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
export const CONTACT_METHODS = ["Home", "Mobile", "Email"]
export const RACES = [
  "American Indian or Alaska Native",
  "Asian",
  "Black or African American",
  "Native Hawaiian or Other Pacific Islander",
  "White",
  "Other",
  "Prefer not to say",
]
export const ETHNICITIES = [
  "Hispanic or Latino",
  "Not Hispanic or Latino",
  "Prefer not to say",
]
export const PRONOUNS = ["She/her", "He/him", "They/them", "Prefer not to say"]
export const MARITAL_STATUSES = [
  "Single",
  "Married",
  "Domestic partner",
  "Divorced",
  "Widowed",
  "Separated",
]
export const RECORD_STATUSES = ["Active", "Inactive"]
export const RELATIONSHIPS = [
  "Spouse",
  "Partner",
  "Parent",
  "Child",
  "Sibling",
  "Friend",
  "Other",
]

/* CMS place of service codes a concierge practice uses. */
export const PLACES_OF_SERVICE = [
  "11 Office",
  "02 Telehealth",
  "10 Telehealth in home",
  "12 Home",
]

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
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
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
  /** Medical assistants (StaffUser ids) who support this provider's panel. */
  assistantIds: string[]
  education: string
  licenses: License[]
  /** A data URL of the drawn signature, or empty. */
  signature: string
  status: PersonStatus
  invitedAt: string
  lastLogin: string
  /** Why an Inactive provider went, set when they were deactivated. */
  departure?: ProviderDeparture
}

/** Moved: the provider and their patients went to another clinic on Inlay.
    Left: the provider left Inlay and their patients were reassigned. */
export type ProviderDeparture =
  | {
      kind: "moved"
      practiceId: string
      practiceName: string
      at: string
      patients: number
    }
  | { kind: "left"; at: string; patients: number }

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
  /** Set when the patient has no email; the portal invite then can't go. */
  noEmail: boolean
  preferredContacts: string[]
  timeZone: string
  race: string
  ethnicity: string
  pronoun: string
  maritalStatus: string
  ssn: string
  /** Whether staff mean to invite the patient to the portal. */
  portalAccess: boolean
  locationId: string
  providerId: string
  registrationDate: string
  emergencyContacts: EmergencyContact[]
  status: PatientStatus
  invitedAt: string
  /** When the patient answered the invite (enrolled or declined). */
  respondedAt?: string
  /** Local "2026-10-12" of the patient's last activity in the app. */
  lastEngagedAt?: string
  source: "Manual" | "Bulk import"
  /** Why an Inactive record closed. */
  inactiveReason?: InactiveReason
  /** Set when a closed record was reopened; fresh consent was requested. */
  reactivatedAt?: string
  /** Set when a duplicate was merged into this record. */
  mergedAt?: string
  /* The fields below are carried by the provider dashboard's sample panel
     (see DASHBOARD_PANEL); other sample patients derive their record state. */
  /** Where the patient's Health Gorilla record stands. */
  recordState?: PanelRecordState
  /** Local "2026-10-03T05:00" of the last successful pull. */
  lastSyncAt?: string
  membership?: "free" | "optimization"
  /** When the physician last reviewed the whole chart. */
  lastReviewAt?: string
  /** Local "2026-07-02T09:15" of the last visit, if any. */
  lastVisitAt?: string
  /** Local "2026-11-12T09:30" of the next booked visit, if any. */
  nextVisitAt?: string
}

export type PanelRecordState =
  | "active"
  | "building"
  | "waiting_for_consent"
  | "invited_not_joined"
  | "sync_failed"

export type EmergencyContact = {
  relationship: string
  name: string
  phone: string
  email: string
}

export const emptyEmergencyContact = (): EmergencyContact => ({
  relationship: "",
  name: "",
  phone: "",
  email: "",
})

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
  "id" | "status" | "invitedAt" | "source" | "reactivatedAt" | "mergedAt"
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
  return [
    p.address1,
    p.address2,
    p.city,
    [p.state, p.zip].filter(Boolean).join(" "),
  ]
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
    role: "Physician",
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
    assistantIds: [],
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
    noEmail: false,
    preferredContacts: ["Email"],
    timeZone: "Pacific (PT)",
    race: "",
    ethnicity: "",
    pronoun: "",
    maritalStatus: "",
    ssn: "",
    portalAccess: true,
    locationId: "",
    providerId: "",
    registrationDate: isoDaysAgo(0),
    emergencyContacts: [emptyEmergencyContact()],
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

const pad = (n: number, width: number) => String(n).padStart(width, "0")

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

/* Half of every list carries a picture and half falls back to initials,
   scattered so the table doesn't read as a strict alternation. */
const PHOTO_PATTERN = [1, 0, 1, 1, 0, 1, 0, 0]
const hasPhoto = (i: number) => PHOTO_PATTERN[i % PHOTO_PATTERN.length] === 1

/* Staff first names that take a woman's headshot from the pool. */
const FEMALE_STAFF = new Set([
  "Alana",
  "Carmen",
  "Elodie",
  "Gemma",
  "Ivy",
  "Kaia",
  "Mila",
  "Olive",
  "Riley",
  "Sienna",
  "Uma",
  "Willa",
  "Yvette",
  "Aurora",
  "Daphne",
  "Freya",
  "Hazel",
  "Jade",
  "Lena",
  "Nadia",
  "Penelope",
  "Stella",
  "Vera",
])

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
      d.day === "Saturday"
        ? { ...d, open: true, start: "09:00", end: "13:00" }
        : d
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
  | "contactPerson"
  | "specialtyType"
  | "specialtyCode"
  | "groupNpi"
  | "taxonomyCode"
  | "ftin"
  | "website"
  | "photo"

const CONTACT_PEOPLE = [
  "Marcus Whitfield",
  "Janelle Ortega",
  "Imani Caldwell",
  "Graham Pellegrini",
  "Victor Lindqvist",
]

/* More sites across Southern California so the list has enough rows to page,
   search and filter: [name, zip, area code]. Everything else is derived from
   the row's position so the data is stable across reloads. */
const MORE_SITES: [name: string, zip: string, area: string][] = [
  ["Encinitas", "92024", "760"],
  ["Solana Beach", "92075", "858"],
  ["Oceanside", "92054", "760"],
  ["Escondido", "92025", "760"],
  ["Poway", "92064", "858"],
  ["Coronado", "92118", "619"],
  ["Point Loma", "92106", "619"],
  ["Mission Valley", "92108", "619"],
  ["Hillcrest", "92103", "619"],
  ["North Park", "92104", "619"],
  ["Pacific Beach", "92109", "858"],
  ["Sorrento Valley", "92121", "858"],
  ["Carmel Valley", "92130", "858"],
  ["Rancho Bernardo", "92127", "858"],
  ["Chula Vista", "91910", "619"],
  ["Eastlake", "91914", "619"],
  ["Temecula", "92590", "951"],
  ["Murrieta", "92562", "951"],
  ["San Marcos", "92069", "760"],
  ["Vista", "92081", "760"],
  ["Newport Beach", "92660", "949"],
  ["Irvine", "92618", "949"],
  ["Laguna Beach", "92651", "949"],
  ["Dana Point", "92629", "949"],
  ["San Clemente", "92672", "949"],
  ["Huntington Beach", "92648", "714"],
  ["Costa Mesa", "92626", "714"],
  ["Tustin", "92780", "714"],
  ["Mission Viejo", "92691", "949"],
  ["Santa Monica", "90401", "310"],
  ["Beverly Hills", "90210", "310"],
  ["Pasadena", "91101", "626"],
  ["Manhattan Beach", "90266", "310"],
  ["Malibu", "90265", "310"],
  ["Palm Springs", "92262", "760"],
  ["Palm Desert", "92260", "760"],
  ["La Quinta", "92253", "760"],
  ["Santa Barbara", "93101", "805"],
  ["Montecito", "93108", "805"],
  ["Thousand Oaks", "91360", "805"],
  ["Westlake Village", "91361", "805"],
  ["Brentwood", "90049", "310"],
  ["Studio City", "91604", "818"],
  ["Calabasas", "91302", "818"],
  ["Long Beach", "90802", "562"],
]

const SITE_STREETS = [
  "Coast Hwy",
  "Main St",
  "Ocean Blvd",
  "Park Ave",
  "Grand Ave",
  "Via Real",
]
const SITE_PHOTOS = ["la-jolla", "del-mar", "carlsbad", "rancho-santa-fe"]

const MORE_LOCATION_BASE: Omit<Location, LocationExtra>[] = MORE_SITES.map(
  ([name, zip, area], i) => ({
    id: `LOC${1006 + i}`,
    name,
    placeOfService: "Office",
    phone: `(${area})-555-${pad(100 + ((i * 3) % 100), 4)}`,
    email:
      i % 4 === 3
        ? ""
        : `${name.toLowerCase().replace(/\s+/g, "")}@${PRACTICE.domain}`,
    fax:
      i % 3 === 0 ? "" : `(${area})-555-${pad(100 + ((i * 3 + 1) % 100), 4)}`,
    address1: `${1_000 + i * 37} ${SITE_STREETS[i % SITE_STREETS.length]}`,
    address2: i % 2 ? `Suite ${100 + i * 2}` : "",
    city: name,
    state: "CA",
    zip,
    timeZone: "Pacific (PT)",
    hours:
      i % 4 === 1
        ? defaultHours().map((d) =>
            d.day === "Saturday"
              ? { ...d, open: true, start: "09:00", end: "13:00" }
              : d
          )
        : defaultHours(),
    status: i % 8 === 5 ? "Inactive" : "Active",
  })
)

const LOCATIONS: Location[] = [...LOCATION_BASE, ...MORE_LOCATION_BASE].map(
  (l, i) => ({
    ...l,
    placeOfService:
      l.placeOfService === "Telehealth" ? "02 Telehealth" : "11 Office",
    contactPerson: CONTACT_PEOPLE[i % CONTACT_PEOPLE.length],
    specialtyType: [
      "Longevity Medicine",
      "Primary Care",
      "Preventive Medicine",
      "Internal Medicine",
      "Primary Care",
    ][i % 5],
    specialtyCode: [
      "2083P0500X",
      "261QP2300X",
      "2083P0500X",
      "207R00000X",
      "261QP2300X",
    ][i % 5],
    groupNpi: withNpiCheckDigit(
      `1760${String(493_21 + i * 7).padStart(5, "0")}`
    ),
    taxonomyCode: "261QP2300X",
    ftin: `33-${String(4_102_870 + i * 11).padStart(7, "0")}`,
    website: i === 0 ? "https://www.harborviewlongevity.com" : "",
    photo: hasPhoto(i)
      ? `/practice/locations/${
          i < LOCATION_BASE.length
            ? slug(l.name)
            : SITE_PHOTOS[i % SITE_PHOTOS.length]
        }.jpg`
      : "",
  })
)

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
  [
    "MD",
    "Elise",
    "Harrington",
    "Internal Medicine",
    "Supervising provider",
    ["LOC1001", "LOC1004"],
    "Active",
    "Female",
  ],
  [
    "MD",
    "Rafael",
    "Quintero",
    "Endocrinology",
    "Provider",
    ["LOC1001", "LOC1002"],
    "Active",
    "Male",
  ],
  [
    "DO",
    "Naomi",
    "Feldstein",
    "Preventive Medicine",
    "Provider",
    ["LOC1002"],
    "Active",
    "Female",
  ],
  [
    "NP",
    "Tessa",
    "Moriarty",
    "Family Medicine",
    "Provider",
    ["LOC1003", "LOC1004"],
    "Active",
    "Female",
  ],
  [
    "MD",
    "Kenji",
    "Albrecht",
    "Cardiology",
    "Supervising provider",
    ["LOC1001"],
    "Active",
    "Male",
  ],
  [
    "PA",
    "Dominic",
    "Ashworth",
    "Sports Medicine",
    "Provider",
    ["LOC1003"],
    "Invited",
    "Male",
  ],
  [
    "RN",
    "Priscilla",
    "Vance",
    "Nutrition",
    "Provider",
    ["LOC1004"],
    "Invited",
    "Female",
  ],
  [
    "MD",
    "Colin",
    "Merriweather",
    "Internal Medicine",
    "Provider",
    ["LOC1005"],
    "Inactive",
    "Male",
  ],
  ...moreProviderRows(),
]

/* The rest of the 50 providers, built from name pairs so each is unique. */
function moreProviderRows(): ProviderRow[] {
  const names: [first: string, last: string, gender: string][] = [
    ["Adeline", "Beaumont", "Female"],
    ["Bennett", "Crawford", "Male"],
    ["Cecilia", "Duarte", "Female"],
    ["Declan", "Everhart", "Male"],
    ["Evangeline", "Foster", "Female"],
    ["Fletcher", "Garrison", "Male"],
    ["Genevieve", "Holt", "Female"],
    ["Hugo", "Iverson", "Male"],
    ["Ingrid", "Jaramillo", "Female"],
    ["Jasper", "Kowalski", "Male"],
    ["Juliet", "Langford", "Female"],
    ["Kieran", "Maddox", "Male"],
    ["Lucia", "Nakagawa", "Female"],
    ["Malcolm", "Ostrander", "Male"],
    ["Mirabel", "Prescott", "Female"],
    ["Nikhil", "Raman", "Male"],
    ["Odette", "Sandoval", "Female"],
    ["Pierce", "Talbot", "Male"],
    ["Rosalie", "Upton", "Female"],
    ["Silas", "Vandermeer", "Male"],
    ["Serena", "Wexler", "Female"],
    ["Theo", "Yamamoto", "Male"],
    ["Valentina", "Zeller", "Female"],
    ["Wyatt", "Abbott", "Male"],
    ["Yara", "Blackwood", "Female"],
    ["Zachary", "Chen", "Male"],
    ["Annika", "Dalton", "Female"],
    ["Brooks", "Emerson", "Male"],
    ["Colette", "Fairchild", "Female"],
    ["Dorian", "Gallagher", "Male"],
    ["Esme", "Hargrove", "Female"],
    ["Finnegan", "Irwin", "Male"],
    ["Greta", "Jovanovic", "Female"],
    ["Harlan", "Keating", "Male"],
    ["Iris", "Lachance", "Female"],
    ["Joaquin", "Mendoza", "Male"],
    ["Katarina", "Novak", "Female"],
    ["Leander", "Oakes", "Male"],
    ["Marisol", "Pineda", "Female"],
    ["Nathaniel", "Radcliffe", "Male"],
    ["Paloma", "Serrano", "Female"],
    ["Rowan", "Thornton", "Male"],
  ]
  const credentials = ["MD", "MD", "DO", "NP", "PA", "MD", "RN"]
  const clinical = SPECIALTIES.filter((s) => s !== "Nutrition")
  const sites = [...LOCATION_BASE, ...MORE_LOCATION_BASE]
    .filter((l) => l.status === "Active")
    .map((l) => l.id)
  return names.map(([first, last, gender], i) => {
    const credential = credentials[i % credentials.length]
    const status: PersonStatus =
      i % 11 === 6 ? "Inactive" : i % 5 === 2 ? "Invited" : "Active"
    return [
      credential,
      first,
      last,
      credential === "RN" ? "Nutrition" : clinical[i % clinical.length],
      credential === "MD" && i % 6 === 0 ? "Supervising provider" : "Provider",
      i % 3 === 0
        ? [sites[i % sites.length], sites[(i + 7) % sites.length]]
        : [sites[i % sites.length]],
      status,
      gender,
    ]
  })
}

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
  const [
    credential,
    firstName,
    lastName,
    specialty,
    role,
    locationIds,
    status,
    gender,
  ] = row
  return {
    id: `PR${3132 + i}`,
    credential,
    firstName,
    middleName: "",
    lastName,
    dob: `19${70 + ((i * 7) % 20)}-${pad(1 + ((i * 5) % 12), 2)}-${pad(3 + ((i * 11) % 25), 2)}`,
    gender,
    npi: withNpiCheckDigit(
      `1${pad((i * 3_141_593 + 27_182_818) % 100_000_000, 8)}`
    ),
    specialty,
    role,
    taxonomyCode:
      TAXONOMY_BY_SPECIALTY[
        credential === "MD" || credential === "DO" ? specialty : credential
      ] ?? TAXONOMY_CODES[0],
    languages: i % 3 === 0 ? ["English", "Spanish"] : ["English"],
    ssn: `${pad(521 + i * 7, 3)}-${pad(40 + i, 2)}-${pad(1_842 + i * 311, 4)}`,
    photo: !hasPhoto(i)
      ? ""
      : i < 8
        ? headshot(firstName, lastName)
        : patientHeadshot(gender, i + 5),
    address1: `${1_200 + i * 45} ${["Prospect St", "Torrey Pines Rd", "Coast Blvd", "Via de la Valle"][i % 4]}`,
    address2: i % 2 ? `Apt ${i + 2}B` : "",
    zip: ["92037", "92014", "92008", "92037"][i % 4],
    city: ["La Jolla", "Del Mar", "Carlsbad", "La Jolla"][i % 4],
    state: "CA",
    telephone: `(858)-555-${pad(100 + ((70 + i) % 100), 4)}`,
    phone: `(858)-555-${pad(100 + ((60 + i) % 100), 4)}`,
    fax: i % 2 ? "" : "(858)-555-0119",
    email: `${firstName}.${lastName}@${PRACTICE.domain}`.toLowerCase(),
    timeZone: "Pacific (PT)",
    federalTaxId: `${pad(33 + i, 2)}-${pad(4_102_870 + i * 1_311, 7)}`,
    taxIdType: "EIN",
    registrationDate: isoDaysAgo(30 + i * 9),
    nonBilling: credential === "RN",
    locationIds,
    supervisorIds: role === "Provider" ? [i % 2 ? "PR3136" : "PR3132"] : [],
    assistantIds: [],
    education:
      credential === "MD" || credential === "DO"
        ? `Residency in ${specialty}; ${6 + i} years in outpatient and concierge practice.`
        : `${credential} program graduate; ${3 + i} years in preventive and lifestyle care.`,
    licenses: [
      {
        type:
          credential === "RN" || credential === "NP"
            ? "Nursing License"
            : "State Medical License",
        state: "CA",
        number:
          credential === "RN"
            ? `RN${pad(845_210 + i * 37, 6)}`
            : `A${pad(128_400 + i * 913, 6)}`,
        expiry: `20${27 + (i % 3)}-${pad(1 + ((i * 4) % 12), 2)}-30`,
      },
      ...(credential === "MD" || credential === "DO"
        ? [
            {
              type: "DEA Registration",
              state: "CA",
              number: `F${lastName[0]}${pad(410_233 + i * 71, 7)}`,
              expiry: `2028-${pad(1 + ((i + 1) % 12), 2)}-28`,
            },
          ]
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
    photo: "",
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
    photo: "",
  },
  ...moreUsers(),
]

/* The rest of the 50 staff users. Values derive from the row's position so
   the list is stable across reloads. */
function moreUsers(): StaffUser[] {
  const names: [first: string, last: string][] = [
    ["Alana", "Brennan"],
    ["Bryce", "Calloway"],
    ["Carmen", "Delgado"],
    ["Dante", "Eriksen"],
    ["Elodie", "Farrow"],
    ["Franco", "Gutierrez"],
    ["Gemma", "Harlow"],
    ["Hector", "Ibarra"],
    ["Ivy", "Jennings"],
    ["Jonas", "Kerrigan"],
    ["Kaia", "Lowell"],
    ["Liam", "Macaulay"],
    ["Mila", "Navarro"],
    ["Nico", "Ortiz"],
    ["Olive", "Pacheco"],
    ["Parker", "Quintana"],
    ["Riley", "Sato"],
    ["Sienna", "Trujillo"],
    ["Tristan", "Ulloa"],
    ["Uma", "Villanueva"],
    ["Vance", "Winslow"],
    ["Willa", "Xiong"],
    ["Xavier", "Yates"],
    ["Yvette", "Zamora"],
    ["Zane", "Albright"],
    ["Aurora", "Bishop"],
    ["Blake", "Cortez"],
    ["Daphne", "Donovan"],
    ["Elias", "Estrada"],
    ["Freya", "Flynn"],
    ["Grant", "Gilmore"],
    ["Hazel", "Hensley"],
    ["Ian", "Ivers"],
    ["Jade", "Jimenez"],
    ["Kai", "Kimura"],
    ["Lena", "Lambert"],
    ["Marco", "Molina"],
    ["Nadia", "Nguyen"],
    ["Oscar", "Olsen"],
    ["Penelope", "Price"],
    ["Reid", "Ramirez"],
    ["Stella", "Sutton"],
    ["Tobias", "Tran"],
    ["Vera", "Vaughn"],
    ["Wade", "Whitman"],
  ]
  const sites = LOCATIONS.filter((l) => l.status === "Active").map((l) => l.id)
  return names.map(([firstName, lastName], i) => {
    const status: PersonStatus =
      i % 9 === 7 ? "Inactive" : i % 4 === 2 ? "Invited" : "Active"
    return {
      id: `U${pad(60_120 + i * 373, 5)}`,
      firstName,
      lastName,
      role: USER_ROLES[i % USER_ROLES.length],
      email: `${firstName}.${lastName}@${PRACTICE.domain}`.toLowerCase(),
      phone:
        i % 6 === 5 ? "" : `(858)-555-${pad(100 + ((i * 7 + 3) % 100), 4)}`,
      locationIds:
        i % 3 === 0
          ? [sites[i % sites.length], sites[(i + 5) % sites.length]]
          : [sites[i % sites.length]],
      status,
      invitedAt: isoDaysAgo(3 + i * 2),
      lastActive:
        status === "Invited"
          ? ""
          : isoDaysAgo(status === "Inactive" ? 20 + i : i % 4),
      photo: hasPhoto(i)
        ? patientHeadshot(
            FEMALE_STAFF.has(firstName) ? "Female" : "Male",
            i + 3
          )
        : "",
    }
  })
}

const FIRST_NAMES = [
  "Amelia",
  "Benjamin",
  "Charlotte",
  "Daniel",
  "Eleanor",
  "Felix",
  "Gabriela",
  "Harrison",
  "Isla",
  "Jonah",
  "Keira",
  "Leonardo",
  "Madeline",
  "Nolan",
  "Ophelia",
  "Preston",
  "Quinn",
  "Rosalind",
  "Sebastian",
  "Tamsin",
  "Ulrich",
  "Vivian",
  "Wesley",
  "Ximena",
  "Yusuf",
  "Zara",
  "Adrian",
  "Beatrice",
  "Cyrus",
  "Delphine",
  "Emmett",
  "Fiona",
  "Gideon",
]
const LAST_NAMES = [
  "Abernathy",
  "Bellweather",
  "Castellanos",
  "Dunmore",
  "Ellsworth",
  "Fairbanks",
  "Galloway",
  "Hollister",
  "Ingram",
  "Jardine",
  "Kensington",
  "Lockhart",
  "Montague",
  "Northcott",
  "Oyelaran",
  "Pemberton",
  "Quayle",
  "Rutherford",
  "Sinclair",
  "Thackeray",
  "Underhill",
  "Valdivia",
  "Whitlock",
  "Yardley",
  "Zimmerman",
  "Achebe",
  "Brightman",
  "Coventry",
  "Delacroix",
]

const FEMALE = new Set([
  "Amelia",
  "Charlotte",
  "Eleanor",
  "Gabriela",
  "Isla",
  "Keira",
  "Madeline",
  "Ophelia",
  "Rosalind",
  "Tamsin",
  "Vivian",
  "Ximena",
  "Zara",
  "Beatrice",
  "Delphine",
  "Fiona",
])

function sexFor(name: string) {
  if (name === "Quinn") return "Other"
  return FEMALE.has(name) ? "Female" : "Male"
}

/* A stable 0 to 99 roll per patient, so who has enrolled doesn't line up
   with the provider rotation. One physician's patients mostly haven't
   enrolled: the case the admin console's adoption view flags. */
const LAGGING_PROVIDER = "PR3133"
function enrollRoll(i: number) {
  return (Math.imul(i + 1, 2_654_435_761) >>> 0) % 100
}

/* Days since an active patient last opened the app: most within the week,
   a tail drifting off over a month or two, counted back from today so the
   list always reads current. */
function engagedDaysAgo(i: number) {
  const roll = enrollRoll(i * 7 + 3)
  const days = roll < 55 ? roll % 7 : roll < 85 ? 7 + (roll % 24) : 31 + roll
  const d = new Date(Date.now() - days * 86_400_000)
  return d.toISOString().slice(0, 10)
}

/* 131 patients, matching the count the admin console shows for the practice.
   Every value is derived from the row's position, so the list is stable. */
const PATIENTS: Patient[] = Array.from({ length: 131 }, (_, i) => {
  const firstName = FIRST_NAMES[(i * 7) % FIRST_NAMES.length]
  const lastName = LAST_NAMES[(i * 11 + 3) % LAST_NAMES.length]
  const active = PROVIDERS.filter((p) => p.status === "Active")
  const provider = active[i % active.length]
  const locationId = provider.locationIds[i % provider.locationIds.length]
  const status: PatientStatus =
    i % 9 === 4 || i % 23 === 7 || i % 29 === 12
      ? "Inactive"
      : enrollRoll(i) < (provider.id === LAGGING_PROVIDER ? 85 : 30)
        ? enrollRoll(i * 5 + 2) < 14
          ? "Declined"
          : "Invited"
        : "Active"
  /* Decline is only offered in the final reminder, so a declined patient
     was invited over 30 days ago and answered on day 30. */
  const invitedDaysAgo =
    status === "Declined" ? 31 + (i % 20) : Math.floor(i / 3)
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
    photo: hasPhoto(i) ? patientHeadshot(sexFor(firstName), i) : "",
    address1: `${100 + i * 13} ${["Pearl St", "Ocean Ave", "Camino Real", "Olive Ave", "El Paseo"][i % 5]}`,
    address2: "",
    zip: area === "760" ? "92008" : ["92037", "92014"][i % 2],
    city: area === "760" ? "Carlsbad" : ["La Jolla", "Del Mar"][i % 2],
    state: "CA",
    phone: `(${area})-555-${pad(100 + (i % 100), 4)}`,
    homePhone: "",
    email:
      `${firstName}.${lastName}${i > 60 ? i : ""}@example.com`.toLowerCase(),
    noEmail: false,
    preferredContacts: [CONTACT_METHODS[i % 3]],
    timeZone: "Pacific (PT)",
    race: "",
    ethnicity: "",
    pronoun: "",
    maritalStatus: "",
    ssn: "",
    portalAccess: true,
    locationId,
    providerId: provider.id,
    registrationDate: isoDaysAgo(Math.floor(i / 3)),
    emergencyContacts:
      i % 3 === 0
        ? []
        : [
            {
              relationship: RELATIONSHIPS[i % 4],
              name: `${FIRST_NAMES[(i * 5 + 2) % FIRST_NAMES.length]} ${lastName}`,
              phone: `(${area})-555-${pad(150 + (i % 50), 4)}`,
              email: "",
            },
          ],
    status,
    invitedAt: isoDaysAgo(invitedDaysAgo),
    ...(status === "Declined" && {
      respondedAt: isoDaysAgo(invitedDaysAgo - 30),
    }),
    ...(status === "Inactive" && {
      inactiveReason: (i % 29 === 12
        ? "Consent withdrawn"
        : i % 2
          ? "Discharged"
          : "Deactivated") as InactiveReason,
    }),
    source: i % 5 === 2 ? "Bulk import" : "Manual",
    ...(status === "Active" && { lastEngagedAt: engagedDaysAgo(i) }),
    /* A closed record used the app before it closed, so it keeps the date. */
    ...(status === "Inactive" && {
      lastEngagedAt: isoDaysAgo(40 + ((i * 13) % 120)),
    }),
  }
})

/* The first sample patient is Olivia Bennett, the patient the invitation
   email and the patient app (mobile/) are built around, under Dr. Elise
   Harrington, so her record reads the same in the portal and the app. */
export const OLIVIA_ID = PATIENTS[0].id
PATIENTS[0] = {
  ...PATIENTS[0],
  firstName: "Olivia",
  lastName: "Bennett",
  sex: "Female",
  dob: "1978-04-16",
  email: INVITEES.patient.email,
  photo: patientHeadshot("Female", 0),
  providerId: "PR3132",
  locationId:
    PROVIDERS.find((p) => p.id === "PR3132")?.locationIds[0] ??
    PATIENTS[0].locationId,
  status: "Active",
  invitedAt: isoDaysAgo(30),
  registrationDate: isoDaysAgo(30),
  lastEngagedAt: engagedDaysAgo(1),
}

/* The signed-in provider, Dr. Daniel Reyes (the header's chip). He joins the
   provider list after the patients are dealt out, so the rotation above, and
   with it every other patient's physician, stays as it was. */
const HARRINGTON_ID = "PR3132"
const REYES: Provider = {
  ...PROVIDERS[0],
  id: `PR${3132 + PROVIDERS.length}`,
  firstName: "Daniel",
  lastName: "Reyes",
  dob: "1979-05-21",
  gender: "Male",
  npi: withNpiCheckDigit("142867301"),
  specialty: "Internal Medicine",
  role: "Provider",
  ssn: "538-61-4471",
  photo: "",
  email: `daniel.reyes@${PRACTICE.domain}`,
  supervisorIds: [HARRINGTON_ID],
  assistantIds: [],
  registrationDate: isoDaysAgo(120),
  lastLogin: isoDaysAgo(0),
}
export const REYES_ID = REYES.id

/* The provider dashboard's sample panel: thirteen patients carrying the
   record fields its counts read. The four named sample patients keep their
   rows; nine more take the place of generated rows, so the practice still
   lists 131. P10444 is a generated id already, so that row is renamed. */
type PanelRow = [
  id: string,
  first: string,
  last: string,
  dob: string,
  sex: "Female" | "Male",
  membership: "free" | "optimization",
  recordState: PanelRecordState,
  providerId: string,
]

const PANEL_ROWS: PanelRow[] = [
  [
    "P10318",
    "Marcus",
    "Hale",
    "1962-03-14",
    "Male",
    "optimization",
    "active",
    REYES.id,
  ],
  [
    "P10411",
    "Daniel",
    "Okafor",
    "1957-02-09",
    "Male",
    "free",
    "active",
    REYES.id,
  ],
  [
    "P10422",
    "Priya",
    "Natarajan",
    "1969-11-23",
    "Female",
    "optimization",
    "active",
    REYES.id,
  ],
  [
    "P10433",
    "Thomas",
    "Whitfield",
    "1949-06-30",
    "Male",
    "free",
    "active",
    REYES.id,
  ],
  [
    "P10444",
    "Grace",
    "Lindqvist",
    "1983-09-12",
    "Female",
    "free",
    "active",
    HARRINGTON_ID,
  ],
  [
    "P10455",
    "Samuel",
    "Ortiz",
    "1975-01-05",
    "Male",
    "optimization",
    "active",
    REYES.id,
  ],
  [
    "P10466",
    "Hannah",
    "Brooks",
    "1991-04-18",
    "Female",
    "free",
    "invited_not_joined",
    REYES.id,
  ],
  [
    "P10477",
    "Walter",
    "Chen",
    "1944-12-02",
    "Male",
    "free",
    "active",
    HARRINGTON_ID,
  ],
  [
    "P10488",
    "Leah",
    "Moreno",
    "1988-07-27",
    "Female",
    "free",
    "waiting_for_consent",
    REYES.id,
  ],
]

/* The generated rows the new patients replace: late in the list, so the
   first pages read as before. */
const REPLACED_ROWS = [122, 123, 124, 12, 125, 126, 127, 128, 129]

/* Where each panel record stands at the mock clock (provider/mock-clock.ts):
   the nightly pull ran at 5:00 AM; a failed source last pulled the day before. */
const NIGHTLY = "2026-10-03T05:00"

PANEL_ROWS.forEach((row, n) => {
  const [
    id,
    firstName,
    lastName,
    dob,
    sex,
    membership,
    recordState,
    providerId,
  ] = row
  const i = REPLACED_ROWS[n]
  const base = PATIENTS[i]
  PATIENTS[i] = {
    ...base,
    id,
    firstName,
    lastName,
    dob,
    sex,
    email: `${firstName}.${lastName}@example.com`.toLowerCase(),
    photo: hasPhoto(n) ? patientHeadshot(sex, n + 4) : "",
    providerId,
    locationId: "LOC1001",
    status: recordState === "invited_not_joined" ? "Invited" : "Active",
    invitedAt: isoDaysAgo(20 + n),
    respondedAt: undefined,
    lastEngagedAt:
      recordState === "invited_not_joined" ? undefined : engagedDaysAgo(n + 40),
    recordState,
    membership,
    ...(recordState === "active" && { lastSyncAt: NIGHTLY }),
    ...(id === "P10318" && { phone: "(858)-555-0142" }),
  }
})

/* The four named sample patients join the panel under Dr. Harrington. */
const PANEL_EXISTING: Record<string, Partial<Patient>> = {
  P10240: { recordState: "active", membership: "free", lastSyncAt: NIGHTLY },
  P10257: {
    recordState: "waiting_for_consent",
    membership: "free",
    status: "Active",
  },
  P10750: { recordState: "building", membership: "free", status: "Active" },
  P10665: {
    recordState: "sync_failed",
    membership: "free",
    status: "Active",
    lastSyncAt: "2026-10-02T05:00",
  },
}
PATIENTS.forEach((p, i) => {
  const extra = PANEL_EXISTING[p.id]
  if (extra)
    PATIENTS[i] = {
      ...p,
      ...extra,
      providerId: HARRINGTON_ID,
      locationId: "LOC1001",
      lastEngagedAt: p.lastEngagedAt ?? engagedDaysAgo(i),
    }
})

/* -------------------------------------------------------------------------- */
/*  Stores                                                                     */
/* -------------------------------------------------------------------------- */

const VERSION = "v20"

/** The sample patients, before any session edits: the duplicate queue seeds from them. */
export const PATIENT_SEED = PATIENTS

export const locations = createCollection(
  "hol-practice-locations",
  LOCATIONS,
  VERSION
)
/* Each provider starts with one medical assistant, taken in turn. */
const ASSISTANT_IDS = USERS.filter((u) => u.role === "Medical assistant").map(
  (u) => u.id
)
export const providers = createCollection(
  "hol-practice-providers",
  [...PROVIDERS, REYES].map((p, i) => ({
    ...p,
    /* One role per person, from Roles and permissions. */
    role: "Physician",
    assistantIds: ASSISTANT_IDS.length
      ? [ASSISTANT_IDS[i % ASSISTANT_IDS.length]]
      : [],
  })),
  VERSION
)
export const users = createCollection("hol-practice-users", USERS, VERSION)
/* Marcus Hale, the provider dashboard's lead sample patient, heads the
   patient list. Only the store is reordered: the seed keeps its indices. */
const LIST_FIRST = "P10318"
export const patients = createCollection(
  "hol-practice-patients",
  [
    ...PATIENTS.filter((p) => p.id === LIST_FIRST),
    ...PATIENTS.filter((p) => p.id !== LIST_FIRST),
  ],
  VERSION
)

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

/* Adding a patient invites them at once, however they come in; the
   reminders follow on their own (INVITE_STEPS). */
export function addPatients(inputs: PatientInput[], source: Patient["source"]) {
  const taken = [...patients.get()]
  const created = inputs.map((input) => {
    const patient: Patient = {
      ...input,
      id: nextId("P", taken),
      status: "Invited",
      invitedAt: today(),
      source,
    }
    taken.push(patient)
    return patient
  })
  patients.add(created)
  return created
}

/* Reopening an inactive or withdrawn record keeps its history and sends a
   fresh consent request with the portal invite. */
export function reactivatePatient(
  id: string,
  assign: { providerId: string; locationId: string }
) {
  patients.patch(id, {
    ...assign,
    status: "Invited",
    invitedAt: today(),
    respondedAt: "",
    inactiveReason: undefined,
    reactivatedAt: today(),
  })
}

/* A merge keeps the existing record and its history. The incoming record
   only fills what the existing one left blank. Returns what it filled. */
const MERGE_FIELDS: [keyof PatientInput, string][] = [
  ["middleName", "Middle name"],
  ["preferredName", "Preferred name"],
  ["sex", "Sex at birth"],
  ["email", "Email"],
  ["phone", "Mobile number"],
  ["homePhone", "Home phone"],
  ["address1", "Address"],
  ["address2", "Address line 2"],
  ["city", "City"],
  ["zip", "ZIP code"],
]

export function mergeFields(existing: Patient, incoming: PatientInput) {
  return MERGE_FIELDS.filter(
    ([key]) => !existing[key] && Boolean(incoming[key])
  ).map(([key, label]) => ({ key, label }))
}

export function mergePatient(id: string, incoming: PatientInput) {
  const existing = patients.get().find((p) => p.id === id)
  if (!existing) return []
  const filled = mergeFields(existing, incoming)
  patients.patch(id, {
    ...Object.fromEntries(filled.map(({ key }) => [key, incoming[key]])),
    mergedAt: today(),
  })
  return filled.map((f) => f.label)
}

/** Emails the patient portal invite to patients added without one. */
export function sendPatientInvites(ids: string[]) {
  for (const id of ids) {
    patients.patch(id, {
      status: "Invited",
      invitedAt: today(),
      respondedAt: "",
    })
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
