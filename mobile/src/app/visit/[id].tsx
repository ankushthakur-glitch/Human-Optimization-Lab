import { router, useLocalSearchParams, type Href } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { keepTogether } from "@/components/care-gap"
import { HeadCard, IconAction, KindLine, SmallLink } from "@/components/care-orders-rows"
import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { AskButton } from "@/components/hol"
import { CalendarBlank, Check, Clock, MapPin, Phone, Sparkle } from "@/components/ph"
import { RecordIcon, type RecordIconName } from "@/components/record-icons"
import { Block, Card, Group, HUE, KeyValue, NeedsRow, SmallAction, Tag, toast } from "@/components/record-kit"
import { relativeDay, showDate } from "@/lib/dates"
import { addToCalendar, call, directions } from "@/lib/links"
import { clock, dateOfAt, questionsFor, withQuestion } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { APPOINTMENTS, DOCUMENTS, ORDERS, PROCEDURES, PROVENANCE_LABEL, PROVENANCE_OF, REVIEW, VISITS, type Appointment, type Visit } from "@/lib/record"
import { card, color, font, ink, space, type } from "@/lib/theme"
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
   falls in her plan's week).

   Figma "Hol" (5 Oct 2026, "Cardiology follow up"): the tinted head card
   with the day on a lifted date tile beside who, when and where; the
   calendar, directions and call actions in a row under it; "Prepare" as
   two cards of plain rows with a text button each; "Ask to Health Agent"
   in the footer. The review and past visits take the same head card. */

/** "Dr. Patel", the doctor who reviews the record. */
const DOCTOR = REVIEW.by.replace(/^(Dr\.)\s+\S+\s+(\S+)$/, "$1 $2")

/** The check beside "Now in your record", a 14 pt mark. */
const CHECK = 14

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** The day of an appointment on a lifted tile: the month, the day in the
    text teal, the weekday. */
function DayTile({ at }: { at: Date }) {
  return (
    <View style={styles.dayTile} accessible accessibilityLabel={showDate(at)}>
      <Text style={styles.dayMonth}>{MONTH[at.getMonth()]}</Text>
      <Text style={styles.dayNumber}>{at.getDate()}</Text>
      <Text style={styles.dayWeekday}>{WEEKDAY[at.getDay()]}</Text>
    </View>
  )
}

/** A 14 icon and its words, under the head card's title. */
function Fact({ icon, children }: { icon: React.ReactNode; children: string }) {
  return (
    <View style={styles.fact}>
      {icon}
      <Text style={styles.factText}>{children}</Text>
    </View>
  )
}

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
  // into her list, where "Remove" puts it back here; the card goes once
  // she has saved them all.
  const suggestions = (a.prepare ?? []).filter((t) => !saved.some((q) => sameQuestion(q.text, t)))
  const where = a.address ?? a.place

  const remove = (id: string) => {
    void removeQuestion(s, s.save, id)
    toast("Removed")
  }
  const keep = (text: string) => {
    s.save({ questions: withQuestion(s.questions, text, undefined, a.id) }).catch(() => {})
    toast("Saved for your next visit")
  }

  return (
    <FlowScreen page title={a.name} footer={<AskButton params={a.ask ? { ask: a.ask } : undefined} />}>
      <HeadCard>
        <View style={styles.headRow}>
          <DayTile at={at} />
          <View style={styles.headText}>
            <Text style={styles.headTitle}>{`${a.with}, ${place}`}</Text>
            <View style={styles.facts}>
              <Fact icon={<Clock size={14} color={ink.detail} />}>{clock(at.getHours(), at.getMinutes())}</Fact>
              {!!a.address && <Fact icon={<MapPin size={14} color={ink.detail} />}>{a.address}</Fact>}
            </View>
          </View>
        </View>
      </HeadCard>

      <View style={styles.actions}>
        <IconAction grow icon={<CalendarBlank size={14} color={ink.primary} />} onPress={() => addToCalendar({ title: a.name, start: at, where })}>
          Add to calendar
        </IconAction>
        <IconAction width={110} icon={<MapPin size={14} color={ink.primary} />} onPress={() => directions(where)}>
          Directions
        </IconAction>
        {!!a.phone && (
          <IconAction width={80} icon={<Phone size={14} color={ink.primary} />} onPress={() => call(a.phone!)}>
            Call
          </IconAction>
        )}
      </View>

      <View style={styles.prepare}>
        <Text style={styles.prepareTitle} accessibilityRole="header">
          Prepare
        </Text>
        <View style={styles.prepareCards}>
          <Card style={styles.prepCard}>
            <Text style={styles.prepLabel}>Questions you saved</Text>
            {saved.length ? (
              saved.map((q) => (
                <View key={q.id} style={styles.prepRow}>
                  <Text style={styles.prepText}>{q.text}</Text>
                  <SmallLink onPress={() => remove(q.id)} accessibilityLabel={`Remove: ${q.text}`}>
                    Remove
                  </SmallLink>
                </View>
              ))
            ) : (
              <Text style={styles.prepText}>Nothing saved yet</Text>
            )}
          </Card>
          {suggestions.length > 0 && (
            <Card style={styles.prepCard}>
              <Text style={styles.prepLabel}>Worth taking with you</Text>
              {suggestions.map((text) => (
                <View key={text} style={styles.prepRow}>
                  <Text style={styles.prepText}>{text}</Text>
                  <SmallLink onPress={() => keep(text)} accessibilityLabel={`Save for your next visit: ${text}`}>
                    Save
                  </SmallLink>
                </View>
              ))}
            </Card>
          )}
        </View>
      </View>
    </FlowScreen>
  )
}

