import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { keepTogether } from "@/components/care-gap"
import { openMedicineByName } from "@/components/medicines"
import { Eye, UploadSimple } from "@/components/ph"
import { Block, EmptyState, Group, Tile } from "@/components/record-kit"
import { FilterChips, ItemRow, addedDetail, type ItemDetail, type RowStatus } from "@/components/record-rows"
import { clockOf, dateOfAt, dayLabel, shortDay, sinceStart } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import {
  ALLERGIES,
  APPOINTMENTS,
  DOCUMENTS,
  IMMUNIZATIONS,
  MEDICATIONS,
  ORDERS,
  PROBLEMS,
  PROCEDURES,
  PROVENANCE_OF,
  SOURCES,
  VISITS,
  timeline,
  type Biomarker,
  type Order,
  type Origin,
  type Provenance,
  type TimelineEntry,
  type TimelineKind,
} from "@/lib/record"
import { color, space } from "@/lib/theme"
import { orderHref, orderStatus, todo, type TodoItem } from "@/lib/todo"
import { timeOf } from "@/lib/trends"

/* The record's own pages (FINAL-SPEC C.6), each a FlowScreen page:

   results        every result: the composition, a filter (All, To watch, In
                  range), search, and rows by body system; "To watch" is
                  the trend tiles; one batch of new results on its own
   allergies      both lists, and the one they differ on, with a quick answer
   conditions     the problem list, and where the hospital's differs
   visits         coming up and past; outside visits say so; each opens its page
   tests          open and done; each order with its three dates, opening its page
   documents, immunizations, procedures
   added          what she added, each "Being checked" until confirmed
   access         who has looked at her record

   Every other row opens the approved sheet with the item's details, where
   it comes from and one provenance label (S-13). Differences between
   lists stay visible until Dr. Patel settles them (S-12); her answers are
   added to the record as told by her, never written over a list. */

export type RecordKind = "allergies" | "conditions" | "visits" | "tests" | "documents" | "immunizations" | "procedures" | "added"

export const RECORD_TITLES: Record<RecordKind, string> = {
  allergies: "Allergies",
  conditions: "Conditions",
  visits: "Visits",
  tests: "Tests and orders",
  documents: "Documents",
  immunizations: "Immunizations",
  procedures: "Procedures",
  added: "Added by you",
}

/* ------------------------------------------------------------ words -- */

const THIS_YEAR = new Date().getFullYear()

/** "Aug 12, 2026" reads "Aug 12" this year; other years and "Oct 2025" stay. */
const shortDate = (date: string) => date.replace(new RegExp(`,\\s*${THIS_YEAR}$`), "")

/** "Pacific Heart, La Jolla" as "Pacific Heart". */
const placeShort = (where: string) => where.split(",")[0].trim()

/** A member's result row line, "Down 0.1 since you started": the short
    form, which keeps to one line in a row's text column (the marker page
    and the assistant say "... in May"). */
export const sinceLine = (marker: Biomarker) => sinceStart(marker)?.short

/* The places records come from, with the system each runs and when it last
   sent something, so every item can say where it comes from. */
const SOURCE_OF = (kind: "clinic" | "hospital" | "lab") => SOURCES.find((s) => s.kind === kind)!
const PLACE: Record<Origin, { name: string; system: string; updated?: string }> = {
  doctor: { name: SOURCE_OF("clinic").name, system: SOURCE_OF("clinic").system, updated: "Aug 12, 2026" },
  hospital: { name: SOURCE_OF("hospital").name, system: SOURCE_OF("hospital").system, updated: "Jun 3, 2026" },
  lab: { name: SOURCE_OF("lab").name, system: SOURCE_OF("lab").system, updated: "Aug 14, 2026" },
  you: { name: "Told by you", system: "Inlay app" },
  report: { name: "Your report", system: "Inlay app" },
}

/** A document's place as the record names it ("Harborview") to its origin. */
const ORIGIN_OF_PLACE: Record<string, Origin> = { Harborview: "doctor", Quest: "lab", "Scripps Memorial": "hospital" }

/** What each sample document is (sample copy). */
const DOCUMENT_KIND: Record<string, string> = {
  physical: "Visit note",
  labs: "Lab report",
  discharge: "Discharge summary",
  ecg: "Test report",
  "physical-25": "Visit note",
}

