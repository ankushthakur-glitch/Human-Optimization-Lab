import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { DayRow, NothingYet } from "@/components/progress-parts"
import { RecordIcon } from "@/components/record-icons"
import { Block, Group, HUE, NeedsRow } from "@/components/record-kit"
import { daysBetween, scoreHistory, type DayScore } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { space } from "@/lib/theme"

/* The Plan screen's "Your history" tab: where she has been, a day at a
   time, without leaving the plan. The last two weeks of daily scores, newest
   first, each opening its day; below them the way to the whole history
   (weigh-ins, blood pressure, lab results) on the History page, which stays
   the one place for the long view. */

/** The day page for a row: yesterday by its word, any other day by its key. */
function openDay(d: DayScore) {
  const date = daysBetween(d.date, new Date()) === 1 ? "yesterday" : d.day
  router.push({ pathname: "/day/[date]", params: { date } })
}

export function YourHistory() {
  const s = useOnboarding()
  const days = scoreHistory(s, 14)
  const any = days.some((d) => d.status !== "none")

  return (
    <View style={styles.wrap}>
      {any ? (
        <Block title="Day by day" meta="last 14 days">
          <Group>
            {[...days].reverse().map((d) => (
              <DayRow key={d.day} day={d} onPress={() => openDay(d)} />
            ))}
          </Group>
        </Block>
      ) : (
        <NothingYet />
      )}
      <Group>
        <NeedsRow
          icon={<RecordIcon name="labs" size={16} color={HUE.teal.ink} />}
          title="Weight, blood pressure and lab results"
          meta="Everything since you started"
          onPress={() => router.push("/history")}
        />
      </Group>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.section },
})
