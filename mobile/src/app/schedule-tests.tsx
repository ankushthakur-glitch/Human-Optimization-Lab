import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { DatePickerSheet, TimePickerSheet } from "@/components/date-time-picker"
import { Bone, CalendarBlank, CheckCircle, Clock, Drop, MapPin, Wind } from "@/components/ph"
import { PlanStepPage } from "@/components/plan-steps"
import { Card, HUE, Tile, toast } from "@/components/record-kit"
import { SelectField } from "@/components/ui"
import { BASELINE_TESTS, TEST_SLOTS, chosenTests, openDays, type BaselineTest, type BaselineTestId } from "@/lib/baseline-tests"
import { clock, dayFrom, dayLabel, localDay } from "@/lib/member"
import type { Booking } from "@/lib/onboarding"
import { useOnboarding } from "@/lib/onboarding"
import { color, space, type } from "@/lib/theme"
import { bookingOf, localIso } from "@/lib/todo"

/* "Schedule your tests": opens from "Schedule my tests" on the enrolled
   page (/enrolled) or "Your tests" (/your-tests), once her physician has
   sorted the tests. Each Inlay test with its
   place, a Date and a Time field; "Confirm schedule" books
   them all and only then opens the confirmation (/schedule-confirmed):
   "Personalize my care" there leads to the flourishing questions,
   "I'll do this later" walks on to her plan. "Schedule later" stays on the
   enrolled page, which leaves them in To do (lib/todo.ts).

   Each test's day and time are two fields: Date opens the calendar
   (components/date-time-picker.tsx) with its open weekdays, then Time
   its times. The same page with ?test=dexa books or moves one test from To do: the
   day and time she has preselected, and Save back. */

type Slot = { day?: string; time?: string }

/** "7:30 AM" on a local day key, as a date. */
function slotDate(day: string, time: string) {
  const [y, m, d] = day.split("-").map(Number)
  const t = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(time)
  const hours = t ? (Number(t[1]) % 12) + (t[3].toUpperCase() === "PM" ? 12 : 0) : 9
  return new Date(y, m - 1, d, hours, t ? Number(t[2]) : 0)
}

/** A slot as the store keeps a booking made through her plan: nothing paid
    here, the place, and the local day and time. */
function bookingOfSlot(test: BaselineTest, day: string, time: string): Booking {
  const at = slotDate(day, time)
  return { where: TEST_SLOTS[test.id].where, when: `${dayLabel(at)}, ${time}`, price: "", paid: "", at: localIso(at), time }
}

