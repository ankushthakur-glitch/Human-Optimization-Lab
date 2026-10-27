import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { GoalRows, type GoalRow } from "@/components/charts"
import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { BowlFood, Lightbulb, Sparkle } from "@/components/ph"
import { HeadCard, headText } from "@/components/plan-tab-pieces"
import { Block, Card, EmptyState, Group, HUE, NeedsRow, SmallAction, Tile } from "@/components/record-kit"
import { LoggedCheck, MealRow, MealSheet, logLabel, minutesOf, slotName, unbroken } from "@/components/today-food-meals"
import { toast } from "@/components/toast"
import {
  MEAL_SLOTS,
  dayScore,
  goalRowsOf,
  localDay,
  memberStage,
  profileOf,
  slotAt,
  today,
  todayFocus,
  yesterday,
  type NutrientId,
} from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { formatNumber } from "@/lib/trends"
import { space, type } from "@/lib/theme"

/* The member's diet plan, opened from the Diet plan door on the Today
   hero (FINAL-SPEC C.21; Ed, 30 Sep: "this is my diet ... they can click
   on it"). Targets and food ideas, not a meal plan (M-13, Q-13): the
   day's targets from her plan, what she has eaten so far,
   one focus from yesterday, each meal logged or a line on what fits it,
   ideas that fit the rest, and one tap to log a meal.

   During the day nothing is scored and nothing is "short": each goal says
   what is left ("92 g to go") and a limit says how much room is left. */

/* The second line under today's focus, by the goal yesterday fell
   furthest short of: a food first way to close it. */
const FOCUS_LINE: Partial<Record<NutrientId, string>> = {
  fiber: "Beans, berries or oats close most of the gap.",
  protein: "Two eggs or a cup of Greek yogurt adds 12 to 20 g.",
  calcium: "Yogurt, milk or tofu at each meal closes most of the gap.",
  addedSugar: "Plain yogurt with fruit, and whole fruit instead of juice.",
  sodium: "Cooking at home tonight keeps it under your limit.",
  calories: "Half the plate vegetables, a palm of protein, a fist of grains.",
  satFat: "Fish, chicken or beans in place of red meat.",
}

/** A line's last two words held together, so a wrapped line never leaves
    one word alone ("every meal", "the gap.", "and carrots", "Dr. Patel"). */
const keepEnd = (text: string) => text.replace(/ (?=\S+$)/, "\u00A0")

/** What is left of a goal today: "92 g to go" for an "at least" goal, the
    room under a limit ("1,348 kcal left"), or how far past it. The amount
    keeps its unit. */
function leftWords(row: GoalRow): string | undefined {
  if (row.actual === undefined) return undefined
  const gap = row.goal - row.actual
  if (row.kind === "atMost") return gap >= 0 ? `${formatNumber(gap)}\u00A0${row.unit} left` : `${formatNumber(-gap)}\u00A0${row.unit} over`
  return gap > 0 ? `${formatNumber(gap)}\u00A0${row.unit} to go` : "Goal reached"
}

