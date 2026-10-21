import { router } from "expo-router"
import * as React from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { RECORD_READY } from "@/app/onboarding/syncing"
import { Appear, AssistantGroup, ChatBar, MyBubble, ScoreChips, TheirBubble, TypingBubble, bubbleText } from "@/components/chat"
import { DarkStatusBar } from "@/components/error-state"
import { Check } from "@/components/ph"
import { PageGround, PageHeader } from "@/components/hol"
import { useOnboarding } from "@/lib/onboarding"
import { SYMPTOM_COUNT, THINKING_ABOUT } from "@/lib/wellbeing"
import { color, font, hairline, ink, space } from "@/lib/theme"

/* Setup's "What Matters Most", drawn as a conversation with the assistant,
   right after "Updates about your care" while the record is still arriving.
   It used to be two pages: the symptoms that bother her most, then a 1 to 10
   rating of each on a page of its own (onboarding/life-question.tsx, now
   unused). Here both happen in one thread, with the app's shared chat
   pieces (components/chat.tsx):

     1. she types or speaks up to three symptoms;
     2. for each one, in turn, "How would you rate your lower back pain?"
        with a 1 to 10 row of chips; one tap answers it and the assistant
        moves straight on to the next symptom;
     3. after the last, the record building starts.

   Between 1 and 2 she confirms what was heard: a card lists the symptoms,
   each tagged Emotional or Physical, with "Looks right, continue" and
   "Change one" (tap a row, then say what should replace it).

   Every rating is saved as it is given. Nothing goes to the clinic unless
   she sends it. */

/** How long the assistant "types" before a line, and between two lines. */
const THINK_MS = 800
const BETWEEN_MS = 600

type Ui = "chips" | "confirm" | "replace" | "rate"
type Msg = { id: number; from: "bot" | "me"; text: string; ui?: Ui; muted?: boolean; list?: string[] }

const EMOTIONAL = /irritab|sad|anxi|mood|stress|depress|anger|angry|worr|overwhelm|lonel|panic|cry|emotion|low spirit/i
const kindOf = (symptom: string) => (EMOTIONAL.test(symptom) ? "Emotional" : "Physical")

/** Her words as up to three symptoms: split on new lines, commas, semicolons
    and "and", with any "1." or "2)" numbering dropped. */
function symptomsFrom(text: string) {
  return text
    .split(/[\n,;]+|\s+and\s+/i)
    .map((s) => s.replace(/^\s*\d+\s*[.)\-:]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, SYMPTOM_COUNT)
}

const EXAMPLE = "e.g., irritability, sadness, anxiety."
const MAX_SCORE = 10
const SCORES = Array.from({ length: MAX_SCORE }, (_, i) => String(i + 1))
const asked = (symptom: string) => `How would you rate your ${symptom.toLowerCase()}?`

/** The symptoms read back with their ratings: one row each with its tag, then
    "Looks right, continue" and "Change one". "Change one" turns the rows into
    toggles; she picks one or more, and each picked symptom is swapped for a new
    one, which she rates in turn. */
