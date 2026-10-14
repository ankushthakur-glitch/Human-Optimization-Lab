"use client"

import * as React from "react"

import type { HealthRecord } from "@/components/practice/health-record"
import { type Patient, usDate } from "@/components/practice/practice-data"
import {
  UpdatedCells,
  UpdatedHeads,
  useRowDetails,
} from "@/components/provider/chart-details"
import {
  type Appointment,
  type EpicExtras,
  epicExtrasFor,
} from "@/components/provider/chart-epic"
import {
  RecordTable,
  SearchBox,
  Section,
  SectionBar,
  SectionBody,
  matches,
  useBarFilters,
} from "@/components/provider/chart-layout"
import { usePaged } from "@/components/table-pager"
import { Badge } from "@/design-system/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"

/* The Epic reads the Health Gorilla feed never had: the patient's
   appointments, family history, consents and care team
   (Practitioner and Location). Read only, like the rest of the chart. */

const PILL = "h-5 rounded-full px-2 text-[13px] font-normal"
const EPIC = "Scripps Health (Epic)"

export function useEpicExtras(patient: Patient, record: HealthRecord) {
  return React.useMemo(() => epicExtrasFor(patient, record), [patient, record])
}

function Empty({ cols, children }: { cols: number; children: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={cols}
        className="py-8! text-center text-muted-foreground"
      >
        {children}
      </TableCell>
    </TableRow>
  )
}

/* -------------------------------------------------------------------------- */
/*  Appointments (Appointment)                                                 */
/* -------------------------------------------------------------------------- */

const APPOINTMENT_TONE: Record<
  Appointment["status"],
  "info" | "success" | "secondary" | "destructive"
> = {
  Booked: "info",
  Fulfilled: "success",
  Cancelled: "secondary",
  "No show": "destructive",
}

