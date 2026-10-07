import { router, type Href } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { keepTogether } from "@/components/care-gap"
import { SmallLink } from "@/components/care-orders-rows"
import { CaretRight } from "@/components/ph"
import { RecordIcon } from "@/components/record-icons"
import { FilterChips } from "@/components/record-rows"
import { DateBlock, EmptyState, Group, HUE, NotConnected, ReviewBanner, SmallAction, Tile, spokenDate } from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { experience, sharingOff } from "@/lib/experience"
import { dateOfAt, shortDay } from "@/lib/member"
import { call } from "@/lib/links"
import { useOnboarding } from "@/lib/onboarding"
import { card, font, ink, space, type } from "@/lib/theme"
import { opensPage, removeQuestion, todo, type TodoItem } from "@/lib/todo"

/* To do, a tab: everything open for the patient in one guided list,
   counted exactly as Home counts it (lib/todo.ts, A-48). Figma "Hol" (5
   Oct 2026, "To do", extended):

   Needs you            every item with its one small action; "Overdue"
                        under a test that is late, in Warning/08
   Upcoming             appointments, and tests ordered and not due yet,
                        their facts split by dots
   For your next visit  care gaps to talk through, and her saved questions
   Booked               tests and visits she booked, until the result
   Done recently        results in over the last 90 days

   Every row is a teal tile (or a date block), the title, and an action or
   a chevron. An empty group is left out. With nothing open, one calm
   empty state; with nothing ever connected, the same not connected state
   as every tab; with sharing turned off, the same banner as every tab,
   over what was collected before; while the record is still arriving, its
   banner over the clinic's appointments.

   Filter chips over the groups: All (every group), Overdue (the late
   rows wherever they sit), Upcoming (Upcoming and Booked) and Completed
   (Done recently). The open filters carry their counts. */

type Show = "all" | "overdue" | "upcoming" | "completed"

const isLate = (item: TodoItem) => item.tag?.label === "Overdue"
/** Late tests and medicines to check: drawn in red and counted as overdue. */
const isUrgent = (item: TodoItem) => isLate(item) || item.kind === "meds"

export default function ToDoScreen() {
  const onboarding = useOnboarding()
  const t = todo(onboarding)
  const exp = experience(onboarding)
  const declined = exp === "declined"
  // While the record arrives only the clinic's appointments are known.
  const arriving = exp === "building"
  const off = sharingOff(onboarding)
  const open = t.needs.length + t.coming.length + t.visit.length + t.booked.length
  const late = [...t.needs, ...t.coming, ...t.visit, ...t.booked].filter(isUrgent)
  const [show, setShow] = React.useState<Show>("all")
  const shows: { value: Show; label: string }[] = [
    { value: "all", label: `All (${open})` },
    { value: "overdue", label: `Overdue (${late.length})` },
    { value: "upcoming", label: `Upcoming (${t.coming.length + t.booked.length})` },
    { value: "completed", label: "Completed" },
  ]
  const all = show === "all"

  const go = (href: Href) => router.push(href)

  const row = (item: TodoItem, opts: { facts?: boolean; withAction?: boolean } = {}) => {
    const a = item.action
    // A saved question is removed in place; it opens the visit it is for.
    const question = item.kind === "question" ? item.id.replace(/^question:/, "") : undefined
    const action = question
      ? { label: "Remove", quiet: true, onPress: () => void removeQuestion(onboarding, onboarding.save, question).catch(() => {}) }
      : opts.withAction && a
        ? { label: a.label, onPress: () => (a.tel ? call(a.tel) : a.href ? go(a.href as Href) : go(item.href as Href)) }
        : undefined
    // A row that would only open this list again (a starting test booked
    // in setup) is not a button.
    const opens = opensPage(item)
    return (
      <TodoRow
        key={item.id}
        item={item}
        urgent={isUrgent(item)}
        late={isLate(item)}
        facts={opts.facts ? item.meta : undefined}
        action={action}
        onPress={opens ? () => go(item.href as Href) : undefined}
      />
    )
  }

  return (
    <TabScreen tab="todo" title="To do">
      <View style={styles.page}>
        {off && <ReviewBanner state={{ kind: "sharing-off", since: off.on ?? "" }} onPress={() => router.push("/connect")} />}
        {arriving && <ReviewBanner state={{ kind: "arriving", got: onboarding.records?.got, of: onboarding.records?.of }} />}

        {declined ? (
          <NotConnected line={keepTogether("Your to do list appears once your records are connected.")} onConnect={() => router.push("/connect")} />
        ) : (
          <>
            {open + t.done.length > 0 && <FilterChips options={shows} value={show} onChange={setShow} label="Show" scroll />}

            {all && open === 0 && <EmptyState art="calendar" artSize={96} title="Nothing to do right now" />}
            {show === "overdue" && late.length === 0 && <EmptyState art="calendar" artSize={96} title="Nothing overdue" />}
            {show === "upcoming" && t.coming.length + t.booked.length === 0 && <EmptyState art="calendar" artSize={96} title="Nothing coming up" />}
            {show === "completed" && t.done.length === 0 && <EmptyState art="calendar" artSize={96} title="Nothing completed yet" />}

            {show === "overdue" && late.length > 0 && <Section title="Overdue">{late.map((item) => row(item, { withAction: true }))}</Section>}

            {all && t.needs.length > 0 && (
              <Section title="Needs your attention" badge={late.length > 0 ? `${late.length} overdue` : undefined}>
                {t.needs.map((item) => row(item, { withAction: true }))}
              </Section>
            )}
            {(all || show === "upcoming") && t.coming.length > 0 && <Section title="Upcoming">{t.coming.map((item) => row(item, { facts: true }))}</Section>}
            {all && t.visit.length > 0 && <Section title="For your next visit">{t.visit.map((item) => row(item))}</Section>}
            {/* The heading says they are booked; each row keeps its day and
                where. */}
            {(all || show === "upcoming") && t.booked.length > 0 && <Section title="Booked">{t.booked.map((item) => row(item, { facts: true }))}</Section>}
            {(all || show === "completed") && t.done.length > 0 && <Section title="Done recently">{t.done.map((item) => row(item))}</Section>}
          </>
        )}
      </View>
    </TabScreen>
  )
}