/* ----------------------------------------------------- record review -- */

function RecordReview({ a }: { a: Appointment }) {
  const s = useOnboarding()
  const at = useWhen(a)
  const last = s.review?.status === "checked" && s.review.at ? showDate(dateOfAt(s.review.at)) : "In progress"
  return (
    <FlowScreen page title={a.name} footer={<AskButton />}>
      <HeadCard style={styles.headGap}>
        <View style={styles.headRow}>
          <DayTile at={at} />
          <View style={styles.headText}>
            <Text style={styles.headTitle}>{a.place}</Text>
            <View style={styles.facts}>
              {/* A day with no time: the calendar, not the clock. */}
              <Fact icon={<CalendarBlank size={14} color={ink.detail} />}>{relativeDay(at)}</Fact>
            </View>
          </View>
        </View>
        <Text style={styles.body}>{`No visit needed. ${DOCTOR} reviews your whole record every 3 months.`}</Text>
      </HeadCard>
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
    <FlowScreen page title={visit.name} footer={<AskButton params={visit.outside ? { ask: `Summarize what changed at my ${visit.name.toLowerCase()}` } : undefined} />}>
      <HeadCard>
        <KindLine icon={<RecordIcon name={visit.origin === "hospital" ? "hospital" : "clinic"} size={16} color={HUE.teal.ink} />}>{visit.where}</KindLine>
        <Text style={styles.body}>{visit.date}</Text>
        {visit.outside && (
          <>
            <Tag tone="muted">Outside your clinic</Tag>
            <View style={styles.inRecord}>
              <View style={styles.inRecordMark}>
                <Check size={CHECK} color={color.primary} weight="bold" />
              </View>
              <Text style={[styles.note, styles.grow]}>{NEW_IN_RECORD_NOTE}</Text>
            </View>
          </>
        )}
      </HeadCard>

      <Block title="Details">
        <Card style={styles.rows}>
          {/* A wrapped value never ends on one word ("within 2 weeks"). */}
          {details.map((d, i) => (
            <KeyValue key={d.label} label={d.label} value={keepTogether(d.value)} last={i === details.length - 1} />
          ))}
        </Card>
        {visit.outside && (
          <Group>
            <NeedsRow
              icon={<Sparkle size={16} color={HUE.teal.ink} />}
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
                icon={<RecordIcon name={r.icon} size={16} color={HUE.teal.ink} />}
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
      icon={<RecordIcon name={item.icon} size={16} color={HUE.teal.ink} />}
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
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: ink.detail },
  note: { ...type.label, color: ink.detail },
  headGap: { gap: space.item },
  headRow: { flexDirection: "row", alignItems: "stretch", gap: space.lead },
  headText: { flex: 1, gap: space.mark, justifyContent: "center" },
  headTitle: { ...type.title, color: ink.detail },
  facts: { gap: space.stack },
  fact: { flexDirection: "row", alignItems: "center", gap: space.stack },
  factText: { ...type.label, color: ink.detail, flexShrink: 1 },
  // Figma's lifted date tile: white at half, radius 8, 10 by 6 inside.
  dayTile: {
    alignItems: "center",
    justifyContent: "center",
    gap: space.line,
    paddingHorizontal: 10,
    paddingVertical: space.mark,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    boxShadow: card.shadow,
  },
  dayMonth: { ...type.caption, color: ink.content },
  dayNumber: { fontFamily: font.semibold, fontSize: 13, lineHeight: 17, color: ink.primary, fontVariant: ["tabular-nums"] },
  dayWeekday: { ...type.caption },
  actions: { flexDirection: "row", gap: 10 },

  // A wrapped note keeps its check beside the first line.
  inRecord: { flexDirection: "row", alignItems: "flex-start", gap: space.mark },
  inRecordMark: { marginTop: (type.label.lineHeight - CHECK) / 2 },
  // A card of rows split by rules: each row carries its own 12 above and
  // below, so the card adds the rest of its padding.
  rows: { paddingVertical: space.card - space.rowY },

  // Prepare: a label 16 over two cards 10 apart, each a title over plain
  // rows 12 apart, a text button at the end of each.
  prepare: { gap: space.gutter },
  prepareTitle: { ...type.title, color: ink.detail },
  prepareCards: { gap: 10 },
  prepCard: { gap: space.item },
  prepLabel: { ...type.title, color: ink.detail },
  prepRow: { flexDirection: "row", alignItems: "center", gap: space.item },
  prepText: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink.secondary },
})
