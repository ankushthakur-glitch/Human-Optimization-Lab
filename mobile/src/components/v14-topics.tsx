import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { ScoreRing } from "@/components/charts"
import { AskButton, PrimaryButton } from "@/components/hol"
import {
  ArrowsClockwise,
  Bluetooth,
  Camera,
  Check,
  ClipboardText,
  DownloadSimple,
  Microphone,
  PencilSimple,
  Phone,
  Play,
  Scales,
  Warning,
  WarningCircle,
} from "@/components/ph"
import { Block, Card, Group, KeyValue, NeedsRow, SmallAction, StatRow, StatTile, Tag, TextAction, toast } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { PlanNote, Source, TargetBand, TopicIcon, Ways } from "@/components/v14-kit"
import { color, hairline, ink, space, type } from "@/lib/theme"
import { DOSES, EAT_TARGET, FIELDS, LIFTS, MEALS, MIND, SESSION, SLEEP, SUPPLEMENTS, type TopicId } from "@/lib/v14"

/* The six topic pages of the v14 dummy (Journey_14, screens 31 and 33 to
   38), each opened from a row on Today. Every page has the same shape:
   today's target on the dark band, the usual way to answer it as the main
   card with the other three under it (the deck lays out four equal
   cards; one clear default is quicker to act on), then what the topic
   needs to show, a link to its history and the assistant.

   The 22 Oct call changed what some pages say: exercise minutes and sleep
   come off the wearable and are never typed, the plate photo is the first
   way to log a meal, and medication leads with what nobody prescribed,
   each checked against the prescription with Dr. Patel told. Nothing here
   saves; a way shows a toast saying what it would do. */

const go = (path: string) => router.push(path as never)

const ICON = 18
const teal = color.primary

/** The foot every topic page ends with: its history and the assistant. */
function Foot({ id, name }: { id: TopicId; name: string }) {
  return (
    <>
      <Group>
        <NeedsRow icon={<TopicIcon id={id} />} title={`${name} history`} meta="Day, week, month, 6 months and year" onPress={() => go(`/v14/history/${id}`)} />
      </Group>
      <AskButton label={`Ask about ${name.toLowerCase()}`} params={{ topic: "plan" }} />
    </>
  )
}

/* ------------------------------------------------------------ exercise -- */

export function ExerciseTopic() {
  return (
    <>
      <TargetBand icon={<TopicIcon id="exercise" />} title={SESSION.name} line={`Week ${SESSION.week}, your third upper body session`} right={`${SESSION.minutes} min`} />
      <Card style={styles.sync}>
        <View style={styles.syncRow}>
          <Text style={type.title}>0 of 55 min synced</Text>
          <Tag tone="muted">Not started</Tag>
        </View>
        <Source from="Apple Watch" />
        <Text style={type.label}>Start a strength workout on your watch, then switch it to an outdoor walk for Zone 2. Your minutes arrive on their own.</Text>
      </Card>
      <Ways
        main={{
          title: "Do it as written",
          line: "All four lifts, then the Zone 2 block",
          effect: "Counts in full",
          icon: <Check size={ICON} color={teal} weight="bold" />,
          onPress: () => toast("Marked as written. Exercise counts in full today."),
        }}
        others={[
          { title: "Do part of it", line: "Tell us what you finished", effect: "Counts what you did", icon: <PencilSimple size={ICON} color={teal} />, onPress: () => toast("Your watch minutes count. Add which lifts you finished.") },
          { title: "Ask for an easier version", line: "Say why, out loud", effect: "Rebuilds today", icon: <Microphone size={ICON} color={teal} />, onPress: () => toast("Tell Inlay why, and today's session is rebuilt.") },
          { title: "Use your own programme", line: "Or connect the app it lives in", effect: "We follow yours", icon: <DownloadSimple size={ICON} color={teal} />, onPress: () => toast("Your own programme replaces this one, and we follow it.") },
        ]}
      />
      <Block title="Today's session" meta="Built for you">
        <Group>
          <KeyValue label="Warm up" value={SESSION.warmUp} />
          {LIFTS.map((l) => (
            <View key={l.id} style={styles.lift}>
              <View style={styles.grow}>
                <Text style={type.title}>{l.name}</Text>
                <Text style={type.label}>
                  {`${l.sets} x ${l.reps} at `}
                  <Text style={type.value}>{`${l.load} lb`}</Text>
                  {l.last === undefined ? "" : l.last === l.load ? ", same as last time" : `, up from ${l.last} lb`}
                </Text>
              </View>
              <SmallAction onPress={() => go(`/v14/move/${l.id}`)} accessibilityLabel={`How to do the ${l.name.toLowerCase()}`}>
                Form
              </SmallAction>
            </View>
          ))}
          <KeyValue label={`Zone 2, ${SESSION.zone2.minutes} min`} value={`Heart rate ${SESSION.zone2.hr}`} last />
        </Group>
      </Block>
      <PlanNote>A partial day is not a failure. Your progress is built from what you actually did, which is why the outlook can be trusted.</PlanNote>
      <Foot id="exercise" name="Exercise" />
    </>
  )
}