/** "Source", "System", "Last updated" for one or more origins. */
function sourceRows(origins: Origin[], updated?: string): [string, string][] {
  const places = origins.map((o) => PLACE[o])
  return [
    ["Source", places.map((p) => p.name).join(", ")],
    ["System", [...new Set(places.map((p) => p.system))].join(", ")],
    ["Last updated", updated ?? places.find((p) => p.updated)?.updated ?? "Not known"],
  ]
}

/** Once Dr. Patel has checked the record, what her own list holds reads as
    confirmed by her; otherwise as the record's own provenance. */
function useProvenance() {
  const checked = useOnboarding().review?.status === "checked"
  return (origin: Origin): Provenance => (checked && origin === "doctor" ? "confirmed" : PROVENANCE_OF[origin])
}

type ProvenanceOf = ReturnType<typeof useProvenance>

/** A document's sheet: what kind it is and where it comes from. Its own
    list and the Timeline open the same one. */
function documentDetail(d: (typeof DOCUMENTS)[number], provenance: ProvenanceOf): ItemDetail {
  const origin = ORIGIN_OF_PLACE[d.where] ?? "doctor"
  return {
    title: d.name,
    provenance: provenance(origin),
    details: [
      ["Date", d.date],
      ["Kind", DOCUMENT_KIND[d.id] ?? "Document"],
    ],
    source: sourceRows([origin], d.date),
  }
}

/** A procedure's sheet: when and where it was done. Its own list and the
    Timeline open the same one. */
function procedureDetail(p: (typeof PROCEDURES)[number], provenance: ProvenanceOf): ItemDetail {
  return {
    title: p.name,
    provenance: provenance(p.origin),
    details: [
      ["Date", p.date],
      ["Where", p.where],
    ],
    source: sourceRows([p.origin], p.date),
  }
}

/* ------------------------------------------------------- allergies -- */

/** Allergies the lists differ on: the Record tab's "Records differ on 1". */
export const allergiesToCheck = () => ALLERGIES.filter((a) => a.difference).length

/* ------------------------------------------------------------ lists -- */

export function KindList({ kind, onOpen, onAdd }: { kind: RecordKind; onOpen: (item: ItemDetail) => void; onAdd: () => void }) {
  switch (kind) {
    case "allergies":
      return <Allergies onOpen={onOpen} />
    case "conditions":
      return <Conditions onOpen={onOpen} />
    case "visits":
      return <Visits onOpen={onOpen} />
    case "tests":
      return <Tests onOpen={onOpen} />
    case "documents":
      return <Documents onOpen={onOpen} />
    case "immunizations":
      return <Immunizations onOpen={onOpen} />
    case "procedures":
      return <Procedures onOpen={onOpen} />
    case "added":
      return <Added onOpen={onOpen} onAdd={onAdd} />
  }
}

type Opens = { onOpen: (item: ItemDetail) => void }

/** A Phosphor glyph on the rows' round teal tile, for a row that is not a
    record kind ("Who has looked", "Added by you"). */
const Glyph = ({ Icon }: { Icon: typeof Eye }) => (
  <Tile>
    <Icon size={16} color={color.primary} />
  </Tile>
)

function Allergies({ onOpen }: Opens) {
  const provenance = useProvenance()
  return (
    <Group>
      {ALLERGIES.map((a) => {
        const both = a.lists.length > 1
        return (
          <ItemRow
            key={a.id}
            icon="allergies"
            title={a.name}
            meta={both ? `${a.reaction}, on both lists` : `${a.reaction}, ${PLACE[a.lists[0]].name.replace(/ Hospital$/, "")} only`}
            status={a.difference ? { level: "borderline", word: "Records differ" } : undefined}
            onPress={() =>
              onOpen({
                title: a.name,
                provenance: provenance(a.lists[0]),
                details: [
                  ["Reaction", a.reaction],
                  ["Type", "Drug allergy"],
                  ["On Dr. Patel's list", a.lists.includes("doctor") ? "Yes" : "No"],
                ],
                source: sourceRows(a.lists),
              })
            }
          />
        )
      })}
    </Group>
  )
}

function Conditions({ onOpen }: Opens) {
  const provenance = useProvenance()
  return (
    <Group>
      {PROBLEMS.map((p) => (
        <ItemRow
          key={p.id}
          icon="conditions"
          title={p.name}
          meta={`Since ${p.since}`}
          status={p.difference ? { level: "borderline", word: "Records differ" } : undefined}
          onPress={() =>
            onOpen({
              title: p.name,
              provenance: provenance(p.origin),
              details: [
                ["Since", p.since],
                ["Status", "Active"],
                ...(p.difference ? [["Scripps Memorial", "High blood pressure"] as [string, string]] : []),
              ],
              source: sourceRows([p.origin]),
            })
          }
        />
      ))}
    </Group>
  )
}

