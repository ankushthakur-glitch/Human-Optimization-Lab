"use client"

import {
  createCollection,
  nextId,
} from "@/components/practice/collection-store"
import { PRACTICE } from "@/components/practice/practice-data"
import type { PortalKey } from "@/components/practice/portal"

/* Every bulk upload, kept with its sheet: who uploaded it, when, and what
   became of each row. Settings shows the clinic manager every upload in the
   practice and the provider their own. */

export type ImportResult =
  "new" | "duplicate" | "on-file" | "reactivated" | "review" | "error"

export const RESULT_LABEL: Record<ImportResult, string> = {
  new: "New",
  duplicate: "Duplicate",
  "on-file": "Already on file",
  reactivated: "Reactivated",
  review: "Needs review",
  error: "Error",
}

export const RESULT_VARIANT = {
  new: "success",
  duplicate: "warning",
  "on-file": "secondary",
  reactivated: "info",
  review: "warning",
  error: "destructive",
} as const

export type ImportedRow = {
  /** The spreadsheet row number, header included. */
  row: number
  name: string
  detail: string
  /** The row's cells as uploaded, keyed by column header. */
  cells: Record<string, string>
  result: ImportResult
  note: string
}

export type ImportRecord = {
  id: string
  /** ISO time, UTC. */
  at: string
  portal: PortalKey
  actor: string
  role: string
  /** Plural, lower case: "patients" or "providers". */
  list: string
  fileName: string
  /** The sheet's column headers, in order. */
  columns: string[]
  rows: ImportedRow[]
}

export function importActor(portal: PortalKey) {
  return portal === "provider"
    ? { actor: "Dr. Elise Harrington", role: "Provider" }
    : { actor: PRACTICE.manager.name, role: "Clinic manager" }
}

export function countOf(record: ImportRecord, ...results: ImportResult[]) {
  return record.rows.filter((r) => results.includes(r.result)).length
}

/* Sample uploads; fictional people only. */
type SeedRow = [
  name: string,
  detail: string,
  result: ImportResult,
  note?: string,
]

const NOTE: Record<ImportResult, string> = {
  new: "Added",
  duplicate: "Not added",
  "on-file": "Matches an existing record. Record kept.",
  reactivated: "Record reactivated with fresh consent.",
  review: "Close match held for review.",
  error: "Not added",
}

const PATIENT_COLUMNS = [
  "First name",
  "Last name",
  "Date of birth",
  "Sex at birth",
  "Email",
  "Mobile number",
  "Location",
  "Primary provider",
  "Employer",
]

const PROVIDER_COLUMNS = [
  "First name",
  "Last name",
  "Credential",
  "NPI",
  "Email",
  "Mobile number",
  "Role",
  "Specialty",
  "Locations",
]

const SEXES = ["Female", "Male"]
const EMPLOYERS = ["", "Pacific Shoreline Bank", ""]

/* The seed keeps each row as name and detail; the cells are spelled out
   from them so the sheet reads as uploaded. */
function cellsFor(
  list: string,
  name: string,
  detail: string,
  i: number,
  provider: string
): Record<string, string> {
  const [first, ...rest] = name.replace(/,.*$/, "").split(" ")
  const [a, b] = detail.split(" | ")
  const phone = `(858)-555-01${String(20 + i).padStart(2, "0")}`
  if (list === "patients")
    return {
      "First name": first,
      "Last name": rest.join(" "),
      "Date of birth": a,
      "Sex at birth": SEXES[i % 2],
      Email: b,
      "Mobile number": i % 3 === 2 ? "" : phone,
      Location: "La Jolla",
      "Primary provider": provider,
      Employer: EMPLOYERS[i % 3],
    }
  return {
    "First name": first,
    "Last name": rest.join(" "),
    Credential: name.split(", ")[1] ?? "",
    NPI: `19${String(40213 + i * 7919).padStart(8, "0")}`,
    Email: a,
    "Mobile number": phone,
    Role: "Physician",
    Specialty: "Internal Medicine",
    Locations: b,
  }
}

function sheet(
  list: string,
  seed: SeedRow[],
  provider = "Daniel Reyes, MD"
): Pick<ImportRecord, "list" | "columns" | "rows"> {
  return {
    list,
    columns: list === "patients" ? PATIENT_COLUMNS : PROVIDER_COLUMNS,
    rows: seed.map(([name, detail, result, note], i) => ({
      row: i + 2,
      name,
      detail,
      cells: cellsFor(list, name, detail, i, provider),
      result,
      note: note ?? NOTE[result],
    })),
  }
}