/* ----------------------------------------------------------------- eat -- */

export function EatTopic() {
  const [swap, setSwap] = React.useState<string | null>(null)
  const logged = MEALS.filter((m) => m.logged).length
  return (
    <>
      <TargetBand icon={<TopicIcon id="eat" />} title={`${EAT_TARGET.deficit} kcal under, ${EAT_TARGET.protein} g protein`} line={`${EAT_TARGET.calcium.toLocaleString("en-US")} mg calcium, three meals already planned`} right={`${logged} of 3`} />
      <Ways
        main={{
          title: "Photograph your plate",
          line: "Snap it and we read the portions",
          effect: "Fastest",
          icon: <Camera size={ICON} color={teal} weight="bold" />,
          onPress: () => go("/log-meal?via=scan"),
        }}
        others={[
          { title: "Pick from your meals", line: "Planned meals, one tap to add", effect: "Macros already known", icon: <ClipboardText size={ICON} color={teal} />, onPress: () => toast("Lunch added from your plan.") },
          { title: "Say what you ate", line: "In your own words", effect: "Nothing to type", icon: <Microphone size={ICON} color={teal} />, onPress: () => go("/log-meal?via=voice") },
          { title: "Import from another app", line: "Apple Health, MyFitnessPal, Cronometer", effect: "Posts itself", icon: <DownloadSimple size={ICON} color={teal} />, onPress: () => toast("Meals from your connected app arrive on their own.") },
        ]}
      />
      <Block title="Today's meals" meta={`${logged} of ${MEALS.length} logged`}>
        <Group>
          {MEALS.map((m) => (
            <NeedsRow
              key={m.slot}
              icon={<TopicIcon id="eat" />}
              hue="green"
              title={m.slot}
              meta={`${m.name}, ${m.kcal} kcal, ${m.protein} g protein`}
              tag={m.logged ? { tone: "ok", label: m.how ? `Logged by ${m.how.toLowerCase()}` : "Logged" } : undefined}
              action={m.logged ? undefined : { label: "Swap", onPress: () => setSwap(m.slot), quiet: true }}
              muted={!m.logged}
              chevron={false}
            />
          ))}
        </Group>
      </Block>
      <PlanNote>Swapping a meal keeps the day's targets. The other meals are rebalanced so the day does not drift.</PlanNote>
      <Foot id="eat" name="Eat" />
      {swap && (
        <Sheet title={`Swap ${swap.toLowerCase()}`} onClose={() => setSwap(null)}>
          <Group>
            {["Turkey chili with beans, 540 kcal", "Tofu stir fry with brown rice, 560 kcal", "Tuna salad wrap and an apple, 520 kcal"].map((o) => (
              <NeedsRow
                key={o}
                title={o.split(",")[0]}
                meta={`${o.split(", ")[1]}, fits today's protein`}
                onPress={() => {
                  setSwap(null)
                  toast(`${swap} swapped. Dinner adjusted to keep your targets.`)
                }}
              />
            ))}
          </Group>
        </Sheet>
      )}
    </>
  )
}

/* --------------------------------------------------------------- sleep -- */