type When = "coming" | "past"

/** A past visit's details: when, where, and what it was for. */
function visitDetail(v: (typeof VISITS)[number], provenance: ProvenanceOf): ItemDetail {
  return {
    title: v.name,
    provenance: provenance(v.origin),
    details: [
      ["Date", v.date],
      ["Where", v.where],
      ...(v.reason ? [["Reason", v.reason] as [string, string]] : []),
      ...(v.seenBy ? [["Seen by", v.seenBy] as [string, string]] : []),
      ...(v.askedFor ? [["Asked for", v.askedFor] as [string, string]] : []),
    ],
    source: sourceRows([v.origin], v.date),
  }
}

/** A coming visit's details, from its appointment when the record has one. */
function comingDetail(item: TodoItem, provenance: ProvenanceOf): ItemDetail {
  const a = APPOINTMENTS.find((x) => `appointment:${x.id}` === item.id)
  if (!a) return { title: item.title, details: [["When", item.meta]] }
  const at = dateOfAt(a.at)
  return {
    title: a.name,
    provenance: provenance(a.origin),
    details: [
      ["Date", dayLabel(at)],
      ["Time", clockOf(at)],
      ["With", a.with],
      ["Place", a.place],
      ...(a.address ? [["Address", a.address] as [string, string]] : []),
      ...(a.phone ? [["Phone", a.phone] as [string, string]] : []),
    ],
    source: sourceRows([a.origin]),
  }
}

function Visits({ onOpen }: Opens) {
  const onboarding = useOnboarding()
  const provenance = useProvenance()
  const t = todo(onboarding)
  const coming = t.coming.filter((i) => i.kind === "appointment" || i.kind === "review")
  const past = [...VISITS].sort((a, b) => timeOf(b.date) - timeOf(a.date))
  const [when, setWhen] = React.useState<When>(coming.length ? "coming" : "past")
  const outside = (id: string) => {
    const a = APPOINTMENTS.find((x) => x.id === id.replace(/^appointment:/, ""))
    return !!a && a.origin !== "doctor"
  }
  const tag = { tone: "muted" as const, label: "Outside your clinic" }

  return (
    <View style={styles.stack}>
      <FilterChips
        options={[
          { value: "coming", label: "Coming up" },
          { value: "past", label: "Past" },
        ]}
        value={when}
        onChange={setWhen}
      />
      {when === "coming" ? (
        coming.length ? (
          <Group>
            {coming.map((v) => (
              <ItemRow
                key={v.id}
                date={v.date}
                title={v.title}
                tag={outside(v.id) ? tag : undefined}
                meta={v.meta}
                note={v.note}
                onPress={() => onOpen(comingDetail(v, provenance))}
              />
            ))}
          </Group>
        ) : (
          <EmptyState title="Nothing coming up" />
        )
      ) : (
        <Group>
          {past.map((v) => (
            <ItemRow
              key={v.id}
              icon="visits"
              title={v.name}
              tag={v.outside ? tag : undefined}
              meta={v.where}
              when={shortDate(v.date)}
              onPress={() => onOpen(visitDetail(v, provenance))}
            />
          ))}
        </Group>
      )}
    </View>
  )
}

/** An order's state as a mark and its word ("Not booked yet", "Booked for
    Tue, Oct 6", "Results in"), from the one rule in lib/todo.ts, marked as
    the order page marks it (C.0.4). */
function orderMark(s: ReturnType<typeof orderStatus>): RowStatus {
  if (s.tone === "done") return { tone: "ok", mark: "check", word: s.word }
  if (s.tone === "booked") return { tone: "primary", word: s.word }
  if (s.tone === "waiting") return { tone: "primary", mark: "ring", word: s.word }
  if (s.tone === "attention") return { tone: "low", mark: "dot", word: s.word }
  return { tone: "muted", word: s.word }
}

type Open = "open" | "done"

