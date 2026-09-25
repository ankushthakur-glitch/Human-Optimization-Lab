"use client"

import * as React from "react"

import type { Practice } from "@/components/admin/practices-store"
import {
  PRACTICE,
  REACTIVATABLE,
  USER_ROLES,
  type PatientStatus,
  type PersonStatus,
  fullName,
  patients as patientStore,
  providerName,
  providers as providerStore,
  users as userStore,
} from "@/components/practice/practice-data"

/* Adoption for the admin console: who at a practice has signed in, and how
   many of its patients have enrolled in the app, per provider. Harborview is
   the practice the clinic manager portal runs on, so its numbers are read
   live from that portal's stores. Every other practice gets a roster derived
   from its id and counts, so the figures are stable across reloads. */

export type AdoptionUser = {
  id: string
  name: string
  role: string
  status: PersonStatus
  lastActive: string
  photo: string
}

export type AdoptionPatient = {
  id: string
  name: string
  status: PatientStatus
  invitedAt: string
}

export type ProviderAdoption = {
  id: string
  name: string
  specialty: string
  status: PersonStatus
  photo: string
  patients: AdoptionPatient[]
  /** Open records: closed ones (inactive, discharged, withdrawn) left out. */
  open: number
  enrolled: number
  invited: number
  notInvited: number
  /** Enrolled over open records, 0 to 1; null with no open records. */
  rate: number | null
  behind: boolean
}

export type Adoption = {
  users: AdoptionUser[]
  providers: ProviderAdoption[]
  usersOnboarded: number
  patientsTotal: number
  open: number
  enrolled: number
  closed: number
  rate: number | null
  providersOnboarded: number
  behind: number
}

/* A provider is flagged when their rate trails the practice's by this many
   points, once they have enough patients for the rate to mean something. */
const BEHIND_GAP = 0.3
const BEHIND_MIN_PATIENTS = 3

const isClosed = (status: PatientStatus) => REACTIVATABLE.includes(status)

type Roster = {
  users: AdoptionUser[]
  providers: Omit<
    ProviderAdoption,
    "open" | "enrolled" | "invited" | "notInvited" | "rate" | "behind"
  >[]
}

function summarise(roster: Roster): Adoption {
  const counted = roster.providers.map((p) => {
    const openRecords = p.patients.filter((x) => !isClosed(x.status))
    const enrolled = openRecords.filter((x) => x.status === "Active").length
    const invited = openRecords.filter((x) => x.status === "Invited").length
    return {
      ...p,
      open: openRecords.length,
      enrolled,
      invited,
      notInvited: openRecords.length - enrolled - invited,
      rate: openRecords.length ? enrolled / openRecords.length : null,
      behind: false,
    }
  })

  const patientsTotal = counted.reduce((n, p) => n + p.patients.length, 0)
  const open = counted.reduce((n, p) => n + p.open, 0)
  const enrolled = counted.reduce((n, p) => n + p.enrolled, 0)
  const rate = open ? enrolled / open : null

  const providers = counted.map((p) => ({
    ...p,
    behind:
      rate !== null &&
      p.rate !== null &&
      p.open >= BEHIND_MIN_PATIENTS &&
      p.rate <= rate - BEHIND_GAP,
  }))

  return {
    users: roster.users,
    providers,
    usersOnboarded: roster.users.filter((u) => u.status === "Active").length,
    patientsTotal,
    open,
    enrolled,
    closed: patientsTotal - open,
    rate,
    providersOnboarded: providers.filter((p) => p.status === "Active").length,
    behind: providers.filter((p) => p.behind).length,
  }
}

/* -------------------------------------------------------------------------- */
/*  Harborview: the live clinic manager portal data                            */
/* -------------------------------------------------------------------------- */

function useHarborviewRoster(enabled: boolean): Roster | null {
  const { items: staff } = userStore.use()
  const { items: clinicians } = providerStore.use()
  const { items: people } = patientStore.use()

  return React.useMemo(() => {
    if (!enabled) return null
    const users: AdoptionUser[] = [
      ...staff.map((u) => ({
        id: u.id,
        name: fullName(u),
        role: u.role,
        status: u.status,
        lastActive: u.lastActive,
        photo: u.photo,
      })),
      ...clinicians.map((p) => ({
        id: p.id,
        name: providerName(p),
        role: p.role,
        status: p.status,
        lastActive: p.lastLogin,
        photo: p.photo,
      })),
    ]
    const providers = clinicians.map((p) => ({
      id: p.id,
      name: providerName(p),
      specialty: p.specialty,
      status: p.status,
      photo: p.photo,
      patients: people
        .filter((x) => x.providerId === p.id)
        .map((x) => ({
          id: x.id,
          name: fullName(x),
          status: x.status,
          invitedAt: x.invitedAt,
        })),
    }))
    return { users, providers }
  }, [enabled, staff, clinicians, people])
}

/* -------------------------------------------------------------------------- */
/*  Every other practice: a derived roster                                     */
/* -------------------------------------------------------------------------- */

