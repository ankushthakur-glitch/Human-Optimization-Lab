import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { GAP_ICON, keepTogether, reminderLine, reminderSteps } from "@/components/care-gap"
import { BookedSheet, BookIt, BookSheet, ElsewhereSheet, elsewhereSave, withTold, type Report } from "@/components/care-orders-book"
import { HeadCard, KindLine, Reminders } from "@/components/care-orders-rows"
import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { AskButton } from "@/components/hol"
import { CalendarCheck } from "@/components/ph"
import { RecordIcon } from "@/components/record-icons"
import { Block, Card, Group, HUE, NeedsRow, SaveQuestion, Status } from "@/components/record-kit"
import { toast } from "@/components/toast"
import { dateOfAt, dayLabel, localDay, shortDay } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { CARE_GAPS, GAP_LABEL, MARKER_CARE, PROVENANCE_LABEL, order as findOrder } from "@/lib/record"
import { font, ink, space, type } from "@/lib/theme"
import { bookingOf } from "@/lib/todo"

/* One care gap, found from the record (FINAL-SPEC C.9): what kind it is,
   why it is open in one sentence, where its reminders have got to, and the
   one way forward that fits it (F-60, A-26):

   book   the test's own ways to book (the order's "Book it")
   call   say it is booked
   talk   save the question for the next visit, or ask about it

   It closes when the record shows it happened, not when she says so.

   Figma "Hol" (5 Oct 2026, "Follow up after urgent care", "Colorectal
   cancer screening", "Talk with Dr. Patel about your A1c"): the tinted
   head card with the kind, the why and the reminder line; the way
   forward; the reminders; "Ask to Health Agent" alone in the footer. */

export default function CareGapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const onboarding = useOnboarding()
  const [sheet, setSheet] = React.useState<"booked" | "book" | "elsewhere">()

  const gap = CARE_GAPS.find((g) => g.id === id)
  if (!gap) return <PageNotFoundState />

  const test = gap.action === "book" ? findOrder(gap.id) : undefined
  // The test it asks for, booked, or the visit she told us she booked: read
  // where every screen reads a booking (lib/todo.ts bookingOf).
  const testBooking = test ? bookingOf(test.id, onboarding) : undefined
  const visitBooking = test ? undefined : bookingOf(gap.id, onboarding)
  const doneAt = onboarding.gapsDone?.[gap.id]
  const booking = testBooking ?? visitBooking
  const booked = !doneAt && !!booking
  // Done somewhere else, as she told us: waiting for the result.
  const elsewhere = !doneAt && !booked && !!test && onboarding.testAnswers?.[test.id]?.answer === "elsewhere"
  // Said once, at the top; the rows under it change it rather than say it
  // again.
  const bookedWords = booking ? `Booked for ${dayLabel(booking.date)}${booking.time ? `, ${booking.time}` : ""}` : "Booked"
  const reminder = reminderLine(gap)
  // The result a question is about, for the visit's list of questions.
  const about = Object.entries(MARKER_CARE).find(([, care]) => care.gaps?.includes(gap.id))?.[0]

  const save = (day: Date, where?: string) => {
    setSheet(undefined)
    if (test) {
      // A test booked and paid through Inlay keeps its booking.
      const bookings = withTold(onboarding.bookings, test.id, day, where)
      if (!bookings) return
      onboarding.save({ bookings }).catch(() => {})
    } else onboarding.save({ booked: { ...onboarding.booked, [gap.id]: localDay(day) } }).catch(() => {})
    toast(test ? "Saved. We'll mark it done when the result arrives." : "Saved")
  }

  const saveElsewhere = (day: Date, where?: string, report?: Report) => {
    setSheet(undefined)
    if (!test) return
    onboarding.save(elsewhereSave(onboarding, test, day, where, report)).catch(() => {})
    toast(report ? "Saved. Your report is being checked." : "Saved. We'll add the result when it arrives.")
  }

  // The assistant opens on this gap: its question, or what it is.
  const ask = gap.question ?? `What should I do about my ${gap.title.charAt(0).toLowerCase()}${gap.title.slice(1)}?`

  return (
    <View style={styles.screen}>
      <FlowScreen
        page
        title={gap.title}
        footer={
          <AskButton params={{ ask }} />
        }
      >
        <HeadCard>
          <KindLine icon={<RecordIcon name={GAP_ICON[gap.kind]} size={16} color={HUE.teal.ink} />}>{GAP_LABEL[gap.kind]}</KindLine>
          <Text style={styles.why}>{keepTogether(gap.why)}</Text>
          {doneAt ? (
            <Status tone="ok">{`Done, ${shortDay(dateOfAt(doneAt))}`}</Status>
          ) : booked ? (
            <Status tone="primary">{bookedWords}</Status>
          ) : (
            !!reminder && <Text style={styles.reminder}>{reminder}</Text>
          )}
        </HeadCard>

        {!doneAt && gap.action === "book" && test && !booked && !elsewhere && <BookIt order={test} onBooked={() => setSheet("booked")} onPartner={() => setSheet("book")} onElsewhere={() => setSheet("elsewhere")} />}

        {!doneAt && gap.action === "book" && test && (booked || elsewhere) && (
          <Group>
            <NeedsRow
              icon={<RecordIcon name="labs" size={16} color={HUE.teal.ink} />}
              title={test.name}
              meta={elsewhere ? "Done somewhere else. Waiting for the result" : testBooking?.where || PROVENANCE_LABEL.patient}
              onPress={() => router.push({ pathname: "/order/[id]", params: { id: test.id } })}
            />
          </Group>
        )}

        {/* Once booked, the card above says so and when; this row moves
            the day if the clinic moves it. */}
        {!doneAt && gap.action === "call" && (
          <Group>
            <NeedsRow icon={<CalendarCheck size={16} color={HUE.teal.ink} />} title={booked ? "Change the day" : "I booked it"} onPress={() => setSheet("booked")} />
          </Group>
        )}

        {!doneAt && gap.action === "talk" && !!gap.question && (
          <Block title="Save for my next visit">
            <Card style={styles.question}>
              <Text style={styles.questionText}>{keepTogether(gap.question)}</Text>
              <SaveQuestion text={gap.question} about={about} />
            </Card>
          </Block>
        )}

        {gap.reminders > 0 && !doneAt && (
          <Block title="Reminders">
            <Card>
              <Reminders steps={reminderSteps(gap, "Then Dr. Patel's team will reach out", booked)} />
            </Card>
          </Block>
        )}
      </FlowScreen>

      {sheet === "booked" && <BookedSheet withWhere={!!test} onSave={save} onClose={() => setSheet(undefined)} />}
      {sheet === "book" && test && <BookSheet order={test} onClose={() => setSheet(undefined)} />}
      {sheet === "elsewhere" && test && <ElsewhereSheet onSave={saveElsewhere} onClose={() => setSheet(undefined)} />}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  why: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: ink.detail },
  reminder: { ...type.metaStrong, color: ink.detail },
  // The question and its pill side by side.
  question: { flexDirection: "row", alignItems: "center", gap: space.item },
  questionText: { flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink.detail },
})