export default function ScheduleTestsScreen() {
  const { test: one } = useLocalSearchParams<{ test?: string }>()
  const onboarding = useOnboarding()
  const single = one && one in BASELINE_TESTS ? BASELINE_TESTS[one as BaselineTestId] : undefined
  // Tests her physician sent to her insurance are ordered by the office, never booked here.
  const sent = new Set(onboarding.testReview?.insurance ?? [])
  const tests = single ? [single] : chosenTests(onboarding.startingTests?.ids ?? onboarding.baselinePicks).filter((t) => !sent.has(t.id))
  // Three weeks of weekdays open on the calendar.
  const [days] = React.useState(() => openDays(new Date(), 15))
  const [slots, setSlots] = React.useState<Record<string, Slot>>(() => {
    // A test already booked opens on its own day and time, when that time
    // is one of the test's openings.
    const now: Record<string, Slot> = {}
    for (const t of tests) {
      const b = bookingOf(t.id, onboarding)
      const time = b && (b.time ?? clock(b.date.getHours(), b.date.getMinutes()))
      if (b && time && TEST_SLOTS[t.id].times.includes(time)) now[t.id] = { day: localDay(b.date), time }
    }
    return now
  })
  const [saving, setSaving] = React.useState(false)
  // The day or time sheet open for one test.
  const [picking, setPicking] = React.useState<{ test: BaselineTest; field: "day" | "time" }>()

  const set = (id: string, slot: Slot) => setSlots((all) => ({ ...all, [id]: { ...all[id], ...slot } }))
  // A day picked opens its times next, until the test has both.
  const pick = (id: string, slot: Slot) => {
    set(id, slot)
    const test = picking?.test
    setPicking(slot.day && test && !slots[id]?.time ? { test, field: "time" } : undefined)
  }
  const booked = tests.every((t) => slots[t.id]?.day && slots[t.id]?.time)

  async function next() {
    if (saving) return
    setSaving(true)
    try {
      if (!booked) return
      const bookings = { ...onboarding.bookings }
      for (const t of tests) bookings[t.id] = bookingOfSlot(t, slots[t.id].day!, slots[t.id].time!)
      await onboarding.save({ bookings })
      if (single) {
        toast(`${single.name} scheduled`)
        return router.canGoBack() ? router.back() : router.replace("/gaps")
      }
      router.replace("/schedule-confirmed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PlanStepPage
      headerTitle={single ? (bookingOf(single.id, onboarding) ? "Reschedule test" : "Schedule test") : "Schedule tests"}
      title={single ? single.name : "Pick a day and time"}
      onNext={next}
      nextLabel={single ? "Save" : "Confirm schedule"}
      nextWide
      nextDisabled={!booked}
      nextPending={saving}
      overlay={
        picking &&
        (picking.field === "day" ? (
          <DatePickerSheet
            title={`Date for ${shortName(picking.test)}`}
            open={days.map(localDay)}
            value={slots[picking.test.id]?.day}
            onPick={(day) => pick(picking.test.id, { day })}
            onClose={() => setPicking(undefined)}
          />
        ) : (
          <TimePickerSheet
            title={`Time for ${shortName(picking.test)}`}
            times={TEST_SLOTS[picking.test.id].times}
            value={slots[picking.test.id]?.time}
            onPick={(time) => pick(picking.test.id, { time })}
            onClose={() => setPicking(undefined)}
          />
        ))
      }
    >
      <View style={styles.tests}>
        {tests.map((t) => (
          <TestSlots key={t.id} test={t} slot={slots[t.id] ?? {}} onPick={(field) => setPicking({ test: t, field })} />
        ))}
      </View>
    </PlanStepPage>
  )
}

/** "Blood panel", "DEXA", "RMR": a test named in a picker's title. */
const shortName = (t: BaselineTest) => (t.id === "panel" ? "blood panel" : t.id === "dexa" ? "DEXA" : "RMR")

/** Each test's mark on its tile. */
const MARK: Record<BaselineTestId, React.ComponentType<{ size?: number; color?: string; weight?: "regular" | "fill" }>> = {
  panel: Drop,
  dexa: Bone,
  rmr: Wind,
}

/** One test on its own card: its mark, its name, then the Location field and the
    Date and Time fields side by side, each opening its sheet. A teal check
    shows beside the name once both are chosen. */
function TestSlots({ test, slot, onPick }: { test: BaselineTest; slot: Slot; onPick: (field: "day" | "time") => void }) {
  const where = TEST_SLOTS[test.id].where
  const Mark = MARK[test.id]
  const set = !!slot.day && !!slot.time
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Tile hue="teal" size={36}>
          <Mark size={18} color={HUE.teal.ink} />
        </Tile>
        <View style={styles.words}>
          <Text style={styles.name} numberOfLines={2}>
            {test.name}
          </Text>
        </View>
        {set && <CheckCircle size={22} weight="fill" color={color.primary} />}
      </View>
      {/* Each test has one place today, so the field shows it and has no
          other opening to offer. */}
      <SelectField
        label={`Location for ${test.name}`}
        hideLabel
        placeholder="Select location"
        value={where}
        icon={({ color: c }) => <MapPin size={18} color={c} />}
        onPress={() => {}}
      />
      <View style={styles.pair}>
        <View style={styles.half}>
          <SelectField
            label={`Date for ${test.name}`}
            hideLabel
            placeholder="Select date"
            value={slot.day ? dayLabel(dayFrom(slot.day)) : undefined}
            icon={({ color: c }) => <CalendarBlank size={18} color={c} />}
            onPress={() => onPick("day")}
          />
        </View>
        <View style={styles.half}>
          <SelectField
            label={`Time for ${test.name}`}
            hideLabel
            placeholder="Select time"
            value={slot.time}
            icon={({ color: c }) => <Clock size={18} color={c} />}
            onPress={() => onPick("time")}
          />
        </View>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  tests: { gap: space.item },
  card: { gap: space.item },
  head: { flexDirection: "row", alignItems: "center", gap: space.item },
  words: { flex: 1, gap: 2 },
  name: { ...type.section },
  pair: { flexDirection: "row", gap: space.inline },
  half: { flex: 1 },
})