function Tests({ onOpen }: Opens) {
  const onboarding = useOnboarding()
  const t = todo(onboarding)
  // Every order the record holds; the to do lists say which are booked
  // and when.
  const listed = [...t.needs, ...t.coming, ...t.booked, ...t.done]
  const itemOf = (o: Order) => listed.find((i) => i.id === `order:${o.id}`)
  const done = ORDERS.filter((o) => o.state === "done" || !!o.completed)
  const open = ORDERS.filter((o) => !done.includes(o))
  const [view, setView] = React.useState<Open>(open.length ? "open" : "done")
  const shown = view === "open" ? open : done

  return (
    <View style={styles.stack}>
      <FilterChips
        options={[
          { value: "open", label: "Open" },
          { value: "done", label: "Done" },
        ]}
        value={view}
        onChange={setView}
      />
      {shown.length ? (
        <Group>
          {shown.map((o) => (
            <OrderRow key={o.id} order={o} item={itemOf(o)} onOpen={onOpen} />
          ))}
        </Group>
      ) : (
        <EmptyState title={view === "open" ? "No open tests" : "Nothing done yet"} />
      )}
    </View>
  )
}

/** One order: its name, where it stands, and when it is due or where it
    was done. Its dates are on its details page. */
function OrderRow({ order: o, item, onOpen }: { order: Order; item?: TodoItem } & Opens) {
  const onboarding = useOnboarding()
  const status = orderStatus(o, onboarding)
  const booked = item?.group === "booked"
  // Booked: where (the status line already says when). Open: when it is due.
  const meta = o.completed
    ? (o.at ?? undefined)
    : booked && item
      ? item.meta.replace(/^\d{1,2}:\d{2}\s(AM|PM), /, "")
      : `Due by ${shortDate(o.due.replace(/^By /, ""))}${o.at ? `, ${placeShort(o.at)}` : ""}`
  const scheduled = booked && item?.date ? shortDay(dateOfAt(item.date)) : o.scheduled ? shortDate(o.scheduled) : undefined
  return (
    <ItemRow
      icon="labs"
      title={o.name}
      status={orderMark(status)}
      meta={meta}
      onPress={() =>
        onOpen({
          title: o.name,
          details: [
            // Booked: the word alone, its day and time under Scheduled.
            ["Status", status.tone === "booked" ? "Booked" : status.word],
            ["Ordered by", o.by],
            ["Ordered", o.ordered],
            ["Due", o.due.replace(/^By /, "")],
            ...(status.tone === "booked" && /^Booked for /.test(status.word)
              ? [["Scheduled", status.word.replace(/^Booked for /, "")] as [string, string]]
              : scheduled
                ? [["Scheduled", scheduled] as [string, string]]
                : []),
            ...(o.completed ? [["Done", o.completed] as [string, string]] : []),
            ...(o.at ? [["Where", o.at] as [string, string]] : []),
          ],
        })
      }
    />
  )
}

function Documents({ onOpen }: Opens) {
  const provenance = useProvenance()
  return (
    <Group>
      {DOCUMENTS.map((d) => (
        <ItemRow key={d.id} icon="documents" title={d.name} meta={d.where} when={shortDate(d.date)} onPress={() => onOpen(documentDetail(d, provenance))} />
      ))}
    </Group>
  )
}

function Immunizations({ onOpen }: Opens) {
  const provenance = useProvenance()
  return (
    <Group>
      {IMMUNIZATIONS.map((i) => (
        <ItemRow
          key={i.id}
          icon="immunizations"
          title={i.name}
          when={i.date}
          onPress={() =>
            onOpen({
              title: i.name,
              provenance: provenance("doctor"),
              details: [
                ["Given", i.date],
                ["Status", "Completed"],
              ],
              source: sourceRows(["doctor"]),
            })
          }
        />
      ))}
    </Group>
  )
}

function Procedures({ onOpen }: Opens) {
  const provenance = useProvenance()
  return (
    <Group>
      {PROCEDURES.map((p) => (
        <ItemRow key={p.id} icon="procedures" title={p.name} meta={p.where} when={shortDate(p.date)} onPress={() => onOpen(procedureDetail(p, provenance))} />
      ))}
    </Group>
  )
}

function Added({ onOpen, onAdd }: Opens & { onAdd: () => void }) {
  const added = [...(useOnboarding().added ?? [])].sort((a, b) => timeOf(b.at) - timeOf(a.at))
  if (!added.length) return <EmptyState title="Nothing added yet" action="Add to your record" onAction={onAdd} />
  return (
    <Group>
      {added.map((a) => (
        <ItemRow
          key={a.id}
          icon={<Glyph Icon={UploadSimple} />}
          title={a.title}
          tag={{ tone: "muted", label: "Being checked" }}
          meta={`Added by you, ${shortDate(a.at)}`}
          onPress={() => onOpen(addedDetail(a))}
        />
      ))}
    </Group>
  )
}

