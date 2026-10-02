import { router } from "expo-router"
import * as React from "react"
import { KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, View } from "react-native"

import { Art } from "@/components/art"
import { FlowScreen } from "@/components/flow"
import { IconWalk } from "@/components/icons"
import { Block, Card, Chip, ChipRow, Group, HUE, NeedsRow, Tag, TextAction, type Tone } from "@/components/record-kit"
import { Sheet, SheetText } from "@/components/sheet"
import { toast } from "@/components/toast"
import { ExerciseRow, TickCircle, goBack, saveLog } from "@/components/today-exercise-parts"
import { Button, TextField } from "@/components/ui"
import { WALK, addDays, clockOf, dayLabel, localDay, moveDone, profileOf, type ActivityLog, type Session } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { color, space, type } from "@/lib/theme"

/* Today's exercise, opened from the Exercise door on the member's Today
   hero: Ed's "today I need to do this exercise program, which they can
   click on and it shows them exercise" (M-10). The day's session from her
   plan, move by move, each opening its own page with the cues and her
   sets; the walk after dinner; and two ways to close the workout: finish
   it and say how it went, or say she did something else instead (M-15).
   A day the plan has no session (Sunday) is a rest day with only the
   walk. FINAL-SPEC C.19. */

type Feeling = "good" | "hard" | "hurt"

const FEELINGS: { value: Feeling; label: string }[] = [
  { value: "good", label: "Felt good" },
  { value: "hard", label: "Hard" },
  { value: "hurt", label: "Something hurt" },
]

const MINUTES = ["10", "20", "30", "45"].map((m) => ({ value: m, label: m }))

/** The practice's short name, as patients say it ("Harborview"). */
const PRACTICE = PATIENT.practice.split(" ")[0]

/** Its number, kept on one line (a no-break space and a no-break hyphen). */
const PHONE = PATIENT.practicePhone.replace(/ /g, "\u00A0").replace(/-/g, "\u2011")

export default function TodayExerciseScreen() {
  const s = useOnboarding()
  const [sheet, setSheet] = React.useState<"finish" | "other">()
  const now = new Date()
  const day = localDay(now)
  const session = profileOf(s).sessionOn(now)
  const log = s.exercises?.[day] ?? {}
  const walk = log[WALK.id]

  async function close(entry: ActivityLog, message: string) {
    if (!session) return
    await saveLog(s, day, session.id, entry)
    setSheet(undefined)
    toast(message)
    goBack("/")
  }

  const toggleWalk = () => saveLog(s, day, WALK.id, walk ? undefined : { at: new Date().toISOString(), minutes: WALK.minutes })

  const walkRow = (
    <Group>
      <NeedsRow
        icon={<IconWalk size={18} color={HUE.teal.ink} />}
        title={WALK.title}
        meta={walk ? `Done at ${clockOf(new Date(walk.at))}` : WALK.detail}
        right={<TickCircle done={!!walk} />}
        onPress={toggleWalk}
        chevron={false}
        accessibilityLabel={`${WALK.title}, ${WALK.detail}, ${walk ? "done" : "not done yet"}`}
      />
    </Group>
  )

  if (!session) {
    const next = nextSession(profileOf(s).sessionOn, now)
    return (
      <FlowScreen page title="Today's exercise">
        <Header rest>
          <Text style={type.section} accessibilityRole="header">
            Rest day
          </Text>
          <Text style={type.label}>An easy walk is enough today</Text>
          {!!next && <Text style={[type.meta, styles.effort]}>{next}</Text>}
        </Header>
        <Block title="Later today">{walkRow}</Block>
      </FlowScreen>
    )
  }

  /* The session is done only once she closes it (its own log): every move
     ticked still reads "5 of 5 done" over "Finish workout", so "How did it
     go?", with its stop rule and the practice's number, is never skipped. */
  const finished = log[session.id]
  const moved = session.exercises.filter((e) => moveDone(log[e.id], e)).length
  const allMoved = moved === session.exercises.length
  // One set ticked, or reps typed, is a start ("0 of 5 done"), never "Not
  // started" over a row that reads "1 of 2 sets done".
  const started = session.exercises.some((e) => log[e.id])
  const status: { tone: Tone; label: string } = finished
    ? { tone: "ok", label: "Done" }
    : started
      ? { tone: "primary", label: `${moved} of ${session.exercises.length} done` }
      : { tone: "muted", label: "Not started" }
  // "about 20 minutes" on one line (no-break spaces), so a wrap never parts
  // the number from "about" or from its unit.
  const length = `about ${session.minutes} minutes`.replace(/ /g, " ")

  // The two ways to close the workout sit together at the foot: finish it,
  // or, until every move is ticked, say she did something else instead.
  const footer = finished ? undefined : (
    <>
      <Button onPress={() => setSheet("finish")}>Finish workout</Button>
      {!allMoved && (
        <View style={styles.other}>
          <TextAction tone="muted" onPress={() => setSheet("other")}>
            I did something else
          </TextAction>
        </View>
      )}
    </>
  )

  return (
    <View style={styles.fill}>
      <FlowScreen page title="Today's exercise" footer={footer}>
        <Header>
          <View style={styles.titleLine}>
            <Text style={type.section} accessibilityRole="header">
              {session.title}
            </Text>
            <Tag tone={status.tone}>{status.label}</Tag>
          </View>
          <Text style={type.label}>{`${session.focus}, ${session.exercises.length} moves, ${length}`}</Text>
          {/* The talk test on its own line, so neither sentence breaks. */}
          <Text style={[type.meta, styles.effort]}>
            {finished ? finishedLine(finished) : `Effort ${session.effort.toLowerCase()}.\nYou can talk, but not sing.`}
          </Text>
        </Header>

        <Block title="Moves">
          <Group>
            {session.exercises.map((e, i) => (
              <ExerciseRow
                key={e.id}
                n={i + 1}
                move={e}
                log={log[e.id]}
                onPress={() => router.push({ pathname: "/exercise/[id]", params: { id: e.id } })}
              />
            ))}
          </Group>
        </Block>

        <Block title="Later today">{walkRow}</Block>
      </FlowScreen>

      {sheet === "finish" && (
        <FinishSheet
          session={session}
          onClose={() => setSheet(undefined)}
          onSave={(note) => close({ at: new Date().toISOString(), ...(note ? { note } : {}) }, "Workout saved")}
        />
      )}
      {sheet === "other" && (
        <OtherSheet
          onClose={() => setSheet(undefined)}
          onSave={(what, minutes) => close({ at: new Date().toISOString(), note: what, minutes }, "Activity saved")}
        />
      )}
    </View>
  )
}

