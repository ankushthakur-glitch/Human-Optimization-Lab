import { router, useLocalSearchParams, type Href } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { IconCheck, IconSparkle } from "@/components/icons"
import { RecordIcon, type RecordIconName } from "@/components/record-icons"
import { Block, Card, DateBlock, Group, HUE, KeyValue, NeedsRow, SaveQuestion, SmallAction, Tag, TextAction, Tile, toast, type Hue } from "@/components/record-kit"
import { relativeDay, showDate } from "@/lib/dates"
import { addToCalendar, call, directions } from "@/lib/links"
import { clock, dateOfAt, questionsFor } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { APPOINTMENTS, DOCUMENTS, ORDERS, PROCEDURES, PROVENANCE_LABEL, PROVENANCE_OF, REVIEW, VISITS, type Appointment, type Visit } from "@/lib/record"
import { color, hairline, space, type } from "@/lib/theme"
import { NEW_IN_RECORD_NOTE, markSeen, removeQuestion, todo, type TodoItem } from "@/lib/todo"

/* One appointment or one visit (FINAL-SPEC C.11), opened from Coming up,
   New in your record, To do and the Record tab's visits:

   cardio-follow-up  an appointment on her calendar: when, with whom and
                     where, the phone's calendar, maps and dialler, then
                     what to bring: the questions she saved, a few to add,
                     and help from the assistant
   review-dec        Dr. Patel's review of her whole record, with no visit
   urgent, cardiology  a visit outside her clinic, now in her record: what
                     happened there, "What changed" (the assistant sums it
                     up), the step it asked for, as To do lists it, and the
                     notes and procedures the record holds from that day
   annual, annual-25 a past visit at her clinic: what was asked for there,
                     its step and its notes

   A clinical page: no offer and no object. Dates come from To do's list,
   so this page and Home always name the same day (a member's follow up
   falls in her plan's week). */

/** "Dr. Patel", the doctor who reviews the record. */
const DOCTOR = REVIEW.by.replace(/^(Dr\.)\s+\S+\s+(\S+)$/, "$1 $2")

/** The check beside "Now in your record", a 14 pt mark. */
const CHECK = 14

/** The same question whatever its case or spacing, as lib/member.ts
    withQuestion compares them before saving. */
const sameQuestion = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** The step a past visit asked for that is a care gap, by its id on To do's
    list; a test ordered at the visit is found from the record. */
const NEXT_STEP: Record<string, string> = { urgent: "gap:follow-up" }

/** Tests ordered at a visit: that day, by the clinician seen there (her own
    clinic's doctor, for a visit at her clinic). */
function ordersAt(v: Visit) {
  return ORDERS.filter((o) => o.ordered === v.date && (o.by === v.where || (v.origin === "doctor" && o.by === REVIEW.by)))
}

/** The record's documents and procedures from a visit: that day, that place. */
function recordsFrom(v: Visit): { id: string; icon: RecordIconName; title: string; meta: string; href: Href }[] {
  const there = (where: string) => v.where.startsWith(where)
  return [
    ...DOCUMENTS.filter((d) => d.date === v.date && there(d.where)).map((d) => ({ id: `document-${d.id}`, icon: "documents" as const, title: d.name, meta: "Document", href: "/record/documents" as Href })),
    ...PROCEDURES.filter((p) => p.date === v.date && there(p.where)).map((p) => ({ id: `procedure-${p.id}`, icon: "procedures" as const, title: p.name, meta: "Procedure", href: "/record/procedures" as Href })),
  ]
}

/** "Oct 21" from "By Oct 21, 2026" (with the year when it isn't this one),
    the month and day held on one line. */
function dueDay(due: string, now = new Date()) {
  const day = due.replace(/^By /, "")
  const m = /^([A-Z][a-z]{2} \d{1,2}), (\d{4})$/.exec(day)
  return (m && Number(m[2]) === now.getFullYear() ? m[1] : day).replace(/^([A-Z][a-z]{2}) /, "$1\u00A0")
}

export default function VisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const appointment = APPOINTMENTS.find((a) => a.id === id)
  if (appointment) return appointment.kind === "review" ? <RecordReview a={appointment} /> : <Upcoming a={appointment} />
  const visit = VISITS.find((v) => v.id === id)
  if (visit) return <PastVisit visit={visit} />
  return <PageNotFoundState />
}

/** When an appointment is, as Home and To do have it (a local day and
    time, "2026-10-21T10:30"). */
function useWhen(a: Appointment): Date {
  const s = useOnboarding()
  return dateOfAt(todo(s).coming.find((i) => i.id === `appointment:${a.id}`)?.date ?? a.at)
}

