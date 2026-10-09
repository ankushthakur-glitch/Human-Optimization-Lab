import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { CheckInSheet, type CheckInKind } from "@/components/check-in-sheet"
import { PressureChart, ProgressChart, WeekBars, formatNumber } from "@/components/charts"
import { FlowScreen } from "@/components/flow"
import { DayRow, EntryRow, NothingYet, Readout, SinceStartRows, changeSince, entryDay, lastDays, sourceOf } from "@/components/progress-parts"
import { RecordIcon } from "@/components/record-icons"
import { Block, Card, ChipRow, Group, HUE, NeedsRow, SmallAction, Status, Tabs, TextAction } from "@/components/record-kit"
import { useExperience, useMarkers } from "@/lib/experience"
import { averageOf, dateOfAt, datedOf, dayLabel, daysBetween, pressureReadingsOf, progress, progressChartOf, scoreHistory, type DayScore, type Measure } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { pointStatus, trendCounts } from "@/lib/trends"
import { space, type } from "@/lib/theme"

/* History (FINAL-SPEC C.26): everything since the member started, like an
   account history (M-48): pick what to look at, see it summed up in one
   chart, then every entry under it, newest first. Day by day, as Ed asked
   ("look back to last week Tuesday", M-47): the last two weeks of daily
   scores, then a row per day that opens the day. Her weigh ins over 30
   days, 3 months or since she started, without the forecast (that lives on
   Progress). Her home blood pressure readings. Her lab results against her
   starting tests, with the way to every result and trend.

   Opened from Your record on the member home and from Progress; reached a
   tap away from the first screen, never on it. Readings she adds here open
   the shared check in sheet and join the chart and the list at once. */

type Show = "days" | "weight" | "bp" | "labs"

const SHOWS: { value: Show; label: string }[] = [
  { value: "days", label: "Days" },
  { value: "weight", label: "Weight" },
  { value: "bp", label: "Blood pressure" },
  { value: "labs", label: "Lab results" },
]

type Range = "30d" | "3m" | "all"

const RANGES: { value: Range; label: string }[] = [
  { value: "30d", label: "30 days" },
  { value: "3m", label: "3 months" },
  { value: "all", label: "Since you started" },
]

const RANGE_DAYS: Record<Exclude<Range, "all">, number> = { "30d": 30, "3m": 91 }

/** The day page for a row or a bar: yesterday by its word, so the page is
    titled "Yesterday" as it is from Home; any other day by its key. */
function openDay(d: DayScore) {
  const date = daysBetween(d.date, new Date()) === 1 ? "yesterday" : d.day
  router.push({ pathname: "/day/[date]", params: { date } })
}

export default function HistoryScreen() {
  const s = useOnboarding()
  const { experience } = useExperience()
  const markers = useMarkers()
  const [show, setShow] = React.useState<Show>("days")
  // History starts on the recent stretch; the whole journey is Progress's
  // first view, and one tap here.
  const [range, setRange] = React.useState<Range>("30d")
  const [sheet, setSheet] = React.useState<CheckInKind>()
  // History belongs to a plan that has started; a paused plan keeps it.
  const started = experience === "member" || experience === "paused"

  const p = progress(s)
  const days = scoreHistory(s, 14)
  const weights = range === "all" ? p.weight.series : lastDays(p.weight.series, RANGE_DAYS[range])
  const readings = p.pressure.series.filter((m) => m.value2 !== undefined)
  const anyDay = days.some((d) => d.status !== "none")
  const counts = trendCounts(markers)

  return (
    <View style={styles.fill}>
      <FlowScreen page title="History">
        {!started ? (
          <NothingYet />
        ) : (
          <>
            <View style={styles.top}>
              <ChipRow options={SHOWS} value={show} onChange={setShow} />
              {show === "days" && (anyDay ? <DaysChart days={days} /> : <NothingYet />)}
              {show === "weight" && (weights.length ? <WeightChart p={p} range={range} onRange={setRange} series={weights} /> : <NothingYet />)}
              {show === "bp" && (readings.length ? <PressureHistory list={readings} /> : <NothingYet />)}
              {show === "labs" && (
                <Group>
                  <NeedsRow
                    icon={<RecordIcon name="labs" size={16} color={HUE.teal.ink} />}
                    title="Your results and trends"
                    meta={counts.toWatch ? `${counts.total} results, ${counts.toWatch} to watch` : `${counts.total} results`}
                    onPress={() => router.push("/results")}
                  />
                </Group>
              )}
            </View>

            {show === "days" && anyDay && (
              <Block title="Day by day">
                <Group>
                  {[...days].reverse().map((d) => (
                    <DayRow key={d.day} day={d} onPress={() => openDay(d)} />
                  ))}
                </Group>
              </Block>
            )}
            {show === "weight" && weights.length > 0 && (
              <Block title="Weigh ins" action={<SmallAction onPress={() => setSheet("weight")}>Add</SmallAction>}>
                <Group>
                  {[...weights].reverse().map((m) => (
                    <EntryRow key={m.at} title={entryDay(m.at)} meta={sourceOf(m)} value={formatNumber(m.value, 1)} unit="lb" spoken={`${formatNumber(m.value, 1)} pounds`} />
                  ))}
                </Group>
              </Block>
            )}
            {show === "bp" && readings.length > 0 && (
              <Block title="Readings" action={<SmallAction onPress={() => setSheet("bp")}>Add</SmallAction>}>
                <Group>
                  {[...readings].reverse().map((m) => (
                    <EntryRow
                      key={m.at}
                      title={entryDay(m.at)}
                      meta={sourceOf(m)}
                      value={`${m.value}/${m.value2}`}
                      unit="mmHg"
                      spoken={`${m.value} over ${m.value2} millimeters of mercury`}
                    />
                  ))}
                </Group>
              </Block>
            )}
            {show === "labs" && <SinceStartRows title="Since you started" />}
          </>
        )}
      </FlowScreen>
      {sheet && <CheckInSheet kind={sheet} onClose={() => setSheet(undefined)} />}
    </View>
  )
}