export function SleepTopic() {
  return (
    <>
      <TargetBand icon={<TopicIcon id="sleep" />} title="In bed by 10:30, CPAP all night" line="Seven and a half hours, device worn" right="6 h 10 m" />
      <Card style={styles.score}>
        <ScoreRing percent={SLEEP.score} size={72} caption="of 100" of="Sleep score" />
        <View style={styles.grow}>
          <Text style={type.section}>Last night's sleep score</Text>
          <Text style={type.body}>{`Fair. Your seven night average is ${SLEEP.average7}, up from ${SLEEP.firstWeek} the week you started.`}</Text>
          <Source from="Apple Watch and CPAP" />
        </View>
      </Card>
      <Block title={`What made it ${SLEEP.score}`} meta="Four parts">
        <Group>
          {SLEEP.parts.map((p, i) => (
            <KeyValue key={p.name} label={p.name} value={p.value} tag={{ tone: p.ok ? "ok" : "low", label: p.note }} last={i === SLEEP.parts.length - 1} />
          ))}
        </Group>
      </Block>
      <Ways
        title="Tonight"
        main={{
          title: "Follow tonight's window",
          line: `In bed by ${SLEEP.window.bed}, up at ${SLEEP.window.up}`,
          effect: "Reminder at 10 pm",
          icon: <Check size={ICON} color={teal} weight="bold" />,
          onPress: () => toast("Reminder set for 10 pm. Your watch scores the night."),
        }}
        others={[
          { title: "Ask to shift tonight", line: "A late flight, a sick child, say why", effect: "Rebuilds tonight", icon: <Microphone size={ICON} color={teal} />, onPress: () => toast("Tell Inlay why, and tonight's window moves.") },
          { title: "Add a note", line: "Times you woke, how you felt", effect: "Kept beside the score", icon: <PencilSimple size={ICON} color={teal} />, onPress: () => toast("Note saved beside last night's score.") },
          { title: "Connect another device", line: "Oura, Eight Sleep", effect: "Logged for you", icon: <Bluetooth size={ICON} color={teal} />, onPress: () => go("/connections") },
        ]}
      />
      <Text style={type.meta}>Your score and CPAP hours come straight from your devices. A note never changes the score.</Text>
      <Foot id="sleep" name="Sleep" />
    </>
  )
}

/* ---------------------------------------------------------------- mind -- */

export function MindTopic() {
  return (
    <>
      <TargetBand icon={<TopicIcon id="mind" />} title={MIND.course} line={`Week ${MIND.week} of ${MIND.of}, ${MIND.by}`} right={`${MIND.minutes} min`} />
      <Ways
        main={{
          title: "Start today's session",
          line: `Guided, ${MIND.minutes} minutes`,
          effect: "Counts in full",
          icon: <Play size={ICON} color={teal} weight="fill" />,
          onPress: () => toast("Session starting. Find somewhere quiet to sit."),
        }}
        others={[
          { title: `Do the ${MIND.short} minute version`, line: "When the day is full", effect: "Partial credit", icon: <PencilSimple size={ICON} color={teal} />, onPress: () => toast(`The ${MIND.short} minute version is ready.`) },
          { title: "Swap the practice", line: "Say what is not working", effect: "Rebuilds the week", icon: <ArrowsClockwise size={ICON} color={teal} />, onPress: () => toast("Tell Inlay what is not working, and the week is rebuilt.") },
          { title: "Log your own", line: "Yoga, prayer, a walk without your phone", effect: "Counts once logged", icon: <ClipboardText size={ICON} color={teal} />, onPress: () => toast("Your own practice is logged for today.") },
        ]}
      />
      <Block title="Irritability" meta="Your own 0 to 10 scale">
        <StatRow>
          <StatTile value={MIND.irritability.start} label="When you started" meta="Jul 1" />
          <StatTile value={MIND.irritability.now} label="This week" meta="4 points better" level="in" />
        </StatRow>
      </Block>
      <PlanNote>The eight weeks are guided and checked by Inlay, so this part of your plan needs none of Dr. Patel's time. He sees your scores at each review.</PlanNote>
      <Foot id="mind" name="Mind" />
    </>
  )
}

/* ---------------------------------------------------------- medication -- */