/* --------------------------------------------------------- timeline -- */

type TimeFilter = TimelineKind | "all"

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "results", label: "Results" },
  { value: "visits", label: "Visits" },
  { value: "medicines", label: "Medicines" },
  { value: "procedures", label: "Procedures" },
  { value: "documents", label: "Documents" },
]

/** "Atorvastatin, 20 mg once a day" as the name and the dose. */
function splitMedicine(title: string): [string, string | undefined] {
  const at = title.indexOf(", ")
  return at < 0 ? [title, undefined] : [title.slice(0, at), title.slice(at + 2)]
}

/** An entry's place in a row: her own doctor's list is "Dr. Patel". After
    a medicine's dose the place is held whole, so a wrapped line never
    splits it ("10 mg once a day," then "Scripps Memorial"). */
function placeLine(where: string, dose?: string) {
  const place = where === "Your doctor" ? "Dr. Patel" : where
  return dose ? `${dose}, ${place.replace(/ /g, "\u00A0")}` : keepTogether(place)
}

const TIME_ICON = { results: "labs", visits: "visits", medicines: "medications", procedures: "procedures", documents: "documents" } as const

/** What an entry opens: a visit or a test on its own page, a medicine
    brought into view on the medicines page, or a document or a procedure
    in the sheet its own list opens. The entry is found in the record by
    its kind, name and day, as timeline() builds it from these lists. */
function timelineOpen(e: TimelineEntry, onOpen: (item: ItemDetail) => void, provenance: ProvenanceOf): (() => void) | undefined {
  const same = (name: string, date?: string) => name === e.title && date === e.date
  switch (e.kind) {
    case "visits": {
      const v = VISITS.find((x) => same(x.name, x.date))
      return v && (() => router.push({ pathname: "/visit/[id]", params: { id: v.id } }))
    }
    case "results": {
      const o = ORDERS.find((x) => same(x.name, x.completed))
      return o && (() => router.push(orderHref(o.id)))
    }
    case "medicines": {
      const m = MEDICATIONS.find((x) => x.name === splitMedicine(e.title)[0])
      return () => (m ? openMedicineByName(m) : router.push("/medications"))
    }
    case "documents": {
      const d = DOCUMENTS.find((x) => same(x.name, x.date))
      return d && (() => onOpen(documentDetail(d, provenance)))
    }
    case "procedures": {
      const p = PROCEDURES.find((x) => same(x.name, x.date))
      return p && (() => onOpen(procedureDetail(p, provenance)))
    }
  }
}

/** The whole record by date, newest first, across every kind of entry,
    with a filter for one kind at a time (S-15). Visits outside her clinic
    say so. Every entry opens, as it does from its own list. */
export function TimelineList({ onOpen }: Opens) {
  const provenance = useProvenance()
  const [filter, setFilter] = React.useState<TimeFilter>("all")
  const entries = timeline().filter((e) => filter === "all" || e.kind === filter)
  const years = [...new Set(entries.map((e) => e.year))]
  return (
    <View style={styles.stack}>
      <FilterChips scroll options={TIME_FILTERS} value={filter} onChange={setFilter} />
      <View style={styles.groups}>
        {years.map((year) => (
          <Block key={year} title={year}>
            <Group>
              {entries
                .filter((e) => e.year === year)
                .map((e, i) => {
                  const [name, dose] = e.kind === "medicines" ? splitMedicine(e.title) : [e.title, undefined]
                  return (
                    <ItemRow
                      key={`${e.kind}-${e.title}-${i}`}
                      icon={TIME_ICON[e.kind]}
                      title={name}
                      tag={e.outside ? { tone: "muted", label: "Outside your clinic" } : undefined}
                      meta={placeLine(e.where, dose) || undefined}
                      when={shortDate(e.date).replace(/,?\s*\d{4}$/, "")}
                      onPress={timelineOpen(e, onOpen, provenance)}
                    />
                  )
                })}
            </Group>
          </Block>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // Lists inside a page sit closer than the page's own 32.
  stack: { gap: space.item },
  groups: { gap: space.section },
})