/* The day's header card: its words, and the one object beside them. A
   rest day says little, so its words sit level with the object. */
function Header({ rest, children }: { rest?: boolean; children: React.ReactNode }) {
  return (
    <Card style={[styles.header, rest && styles.headerRest]}>
      <View style={styles.headerWords}>{children}</View>
      <Art name="dumbbell" size={64} />
    </Card>
  )
}

/* What closed the session: the time she finished it, or what she did in
   its place ("Instead: Swimming, 30 minutes"). Only something else is
   saved with minutes. */
function finishedLine(entry: ActivityLog) {
  if (entry.minutes) return `Instead: ${entry.note}, ${entry.minutes} minutes`
  return `Finished at ${clockOf(new Date(entry.at))}`
}

/* The next day the plan has a session, within a week: "Next: Strength A
   tomorrow", "Next: Strength and balance on Mon, Oct 5". */
function nextSession(sessionOn: (d: Date) => Session | undefined, now: Date) {
  for (let i = 1; i <= 7; i++) {
    const day = addDays(now, i)
    const next = sessionOn(day)
    if (next) return `Next: ${next.title} ${i === 1 ? "tomorrow" : `on ${dayLabel(day)}`}`
  }
}

/** "How did it go?" after the workout. Something hurting brings the stop
    rule and the practice's number, and lets her name the moves. */
function FinishSheet({ session, onSave, onClose }: { session: Session; onSave: (note?: string) => void; onClose: () => void }) {
  const [feeling, setFeeling] = React.useState<Feeling | "">("")
  const [hurt, setHurt] = React.useState<string[]>([])
  const word = FEELINGS.find((f) => f.value === feeling)?.label
  const note = feeling === "hurt" && hurt.length ? `${word}: ${hurt.join(", ")}` : word
  const toggle = (name: string) => setHurt((list) => (list.includes(name) ? list.filter((n) => n !== name) : [...list, name]))

  return (
    <Sheet title="How did it go?" onClose={onClose}>
      <ChipRow<Feeling | ""> options={FEELINGS} value={feeling} onChange={setFeeling} />
      {feeling === "hurt" && (
        <>
          <SheetText>
            {`Stop the move that hurts. If the pain is sharp or doesn't ease, call ${PRACTICE} at `}
            <Text style={styles.phone} accessibilityRole="link" onPress={() => Linking.openURL(`tel:${PATIENT.practicePhone.replace(/\D/g, "")}`)}>
              {PHONE}
            </Text>
            .
          </SheetText>
          <View style={styles.chips} accessibilityLabel="Which move hurt">
            {session.exercises.map((e) => (
              <Chip key={e.id} label={e.name} selected={hurt.includes(e.name)} onPress={() => toggle(e.name)} />
            ))}
          </View>
        </>
      )}
      <Button onPress={() => onSave(note)}>Save</Button>
    </Sheet>
  )
}

/** "What did you do?" when she swapped the session for something else:
    what it was and about how long, saved as the day's workout. */
function OtherSheet({ onSave, onClose }: { onSave: (what: string, minutes: number) => void; onClose: () => void }) {
  const [what, setWhat] = React.useState("")
  const [minutes, setMinutes] = React.useState("")
  return (
    // The sheet rises with the keyboard while she types what she did.
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Sheet title="What did you do?" onClose={onClose}>
        <TextField label="Activity" value={what} onChangeText={setWhat} autoCapitalize="sentences" returnKeyType="done" />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Minutes</Text>
          <ChipRow options={MINUTES} value={minutes} onChange={setMinutes} />
        </View>
        <Button onPress={() => onSave(what.trim(), Number(minutes))} disabled={!what.trim() || !minutes}>
          Save
        </Button>
      </Sheet>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // The object sits a tile's lead from the words.
  header: { flexDirection: "row", alignItems: "flex-start", gap: space.lead },
  headerRest: { alignItems: "center" },
  // A 16 pt title to the line under it.
  headerWords: { flex: 1, gap: space.stack },
  // The kit row's title line: the tag beside the title, under it when both
  // do not fit.
  titleLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.inline, rowGap: space.stack },
  // Sets the effort apart from the line about the session.
  effort: { marginTop: space.stack },
  other: { alignItems: "center" },
  // A link inside the sheet's sentence: the link's weight and teal, at the
  // sentence's size.
  phone: { fontFamily: type.link.fontFamily, color: type.link.color },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  // "Minutes" sits over its chips as the frozen TextField's label sits over
  // "Activity" (ui.tsx: 14 medium in the field's ink, 6 to the field), so
  // the two fields of the sheet read alike.
  field: { gap: 6 },
  fieldLabel: { ...type.title, color: color.text },
})