const FIRST = [
  "Adele", "Brandon", "Celeste", "Desmond", "Eloise", "Fabian", "Gwen",
  "Holden", "Ines", "Jude", "Kira", "Lorenzo", "Mae", "Nash", "Orla",
  "Paxton", "Rhea", "Sterling", "Talia", "Upton", "Vera", "Warren", "Yasmin",
  "Zeke", "Anya", "Beckett", "Cora", "Dmitri", "Edie", "Flynn",
]
const LAST = [
  "Ashby", "Barlow", "Cordero", "Dempsey", "Eastman", "Fennimore",
  "Gallardo", "Hightower", "Isley", "Jessup", "Kingsley", "Lorimer",
  "Mercado", "Nyberg", "Ogden", "Paredes", "Rourke", "Stanhope", "Treviño",
  "Vickers", "Wainwright", "Yoon", "Zamarripa", "Albee", "Bramwell",
]
const CREDENTIALS = ["MD", "MD", "DO", "NP", "PA"]
const SPECIALTIES = [
  "Internal Medicine", "Family Medicine", "Preventive Medicine",
  "Endocrinology", "Cardiology", "Sports Medicine",
]

/* Small deterministic generator (mulberry32) seeded from the practice id. */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

function isoDaysBefore(iso: string, days: number) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) - days * 86_400_000)
    .toISOString()
    .slice(0, 10)
}

function derivedRoster(practice: Practice): Roster {
  const rand = seeded(Number(practice.id) * 2_654_435 + 1)
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)]
  const name = (i: number, offset: number) =>
    `${FIRST[(i * 7 + offset) % FIRST.length]} ${LAST[(i * 11 + offset * 3) % LAST.length]}`
  const seedOffset = Number(practice.id) % 97
  const lastSeen = () => isoDaysBefore("2026-09-24", Math.floor(rand() * 6))
  const inactive = practice.status === "Inactive"

  const providers: Roster["providers"] = Array.from(
    { length: practice.clinicians },
    (_, i) => {
      const credential = CREDENTIALS[(i + seedOffset) % CREDENTIALS.length]
      const status: PersonStatus =
        inactive ? "Inactive" : i > 0 && rand() < 0.18 ? "Invited" : "Active"
      return {
        id: `PR${String(4000 + ((seedOffset * 13 + i * 7) % 6000)).padStart(4, "0")}`,
        name: `${name(i, seedOffset)}, ${credential}`,
        specialty: pick(SPECIALTIES),
        status,
        photo: "",
        patients: [],
      }
    }
  )

  /* Patients go to providers who have signed in. Each provider gets their
     own enrollment tendency; in larger practices one trails well behind, the
     case HOL most wants to spot. */
  const seeing = providers.filter((p) => p.status !== "Invited")
  const pool = seeing.length ? seeing : providers
  const tendency = pool.map(() => 0.45 + rand() * 0.4)
  if (pool.length >= 3) tendency[Math.floor(rand() * pool.length)] = 0.1 + rand() * 0.12
  for (let i = 0; i < practice.patients; i++) {
    const at = Math.floor(rand() * pool.length)
    const r = rand()
    const status: PatientStatus =
      r < 0.06
        ? "Inactive"
        : r < 0.09
          ? "Discharged"
          : rand() < tendency[at]
            ? "Active"
            : rand() < 0.7
              ? "Invited"
              : "Not invited"
    pool[at].patients.push({
      id: `P${String(20_000 + ((seedOffset * 311 + i * 17) % 80_000)).padStart(5, "0")}`,
      name: name(i + 3, seedOffset + 5),
      status,
      invitedAt:
        status === "Not invited"
          ? ""
          : isoDaysBefore("2026-09-24", Math.floor(rand() * 30)),
    })
  }

  const users: AdoptionUser[] = []
  if (practice.manager) {
    users.push({
      id: "CM",
      name: [practice.manager.firstName, practice.manager.lastName].join(" "),
      role: "Clinic manager",
      status: practice.manager.status,
      lastActive: practice.manager.status === "Active" ? lastSeen() : "",
      photo: "",
    })
  }
  const staff = practice.clinicians === 0 ? 0 : 1 + (practice.clinicians % 4)
  for (let i = 0; i < staff; i++) {
    const status: PersonStatus = inactive
      ? "Inactive"
      : rand() < 0.25
        ? "Invited"
        : "Active"
    users.push({
      id: `U${i}`,
      name: name(i + 40, seedOffset + 11),
      role: USER_ROLES[(i + seedOffset) % USER_ROLES.length],
      status,
      lastActive: status === "Active" ? lastSeen() : "",
      photo: "",
    })
  }
  for (const provider of providers) {
    users.push({
      id: provider.id,
      name: provider.name,
      role: "Provider",
      status: provider.status,
      lastActive: provider.status === "Active" ? lastSeen() : "",
      photo: "",
    })
  }

  return { users, providers }
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function usePracticeAdoption(practice: Practice): Adoption {
  const live = practice.id === PRACTICE.id
  const harborview = useHarborviewRoster(live)
  return React.useMemo(
    () => summarise(harborview ?? derivedRoster(practice)),
    [harborview, practice]
  )
}

/** Every practice's adoption from its derived roster, without the live
    portal stores: enough for HOL wide averages. */
export function derivedAdoption(practice: Practice): Adoption {
  return summarise(derivedRoster(practice))
}