/* ------------------------------------------------------- appointment -- */

function Upcoming({ a }: { a: Appointment }) {
  const s = useOnboarding()
  const at = useWhen(a)
  const place = a.place.split(",")[0]
  const saved = questionsFor(s.questions, a.id)
  // What to prepare is the appointment's own list, which the assistant's
  // "Prepare for my next visit" reads too. A suggestion she saves moves up
  // into her list, where "Remove" puts it back here; the group goes once
  // she has saved both.
  const suggestions = (a.prepare ?? []).filter((t) => !saved.some((q) => sameQuestion(q.text, t)))

  const remove = (id: string) => {
    void removeQuestion(s, s.save, id)
    toast("Removed")
  }

  return (
    <FlowScreen page title={a.name}>
      <Card style={styles.head}>
        <View style={styles.headRow}>
          <DateBlock date={at} />
          <View style={styles.headText}>
            <Text style={type.section}>{`${relativeDay(at)}, ${clock(at.getHours(), at.getMinutes())}`}</Text>
            <Text style={type.label}>{`${a.with}, ${place}`}</Text>
            {!!a.address && <Text style={type.meta}>{a.address}</Text>}
          </View>
        </View>
        <View style={styles.actions}>
          <SmallAction onPress={() => addToCalendar({ title: a.name, start: at, where: a.address ?? a.place })}>Add to calendar</SmallAction>
          <SmallAction onPress={() => directions(a.address ?? a.place)}>Directions</SmallAction>
          {!!a.phone && <SmallAction onPress={() => call(a.phone!)}>Call</SmallAction>}
        </View>
      </Card>

      <Block title="Prepare">
        <Card style={styles.rows}>
          <Text style={styles.prepLabel}>Questions you saved</Text>
          {saved.length ? (
            <View>
              {saved.map((q, i) => (
                <View key={q.id} style={[styles.prepRow, i > 0 && styles.prepRule]}>
                  <Text style={[type.body, styles.grow]}>{q.text}</Text>
                  <TextAction tone="muted" onPress={() => remove(q.id)}>
                    Remove
                  </TextAction>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.nothing}>Nothing saved yet</Text>
          )}
          {suggestions.length > 0 && (
            <>
              <Text style={[styles.prepLabel, styles.prepRule]}>Worth taking with you</Text>
              <View>
                {suggestions.map((text, i) => (
                  <View key={text} style={[styles.prepRow, i > 0 && styles.prepRule]}>
                    <Text style={[type.body, styles.grow]}>{text}</Text>
                    <SaveQuestion text={text} forVisit={a.id} />
                  </View>
                ))}
              </View>
            </>
          )}
        </Card>
        {!!a.ask && (
          <TextAction chevron onPress={() => router.push({ pathname: "/assistant", params: { ask: a.ask! } })}>
            Get help preparing
          </TextAction>
        )}
      </Block>
    </FlowScreen>
  )
}

/* ----------------------------------------------------- record review -- */

function RecordReview({ a }: { a: Appointment }) {
  const s = useOnboarding()
  const at = useWhen(a)
  const last = s.review?.status === "checked" && s.review.at ? showDate(dateOfAt(s.review.at)) : "In progress"
  return (
    <FlowScreen page title={a.name}>
      <Card style={styles.head}>
        <View style={styles.headRow}>
          <DateBlock date={at} />
          <View style={styles.headText}>
            <Text style={type.section}>{relativeDay(at)}</Text>
            <Text style={type.label}>{a.place}</Text>
          </View>
        </View>
        <Text style={type.body}>{`No visit needed. ${DOCTOR} reviews your whole record every 3 months.`}</Text>
      </Card>
      <Block title="Details">
        <Card style={styles.rows}>
          <KeyValue label="Reviewed by" value={a.with} />
          <KeyValue label="Last review" value={last} last />
        </Card>
      </Block>
    </FlowScreen>
  )
}

/* -------------------------------------------------------- past visit -- */

function PastVisit({ visit }: { visit: Visit }) {
  const s = useOnboarding()
  const t = todo(s)
  const ordered = ordersAt(visit)
  const step = NEXT_STEP[visit.id] ?? (ordered[0] && `order:${ordered[0].id}`)
  const next = step ? [...t.needs, ...t.coming, ...t.booked, ...t.done].find((i) => i.id === step) : undefined
  const records = recordsFrom(visit)
  const hue: Hue = visit.outside ? "blue" : "teal"
  const askedFor = visit.askedFor ?? (ordered.length ? ordered.map((o) => `${o.name} by ${dueDay(o.due)}`).join(", ") : undefined)
  const details = [
    visit.reason ? { label: "Reason", value: visit.reason } : undefined,
    visit.seenBy ? { label: "Seen by", value: visit.seenBy } : undefined,
    askedFor ? { label: "Asked for", value: askedFor } : undefined,
    { label: "Source", value: PROVENANCE_LABEL[PROVENANCE_OF[visit.origin]] },
  ].filter((d): d is { label: string; value: string } => Boolean(d))

  // Opening an outside visit takes it off Home's "New in your record".
  const seen = React.useRef(false)
  React.useEffect(() => {
    if (seen.current || !visit.outside) return
    seen.current = true
    void markSeen(s, s.save, { id: `visit:${visit.id}` })
  }, [s, visit])

  return (
    <FlowScreen page title={visit.name}>
      <Card style={styles.head}>
        <View style={styles.headRow}>
          <Tile hue={hue}>
            <RecordIcon name={visit.origin === "hospital" ? "hospital" : "clinic"} size={18} color={HUE[hue].ink} />
          </Tile>
          <View style={styles.headText}>
            <Text style={type.section}>{visit.where}</Text>
            <Text style={type.label}>{visit.date}</Text>
            {visit.outside && (
              <View style={styles.tag}>
                <Tag tone="muted">Outside your clinic</Tag>
              </View>
            )}
          </View>
        </View>
        {visit.outside && (
          <>
            <View style={styles.rule} />
            <View style={styles.inRecord}>
              <View style={styles.inRecordMark}>
                <IconCheck size={CHECK} color={color.primary} strokeWidth={2.4} />
              </View>
              <Text style={[type.label, styles.grow]}>{NEW_IN_RECORD_NOTE}</Text>
            </View>
          </>
        )}
      </Card>

      <Block title="Details">
        <Card style={styles.rows}>
          {details.map((d, i) => (
            <KeyValue key={d.label} label={d.label} value={d.value} last={i === details.length - 1} />
          ))}
        </Card>
        {visit.outside && (
          <Group>
            <NeedsRow
              icon={<IconSparkle size={16} color={HUE.teal.ink} />}
              title="What changed"
              accessibilityLabel="What changed, ask your assistant"
              onPress={() => router.push({ pathname: "/assistant", params: { ask: `Summarize what changed at my ${visit.name.toLowerCase()}` } })}
            />
          </Group>
        )}
      </Block>

      {next && (
        <Block title="Next step">
          <Group>
            <StepRow item={next} />
          </Group>
        </Block>
      )}

      {records.length > 0 && (
        <Block title="From this visit">
          <Group>
            {records.map((r) => (
              <NeedsRow
                key={r.id}
                icon={<RecordIcon name={r.icon} size={18} color={HUE.violet.ink} />}
                hue="violet"
                title={r.title}
                meta={r.meta}
                onPress={() => router.push(r.href)}
              />
            ))}
          </Group>
        </Block>
      )}
    </FlowScreen>
  )
}

/** The step a visit asked for, as To do lists it, opening the same page. */
function StepRow({ item }: { item: TodoItem }) {
  const act = item.action
  return (
    <NeedsRow
      icon={<RecordIcon name={item.icon} size={18} color={HUE[item.hue].ink} />}
      hue={item.hue}
      title={item.title}
      meta={item.meta}
      tag={item.tag}
      right={
        act?.tel ? (
          <SmallAction onPress={() => call(act.tel!)}>{act.label}</SmallAction>
        ) : act?.href ? (
          <SmallAction onPress={() => router.push(act.href as Href)}>{act.label}</SmallAction>
        ) : undefined
      }
      onPress={() => router.push(item.href as Href)}
    />
  )
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  // The head card: its date block or tile beside a 16 pt title and the
  // lines under it, then its pills or its note.
  head: { gap: space.card },
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: space.lead },
  headText: { flex: 1, gap: space.stack },
  tag: { flexDirection: "row", marginTop: space.stack },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  rule: { height: 1, backgroundColor: hairline.rule },
  // A wrapped note keeps its check beside the first line.
  inRecord: { flexDirection: "row", alignItems: "flex-start", gap: space.mark },
  inRecordMark: { marginTop: (type.label.lineHeight - CHECK) / 2 },
  // A card of rows split by rules: each row carries its own 12 above and
  // below, so the card adds the rest of its padding and the first and last
  // words sit 16 from its edge.
  rows: { paddingVertical: space.card - space.rowY },

  // Prepare: a small label over each group of rows, on the same 12 as the
  // rows and their rules.
  prepLabel: { ...type.metaStrong, paddingTop: space.rowY },
  prepRow: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: space.rowY },
  prepRule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  nothing: { ...type.meta, paddingVertical: space.rowY },
})