/** A group's label and its rows on one card: Figma's 14 medium in Grey/08,
    16 above the card. */
function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {!!badge && (
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Group>{children}</Group>
    </View>
  )
}

/** One To do row: a teal tile (or a date block for something on a day),
    the title, "Overdue" or the facts split by dots under it, and the row's
    one small action, or a chevron when the row opens a page. The action's
    pill sits centred on the row's words. */
function TodoRow({
  item,
  late,
  urgent,
  facts,
  action,
  onPress,
}: {
  item: TodoItem
  late?: boolean
  urgent?: boolean
  facts?: string
  action?: { label: string; onPress: () => void; quiet?: boolean }
  onPress?: () => void
}) {
  // "Not booked yet. Due by Oct 21" as two facts: "Not booked yet" and
  // "Due by Oct 21".
  const parts = facts
    ? facts
        // Plain spaces only: a held "Dr.\u00A0Lee" is never split.
        .split(/\. +/)
        .map((p) => p.replace(/\.$/, ""))
        .filter(Boolean)
    : []
  const spoken = item.date ? spokenDate(item.date) : undefined
  // A late test says when it was due, a medicine check asks for a look,
  // and any other needs row reads its own line.
  const due = late ? `Due ${shortDay(dateOfAt(item.sortAt))}` : undefined
  const line = due ?? (item.kind === "meds" ? "Please review" : item.group === "needs" ? item.meta : undefined)
  const label = [item.title, late ? "Overdue" : undefined, line, spoken, ...parts, item.note].filter(Boolean).join(", ")
  const body = (
    <>
      {item.date ? (
        <DateBlock date={item.date} />
      ) : (
        <Tile hue={urgent ? "red" : "teal"}>
          <RecordIcon name={item.icon} size={16} color={urgent ? HUE.red.ink : HUE.teal.ink} />
        </Tile>
      )}
      <View style={styles.words}>
        <Text style={styles.title}>{item.title}</Text>
        {!!line && <Text style={late ? styles.late : styles.fact}>{line}</Text>}
        {/* One line of words, so a long fact wraps as a sentence does;
            the dots are drawn in the chevron grey. */}
        {parts.length > 0 && (
          <Text style={styles.fact}>
            {parts.map((p, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Text style={styles.factDot}>{"\u2002\u2022\u2002"}</Text>}
                {p}
              </React.Fragment>
            ))}
          </Text>
        )}
        {!!item.note && <Text style={styles.note}>{item.note}</Text>}
      </View>
      {action ? (
        action.quiet ? (
          <SmallLink onPress={action.onPress} accessibilityLabel={`${action.label}: ${item.title}`}>
            {action.label}
          </SmallLink>
        ) : (
          <SmallAction onPress={action.onPress} accessibilityLabel={`${action.label}: ${item.title}`}>
            {action.label}
          </SmallAction>
        )
      ) : (
        onPress && <CaretRight size={16} color={card.chevron} />
      )}
    </>
  )
  const look = [styles.row, !!item.date && styles.rowDated]
  if (!onPress)
    return (
      <View style={look} accessible={!action} accessibilityLabel={action ? undefined : label}>
        {body}
      </View>
    )
  // With an action, a screen reader hears the row as one button that opens
  // the item, its pill offered as an action on it ("Book").
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityActions={action ? [{ name: "activate" }, { name: "action", label: action.label }] : undefined}
      onAccessibilityAction={action ? (e) => (e.nativeEvent.actionName === "action" ? action.onPress() : onPress()) : undefined}
      style={({ pressed }) => [...look, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // Sections sit space.section apart, as on every tab.
  page: { gap: space.section },
  section: { gap: space.gutter },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { ...type.title, color: ink.detail },
  badge: { flexDirection: "row", alignItems: "center", gap: 6 },
  badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: HUE.red.ink },
  badgeText: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: HUE.red.ink },

  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  // A date block stands 10 from its words.
  rowDated: { gap: 10 },
  pressed: { opacity: 0.6 },
  words: { flex: 1, gap: space.stack },
  title: { ...type.title, color: ink.detail },
  late: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: HUE.red.ink },
  fact: { ...type.label },
  factDot: { color: card.chevron },
  note: { ...type.metaStrong, color: ink.primary },
})
