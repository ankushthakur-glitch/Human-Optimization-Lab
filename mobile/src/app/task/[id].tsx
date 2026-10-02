import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { GAP_ICON, gapHue, keepTogether, reminderLine, reminderSteps } from "@/components/care-gap"
import { BookedSheet, BookIt, CLINIC, withTold } from "@/components/care-orders-book"
import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { IconCalendar } from "@/components/icons"
import { RecordIcon } from "@/components/record-icons"
import { Block, Card, Group, HUE, NeedsRow, SaveQuestion, Status, Steps, TextAction, Tile } from "@/components/record-kit"
import { toast } from "@/components/toast"
import { Button } from "@/components/ui"
import { call } from "@/lib/links"
import { dateOfAt, dayLabel, localDay, shortDay } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { CARE_GAPS, GAP_LABEL, MARKER_CARE, PROVENANCE_LABEL, order as findOrder } from "@/lib/record"
import { space, type } from "@/lib/theme"
import { bookingOf } from "@/lib/todo"

/* One care gap, found from the record (FINAL-SPEC C.9): what kind it is,
   why it is open in one sentence, where its reminders have got to, and the
   one way forward that fits it (F-60, A-26):

   book   the test's own ways to book (the order's "Book it")
   call   call the clinic, or say it is booked
   talk   save the question for the next visit, or ask about it

   It closes when the record shows it happened, not when she says so. */

export default function CareGapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const onboarding = useOnboarding()
  const [sheet, setSheet] = React.useState(false)

  const gap = CARE_GAPS.find((g) => g.id === id)
  if (!gap) return <PageNotFoundState />

  const hue = gapHue(gap)
  const test = gap.action === "book" ? findOrder(gap.id) : undefined
  // The test it asks for, booked, or the visit she told us she booked: read
  // where every screen reads a booking (lib/todo.ts bookingOf).
  const testBooking = test ? bookingOf(test.id, onboarding) : undefined
  const visitBooking = test ? undefined : bookingOf(gap.id, onboarding)
  const doneAt = onboarding.gapsDone?.[gap.id]
  const booking = testBooking ?? visitBooking
  const booked = !doneAt && !!booking
  // Said once, at the top; the rows under it change it rather than say it
  // again.
  const bookedWords = booking ? `Booked for ${dayLabel(booking.date)}${booking.time ? `, ${booking.time}` : ""}` : "Booked"
  const reminder = reminderLine(gap)
  // The result a question is about, for the visit's list of questions.
  const about = Object.entries(MARKER_CARE).find(([, care]) => care.gaps?.includes(gap.id))?.[0]

  const save = (day: Date, where?: string) => {
    setSheet(false)
    if (test) {
      // A test booked and paid through Inlay keeps its booking.
      const bookings = withTold(onboarding.bookings, test.id, day, where)
      if (!bookings) return
      onboarding.save({ bookings }).catch(() => {})
    } else onboarding.save({ booked: { ...onboarding.booked, [gap.id]: localDay(day) } }).catch(() => {})
    toast(test ? "Saved. We'll mark it done when the result arrives." : "Saved")
  }

  return (
    <View style={styles.screen}>
      <FlowScreen page title={gap.title}>
        <Card style={styles.head}>
          <View style={styles.kindLine}>
            <Tile hue={hue}>
              <RecordIcon name={GAP_ICON[gap.kind]} size={18} color={HUE[hue].ink} />
            </Tile>
            <Text style={styles.kind}>{GAP_LABEL[gap.kind]}</Text>
          </View>
          <Text style={styles.why}>{keepTogether(gap.why)}</Text>
          {doneAt ? (
            <Status tone="ok">{`Done, ${shortDay(dateOfAt(doneAt))}`}</Status>
          ) : booked ? (
            <Status tone="primary">{bookedWords}</Status>
          ) : (
            !!reminder && <Text style={styles.reminder}>{reminder}</Text>
          )}
        </Card>

        {!doneAt && gap.action === "book" && test && !booked && <BookIt order={test} onBooked={() => setSheet(true)} />}

        {!doneAt && gap.action === "book" && test && booked && (
          <Group>
            <NeedsRow
              icon={<RecordIcon name="labs" size={18} color={HUE.teal.ink} />}
              title={test.name}
              meta={testBooking?.where || PROVENANCE_LABEL.patient}
              onPress={() => router.push({ pathname: "/order/[id]", params: { id: test.id } })}
            />
          </Group>
        )}

        {!doneAt && gap.action === "call" && (
          <View style={styles.actions}>
            {!booked && <Button onPress={() => call(PATIENT.practicePhone)}>{`Call ${CLINIC}`}</Button>}
            <Group>
              {/* Once booked, the card above says so and when; this row
                  moves the day if the clinic moves it. */}
              <NeedsRow icon={<IconCalendar size={18} color={HUE.teal.ink} />} title={booked ? "Change the day" : "I booked it"} onPress={() => setSheet(true)} />
            </Group>
          </View>
        )}

        {!doneAt && gap.action === "talk" && !!gap.question && (
          <Block title="Save for my next visit">
            <Group>
              <View style={styles.question}>
                <Text style={styles.questionText}>{keepTogether(gap.question)}</Text>
                <SaveQuestion text={gap.question} about={about} />
              </View>
            </Group>
            <TextAction chevron onPress={() => router.push({ pathname: "/assistant", params: { ask: gap.question } })}>
              Ask about this
            </TextAction>
          </Block>
        )}

        {gap.reminders > 0 && !doneAt && (
          <Block title="Reminders">
            <Card style={styles.steps}>
              <Steps steps={reminderSteps(gap, "Then Dr. Patel and your clinic follow up", booked)} />
            </Card>
          </Block>
        )}
      </FlowScreen>

      {sheet && <BookedSheet withWhere={!!test} onSave={save} onClose={() => setSheet(false)} />}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  head: { gap: space.item },
  kindLine: { flexDirection: "row", alignItems: "center", gap: space.lead },
  kind: { ...type.title, flex: 1 },
  why: { ...type.body },
  reminder: { ...type.metaStrong },
  actions: { gap: space.item },
  // The question and its pill side by side, on the kit's row metrics.
  question: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: space.rowY },
  questionText: { ...type.title, flex: 1 },
  // Each step keeps space.item under it; the card adds what brings the
  // last one to a card's padding, as at the top.
  steps: { paddingBottom: space.card - space.item },
})