function SymptomCard({
  list,
  ratings,
  live,
  onContinue,
  onChange,
}: {
  list: string[]
  ratings: Record<string, number>
  live: boolean
  onContinue: () => void
  onChange: (indexes: number[]) => void
}) {
  const [picking, setPicking] = React.useState(false)
  const [chosen, setChosen] = React.useState<number[]>([])
  const toggle = (i: number) => setChosen((c) => (c.includes(i) ? c.filter((n) => n !== i) : [...c, i].sort((x, y) => x - y)))
  const stop = () => {
    setPicking(false)
    setChosen([])
  }
  return (
    <View style={styles.card}>
      <View style={styles.rows}>
        {list.map((s, i) => {
          const emotional = kindOf(s) === "Emotional"
          const on = chosen.includes(i)
          const rating = ratings[s]
          return (
            <Pressable
              key={`${s}-${i}`}
              disabled={!live || !picking}
              onPress={() => toggle(i)}
              accessibilityRole={picking ? "checkbox" : undefined}
              accessibilityState={picking ? { checked: on } : undefined}
              accessibilityLabel={picking ? `Change ${s}` : undefined}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowRule, picking && styles.rowPicking, on && styles.rowChosen, pressed && styles.pressed]}
            >
              <Check size={14} color={color.primary} weight="bold" />
              <Text style={styles.symptom} numberOfLines={2}>
                {s}
              </Text>
              {rating !== undefined && <Text style={styles.rating}>{`${rating}/${MAX_SCORE}`}</Text>}
              <View style={[styles.tag, emotional ? styles.tagEmotional : styles.tagPhysical]}>
                <Text style={[styles.tagText, { color: emotional ? color.violet : ink.primary }]}>{kindOf(s)}</Text>
              </View>
            </Pressable>
          )
        })}
      </View>
      {live && (
        <View style={styles.actions}>
          {picking && chosen.length > 0 ? (
            <Pressable
              onPress={() => {
                onChange(chosen)
                stop()
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.go, pressed && styles.pressed]}
            >
              <Text style={styles.goText}>{chosen.length === 1 ? "Change this one" : `Change these ${chosen.length}`}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={onContinue} accessibilityRole="button" style={({ pressed }) => [styles.go, pressed && styles.pressed]}>
              <Text style={styles.goText}>Looks right, continue</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => (picking ? stop() : setPicking(true))}
            accessibilityRole="button"
            accessibilityState={{ selected: picking }}
            style={({ pressed }) => [styles.alter, picking && styles.alterOn, pressed && styles.pressed]}
          >
            <Text style={styles.alterText}>{picking ? (chosen.length ? "Cancel" : "Pick the ones to change") : "Change one"}</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

export default function WhatMattersMostScreen() {
  const { bottom } = useSafeAreaInsets()
  const onboarding = useOnboarding()
  const [msgs, setMsgs] = React.useState<Msg[]>([])
  const [typing, setTyping] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const [symptoms, setSymptoms] = React.useState<string[]>([])
  const [ratings, setRatings] = React.useState<Record<string, number>>({})
  const [at, setAt] = React.useState(0)
  const [queue, setQueue] = React.useState<number[]>([])
  const [replacing, setReplacing] = React.useState<{ index: number; symptom: string } | null>(null)

  const seq = React.useRef(0)
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([])
  const scroll = React.useRef<ScrollView>(null)
  React.useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const mine = (text: string) => setMsgs((m) => [...m, { id: ++seq.current, from: "me", text }])

  /** The assistant writes `lines` one after another; `ui` lands on the last. */
  const say = React.useCallback((lines: string[], ui?: Ui, list?: string[]) => {
    setTyping(true)
    lines.forEach((text, i) => {
      const last = i === lines.length - 1
      timers.current.push(
        setTimeout(
          () => {
            setMsgs((m) => [...m, { id: ++seq.current, from: "bot", text, ui: last ? ui : undefined, list: last ? list : undefined }])
            if (last) setTyping(false)
          },
          THINK_MS + i * (THINK_MS + BETWEEN_MS)
        )
      )
    })
  }, [])

  React.useEffect(() => {
    say(
      [
        "A few questions while your record builds. Type or tap the mic, whichever is easier.",
        "What are the three physical or emotional symptoms that bother you most right now? Answer in your own words.",
      ],
      "chips"
    )
  }, [say])

  const last = msgs[msgs.length - 1]
  const live = !typing && last?.from === "bot" ? last.ui : undefined
  const symptom = symptoms[at]

  /* ------------------------------------------------------------ turns -- */

  function save(list: string[], symptomRatings: Record<string, number> = {}) {
    onboarding.save({ life: { ratings: onboarding.life?.ratings ?? {}, focus: onboarding.life?.focus, symptoms: list, skipped: false, symptomRatings }, step: "life" })
  }

  /** Read back the list with its ratings, for her to confirm or change. */
  function readBack(list: string[], lead: string) {
    const count = list.length === 3 ? "three" : list.length === 2 ? "two" : "one"
    say([`${lead} Here ${list.length === 1 ? "is the one" : `are the ${count}`} I'll track. Change any of them before I save.`], "confirm", list)
  }

  /** The next symptom after `from` that has no rating yet, or -1. */
  const nextUnrated = (list: string[], given: Record<string, number>, from: number) => list.findIndex((s, i) => i > from && given[s] === undefined)

  /** What she typed, as the list to rate: the first question comes straight away. */
  function sendSymptoms(text: string) {
    const list = symptomsFrom(text)
    if (!list.length) return
    mine(text.trim())
    setDraft("")
    setSymptoms(list)
    setRatings({})
    setAt(0)
    setQueue([])
    setReplacing(null)
    save(list)
    say([`Thanks. I'll ask how much ${list.length === 1 ? "it bothers" : "each one bothers"} you, starting with ${list[0].toLowerCase()}.`, `${THINKING_ABOUT}: ${asked(list[0])}`], "rate")
  }

  /** All rated and confirmed: on to the next onboarding screen. */
  function looksRight() {
    mine("Looks right, continue")
    setDraft("")
    save(symptoms, ratings)
    onboarding.save({ step: "records" })
    router.push(RECORD_READY)
  }

  /** The symptoms she picked to change: each is swapped for a new one, rated in turn. */
  function changeSome(indexes: number[]) {
    if (!indexes.length) return
    mine(`Change ${indexes.map((i) => symptoms[i].toLowerCase()).join(", ")}`)
    setQueue(indexes)
    say([`Sure. What would you like in place of ${symptoms[indexes[0]].toLowerCase()}?`], "replace")
  }

  function replace(text: string) {
    const [next] = symptomsFrom(text)
    if (!next || !queue.length) return
    mine(text.trim())
    setDraft("")
    // Rate the new symptom first; the list updates once she has.
    setReplacing({ index: queue[0], symptom: next })
    say([asked(next)], "rate")
  }

  function rate(n: number) {
    const name = onboarding.profile?.firstName
    if (replacing) {
      mine(String(n))
      setDraft("")
      const list = symptoms.map((s, i) => (i === replacing.index ? replacing.symptom : s))
      const kept = { ...ratings }
      delete kept[symptoms[replacing.index]]
      const next = { ...kept, [replacing.symptom]: n }
      const rest = queue.slice(1)
      setSymptoms(list)
      setRatings(next)
      setQueue(rest)
      setReplacing(null)
      save(list, next)
      if (rest.length) say([`Sure. What would you like in place of ${list[rest[0]].toLowerCase()}?`], "replace")
      else readBack(list, "Updated.")
      return
    }
    if (!symptom) return
    mine(String(n))
    setDraft("")
    const next = { ...ratings, [symptom]: n }
    setRatings(next)
    onboarding.save({ life: { ...onboarding.life, ratings: onboarding.life?.ratings ?? {}, symptoms, symptomRatings: next } })
    const following = nextUnrated(symptoms, next, at)
    if (following >= 0) {
      setAt(following)
      say([asked(symptoms[following])], "rate")
      return
    }
    // All rated: read the list back with its ratings.
    readBack(symptoms, `That's helpful${name ? `, ${name}` : ""}.`)
  }

  function send() {
    if (live === "chips") sendSymptoms(draft)
    else if (live === "replace") replace(draft)
    else if (live === "confirm") sendSymptoms(draft)
    else if (live === "rate" && /^([1-9]|10)$/.test(draft.trim())) rate(Number(draft.trim()))
  }

  const canSend = live === "chips" || live === "replace" || live === "confirm" ? symptomsFrom(draft).length > 0 : live === "rate" ? /^[1-5]$/.test(draft.trim()) : false
  const placeholder =
    live === "rate" ? "Or type a number from 1 to 5" : live === "replace" ? "Type the new symptom..." : live === "confirm" ? "Or type your symptoms again..." : "Type your three symptoms..."

  const showBar = !(last?.from === "bot" && last.ui === "confirm")

  /* The rating row under the newest question, once it has landed. */
  const ask = (m: Msg) =>
    m.ui === "rate" && m === last && live === "rate" ? <ScoreChips options={SCORES} onSelect={(o) => rate(Number(o))} high="Very much" /> : null

  // Group the assistant's consecutive messages under one name.
  const groups: Msg[][] = []
  msgs.forEach((m) => {
    const tail = groups[groups.length - 1]
    if (tail && tail[0].from === m.from) tail.push(m)
    else groups.push([m])
  })

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <DarkStatusBar />
      <PageGround />
      <PageHeader title="What Matters Most" onBack={() => router.back()} />
      <ScrollView
        ref={scroll}
        style={styles.fill}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        onLayout={() => scroll.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.thread}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {groups.map((g) =>
          g[0].from === "me" ? (
            g.map((m) => <MyBubble key={m.id} text={m.text} />)
          ) : (
            <AssistantGroup key={g[0].id}>
              {g.map((m) => {
                const widget = ask(m)
                const card = !!widget
                return (
                  <React.Fragment key={m.id}>
                  <Appear lift={4} style={card ? styles.stretch : undefined}>
                    <TheirBubble wide={!!card}>
                      <Text style={bubbleText()}>{m.text}</Text>
                      {m.ui === "chips" && <Text style={styles.example}>{EXAMPLE}</Text>}
                      {widget}
                    </TheirBubble>
                  </Appear>
                  {m.ui === "confirm" && m.list && (
                    <Appear lift={4} delay={120} style={styles.stretch}>
                      <SymptomCard list={m.list} ratings={ratings} live={m === last && live === "confirm"} onContinue={looksRight} onChange={changeSome} />
                    </Appear>
                  )}
                  </React.Fragment>
                )
              })}
            </AssistantGroup>
          )
        )}
        {typing && (
          <Appear lift={4}>
            <TypingBubble />
          </Appear>
        )}
      </ScrollView>
      {/* The confirm card has its own buttons; the input bar stays away until a
          step asks for typing ("Change one" brings it back for the replacement). */}
      {showBar ? (
        <ChatBar
          value={draft}
          onChange={setDraft}
          onSend={send}
          canSend={canSend}
          placeholder={placeholder}
          bottom={bottom}
          voice
          sendOutside
          keyboardType={live === "rate" ? "number-pad" : "default"}
        />
      ) : (
        <View style={{ height: bottom }} />
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  fill: { flex: 1 },
  pressed: { opacity: 0.8 },
  thread: { width: "100%", maxWidth: 420 + space.gutter * 2, alignSelf: "center", paddingHorizontal: space.gutter, paddingTop: space.section, paddingBottom: 20, gap: 10 },
  stretch: { alignSelf: "stretch" },
  example: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink.secondary, marginTop: 2 },

  card: { gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: hairline.outline, backgroundColor: color.background },
  rows: { borderRadius: 8 },
  row: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  rowRule: { borderTopWidth: 1, borderTopColor: hairline.outline },
  rowPicking: { borderRadius: 8, borderWidth: 1, borderColor: "transparent" },
  rowChosen: { backgroundColor: color.primaryTint, borderColor: color.primaryLine },
  rating: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: ink.secondary },
  symptom: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink.content },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  tagEmotional: { backgroundColor: color.violetTint },
  tagPhysical: { backgroundColor: color.primaryTint, borderWidth: 1, borderColor: color.primaryEdge },
  tagText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  go: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: color.primary, alignItems: "center", justifyContent: "center" },
  goText: { fontFamily: font.medium, fontSize: 14, lineHeight: 18, color: color.onPrimary },
  alter: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: color.primaryEdge, backgroundColor: color.background, alignItems: "center", justifyContent: "center" },
  alterOn: { backgroundColor: color.primaryTint },
  alterText: { fontFamily: font.medium, fontSize: 14, lineHeight: 18, color: ink.primary },

})
