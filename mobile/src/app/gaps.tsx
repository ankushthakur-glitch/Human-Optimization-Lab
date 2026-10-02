import { router, type Href } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { keepTogether, withReminders } from "@/components/care-gap"
import { RecordIcon } from "@/components/record-icons"
import { Block, EmptyState, Group, HUE, NeedsRow, NotConnected, ReviewBanner, SummaryLine } from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { experience, sharingOff } from "@/lib/experience"
import { call } from "@/lib/links"
import { useOnboarding } from "@/lib/onboarding"
import { CARE_GAPS } from "@/lib/record"
import { space } from "@/lib/theme"
import { opensPage, removeQuestion, todo, type TodoItem } from "@/lib/todo"

/* To do, a tab: everything open for the patient in one guided list,
   counted exactly as Home counts it (lib/todo.ts, A-48). No hero: Home
   holds the one strong block. A line says how much there is, then

   Needs you            every item, each with its one action
   Coming up            appointments, and tests ordered and not due yet
   For your next visit  care gaps to talk through, and her saved questions
   Booked               tests and visits she booked, until the result
   Done recently        results in over the last 90 days

   An empty group is left out. With nothing open, one calm empty state;
   with nothing ever connected, the same not connected state as every tab;
   with sharing turned off, the same banner as every tab, over what was
   collected before; while the record is still arriving, its banner over
   the clinic's appointments. */

export default function ToDoScreen() {
  const onboarding = useOnboarding()
  const t = todo(onboarding)
  const exp = experience(onboarding)
  const declined = exp === "declined"
  // While the record arrives only the clinic's appointments are known, so
  // nothing can be called caught up yet.
  const arriving = exp === "building"
  const off = sharingOff(onboarding)
  const open = t.needs.length + t.coming.length + t.visit.length + t.booked.length

  const go = (href: Href) => router.push(href)

  const row = (item: TodoItem, opts: { meta?: string; withAction?: boolean; tag?: boolean } = {}) => {
    const a = item.action
    // A saved question is removed in place; it opens the visit it is for.
    const question = item.kind === "question" ? item.id.replace(/^question:/, "") : undefined
    const action = question
      ? { label: "Remove", quiet: true, onPress: () => void removeQuestion(onboarding, onboarding.save, question).catch(() => {}) }
      : opts.withAction && a
        ? { label: a.label, onPress: () => (a.tel ? call(a.tel) : a.href ? go(a.href as Href) : go(item.href as Href)) }
        : undefined
    // A row that would only open this list again (a saved question, a
    // starting test booked in setup) is not a button.
    const opens = opensPage(item)
    const meta = opts.meta ?? item.meta
    // The row's action sits on its title line, so long facts ("Dr. Patel
    // ordered it on Mar 4. Reminder 3 of 3. Dr. Patel's team will reach
    // out.") take the row's full width; a saved question runs to two or
    // three lines, its last line never a lone word.
    return (
      <NeedsRow
        key={item.id}
        icon={<RecordIcon name={item.icon} size={18} color={HUE[item.hue].ink} />}
        hue={item.hue}
        date={item.date}
        title={keepTogether(item.title)}
        tag={opts.tag === false ? undefined : item.tag}
        meta={meta ? keepTogether(meta) : undefined}
        note={item.note}
        action={action}
        onPress={opens ? () => go(item.href as Href) : undefined}
        chevron={opens}
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
            {t.needs.length + t.coming.length + t.visit.length > 0 && <SummaryLine done={t.needs.length === 0 && !arriving}>{t.summary}</SummaryLine>}

            {open === 0 && <EmptyState art="calendar" artSize={96} title="Nothing to do right now" />}

            {t.needs.length > 0 && (
              <Block title="Needs you" variant="title">
                <Group>{t.needs.map((item) => row(item, { meta: withReminders(item.meta, gapOf(item)), withAction: true }))}</Group>
              </Block>
            )}

            {t.coming.length > 0 && (
              <Block title="Coming up" variant="title">
                <Group>{t.coming.map((item) => row(item))}</Group>
              </Block>
            )}

            {t.visit.length > 0 && (
              <Block title="For your next visit" variant="title">
                <Group>{t.visit.map((item) => row(item))}</Group>
              </Block>
            )}

            {/* The heading says they are booked, so the rows do not say it
                again; each keeps its day and where. */}
            {t.booked.length > 0 && (
              <Block title="Booked" variant="title">
                <Group>{t.booked.map((item) => row(item, { tag: false }))}</Group>
              </Block>
            )}

            {t.done.length > 0 && (
              <Block title="Done recently" variant="title">
                <Group>{t.done.map((item) => row(item))}</Group>
              </Block>
            )}
          </>
        )}
      </View>
    </TabScreen>
  )
}

/** The care gap behind an item: a test's reminders ("order:mammogram"), or
    the gap itself ("gap:follow-up"). */
function gapOf(item: TodoItem) {
  if (item.kind !== "order" && item.kind !== "gap") return undefined
  const id = item.id.replace(/^(order|gap):/, "")
  return CARE_GAPS.find((g) => g.id === id)
}

const styles = StyleSheet.create({
  // Sections sit space.section apart, as on every tab.
  page: { gap: space.section },
})