/** The last two weeks of daily scores. A day with nothing logged is a dot
    on the baseline; a partial day has no score (M-28). Tapping a bar moves
    the readout to that day, which opens from there. Drawn as the day page
    draws its week: against a perfect day, the 100% line labelled in the
    gutter, so the bars and their scale read the same on both. */
function DaysChart({ days }: { days: DayScore[] }) {
  const [sel, setSel] = React.useState(days.length - 1)
  const day = days[Math.min(sel, days.length - 1)]
  const { average, scored } = averageOf(days)
  const bars = days.map((d) => ({ label: String(d.date.getDate()), value: d.percent, partial: d.status === "partial" || undefined }))
  const word = day.percent !== undefined ? String(day.percent) : day.status === "partial" ? "Partial" : "Nothing logged"
  return (
    <Card style={styles.chartCard}>
      <Readout
        value={word}
        unit={day.percent !== undefined ? "%" : undefined}
        dim={day.percent === undefined}
        label={day.label}
        right={
          <SmallAction onPress={() => openDay(day)} accessibilityLabel={`Open ${day.label}`}>
            Open day
          </SmallAction>
        }
      />
      <WeekBars
        days={bars}
        goal={100}
        format={(v) => `${v}%`}
        selected={sel}
        onSelect={setSel}
        readout={false}
        name="Daily score"
        emptyWord="Nothing logged"
        playKey="history:days"
      />
      {average !== undefined && <Text style={styles.foot}>{`Average ${average}% on ${scored} scored days`}</Text>}
    </Card>
  )
}

/** Every home blood pressure reading since she started, to scale in time.
    The readout follows the reading she taps, with what it means, and
    "Latest" goes back to the newest. */
function PressureHistory({ list }: { list: Measure[] }) {
  const markers = useMarkers()
  const bp = markers.find((b) => b.id === "bp")
  const latest = list.length - 1
  const [picked, setPicked] = React.useState(latest)
  // A reading she adds becomes the one shown.
  React.useEffect(() => setPicked(latest), [latest])
  const m = list[Math.min(picked, latest)]
  const top = m.value
  const bottom = m.value2 ?? 0
  return (
    <Card style={styles.chartCard}>
      <View style={styles.summary}>
        <Readout
          value={`${top}/${bottom}`}
          unit="mmHg"
          label={picked === latest ? `Latest, ${entryDay(m.at)}` : dayLabel(dateOfAt(m.at))}
          right={picked !== latest ? <TextAction onPress={() => setPicked(latest)}>Latest</TextAction> : undefined}
        />
        {bp && (
          <View style={styles.pills}>
            <Status level={pointStatus(bp, { value: top, value2: bottom })} />
          </View>
        )}
      </View>
      <PressureChart readings={pressureReadingsOf(list)} selected={picked} onSelect={setPicked} readout={false} playKey="history:bp" />
    </Card>
  )
}

/** Her weigh ins over the stretch she picks, with the trend through them,
    the goal and the start; no forecast here. */
function WeightChart({ p, range, onRange, series }: { p: ReturnType<typeof progress>; range: Range; onRange: (r: Range) => void; series: Measure[] }) {
  const all = progressChartOf(p)
  const readings = datedOf(series)
  const label = range === "all" ? `${p.weight.words} ${p.weight.since}` : changeSince(series[0], p.weight.now)
  return (
    <Card style={styles.chartCard}>
      <Tabs options={RANGES} value={range} onChange={onRange} />
      <Readout value={formatNumber(p.weight.now, 1)} unit="lb" label={label} />
      <ProgressChart
        readings={readings}
        start={range === "all" ? all.start : readings[0]}
        goal={all.goal}
        today={all.today}
        unit={all.unit}
        name={all.name}
        readingsLabel={all.readingsLabel}
        caption={null}
        playKey={`history:weight:${range}`}
      />
    </Card>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // The chips head what they choose, as a label heads its content.
  top: { gap: space.item },
  chartCard: { gap: space.card },
  summary: { gap: space.inline },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  foot: { ...type.meta },
})
