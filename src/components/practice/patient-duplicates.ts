"use client"

import { digits } from "@/components/form-kit"
import {
  createCollection,
  nextId,
  today,
} from "@/components/practice/collection-store"
import {
  type Patient,
  type PatientInput,
  PATIENT_SEED,
  PRACTICE,
  REACTIVATABLE,
  addPatients,
  emptyPatient,
  mergePatient,
  patients,
} from "@/components/practice/practice-data"

/* The duplicate check every new patient record goes through before it is
   created or invited, whichever way it came in (bulk import, a provider's
   referral, the practice's own onboarding). The check is per practice: the
   prototype holds one practice, so it runs against the practice's list.

     Exact match      name + date of birth + email or mobile
       Invited / Not invited   reuse the record, no second invite
       Active                  keep the record, no second invite
       Discharged, Consent withdrawn, Inactive
                               reactivate the record, fresh consent
     Possible match   two of name, date of birth and contact agree, or the
                      surname, first initial and date of birth do
                      held in the review queue for the clinic manager
     No match         create the record, then assign a physician */

export type MatchField = "name" | "dob" | "email" | "phone"

export type DuplicateCheck =
  | { kind: "none" }
  | {
      kind: "exact"
      patient: Patient
      action: "reuse" | "keep" | "reactivate"
      matched: MatchField[]
    }
  | { kind: "possible"; patient: Patient; matched: MatchField[] }

type Candidate = Pick<
  PatientInput,
  "firstName" | "lastName" | "dob" | "email" | "phone"
>

const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")

export const MATCH_LABEL: Record<MatchField, string> = {
  name: "Name",
  dob: "Date of birth",
  email: "Email",
  phone: "Mobile number",
}

/** "Name, date of birth and email" */
export function matchedText(matched: MatchField[]) {
  const words = matched.map((m, i) =>
    i === 0 ? MATCH_LABEL[m] : MATCH_LABEL[m].toLowerCase()
  )
  return words.length < 2
    ? (words[0] ?? "")
    : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`
}

function compare(v: Candidate, p: Patient) {
  const first = letters(v.firstName)
  const last = letters(v.lastName)
  const name =
    Boolean(first && last) &&
    letters(p.firstName) === first &&
    letters(p.lastName) === last
  const nearName =
    !name &&
    Boolean(first && last) &&
    letters(p.lastName) === last &&
    letters(p.firstName)[0] === first[0]
  const dob = Boolean(v.dob) && p.dob === v.dob
  const email =
    Boolean(v.email.trim()) &&
    p.email.trim().toLowerCase() === v.email.trim().toLowerCase()
  const phone =
    digits(v.phone).length === 10 && digits(p.phone) === digits(v.phone)

  const matched: MatchField[] = []
  if (name) matched.push("name")
  if (dob) matched.push("dob")
  if (email) matched.push("email")
  if (phone) matched.push("phone")

  const contact = email || phone
  const exact = name && dob && contact
  const possible =
    (name && dob) || (dob && contact) || (name && contact) || (nearName && dob)
  return { exact, possible, matched }
}

export function checkDuplicate(
  v: Candidate,
  list: Patient[] = patients.get()
): DuplicateCheck {
  let best: { patient: Patient; matched: MatchField[] } | undefined
  for (const p of list) {
    const r = compare(v, p)
    if (r.exact) {
      const action = REACTIVATABLE.includes(p.status)
        ? "reactivate"
        : p.status === "Active"
          ? "keep"
          : "reuse"
      return { kind: "exact", patient: p, action, matched: r.matched }
    }
    if (r.possible && (!best || r.matched.length > best.matched.length)) {
      best = { patient: p, matched: r.matched }
    }
  }
  return best ? { kind: "possible", ...best } : { kind: "none" }
}

/* -------------------------------------------------------------------------- */
/*  Possible-duplicate queue                                                   */
/* -------------------------------------------------------------------------- */

/* An incoming record held back because it may be someone already on file.
   It is not a patient yet: resolving it either merges it into the match or
   creates it as a separate record. */
export type DuplicateReview = {
  id: string
  incoming: PatientInput
  matchId: string
  matched: MatchField[]
  source: Patient["source"]
  submittedBy: string
  submittedAt: string
}

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const pad = (x: number) => String(x).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function seedReview(
  id: string,
  base: Patient,
  changes: Partial<PatientInput>,
  source: Patient["source"],
  submittedBy: string,
  age: number
): DuplicateReview {
  const incoming: PatientInput = {
    ...emptyPatient(),
    firstName: base.firstName,
    lastName: base.lastName,
    dob: base.dob,
    sex: base.sex,
    email: base.email,
    phone: base.phone,
    locationId: base.locationId,
    providerId: base.providerId,
    ...changes,
  }
  const check = checkDuplicate(incoming, PATIENT_SEED)
  return {
    id,
    incoming,
    matchId: base.id,
    matched: check.kind === "none" ? [] : check.matched,
    source,
    submittedBy,
    submittedAt: daysAgo(age),
  }
}

const MANAGER = PRACTICE.manager.name
const PROVIDER = "Dr. Elise Harrington"

/* Three cases the review exists for: new contact details, a changed
   surname, and a mistyped date of birth. */
const REVIEW_SEED: DuplicateReview[] = [
  seedReview(
    "DR1001",
    PATIENT_SEED[3],
    {
      email:
        `${PATIENT_SEED[3].firstName}.${PATIENT_SEED[3].lastName}@mailbox.org`.toLowerCase(),
      phone: "(619)-555-0142",
      address1: "2210 Via Capri",
      city: "La Jolla",
      zip: "92037",
    },
    "Bulk import",
    MANAGER,
    1
  ),
  seedReview(
    "DR1002",
    PATIENT_SEED[10],
    { lastName: "Okafor", phone: "" },
    "Manual",
    PROVIDER,
    2
  ),
  seedReview(
    "DR1003",
    PATIENT_SEED[17],
    {
      dob: PATIENT_SEED[17].dob.replace(
        /-(\d\d)$/,
        (_, d) => `-${String(((Number(d) + 9) % 28) + 1).padStart(2, "0")}`
      ),
      email: "",
      homePhone: "(858)-555-0177",
    },
    "Bulk import",
    MANAGER,
    3
  ),
]

export const duplicateReviews = createCollection(
  "hol-practice-duplicate-reviews",
  REVIEW_SEED,
  "v1"
)

export function queueForReview(
  entries: {
    incoming: PatientInput
    matchId: string
    matched: MatchField[]
    source: Patient["source"]
  }[],
  submittedBy: string
) {
  const taken = [...duplicateReviews.get()]
  const created = entries.map((entry) => {
    const review: DuplicateReview = {
      ...entry,
      id: nextId("DR", taken, 4),
      submittedBy,
      submittedAt: today(),
    }
    taken.push(review)
    return review
  })
  duplicateReviews.add(created)
  return created
}

/** Same person: the existing record stays, blanks filled from the incoming. */
export function resolveAsMerge(review: DuplicateReview) {
  const filled = mergePatient(review.matchId, review.incoming)
  duplicateReviews.remove(review.id)
  return filled
}

/** Different person: the incoming record is created with its physician. */
export function resolveAsSeparate(
  review: DuplicateReview,
  assign: { providerId: string; locationId: string }
) {
  const [created] = addPatients(
    [{ ...review.incoming, ...assign }],
    review.source
  )
  duplicateReviews.remove(review.id)
  return created
}
