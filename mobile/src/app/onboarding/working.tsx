import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text } from "react-native"

import { FlowScreen, Section } from "@/components/flow"
import { Group, NeedsRow } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { APPOINTMENTS, type Appointment } from "@/lib/record"
import { type } from "@/lib/theme"

/* The step after "Your record is ready", the first of the value phase agreed
   on the 16 Oct 2026 call with Dr. Blanchard: show the patient what the
   platform does for them before it shows what is going the wrong way. This
   one is Upcoming appointments (the "What's coming up" idea of the earlier
   bento, now a screen of its own): the visits already on the patient's
   calendar, each as the appointment card designed on 13 Oct. Medicines are
   the next screen, New medication, never on this one. Nothing here is off
   track, risk, biological age, a price or an upgrade. The patient moves on
   to New medication. */

/** New medication, the next screen. */
const NEXT = "/onboarding/new-medication" as const

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** "2026-10-21T10:30" as "Wed, 10:30 AM". */
function whenOf(at: string): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(at)
  if (!m) return undefined
  const h = Number(m[4])
  const day = WEEKDAYS[new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay()]
  return `${day}, ${h % 12 || 12}:${m[5]} ${h < 12 ? "AM" : "PM"}`
}

export default function UpcomingAppointmentsScreen() {
  const upcoming = React.useMemo(() => [...APPOINTMENTS].sort((a, b) => a.at.localeCompare(b.at)), [])

  return (
    <FlowScreen hol title="Upcoming appointments" footer={<Button onPress={() => router.push(NEXT)}>Continue</Button>}>
      {upcoming.length > 0 && (
        <Section title={`${upcoming.length} ${upcoming.length === 1 ? "appointment" : "appointments"} coming up`}>
          <Group>
            {upcoming.map((a) => (
              <Row key={a.id} appointment={a} />
            ))}
          </Group>
        </Section>
      )}

      <Text style={styles.note}>From your own record. General information, not medical advice.</Text>
    </FlowScreen>
  )
}

function Row({ appointment: a }: { appointment: Appointment }) {
  return (
    <NeedsRow
      date={a.at}
      title={a.name}
      meta={[whenOf(a.at), a.with, a.place].filter(Boolean).join(", ")}
      tag={{ tone: "primary", label: "Booked" }}
      chevron={false}
    />
  )
}

const styles = StyleSheet.create({
  note: { ...type.meta, textAlign: "center" },
})