export function MedicationTopic() {
  const [eveningTaken, setEveningTaken] = React.useState(false)
  const take = () => {
    setEveningTaken(true)
    toast("Evening metformin marked taken.")
  }
  const flagged = SUPPLEMENTS.find((s) => s.interaction)
  return (
    <>
      <TargetBand icon={<TopicIcon id="medication" />} title="Evening metformin, 500 mg" line="Prescribed by Dr. Patel, with dinner" right="7 pm" />
      <Block title="Today's doses">
        <Group>
          {DOSES.map((d, i) => {
            const taken = d.taken || (i === DOSES.length - 1 && eveningTaken)
            return (
              <NeedsRow
                key={`${d.name}${d.when}`}
                icon={<TopicIcon id="medication" />}
                title={`${d.name}, ${d.dose}`}
                meta={`${d.when}, prescribed by ${d.by}`}
                tag={taken ? { tone: "ok", label: "Taken" } : undefined}
                action={taken ? undefined : { label: "Mark taken", onPress: take }}
                chevron={false}
              />
            )
          })}
        </Group>
      </Block>
      <Ways
        main={{
          title: "Mark tonight's dose taken",
          line: "One tap after dinner",
          effect: eveningTaken ? "Done" : "Counts in full",
          icon: <Check size={ICON} color={teal} weight="bold" />,
          onPress: take,
        }}
        others={[
          { title: "I missed a dose", line: "Add it when you remember, no judgement", effect: "Helps Dr. Patel read your record", icon: <PencilSimple size={ICON} color={teal} />, onPress: () => toast("Missed dose noted. Thank you for telling us.") },
          { title: "Report a side effect", line: "Say what happened, in your words", effect: "Goes to Dr. Patel", icon: <Phone size={ICON} color={teal} />, onPress: () => toast("Sent to Dr. Patel. He will reply in your messages.") },
          { title: "Add a medicine or supplement", line: "Photograph the label, we read it", effect: "Checked against your list", icon: <Camera size={ICON} color={teal} />, onPress: () => toast("Point your camera at the label. We read the name and dose.") },
        ]}
      />
      <Block title="Also taking, added by you" meta="Checked on entry">
        <Group>
          {SUPPLEMENTS.map((s) => (
            <NeedsRow
              key={s.name}
              icon={s.interaction ? <WarningCircle size={16} color={color.high} /> : <Check size={16} color={color.ok} weight="bold" />}
              hue={s.interaction ? "red" : "green"}
              title={s.name}
              meta={s.dose}
              tag={s.interaction ? { tone: "high", label: "Interaction" } : { tone: "ok", label: "No interaction" }}
              chevron={false}
            />
          ))}
        </Group>
      </Block>
      {flagged?.interaction && (
        <View style={styles.alert} accessible accessibilityRole="alert">
          <View style={styles.alertHead}>
            <Warning size={16} color={color.high} weight="bold" />
            <Text style={[type.title, styles.alertTitle]}>Berberine and metformin both lower blood glucose</Text>
          </View>
          <Text style={type.body}>{flagged.interaction}</Text>
          <Text style={[type.title, styles.alertTitle]}>Dr. Patel was told in his portal and will go over it with you.</Text>
          <TextAction onPress={() => go("/assistant?topic=plan")} chevron>
            Ask about this
          </TextAction>
        </View>
      )}
      <Foot id="medication" name="Medication" />
    </>
  )
}

/* ------------------------------------------------------------- measure -- */

export function MeasureTopic() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <TargetBand icon={<TopicIcon id="measure" />} title="Weight and waist, Mondays" line="Last entered Oct 6, 178 lb and 36.5 in" right="Weekly" />
      <Ways
        main={{
          title: "Enter today's numbers",
          line: "Weight and the five measures you set",
          effect: "Counts in full",
          icon: <Scales size={ICON} color={teal} weight="bold" />,
          onPress: () => setOpen(true),
        }}
        others={[
          { title: "Skip today", line: "Say why, the gap stays in the chart", effect: "No penalty", icon: <PencilSimple size={ICON} color={teal} />, onPress: () => toast("Skipped. This week stays a gap in your chart.") },
          { title: "Change how often", line: "Weekly is a lot for some, ask for monthly", effect: "Rebuilds the schedule", icon: <ArrowsClockwise size={ICON} color={teal} />, onPress: () => toast("Ask Inlay to move you to monthly.") },
          { title: "Connect a scale or cuff", line: "Withings, Omron, Apple Health", effect: "Posts itself", icon: <Bluetooth size={ICON} color={teal} />, onPress: () => go("/connections") },
        ]}
      />
      <PlanNote>A skipped week is kept as a gap. A line drawn through weeks nobody measured would not be true, and your outlook would inherit it.</PlanNote>
      <Foot id="measure" name="Measure" />
      {open && <MeasureSheet onClose={() => setOpen(false)} />}
    </>
  )
}