const SEED: ImportRecord[] = [
  {
    id: "IM20481",
    at: "2026-10-28T17:42:00.000Z",
    ...importActor("practice"),
    portal: "practice",
    fileName: "Harborview patients October.csv",
    ...sheet("patients", [
      ["Jordan Ellery", "07/14/1978 | jordan.ellery@example.com", "new"],
      ["Renata Solis", "02/03/1985 | renata.solis@example.com", "new"],
      ["Curtis Vale", "11/22/1969 | curtis.vale@example.com", "new"],
      ["Mina Park", "05/30/1991 | mina.park@example.com", "new"],
      ["Hannah Brooks", "09/12/1974 | hannah.brooks@example.com", "on-file"],
      ["Walter Chen", "01/08/1958 | walter.chen@example.com", "reactivated"],
      [
        "Grace Lindqvst",
        "03/19/1982 | grace.l@example.com",
        "review",
        "Name and date of birth close to Grace Lindqvist (P10444).",
      ],
      [
        "Owen Tate",
        "08/04/1979 | owen.tate@example.com",
        "duplicate",
        "Repeats row 3. Not added.",
      ],
      [
        "Lena Marsh",
        "04/27/2031 | lena.marsh@example.com",
        "error",
        "Date of birth is in the future.",
      ],
      [
        "Felix Ward",
        "12/01/1988 | felix.ward@example",
        "error",
        "Email isn't valid.",
      ],
      ["Ivy Moreno", "06/16/1993 | ivy.moreno@example.com", "new"],
      ["Samir Haddad", "10/10/1966 | samir.haddad@example.com", "new"],
    ]),
  },
  {
    id: "IM20457",
    at: "2026-10-26T21:15:00.000Z",
    ...importActor("practice"),
    portal: "practice",
    fileName: "New providers Q4.csv",
    ...sheet("providers", [
      [
        "Avery Sutherland, MD",
        "avery.sutherland@harborviewlongevity.com | Carlsbad",
        "new",
        "Invited",
      ],
      [
        "Nora Whitley, MD",
        "nora.whitley@harborviewlongevity.com | La Jolla",
        "new",
        "Invited",
      ],
      [
        "Theo Brandt, NP",
        "theo.brandt@harborviewlongevity.com | Carlsbad",
        "new",
        "Invited",
      ],
      [
        "Daniel Reyes, MD",
        "daniel.reyes@harborviewlongevity.com | Carlsbad",
        "duplicate",
        "A provider with this NPI already exists.",
      ],
      [
        "Priya Raman, DO",
        "priya.raman@harborviewlongevity.com | Encinitas",
        "error",
        'Location "Encinitas" doesn\'t exist.',
      ],
      [
        "Marco Ruiz, PA",
        "marco.ruiz@harborviewlongevity.com | La Jolla",
        "error",
        "NPI isn't a valid 10-digit NPI.",
      ],
    ]),
  },
  {
    id: "IM20433",
    at: "2026-10-23T16:05:00.000Z",
    ...importActor("provider"),
    portal: "provider",
    fileName: "Dr Harrington panel.xlsx",
    ...sheet(
      "patients",
      [
        ["Clara Benton", "02/11/1971 | clara.benton@example.com", "new"],
        ["Rafael Ortega", "07/25/1964 | rafael.ortega@example.com", "new"],
        ["Marcus Hale", "05/02/1968 | marcus.hale@example.com", "on-file"],
        [
          "Priya Natarajan",
          "09/09/1980 | priya.n@example.com",
          "review",
          "Name and date of birth match Priya Natarajan (P10422).",
        ],
        ["June Abara", "03/14/1990 | june.abara@example.com", "new"],
      ],
      "Elise Harrington, MD"
    ),
  },
  {
    id: "IM20402",
    at: "2026-10-20T18:30:00.000Z",
    ...importActor("practice"),
    portal: "practice",
    fileName: "La Jolla providers.xlsx",
    ...sheet("providers", [
      [
        "Elise Harrington, MD",
        "elise.harrington@harborviewlongevity.com | La Jolla",
        "new",
        "Invited",
      ],
      [
        "Kenji Mori, MD",
        "kenji.mori@harborviewlongevity.com | La Jolla",
        "new",
        "Invited",
      ],
      [
        "Kenji Mori, MD",
        "kenji.mori@harborviewlongevity.com | La Jolla",
        "duplicate",
        "Repeats row 3.",
      ],
    ]),
  },
]

export const importHistory = createCollection("hol-import-history", SEED, "1")

export function recordImport(
  record: Omit<ImportRecord, "id" | "at" | "actor" | "role">
) {
  importHistory.add([
    {
      id: nextId("IM", importHistory.get()),
      at: new Date().toISOString(),
      ...importActor(record.portal),
      ...record,
    },
  ])
}