export default function DietScreen() {
  const s = useOnboarding()
  const [open, setOpen] = React.useState<string>()
  const stage = memberStage(s)
  if (stage !== "live") return <NoPlanYet stage={stage} />

  const now = new Date()
  const key = localDay(now)
  const profile = profileOf(s)
  const day = dayScore(s, now)
  const meals = [...day.meals].sort((a, b) => minutesOf(a.time) - minutesOf(b.time))
  const rows = goalRowsOf(day).map((r) => ({ ...r, note: leftWords(r) }))
  const updated = meals.length ? meals[meals.length - 1].time : undefined
  const ids = profile.goals.map((g) => g.id).filter((id) => id !== "calories")
  const version = s.plan?.versions[0]?.version ?? s.plan?.version
  const focus = todayFocus(s, now)
  // The meal to log next (lunch at 4 PM while lunch is still open, never a
  // breakfast already logged); once every main meal is in, Eat asks which.
  const next = today(s, now).actions.find((a) => a.id === "meal")
  const nextSlot = next && next.status !== "done" ? next.slot : undefined
  const first = nextSlot ?? slotAt(now)
  const last = yesterday(s, now)
  const focusLine = last.status !== "complete" ? undefined : last.shortfall ? FOCUS_LINE[last.shortfall.goal.id] : "You met every goal yesterday."
  const sheet = meals.find((m) => m.id === open)

  const logSlot = (slot?: string) => router.push({ pathname: "/topic/[id]", params: slot ? { id: "eat", slot } : { id: "eat" } })

  async function remove(id: string) {
    const gone = meals.find((m) => m.id === id)
    setOpen(undefined)
    await s.save({ meals: { ...s.meals, [key]: (s.meals?.[key] ?? []).filter((m) => m.id !== id) } })
    if (gone) toast(`${slotName(gone.slot)} deleted`)
  }

  return (
    <View style={styles.fill}>
      <FlowScreen page title="Diet plan" footer={<PrimaryButton onPress={() => logSlot(nextSlot)}>Log a meal</PrimaryButton>}>
        <HeadCard>
          <Text style={headText.title} accessibilityRole="header">
            {profile.diet.title}
          </Text>
          <Text style={headText.line}>{unbroken(profile.diet.summary)}</Text>
          {version !== undefined && <Text style={[headText.meta, styles.headMeta]}>{keepEnd(`Version ${version}`)}</Text>}
        </HeadCard>

        <View style={styles.section}>
          <Block title="So far today" meta={updated ? `Updated ${updated}` : undefined}>
            <Card>
              {meals.length ? (
                <View style={styles.rows}>
                  <GoalRows
                    rows={rows}
                    playKey="diet:today"
                  />
                  {!!day.estimateNote && <Text style={styles.meta}>{day.estimateNote}</Text>}
                </View>
              ) : (
                <View style={styles.nothing}>
                  <Text style={styles.title}>Nothing logged yet today</Text>
                  <SmallAction onPress={() => logSlot(first)}>{logLabel(first)}</SmallAction>
                </View>
              )}
            </Card>
          </Block>

          <Card style={styles.focus}>
            <Tile hue="teal">
              <Sparkle size={16} color={HUE.teal.ink} />
            </Tile>
            <View style={styles.focusWords}>
              <Text style={styles.title}>{keepEnd(focus)}</Text>
              {!!focusLine && <Text style={styles.label}>{keepEnd(focusLine)}</Text>}
            </View>
          </Card>
        </View>

        <Block title="Meals">
          <Group>
            {MEAL_SLOTS.flatMap((slot) => {
              const logged = meals.filter((m) => m.slot === slot.id)
              // A logged meal: the same row as a day's, with its check; it
              // opens the meal.
              if (logged.length) return logged.map((m) => <MealRow key={m.id} meal={m} plan={profile} right={<LoggedCheck />} onPress={() => setOpen(m.id)} />)
              // No snack row to log (15 Oct 2026); a snack already logged
              // still shows above.
              if (slot.id === "snack") return []
              const line = profile.diet.slots.find((x) => x.slot === slot.id)?.line
              // The whole row logs the slot, as its pill does. The pill sits
              // on the title line, so the line on what fits the meal takes
              // the row's full width and is never cut short.
              const log = () => logSlot(slot.id)
              return [
                <NeedsRow
                  key={slot.id}
                  icon={<BowlFood size={16} color={HUE.teal.ink} />}
                  title={slot.name}
                  meta={line && keepEnd(line)}
                  action={{ label: logLabel(slot.id), onPress: log }}
                  onPress={log}
                  accessibilityLabel={line ? `${logLabel(slot.id)}. ${line}` : logLabel(slot.id)}
                />,
              ]
            })}
          </Group>
        </Block>

        <View style={styles.section}>
          <Block title="Ideas that fit your targets">
            <Group>
              {profile.diet.ideas.map((idea) => (
                <NeedsRow key={idea.name} icon={<Lightbulb size={16} color={HUE.teal.ink} />} title={idea.name} meta={unbroken(idea.line)} />
              ))}
            </Group>
          </Block>
          {!!profile.diet.deficit && <Text style={styles.meta}>{`${profile.diet.deficit.replace(/\.$/, "")}. It's worked out at the end of the day.`}</Text>}
        </View>
      </FlowScreen>

      {sheet && (
        <MealSheet
          meal={sheet}
          ids={ids}
          onClose={() => setOpen(undefined)}
          onDelete={() => remove(sheet.id)}
        />
      )}
    </View>
  )
}

/** A paused plan or the free record has no targets to show. */
function NoPlanYet({ stage }: { stage: ReturnType<typeof memberStage> }) {
  const empty =
    stage === "paused"
      ? { title: "Your plan is paused", action: "Resume my plan", go: () => router.push({ pathname: "/membership", params: { sheet: "resume" } }) }
      : { title: "No diet plan yet" }
  return (
    <FlowScreen page title="Diet plan">
      <EmptyState art="bowl" artSize={64} title={empty.title} action={empty.action} onAction={empty.go} />
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  section: { gap: space.item },
  // The approval sits a little apart from the targets it approves.
  headMeta: { marginTop: space.stack },
  title: { ...type.title },
  body: { ...type.body },
  label: { ...type.label },
  meta: { ...type.meta },
  // The estimate note keeps the goal rows' own rhythm.
  rows: { gap: space.card },
  nothing: { gap: space.item, alignItems: "flex-start" },
  focus: { flexDirection: "row", alignItems: "center", gap: space.lead },
  focusWords: { flex: 1, gap: space.stack },
})