/** Today's measurements (deck 38): every field set on day one, last time's
    value under each so a typo shows, the missing ones marked, and voice
    first because a phone held in one hand at six in the morning is
    quicker to talk to. */
function MeasureSheet({ onClose }: { onClose: () => void }) {
  const entered = FIELDS.filter((f) => f.now !== undefined).length
  return (
    <Sheet title="Today's measurements" onClose={onClose} tall>
      <View style={styles.sheet}>
        <Pressable onPress={() => toast("Listening. Say each measure and its number.")} accessibilityRole="button" style={({ pressed }) => [styles.voice, pressed && styles.pressed]}>
          <View style={styles.grow}>
            <Text style={[type.title, { color: ink.primary }]}>Say them all at once</Text>
            <Text style={type.label}>"Waist thirty six and a quarter, arm twelve"</Text>
          </View>
          <View style={styles.mic}>
            <Microphone size={18} color={color.onPrimary} weight="fill" />
          </View>
        </Pressable>
        <View style={styles.grid}>
          {FIELDS.map((f) => {
            const missing = f.now === undefined
            return (
              <Pressable
                key={f.id}
                onPress={() => toast(`Type your ${f.name.toLowerCase()}.`)}
                accessibilityRole="button"
                accessibilityLabel={missing ? `${f.name}, still needed, was ${f.was}` : `${f.name}, ${f.now} ${f.unit}, was ${f.was}`}
                style={({ pressed }) => [styles.field, missing && styles.fieldMissing, pressed && styles.pressed]}
              >
                <Text style={type.label}>{f.name}</Text>
                <Text style={type.hero}>
                  {missing ? "Add" : f.now!.toFixed(1)}
                  {!missing && <Text style={type.unit}>{` ${f.unit}`}</Text>}
                </Text>
                <Text style={[type.meta, missing && { color: color.low }]}>{missing ? `Still needed, was ${f.was}` : f.now === f.was ? "Same as last time" : `Was ${f.was}`}</Text>
              </Pressable>
            )
          })}
        </View>
        <Text style={[type.metaStrong, { color: color.low }]}>{`${entered} of ${FIELDS.length} entered, ${FIELDS.length - entered} to go`}</Text>
        <PrimaryButton
          onPress={() => {
            onClose()
            toast(`${entered} measures saved. Waist and arm are still open for today.`)
          }}
        >
          Save
        </PrimaryButton>
      </View>
    </Sheet>
  )
}

export const TOPIC_PAGES: Record<TopicId, () => React.ReactElement> = {
  exercise: ExerciseTopic,
  eat: EatTopic,
  sleep: SleepTopic,
  mind: MindTopic,
  medication: MedicationTopic,
  measure: MeasureTopic,
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: space.line },
  pressed: { opacity: 0.7 },
  sync: { gap: space.stack },
  syncRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline },
  lift: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY, paddingHorizontal: space.rowX },
  score: { flexDirection: "row", alignItems: "center", gap: space.lead },
  alert: { backgroundColor: color.highTint, borderRadius: 8, padding: space.card, gap: space.inline, borderWidth: 1, borderColor: "#FECDCA" },
  alertHead: { flexDirection: "row", alignItems: "flex-start", gap: space.mark },
  alertTitle: { color: color.high, flex: 1 },
  sheet: { gap: space.item, paddingBottom: space.item },
  voice: { flexDirection: "row", alignItems: "center", gap: space.lead, backgroundColor: color.primaryTint, borderWidth: 1, borderColor: color.primaryEdge, borderRadius: 12, padding: space.card },
  mic: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.primary, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  field: { width: "48%", flexGrow: 1, gap: space.line, borderWidth: 1, borderColor: hairline.edge, borderRadius: 12, padding: space.card, backgroundColor: color.background },
  fieldMissing: { borderStyle: "dashed", borderColor: color.amberEdge, backgroundColor: color.amberTint },
})
