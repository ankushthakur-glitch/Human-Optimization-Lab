"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  type ChartDocument,
  type Encounter,
  type HealthRecord,
  type LabReport,
  SOURCES,
  bmiOf,
  heightLabel,
} from "@/components/practice/health-record"
import {
  type Patient,
  ageFrom,
  fullName,
  personAddress,
  usDate,
} from "@/components/practice/practice-data"
import type { LabOrder } from "@/components/provider/chart-lab-orders"

/* What the sources actually send, drawn as the documents a provider would
   print: a lab's patient report, the clinic's signed progress note, a C-CDA
   summary and imaging and endoscopy reports with their pictures. Paper stays
   white in dark mode, as a PDF would. Letterheads use a plain monogram, not
   any organization's real logo. Sample content only. */

/* -------------------------------------------------------------------------- */
/*  Who sent it                                                                */
/* -------------------------------------------------------------------------- */

type Org = {
  name: string
  unit: string
  address: string
  phone: string
  fax?: string
  mark: string
  tone: string
}

const CLINIC: Org = {
  name: "Harborview Longevity Clinic",
  unit: "Internal and longevity medicine",
  address: "4150 Regents Park Row, Suite 210, La Jolla, CA 92037",
  phone: "(858) 555-0140",
  fax: "(858) 555-0141",
  mark: "HL",
  tone: "#0f766e",
}

const ORGS: Record<string, Org> = {
  "SRC-EPIC": {
    name: "Scripps Health",
    unit: "Scripps Clinic Torrey Pines",
    address: "10820 Torrey Pines Court, La Jolla, CA 92037",
    phone: "(858) 555-0190",
    fax: "(858) 555-0191",
    mark: "SH",
    tone: "#1e3a8a",
  },
  "SRC-QUEST": {
    name: "Quest Diagnostics",
    unit: "Carlsbad patient service center",
    address: "2380 Faraday Avenue, Carlsbad, CA 92008",
    phone: "(760) 555-0120",
    mark: "QD",
    tone: "#166534",
  },
  "SRC-LABCORP": {
    name: "Labcorp",
    unit: "San Diego regional laboratory",
    address: "13112 Evening Creek Drive S, San Diego, CA 92128",
    phone: "(858) 555-0175",
    mark: "LC",
    tone: "#5b21b6",
  },
  "SRC-IMG": {
    name: "Coastal Imaging Center",
    unit: "Breast and cardiac imaging",
    address: "3900 Fifth Avenue, Suite 120, San Diego, CA 92103",
    phone: "(619) 555-0160",
    fax: "(619) 555-0161",
    mark: "CI",
    tone: "#9a3412",
  },
  "SRC-UCSD": {
    name: "UC San Diego Health",
    unit: "Hillcrest Medical Center, Emergency Department",
    address: "200 W Arbor Drive, San Diego, CA 92103",
    phone: "(619) 555-0130",
    fax: "(619) 555-0131",
    mark: "UC",
    tone: "#1d4ed8",
  },
  "SRC-HFH": {
    name: "Henry Ford Health",
    unit: "Henry Ford Hospital",
    address: "2799 W Grand Boulevard, Detroit, MI 48202",
    phone: "(313) 555-0110",
    mark: "HF",
    tone: "#0c4a6e",
  },
}

const LAB_SITE: Record<
  string,
  { code: string; director: string; clia: string }
> = {
  "SRC-QUEST": {
    code: "QCB",
    director: "Anita Kerr, MD, PhD",
    clia: "05D0987612",
  },
  "SRC-LABCORP": {
    code: "LSD",
    director: "Paul Whitaker, MD",
    clia: "05D0765431",
  },
}

const orgOf = (sourceId: string) => ORGS[sourceId] ?? CLINIC

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000)
    .toISOString()
    .slice(0, 10)
}

/* -------------------------------------------------------------------------- */
/*  Paper pieces                                                               */
/* -------------------------------------------------------------------------- */

/** One sheet of letter paper on the grey canvas. */
export function Paper({
  children,
  footer,
}: {
  children: React.ReactNode
  footer: string
}) {
  return (
    <article className="mx-auto flex w-full max-w-[816px] flex-col bg-white px-6 py-8 text-[12.5px] leading-[1.5] text-neutral-900 shadow-[0_1px_4px_rgb(0_0_0/0.12)] ring-1 ring-black/5 sm:px-12 sm:py-10 print:shadow-none print:ring-0">
      <div className="flex flex-col gap-5">{children}</div>
      <footer className="mt-8 flex flex-wrap justify-between gap-2 border-t border-neutral-200 pt-2 text-[10.5px] text-neutral-500">
        <span>{footer}</span>
        <span>Page 1 of 1</span>
      </footer>
    </article>
  )
}

function Monogram({ org, size = 44 }: { org: Org; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      aria-hidden
      className="shrink-0"
    >
      <rect width="44" height="44" rx="9" fill={org.tone} />
      <text
        x="22"
        y="27.5"
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill="white"
      >
        {org.mark}
      </text>
    </svg>
  )
}

function Letterhead({
  org,
  title,
  meta,
}: {
  org: Org
  title: string
  meta?: React.ReactNode
}) {
  return (
    <header
      className="flex flex-wrap items-start justify-between gap-4 border-b-2 pb-4"
      style={{ borderColor: org.tone }}
    >
      <div className="flex items-center gap-3">
        <Monogram org={org} />
        <div className="flex flex-col">
          <span className="text-[17px] font-bold" style={{ color: org.tone }}>
            {org.name}
          </span>
          <span className="text-[11px] text-neutral-600">{org.unit}</span>
          <span className="text-[11px] text-neutral-600">{org.address}</span>
          <span className="text-[11px] text-neutral-600">
            Tel {org.phone}
            {org.fax ? `  |  Fax ${org.fax}` : ""}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 text-right">
        <span className="text-[15px] font-semibold">{title}</span>
        {meta}
      </div>
    </header>
  )
}