export function AppointmentsView({
  extras,
  tab,
  onTab,
}: {
  extras: EpicExtras
  tab: "upcoming" | "past"
  onTab: (tab: "upcoming" | "past") => void
}) {
  const entry = useRowDetails()
  const bar = useBarFilters()
  const upcoming = extras.appointments.filter((a) => a.status === "Booked")
  const past = extras.appointments.filter((a) => a.status !== "Booked")
  const rows = (tab === "past" ? past : upcoming).filter((a) =>
    matches(bar.query, a.type, a.reason, a.practitioner, a.location)
  )
  const paged = usePaged(rows)
  return (
    <Section>
      <SectionBar
        tabs={[
          { id: "upcoming", label: `Upcoming (${upcoming.length})` },
          { id: "past", label: `Past (${past.length})` },
        ]}
        value={tab}
        onTab={(t) => onTab(t as "upcoming" | "past")}
        actions={
          <SearchBox
            value={bar.query}
            onChange={bar.setQuery}
            label="Search appointments"
          />
        }
      />
      <SectionBody className="flex flex-col pb-3">
        <RecordTable paged={paged}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date and time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="min-w-52">Reason</TableHead>
                <TableHead>Practitioner</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <UpdatedHeads />
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <Empty cols={9}>
                  {tab === "past"
                    ? "No past appointments"
                    : "No upcoming appointments"}
                </Empty>
              )}
              {paged.visible.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium tabular-nums">
                    {usDate(a.date)}, {a.time}
                  </TableCell>
                  <TableCell>{a.type}</TableCell>
                  <TableCell className="whitespace-normal">{a.reason}</TableCell>
                  <TableCell>{a.practitioner}</TableCell>
                  <TableCell>{a.location}</TableCell>
                  <TableCell>
                    <Badge variant={APPOINTMENT_TONE[a.status]} className={PILL}>
                      {a.status}
                    </Badge>
                  </TableCell>
                  <UpdatedCells updated={a.updated} />
                  <TableCell className="py-1.5!">
                    {entry.rowAction({
                      title: `${a.type} on ${usDate(a.date)}`,
                      status: { label: a.status, tone: APPOINTMENT_TONE[a.status] },
                      lead: ["Reason", a.reason],
                      sections: [
                        {
                          title: "Appointment",
                          fields: [
                            ["Date", usDate(a.date)],
                            ["Time", a.time],
                            ["Length", `${a.minutes} min`],
                            ["Type", a.type],
                            ["Practitioner", a.practitioner],
                            ["Location", a.location],
                          ],
                        },
                      ],
                      source: EPIC,
                      updated: a.updated,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </RecordTable>
      </SectionBody>
      {entry.dialog}
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Family history (FamilyMemberHistory)                                       */
/* -------------------------------------------------------------------------- */

export function FamilyHistoryView({ extras }: { extras: EpicExtras }) {
  const entry = useRowDetails()
  const bar = useBarFilters()
  const rows = extras.family.filter((f) =>
    matches(bar.query, f.relation, f.condition, f.code, f.note)
  )
  const paged = usePaged(rows)
  return (
    <Section>
      <SectionBar
        title={`Family history (${extras.family.length})`}
        actions={
          <SearchBox
            value={bar.query}
            onChange={bar.setQuery}
            label="Search family history"
          />
        }
      />
      <SectionBody className="flex flex-col pb-3">
        <RecordTable paged={paged}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Relation</TableHead>
                <TableHead className="min-w-56">Condition</TableHead>
                <TableHead>Age at onset</TableHead>
                <TableHead>Deceased</TableHead>
                <TableHead className="min-w-44">Note</TableHead>
                <UpdatedHeads />
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <Empty cols={8}>No family history on record</Empty>
              )}
              {paged.visible.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.relation}</TableCell>
                  <TableCell>
                    <span className="font-medium tabular-nums">{f.code}</span>{" "}
                    {f.condition}
                  </TableCell>
                  <TableCell className="tabular-nums">{f.onsetAge}</TableCell>
                  <TableCell>{f.deceased}</TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {f.note || "None"}
                  </TableCell>
                  <UpdatedCells updated={f.updated} />
                  <TableCell className="py-1.5!">
                    {entry.rowAction({
                      title: `${f.relation}: ${f.condition}`,
                      codes: [`ICD-10 ${f.code}`],
                      sections: [
                        {
                          title: "Family member",
                          fields: [
                            ["Relation", f.relation],
                            ["Condition", f.condition],
                            ["Age at onset", f.onsetAge],
                            ["Deceased", f.deceased],
                          ],
                        },
                      ],
                      note: f.note,
                      source: EPIC,
                      updated: f.updated,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </RecordTable>
      </SectionBody>
      {entry.dialog}
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Profile: consents (Consent) and care team (Practitioner, Location)         */
/* -------------------------------------------------------------------------- */

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <h3 className="border-b px-4 py-2.5 text-[15px] font-semibold">{title}</h3>
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}

export function ProfileEpicCards({ extras }: { extras: EpicExtras }) {
  const entry = useRowDetails()
  if (extras.consents.length === 0 && extras.careTeam.length === 0) return null
  return (
    <>
      <Card title={`Consents (${extras.consents.length})`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Consent</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Signed on</TableHead>
              <TableHead>Expires on</TableHead>
              <TableHead>Status</TableHead>
              <UpdatedHeads />
            </TableRow>
          </TableHeader>
          <TableBody>
            {extras.consents.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.scope}</TableCell>
                <TableCell className="tabular-nums">{usDate(c.signed)}</TableCell>
                <TableCell className="tabular-nums">
                  {c.expires ? usDate(c.expires) : "No expiry"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={c.status === "Active" ? "success" : "secondary"}
                    className={PILL}
                  >
                    {c.status}
                  </Badge>
                </TableCell>
                <UpdatedCells updated={c.updated} />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card title={`Practitioners and locations (${extras.careTeam.length})`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Practitioner</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Specialty</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Phone</TableHead>
              <UpdatedHeads />
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {extras.careTeam.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell>{m.role}</TableCell>
                <TableCell>{m.specialty}</TableCell>
                <TableCell>{m.location}</TableCell>
                <TableCell className="tabular-nums">{m.phone}</TableCell>
                <UpdatedCells updated={m.updated} />
                <TableCell className="py-1.5!">
                  {entry.rowAction({
                    title: m.name,
                    codes: [`NPI ${m.npi}`],
                    sections: [
                      {
                        title: "Practitioner",
                        fields: [
                          ["Role", m.role],
                          ["Specialty", m.specialty],
                          ["Phone", m.phone],
                        ],
                      },
                      {
                        title: "Location",
                        fields: [
                          ["Name", m.location],
                          ["Address", m.address],
                        ],
                      },
                    ],
                    source: EPIC,
                    updated: m.updated,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {entry.dialog}
    </>
  )
}
