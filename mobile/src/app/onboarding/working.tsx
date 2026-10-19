import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { FlowScreen, Section } from "@/components/flow"
import { Flask, Stethoscope } from "@/components/ph"
import { Group, HUE, NeedsRow, Tile } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { APPOINTMENTS, SCHEDULED_LABS } from "@/lib/record"
import { space } from "@/lib/theme"

/* The record tour's first step, after "Your record is ready" (the value
   phase agreed on the 16 Oct 2026 call with Dr. Blanchard: what the
   platform does for her before what is going the wrong way). Everything
   already booked, lab tests and visits together, grouped by month (layout
   option 3 of the 19 Oct "Upcoming appointments: 10 layouts" canvas):
   the weekday and day, the name, the time and the place, and on the right
   a mark for a lab test or a visit. Medicines are the next step. */

const NEXT = "/onboarding/new-medication" as const

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

type Item = { id: string; at: string; name: string; place: string; kind: "lab" | "visit" }

/** "2026-10-21T10:30" as its local day and "10:30 AM". */
function parts(at: string) {
  const [, y, mo, d, h, mi] = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(at)!.map(Number)
  const day = new Date(y, mo - 1, d)
  return { day, time: `${h % 12 || 12}:${String(mi).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}` }
}

export default function UpcomingAppointmentsScreen() {
  const months = React.useMemo(() => {
    const all: Item[] = [
      ...SCHEDULED_LABS.map((l) => ({ id: l.id, at: l.at, name: l.name, place: l.place, kind: "lab" as const })),
      ...APPOINTMENTS.map((a) => ({ id: a.id, at: a.at, name: a.name, place: a.place, kind: "visit" as const })),
    ].sort((a, b) => a.at.localeCompare(b.at))
    const groups: { label: string; items: Item[] }[] = []
    for (const x of all) {
      const label = MONTHS[parts(x.at).day.getMonth()]
      if (groups.at(-1)?.label !== label) groups.push({ label, items: [] })
      groups.at(-1)!.items.push(x)
    }
    return groups
  }, [])

  return (
    <FlowScreen hol title="Upcoming appointments" description="Lab tests and visits already booked, by month." footer={<Button onPress={() => router.push(NEXT)}>Continue</Button>}>
      <View style={styles.groups}>
        {months.map((m) => (
          <Section key={m.label} title={m.label}>
            <Group>
              {m.items.map((x) => (
                <Row key={x.id} item={x} />
              ))}
            </Group>
          </Section>
        ))}
      </View>
    </FlowScreen>
  )
}

function Row({ item: x }: { item: Item }) {
  const { day, time } = parts(x.at)
  const lab = x.kind === "lab"
  return (
    <NeedsRow
      date={{ weekday: WEEKDAYS[day.getDay()], day: day.getDate() }}
      title={x.name}
      meta={`${time} · ${x.place}`}
      right={
        <Tile hue={lab ? "blue" : "teal"} size={32}>
          {lab ? <Flask size={16} color={HUE.blue.ink} /> : <Stethoscope size={16} color={HUE.teal.ink} />}
        </Tile>
      }
      accessibilityLabel={`${x.name}, ${lab ? "lab test" : "visit"}, ${WEEKDAYS[day.getDay()]} ${MONTHS[day.getMonth()]} ${day.getDate()}, ${time}, ${x.place}`}
      chevron={false}
    />
  )
}

const styles = StyleSheet.create({
  groups: { gap: space.section },
})