/** A Code 128 look-alike drawn from the accession, for the specimen label. */
function Barcode({ value }: { value: string }) {
  const bars: { x: number; w: number }[] = []
  let x = 0
  for (const ch of `*${value}*`) {
    const code = ch.charCodeAt(0)
    for (let i = 0; i < 6; i++) {
      const w = ((code >> i) & 1) + 1
      if (i % 2 === 0) bars.push({ x, w })
      x += w + 0.6
    }
  }
  return (
    <svg
      viewBox={`0 0 ${x} 20`}
      preserveAspectRatio="none"
      className="h-7 w-40"
      aria-hidden
    >
      {bars.map((b, i) => (
        <rect key={i} x={b.x} width={b.w} height="20" fill="#111" />
      ))}
    </svg>
  )
}

function Box({
  title,
  children,
  className,
}: {
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("border border-neutral-300", className)}>
      {title && (
        <div className="border-b border-neutral-300 bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold">
          {title}
        </div>
      )}
      <div className="px-2.5 py-2">{children}</div>
    </div>
  )
}

function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
      {rows.map(([k, v]) => (
        <React.Fragment key={k}>
          <dt className="text-neutral-500">{k}</dt>
          <dd className="font-medium">{v || "Not recorded"}</dd>
        </React.Fragment>
      ))}
    </dl>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-neutral-300 pb-1 text-[12.5px] font-bold text-neutral-800">
      {children}
    </h3>
  )
}

function Part({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <Heading>{title}</Heading>
      <div>{children}</div>
    </section>
  )
}

function Grid({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-neutral-100">
            {head.map((h) => (
              <th
                key={h}
                className="border border-neutral-300 px-2 py-1 text-[11px] font-semibold"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td
                  key={j}
                  className="border border-neutral-300 px-2 py-1 align-top"
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Signature({
  name,
  credential,
  when,
}: {
  name: string
  credential: string
  when: string
}) {
  const plain = name.replace(/^Dr\. /, "")
  return (
    <div className="mt-2 flex flex-col gap-0.5">
      <span
        className="text-[26px] leading-none text-[#1e3a8a]"
        style={{
          fontFamily:
            '"Snell Roundhand", "Brush Script MT", "Segoe Script", cursive',
        }}
      >
        {plain}
      </span>
      <span className="w-64 border-t border-neutral-400 pt-1 text-[11px] text-neutral-600">
        Electronically signed by {plain}, {credential} on {when}
      </span>
    </div>
  )
}

function Figure({
  src,
  caption,
  className,
}: {
  src: string
  caption: string
  className?: string
}) {
  return (
    <figure className="flex flex-col gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element -- static sample scans */}
      <img
        src={src}
        alt={caption}
        className={cn("w-full border border-neutral-300 bg-black", className)}
      />
      <figcaption className="text-[10.5px] text-neutral-500">
        {caption}
      </figcaption>
    </figure>
  )
}

function PatientBox({
  p,
  extra = [],
}: {
  p: Patient
  extra?: [string, string][]
}) {
  return (
    <Box title="Patient">
      <KV
        rows={[
          ["Name", `${p.lastName}, ${p.firstName}`],
          ["Date of birth", `${usDate(p.dob)} (${ageFrom(p.dob)} yrs)`],
          ["Sex", p.sex],
          ["Patient ID", p.id],
          ...extra,
        ]}
      />
    </Box>
  )
}

const footerFor = (sourceId: string, id: string) => {
  const s = SOURCES.find((x) => x.id === sourceId)
  return `${id}  |  Received from ${s?.name ?? ORGS[sourceId]?.name ?? sourceId} through Health Gorilla${s ? `, ${s.network}` : ""}`
}

/* -------------------------------------------------------------------------- */
/*  Lab order                                                                  */
/* -------------------------------------------------------------------------- */

/** The requisition the clinic sends the lab for an order placed in the chart. */
export function LabOrderPaper({
  patient: p,
  order: o,
  orderedOn,
}: {
  patient: Patient
  order: LabOrder
  /** The order time, already formatted. */
  orderedOn: string
}) {
  return (
    <Paper footer={`${o.id}  |  Ordered from the ${CLINIC.name} chart`}>
      <Letterhead
        org={CLINIC}
        title="Lab requisition"
        meta={
          <>
            <Barcode value={o.id} />
            <span className="text-[11px] text-neutral-600">Order {o.id}</span>
            <span
              className={cn(
                "text-[11px] font-semibold",
                o.status === "Cancelled" ? "text-neutral-500" : "text-sky-700"
              )}
            >
              {o.status}
            </span>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <PatientBox p={p} extra={[["Phone", p.phone]]} />
        <Box title="Collection">
          <KV
            rows={[
              ["Lab", o.lab],
              ["Collect on", usDate(o.collectOn)],
              ["Priority", o.priority],
              ["Fasting", o.fasting ? "Yes" : "No"],
            ]}
          />
        </Box>
        <Box title="Ordering provider">
          <KV
            rows={[
              ["Provider", o.orderedBy],
              ["Practice", CLINIC.name],
              ["Ordered", orderedOn],
              ["Address", CLINIC.address],
            ]}
          />
        </Box>
      </div>

      <Part title="Tests ordered">
        <Grid
          head={["#", "Test", "Facility", "Diagnosis"]}
          rows={o.items.map((t, i) => [i + 1, t.name, t.facility, o.diagnosis || "Not given"])}
        />
      </Part>

      {o.note && (
        <Part title="Note to lab">
          <p>{o.note}</p>
        </Part>
      )}

      <Signature name={o.orderedBy} credential="MD" when={orderedOn} />
    </Paper>
  )
}

/* -------------------------------------------------------------------------- */
/*  Lab report                                                                 */
/* -------------------------------------------------------------------------- */

function refRange(range: string, unit: string) {
  if (!range) return ""
  if (range.startsWith("Below ")) return `<${range.slice(6)} ${unit}`
  if (range.startsWith("Above ")) return `>${range.slice(6)} ${unit}`
  return `${range} ${unit}`
}

/* A printed cumulative chart: each draw as a point, the reference range
   as a shaded band, the latest value labelled. */
function TrendChart({ result: x }: { result: LabReport["results"][number] }) {
  const w = 200
  const h = 84
  const pad = 14
  const [lo, hi] = x.range.includes("-")
    ? x.range.split("-").map(Number)
    : x.range.startsWith("Below ")
      ? [undefined, Number(x.range.slice(6))]
      : x.range.startsWith("Above ")
        ? [Number(x.range.slice(6)), undefined]
        : [undefined, undefined]
  const values = x.history
  const all = [
    ...values,
    ...(lo != null ? [lo] : []),
    ...(hi != null ? [hi] : []),
  ]
  const min = Math.min(...all)
  const max = Math.max(...all)
  const span = max - min || 1
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2)
  const xAt = (i: number) => pad + (i / (values.length - 1)) * (w - pad * 2)
  const band = {
    top: hi != null ? y(hi) : pad / 2,
    bottom: lo != null ? y(lo) : h - pad / 2,
  }
  return (
    <figure className="flex flex-col gap-1 border border-neutral-300 p-2">
      <figcaption className="flex justify-between text-[11px]">
        <span className="font-semibold">{x.name}</span>
        <span className="text-neutral-500">{x.unit}</span>
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-hidden>
        <rect
          x={pad}
          y={band.top}
          width={w - pad * 2}
          height={Math.max(band.bottom - band.top, 1)}
          fill="#dcfce7"
        />
        <polyline
          points={values.map((v, i) => `${xAt(i)},${y(v)}`).join(" ")}
          fill="none"
          stroke="#334155"
          strokeWidth="1.5"
        />
        {values.map((v, i) => (
          <circle
            key={i}
            cx={xAt(i)}
            cy={y(v)}
            r="2.5"
            fill={
              (hi != null && v > hi) || (lo != null && v < lo)
                ? "#b91c1c"
                : "#334155"
            }
          />
        ))}
        <text
          x={xAt(values.length - 1)}
          y={y(values[values.length - 1]) - 5}
          textAnchor="end"
          fontSize="10"
          fill="#111"
        >
          {values[values.length - 1]}
        </text>
      </svg>
    </figure>
  )
}

/** A lab's patient report: every panel drawn from one specimen. */
export function LabReportPaper({
  patient: p,
  reports,
}: {
  patient: Patient
  reports: LabReport[]
}) {
  const first = reports[0]
  const org = orgOf(first.sourceId)
  const site = LAB_SITE[first.sourceId]
  const flagged = reports.flatMap((r) => r.results).filter((x) => x.flag)
  const a1c = reports
    .flatMap((r) => r.results)
    .find((x) => x.name === "Hemoglobin A1C")

  return (
    <Paper footer={footerFor(first.sourceId, first.accession)}>
      <Letterhead
        org={org}
        title="Patient report"
        meta={
          <>
            <Barcode value={first.accession} />
            <span className="text-[11px] text-neutral-600">
              Specimen {first.accession}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">
              Final report
            </span>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <PatientBox p={p} extra={[["Phone", p.phone]]} />
        <Box title="Specimen">
          <KV
            rows={[
              ["Collected", `${usDate(first.date)} 7:42 AM`],
              ["Received", `${usDate(first.date)} 11:10 AM`],
              ["Reported", `${usDate(addDays(first.date, 1))} 6:05 AM`],
              ["Fasting", "Yes"],
              ["Type", "Serum, whole blood"],
            ]}
          />
        </Box>
        <Box title="Ordering provider">
          <KV
            rows={[
              ["Provider", first.orderedBy],
              ["Practice", CLINIC.name],
              ["Client no.", "954150"],
              ["Address", CLINIC.address],
            ]}
          />
        </Box>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-y-2 border-neutral-800 text-[11px]">
              <th className="py-1 pr-2 font-semibold">Test name</th>
              <th className="py-1 pr-2 font-semibold">In range</th>
              <th className="py-1 pr-2 font-semibold">Out of range</th>
              <th className="py-1 pr-2 font-semibold">Reference range</th>
              <th className="py-1 pr-2 font-semibold">Previous</th>
              <th className="py-1 font-semibold">Lab</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <React.Fragment key={r.id}>
                <tr>
                  <td colSpan={6} className="pt-3 pb-1 font-bold">
                    {r.name}
                  </td>
                </tr>
                {r.results.map((x) => (
                  <tr
                    key={x.name}
                    className="border-b border-dotted border-neutral-300"
                  >
                    <td className="py-1 pr-2 pl-3">{x.name}</td>
                    <td className="py-1 pr-2 tabular-nums">
                      {x.flag ? "" : x.value}
                    </td>
                    <td className="py-1 pr-2 font-bold text-red-700 tabular-nums">
                      {x.flag
                        ? `${x.value} ${x.flag === "High" ? "H" : "L"}`
                        : ""}
                    </td>
                    <td className="py-1 pr-2 text-neutral-700 tabular-nums">
                      {refRange(x.range, x.unit)}
                    </td>
                    <td className="py-1 pr-2 text-neutral-600 tabular-nums">
                      {x.previous
                        ? `${x.previous.value} (${usDate(x.previous.date)})`
                        : "None"}
                    </td>
                    <td className="py-1 text-neutral-600">{site?.code}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {reports.some((r) => r.results.some((x) => x.history.length > 1)) && (
        <section className="flex flex-col gap-1.5">
          <Heading>Cumulative trend</Heading>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {reports
              .flatMap((r) => r.results)
              .filter((x) => x.history.length > 1)
              .map((x) => (
                <TrendChart key={x.name} result={x} />
              ))}
          </div>
        </section>
      )}

      {(a1c || flagged.length > 0) && (
        <Box title="Comments">
          <div className="flex flex-col gap-1">
            {flagged.length > 0 && (
              <p>
                H = above the reference range, L = below. {flagged.length}{" "}
                {flagged.length === 1 ? "result is" : "results are"} outside the
                reference range.
              </p>
            )}
            {a1c && (
              <p>
                Hemoglobin A1C: below 5.7% is consistent with the absence of
                diabetes; 5.7-6.4% is consistent with increased risk
                (prediabetes); 6.5% or above is consistent with diabetes.
              </p>
            )}
          </div>
        </Box>
      )}

      {site && (
        <p className="text-[11px] text-neutral-600">
          Performing site {site.code}: {org.name}, {org.address}. Laboratory
          director {site.director}. CLIA {site.clia}.
        </p>
      )}
    </Paper>
  )
}

/* -------------------------------------------------------------------------- */
/*  Any other report                                                           */
/* -------------------------------------------------------------------------- */

/** A source's report that has no layout of its own (an ECG, a sleep study,
    an order requisition, a medication history): the letterhead, the patient
    and one facts box, an optional table, the report's sections and its
    signature. */
export function ReportPaper({
  patient: p,
  sourceId,
  title,
  id,
  date,
  box,
  table,
  sections,
  signer,
}: {
  patient: Patient
  sourceId: string
  title: string
  id: string
  date: string
  box: { title: string; rows: [string, string][] }
  table?: { title: string; head: string[]; rows: string[][] }
  sections: { heading: string; text: string }[]
  signer?: { name: string; credential: string }
}) {
  return (
    <Paper footer={footerFor(sourceId, id)}>
      <Letterhead
        org={orgOf(sourceId)}
        title={title}
        meta={
          <>
            <Barcode value={id} />
            <span className="text-[11px] text-neutral-600">
              {id}  |  {usDate(date)}
            </span>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <PatientBox p={p} />
        <Box title={box.title}>
          <KV rows={box.rows} />
        </Box>
      </div>
      {table && (
        <Part title={table.title}>
          <Grid head={table.head} rows={table.rows} />
        </Part>
      )}
      {sections.map((s) => (
        <Part key={s.heading} title={s.heading}>
          {s.text}
        </Part>
      ))}
      {signer && <Signature name={signer.name} credential={signer.credential} when={usDate(date)} />}
    </Paper>
  )
}

/* -------------------------------------------------------------------------- */
/*  Encounter                                                                  */
/* -------------------------------------------------------------------------- */

/** The clinic's progress note for a visit, or a short summary for a lab or
    imaging stop that sent no note. */
export function EncounterPaper({
  patient: p,
  record,
  e,
}: {
  patient: Patient
  record: HealthRecord
  e: Encounter
}) {
  const clinic = e.sourceId === "SRC-EPIC" ? CLINIC : orgOf(e.sourceId)
  const vitals =
    e.kind === "In person"
      ? record.vitals.find((v) => v.date === e.date)
      : undefined
  const diagnoses = e.diagnoses
    .map((code) => record.conditions.find((c) => c.code === code))
    .filter((c) => c != null)
  const meds = record.medications.filter(
    (m) => m.started <= e.date && (!m.ended || m.ended >= e.date)
  )

  return (
    <Paper footer={footerFor(e.sourceId, e.id)}>
      <Letterhead
        org={clinic}
        title={e.note ? "Progress note" : "Encounter summary"}
        meta={
          <span className="text-[11px] text-neutral-600">Encounter {e.id}</span>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <PatientBox p={p} />
        <Box title="Visit">
          <KV
            rows={[
              ["Date of service", `${usDate(e.date)}, ${e.start} to ${e.end}`],
              ["Visit type", `${e.kind}, ${e.type}`],
              ["Provider", e.clinician],
              ["Location", e.where],
            ]}
          />
        </Box>
      </div>

      <Part title="Reason for visit">{e.reason}.</Part>

      {e.note ? (
        <>
          <Part title="Chief complaint">{e.note.chiefComplaint}</Part>
          <Part title="History of present illness">{e.note.hpi}</Part>
          <Part title="Current medications">
            {meds.length ? (
              <ul className="list-disc pl-5">
                {meds.map((m) => (
                  <li key={m.id}>
                    {m.name}, {m.route.toLowerCase()},{" "}
                    {m.frequency.toLowerCase()}
                    {m.timing !== "With food"
                      ? `, ${m.timing.toLowerCase()}`
                      : ", with food"}
                  </li>
                ))}
              </ul>
            ) : (
              "None"
            )}
          </Part>
          <Part title="Allergies">
            {record.allergies.length
              ? record.allergies
                  .map((a) => `${a.substance} (${a.reaction.toLowerCase()})`)
                  .join("; ")
              : "No known allergies"}
          </Part>
          {vitals && (
            <Part title="Vital signs">
              <Grid
                head={[
                  "BP",
                  "Pulse",
                  "SpO2",
                  "Temp",
                  "Height",
                  "Weight",
                  "BMI",
                ]}
                rows={[
                  [
                    `${vitals.systolic}/${vitals.diastolic} mmHg`,
                    `${vitals.heartRate} bpm`,
                    `${vitals.spo2}%`,
                    `${vitals.tempF}°F`,
                    heightLabel(vitals.heightIn),
                    `${vitals.weightLb} lb`,
                    `${bmiOf(vitals)} kg/m²`,
                  ],
                ]}
              />
            </Part>
          )}
          <Part title="Assessment">
            <p>{e.note.assessment}</p>
            {diagnoses.length > 0 && (
              <ol className="mt-1 list-decimal pl-5">
                {diagnoses.map((c) => (
                  <li key={c.id}>
                    {c.name} ({c.code})
                  </li>
                ))}
              </ol>
            )}
          </Part>
          <Part title="Plan">{e.note.plan}</Part>
          <Signature
            name={e.clinician}
            credential="MD"
            when={`${usDate(e.date)} at ${e.end}`}
          />
        </>
      ) : (
        <Part title="Notes">
          {e.kind === "Lab"
            ? "Venous blood drawn from the left arm after a 12 hour fast. Specimen sent for the ordered panels. Results follow in a separate lab report."
            : "Study completed without complication. The radiologist's report follows as a separate document."}
        </Part>
      )}
    </Paper>
  )
}

/* -------------------------------------------------------------------------- */
/*  Documents                                                                  */
/* -------------------------------------------------------------------------- */

export function DocumentPaper({
  patient,
  record,
  d,
}: {
  patient: Patient
  record: HealthRecord
  d: ChartDocument
}) {
  if (d.kind === "lab") {
    const reports = record.labReports.filter(
      (r) => r.date === addDays(d.date, -1) && r.sourceId === d.sourceId
    )
    if (reports.length)
      return <LabReportPaper patient={patient} reports={reports} />
  }
  if (d.kind === "visit-summary" || d.kind === "ccd") {
    return <CcdPaper patient={patient} record={record} d={d} />
  }
  if (d.kind === "upload") return <UploadPaper patient={patient} d={d} />
  if (d.kind === "imaging") return <ImagingPaper patient={patient} d={d} />
  if (d.kind === "colonoscopy")
    return <ColonoscopyPaper patient={patient} d={d} />
  return <GenericPaper patient={patient} d={d} />
}

/* A C-CDA as an EHR renders it: document header table, then coded
   sections. The continuity of care document carries the whole record; a
   visit summary carries that visit. */
function CcdPaper({
  patient: p,
  record,
  d,
}: {
  patient: Patient
  record: HealthRecord
  d: ChartDocument
}) {
  const org = orgOf(d.sourceId)
  const full = d.kind === "ccd"
  const e = record.encounters.find((x) => x.id === d.encounterId)
  const latestLabs = record.labReports.filter(
    (r) => r.date === record.labReports[0]?.date
  )
  const vitals = e ? record.vitals.find((v) => v.date === e.date) : undefined

  return (
    <Paper footer={footerFor(d.sourceId, `${d.id}  |  HL7 C-CDA R2.1`)}>
      <Letterhead
        org={org}
        title={full ? "Continuity of Care Document" : "Clinical summary"}
        meta={
          <span className="text-[11px] text-neutral-600">
            Created {usDate(d.date)}
          </span>
        }
      />
      <Grid
        head={["Patient", "Document"]}
        rows={[
          [
            <KV
              key="p"
              rows={[
                ["Name", fullName(p)],
                ["Date of birth", usDate(p.dob)],
                ["Sex", p.sex],
                ["Language", p.languages.join(", ")],
                ["Address", personAddress(p)],
                ["Patient ID", p.id],
              ]}
            />,
            <KV
              key="d"
              rows={[
                ["Author", d.author],
                ["Custodian", org.name],
                ["Encounter", e ? `${usDate(e.date)}, ${e.type}` : ""],
                ["Location", e?.where ?? ""],
                ["Document ID", `${d.id}-${p.id}`],
              ]}
            />,
          ],
        ]}
      />

      {d.sections
        .filter((s) => s.heading !== "Assessment" && s.heading !== "Plan")
        .map((s) => (
          <Part key={s.heading} title={s.heading}>
            {s.text}
          </Part>
        ))}

      {(full || vitals) && vitals && (
        <Part title="Vital signs">
          <Grid
            head={["Date", "BP", "Pulse", "SpO2", "Temp", "Weight", "BMI"]}
            rows={[
              [
                usDate(vitals.date),
                `${vitals.systolic}/${vitals.diastolic} mmHg`,
                `${vitals.heartRate} bpm`,
                `${vitals.spo2}%`,
                `${vitals.tempF}°F`,
                `${vitals.weightLb} lb`,
                `${bmiOf(vitals)}`,
              ],
            ]}
          />
        </Part>
      )}

      <Part title="Problems">
        <Grid
          head={["Problem", "Code (ICD-10)", "Status", "Onset"]}
          rows={record.conditions
            .filter((c) => full || c.status === "Active")
            .map((c) => [c.name, c.code, c.status, usDate(c.onset)])}
        />
      </Part>

      <Part title="Allergies and adverse reactions">
        <Grid
          head={["Substance", "Reaction", "Severity", "Status"]}
          rows={record.allergies.map((a) => [
            a.substance,
            a.reaction,
            a.severity,
            "Active",
          ])}
        />
      </Part>

      <Part title="Medications">
        <Grid
          head={["Medication", "Directions", "Start", "Status"]}
          rows={record.medications
            .filter((m) => full || !m.ended)
            .map((m) => [
              m.name,
              `${m.route}, ${m.frequency.toLowerCase()}, ${m.timing.toLowerCase()}`,
              usDate(m.started),
              m.ended ? "Completed" : "Active",
            ])}
        />
      </Part>

      {full && (
        <>
          <Part title="Results">
            <Grid
              head={["Test", "Result", "Reference range", "Date"]}
              rows={latestLabs.flatMap((r) =>
                r.results.map((x) => [
                  x.name,
                  <span
                    key="v"
                    className={cn(x.flag && "font-bold text-red-700")}
                  >
                    {x.value} {x.unit}
                    {x.flag ? ` (${x.flag})` : ""}
                  </span>,
                  refRange(x.range, x.unit),
                  usDate(r.date),
                ])
              )}
            />
          </Part>
          <Part title="Immunizations">
            <Grid
              head={["Vaccine", "Date", "Status"]}
              rows={record.immunizations.map((v) => [
                `${v.vaccine}, ${v.dose}`,
                v.date ? usDate(v.date) : "",
                v.status === "Refused" ? "Declined by patient" : v.status,
              ])}
            />
          </Part>
          <Part title="Procedures">
            <Grid
              head={["Procedure", "Date", "Performer"]}
              rows={record.procedures.map((x) => [
                x.name,
                usDate(x.date),
                `${x.performer}, ${x.where}`,
              ])}
            />
          </Part>
        </>
      )}

      {d.sections
        .filter((s) => s.heading === "Assessment" || s.heading === "Plan")
        .map((s) => (
          <Part
            key={s.heading}
            title={s.heading === "Plan" ? "Plan of treatment" : s.heading}
          >
            {s.text}
          </Part>
        ))}

      {d.author.startsWith("Dr.") && (
        <Signature name={d.author} credential="MD" when={usDate(d.date)} />
      )}
    </Paper>
  )
}

type ImagingSpec = {
  exam: string
  cpt: string
  history: string
  technique: string
  comparison: string
  images: { src: string; caption: string; className: string }[]
  findings: React.ReactNode
  impression: string
  extra?: React.ReactNode
  dose?: string
  technologist: string
}

function imagingSpec(
  study: ChartDocument["study"],
  impression: string
): ImagingSpec {
  switch (study) {
    case "calcium":
      return {
        exam: "CT cardiac calcium scoring",
        cpt: "75571",
        history:
          "Cardiovascular risk assessment. Hyperlipidemia on statin therapy.",
        technique:
          "Non-contrast, prospectively ECG-gated axial CT of the heart at 3 mm slice thickness, 120 kVp.",
        comparison: "None.",
        images: [
          {
            src: "/chart/coronary-ct.jpg",
            caption: "Coronary arteries, 3D reconstruction",
            className: "aspect-[4/3] object-cover",
          },
          {
            src: "/chart/agatston.png",
            caption: "Axial slices with calcium scoring overlay",
            className: "aspect-[4/3] object-cover object-top",
          },
        ],
        findings: (
          <Grid
            head={["Artery", "Lesions", "Volume (mm³)", "Agatston score"]}
            rows={[
              ["Left main", "0", "0", "0"],
              ["Left anterior descending", "0", "0", "0"],
              ["Left circumflex", "0", "0", "0"],
              ["Right coronary", "0", "0", "0"],
              [<b key="t">Total</b>, "0", "0", <b key="s">0</b>],
            ]}
          />
        ),
        extra: (
          <Part title="Risk category">
            <Grid
              head={["Score", "Category", "This patient"]}
              rows={[
                ["0", "No identifiable plaque", "Yes"],
                ["1-99", "Mild", ""],
                ["100-399", "Moderate", ""],
                ["400 or above", "Extensive", ""],
              ]}
            />
            <p className="mt-1">Percentile for age, sex and race (MESA): 0.</p>
          </Part>
        ),
        impression,
        dose: "CTDIvol 2.1 mGy, DLP 38 mGy·cm",
        technologist: "Lauren Pierce, RT(R)(CT)",
      }
    case "dexa":
      return {
        exam: "DEXA bone density, lumbar spine and both hips",
        cpt: "77080",
        history:
          "Baseline bone density. Perimenopausal. Vitamin D deficiency, treated.",
        technique:
          "Dual-energy X-ray absorptiometry of L1-L4 and both proximal femurs on a Hologic Horizon A scanner.",
        comparison: "None.",
        images: [
          {
            src: "/chart/dxa-spine.png",
            caption: "Lumbar spine, L1-L4 regions of interest",
            className: "aspect-[3/4] object-cover",
          },
          {
            src: "/chart/dxa-hip.jpg",
            caption: "Right proximal femur, neck region",
            className: "aspect-[3/4] bg-white! object-contain",
          },
        ],
        findings: (
          <Grid
            head={["Region", "BMD (g/cm²)", "T-score", "Z-score", "WHO class"]}
            rows={[
              ["Lumbar spine L1-L4", "0.911", "-1.6", "-1.1", "Osteopenia"],
              ["Left femoral neck", "0.742", "-0.9", "-0.4", "Normal"],
              ["Left total hip", "0.884", "-0.7", "-0.3", "Normal"],
              ["Right femoral neck", "0.751", "-0.8", "-0.3", "Normal"],
              ["Right total hip", "0.890", "-0.6", "-0.2", "Normal"],
            ]}
          />
        ),
        extra: (
          <Part title="FRAX 10 year fracture probability">
            <Grid
              head={["Major osteoporotic fracture", "Hip fracture"]}
              rows={[["6.1%", "0.4%"]]}
            />
            <p className="mt-1">
              WHO criteria: T-score -1.0 or above is normal, between -1.0 and
              -2.5 is osteopenia, -2.5 or below is osteoporosis.
            </p>
          </Part>
        ),
        impression,
        technologist: "Grace Kim, RT(R)(BD)",
      }
    case "chest":
      return {
        exam: "Chest X-ray, PA and lateral",
        cpt: "71046",
        history:
          "Baseline imaging at establishment of care. No respiratory symptoms.",
        technique:
          "Frontal and lateral radiographs of the chest in full inspiration.",
        comparison: "None.",
        images: [
          {
            src: "/chart/chest-xray.jpg",
            caption: "PA view",
            className: "aspect-[4/5] object-cover",
          },
        ],
        findings:
          "The lungs are clear, with no focal consolidation, effusion or pneumothorax. The cardiomediastinal silhouette is normal in size. The hila are unremarkable. No acute osseous abnormality. Surgical clips in the right upper quadrant.",
        impression,
        dose: "Entrance skin dose 0.1 mGy",
        technologist: "Lauren Pierce, RT(R)",
      }
    case "ultrasound":
      return {
        exam: "Ultrasound abdomen, right upper quadrant",
        cpt: "76705",
        history: "Mildly raised ALT. Prediabetes. Prior cholecystectomy.",
        technique:
          "Real-time grayscale and color Doppler imaging of the right upper quadrant.",
        comparison: "None.",
        images: [
          {
            src: "/chart/liver-us.jpg",
            caption: "Liver, right lobe, longitudinal",
            className: "aspect-[4/3] object-cover",
          },
        ],
        findings: (
          <Grid
            head={["Structure", "Finding"]}
            rows={[
              [
                "Liver",
                "15.2 cm. Mildly increased, uniform echogenicity. No focal lesion.",
              ],
              ["Gallbladder", "Surgically absent."],
              ["Common bile duct", "4 mm, normal for post cholecystectomy."],
              ["Pancreas", "Head and body normal where seen."],
              ["Right kidney", "10.8 cm. No hydronephrosis or stones."],
              ["Portal vein", "Patent, flow toward the liver."],
            ]}
          />
        ),
        impression,
        technologist: "Maya Ortiz, RDMS",
      }
    default:
      return {
        exam: "Screening mammogram, bilateral, with tomosynthesis",
        cpt: "77067, 77063",
        history:
          "Routine annual screening. No palpable abnormality. No family history of breast cancer.",
        technique:
          "Standard craniocaudal and mediolateral oblique views of both breasts with digital breast tomosynthesis. Computer-aided detection was used.",
        comparison: "Prior screening mammograms from 12 and 24 months earlier.",
        images: [
          {
            src: "/chart/mammogram.jpg",
            caption: "Right craniocaudal view",
            className: "aspect-[3/2] object-cover",
          },
          {
            src: "/chart/mammogram.jpg",
            caption: "Left craniocaudal view",
            className: "aspect-[3/2] object-cover -scale-x-100",
          },
        ],
        findings: (
          <>
            <p>
              Breast composition: the breasts are almost entirely fatty (ACR
              density A).
            </p>
            <p className="mt-1">
              There are no masses, suspicious calcifications or areas of
              architectural distortion. Skin and nipples are normal. No axillary
              adenopathy. Stable compared with prior studies.
            </p>
          </>
        ),
        extra: (
          <Part title="BI-RADS assessment">
            <Grid
              head={["Category", "Meaning", "This study"]}
              rows={[
                ["0", "Incomplete, needs more imaging", ""],
                ["1", "Negative", "Yes"],
                ["2", "Benign", ""],
                ["3", "Probably benign", ""],
                ["4 and 5", "Suspicious, highly suggestive", ""],
              ]}
            />
          </Part>
        ),
        impression: `${impression} BI-RADS category 1: negative.`,
        dose: "Average glandular dose 1.4 mGy per view",
        technologist: "Grace Kim, RT(R)(M)",
      }
  }
}

export function ImagingPaper({
  patient: p,
  d,
}: {
  patient: Patient
  d: ChartDocument
}) {
  const org = orgOf(d.sourceId)
  const spec = imagingSpec(
    d.study,
    d.sections.find((s) => s.heading === "Impression")?.text ?? ""
  )
  const examDate = addDays(d.date, -1)
  /* A document that carries its own findings (the provider home's sample
     results) is read as written, not from the study's normal template. */
  const own = (heading: string) => d.sections.find((s) => s.heading === heading)?.text
  const findings = own("Findings")
  const recommendation = own("Recommendation")
  return (
    <Paper footer={footerFor(d.sourceId, d.id)}>
      <Letterhead
        org={org}
        title="Radiology report"
        meta={
          <>
            <Barcode value={`RAD${examDate.replaceAll("-", "")}`} />
            <span className="text-[11px] text-neutral-600">
              Accession RAD-{examDate.replaceAll("-", "").slice(2)}-0457
            </span>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <PatientBox p={p} />
        <Box title="Exam">
          <KV
            rows={[
              ["Exam", spec.exam],
              ["CPT", spec.cpt],
              ["Date", `${usDate(examDate)} 8:15 AM`],
              ["Referring", `${CLINIC.name}`],
              ["Technologist", spec.technologist],
              ["Reading", d.author],
            ]}
          />
        </Box>
      </div>
      <Part title="Clinical history">{own("Clinical history") ?? spec.history}</Part>
      <Part title="Technique">
        {spec.technique}
        {spec.dose && (
          <p className="mt-1 text-neutral-600">Dose: {spec.dose}.</p>
        )}
      </Part>
      <Part title="Comparison">{spec.comparison}</Part>
      <section className="flex flex-col gap-1.5">
        <Heading>Key images</Heading>
        <div
          className={cn(
            "grid gap-3",
            spec.images.length > 1 ? "grid-cols-2" : "max-w-sm grid-cols-1"
          )}
        >
          {spec.images.map((img) => (
            <Figure key={img.caption} {...img} />
          ))}
        </div>
      </section>
      <Part title="Findings">{findings ?? spec.findings}</Part>
      {!findings && spec.extra}
      <Part title="Impression">
        <p className="font-bold">{findings ? own("Impression") : spec.impression}</p>
      </Part>
      {recommendation && <Part title="Recommendation">{recommendation}</Part>}
      <Signature
        name={d.author}
        credential="MD, Radiology"
        when={usDate(d.date)}
      />
    </Paper>
  )
}

function ColonoscopyPaper({
  patient: p,
  d,
}: {
  patient: Patient
  d: ChartDocument
}) {
  const org = orgOf(d.sourceId)
  const text = (h: string) => d.sections.find((s) => s.heading === h)?.text
  return (
    <Paper footer={footerFor(d.sourceId, d.id)}>
      <Letterhead
        org={{ ...org, unit: "Scripps Memorial Hospital, endoscopy unit" }}
        title="Procedure report"
        meta={
          <span className="text-[11px] text-neutral-600">
            Case ENDO-{d.date.replaceAll("-", "").slice(2)}-118
          </span>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <PatientBox p={p} />
        <Box title="Procedure">
          <KV
            rows={[
              ["Procedure", text("Procedure")?.replace(/\.$/, "")],
              ["Date", usDate(d.date)],
              ["Endoscopist", d.author],
              ["Sedation", "Monitored anesthesia care, propofol"],
            ]}
          />
        </Box>
      </div>
      <Part title="Indication">Average risk colorectal cancer screening.</Part>
      <Part title="Description">
        The colonoscope was passed to the cecum, identified by the appendiceal
        orifice and ileocecal valve, and withdrawn over 11 minutes. Bowel
        preparation was good (Boston bowel preparation scale 8). The patient
        tolerated the procedure well.
      </Part>
      <Figure
        src="/chart/polypectomy.jpg"
        caption="Sigmoid polyp before, during and after snare polypectomy"
        className="aspect-[3/1] object-cover"
      />
      <Part title="Findings">{text("Findings")}</Part>
      <Part title="Pathology">{text("Pathology")}</Part>
      <Part title="Recommendation">{text("Recommendation")}</Part>
      <Signature
        name={d.author}
        credential="MD, Gastroenterology"
        when={usDate(d.date)}
      />
    </Paper>
  )
}

function GenericPaper({
  patient: p,
  d,
}: {
  patient: Patient
  d: ChartDocument
}) {
  const org = orgOf(d.sourceId)
  return (
    <Paper footer={footerFor(d.sourceId, `${d.id}  |  HL7 C-CDA R2.1`)}>
      <Letterhead
        org={{ ...org, unit: "Scripps Memorial Hospital" }}
        title={d.title}
        meta={
          <span className="text-[11px] text-neutral-600">{usDate(d.date)}</span>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <PatientBox p={p} />
        <Box title="Stay">
          <KV
            rows={[
              ["Admitted", usDate(addDays(d.date, -1))],
              ["Discharged", usDate(d.date)],
              ["Attending", d.author],
              ["Disposition", "Home, self care"],
            ]}
          />
        </Box>
      </div>
      {d.sections.map((s) => (
        <Part key={s.heading} title={s.heading}>
          {s.text}
        </Part>
      ))}
      <Signature
        name={d.author}
        credential="MD, General Surgery"
        when={usDate(d.date)}
      />
    </Paper>
  )
}

/* -------------------------------------------------------------------------- */
/*  Uploaded by the practice                                                   */
/* -------------------------------------------------------------------------- */

/* A file the practice attached: shown as it is, under a short cover with
   who added it and why. */
function UploadPaper({
  patient: p,
  d,
}: {
  patient: Patient
  d: ChartDocument
}) {
  const image = d.mime?.startsWith("image/")
  const pdf = d.mime === "application/pdf"
  return (
    <Paper footer={`${d.id}  |  Entered by practice in HOL`}>
      <Letterhead
        org={CLINIC}
        title={d.title}
        meta={
          <span className="text-[11px] text-neutral-600">
            Added {usDate(d.date)}
          </span>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <PatientBox p={p} />
        <Box title="Document">
          <KV
            rows={[
              ["Added by", d.author],
              ["Date", usDate(d.date)],
              ...d.sections
                .filter((s) => s.heading !== "Note")
                .map((s) => [s.heading, s.text] as [string, string]),
            ]}
          />
        </Box>
      </div>
      {d.sections
        .filter((s) => s.heading === "Note" || s.heading === "Impression")
        .map((s) => (
          <Part key={s.heading} title={s.heading}>
            {s.text}
          </Part>
        ))}
      {d.file && image && (
        <Figure src={d.file} caption={d.title} className="object-contain" />
      )}
      {d.file && pdf && (
        <iframe
          src={d.file}
          title={d.title}
          className="h-[70dvh] w-full border border-neutral-300"
        />
      )}
      {!d.file && <p className="text-neutral-500">No file attached.</p>}
    </Paper>
  )
}
