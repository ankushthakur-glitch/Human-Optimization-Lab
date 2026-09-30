import { router } from "expo-router"
import * as React from "react"
import { Animated, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { DarkStatusBar } from "@/components/error-state"
import { FlourishCard } from "@/components/flourish"
import { FlowBar } from "@/components/flow"
import { Sheet } from "@/components/sheet"
import { Button, TextField } from "@/components/ui"
import { WHY_LABELS, WhyCard, whyValue, withWhy, type WhyKey } from "@/components/why-card"
import { Appear, AssistantGroup, ChatBar, MyBubble, Options, StreamedText, TheirBubble, TypingBubble, bubbleText } from "@/components/chat"
import { IconCheck, IconFace } from "@/components/icons"
import { EMPTY, TURNS, needsHelp, nextTurn, spoken, typedScale, type Answers, type Input, type Line, type Value } from "@/lib/conversation"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { color, font, gutter } from "@/lib/theme"

/* Step 3: "your why", a conversation with the assistant (the script and its
   reasoning are in lib/conversation.ts), drawn with the app's shared chat
   pieces (components/chat.tsx). The thread is drawn from the answers, so a
   patient who closes the app comes back to the same thread and the same
   question. A question lists its options inside its message; tap one or
   type an answer: the chat bar stays on screen at every step, even while
   the assistant is still writing (it sends once the question lands). Free text can be skipped. No going back: like any conversation, it moves forward, and the
   plan it ends on can be changed later. */

/* How long the assistant "types" before its first line after an answer,
   on arrival, and between two lines of the same turn. */
const THINK_MS = 900
const ARRIVE_MS = 450
const BETWEEN_MS = 550

export default function WhyScreen() {
  const { bottom } = useSafeAreaInsets()
  const onboarding = useOnboarding()
  const name = onboarding.profile?.preferredName || onboarding.profile?.firstName || PATIENT.firstName

  const [a, setAnswers] = React.useState<Answers>({ ...EMPTY, ...onboarding.why })
  const [at, setAt] = React.useState(() => nextTurn(onboarding.whyAt ?? 0, { ...EMPTY, ...onboarding.why }))
  // The current turn's lines are still arriving: the composer waits for them.
  const [ready, setReady] = React.useState(false)
  const arrived = React.useRef(false)
  // Something the patient typed needs a person: the script pauses on it.
  const [help, setHelp] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const [picked, setPicked] = React.useState<string[]>([])
  // An answer on the why card being edited, and its draft.
  const [editing, setEditing] = React.useState<WhyKey>()
  const [edit, setEdit] = React.useState("")
  const openEdit = (key: WhyKey) => {
    setEdit(whyValue(a, key))
    setEditing(key)
  }
  function saveEdit() {
    if (editing && edit.trim()) {
      const next = withWhy(a, editing, edit.trim())
      setAnswers(next)
      onboarding.save({ why: next })
    }
    setEditing(undefined)
  }
  // The turn just answered: its options fold away as it joins the thread.
  const justAnswered = React.useRef<string | null>(null)

  const scroll = React.useRef<ScrollView>(null)
  const field = React.useRef<TextInput>(null)

  const turn = TURNS[at]
  // What this step asks for; its chips or scale show once the question lands.
  const input = turn && !help ? turn.input(a) : null
  const open = !!input && ready
  const last = at === TURNS.length - 1

  async function answer(value: Value, shown = spoken(value)) {
    if (!turn || !ready) return
    const next: Answers = { ...a, ...turn.save(a, value), said: { ...a.said, [turn.id]: shown } }
    setDraft("")
    setPicked([])
    justAnswered.current = turn.id

    if (last) {
      await onboarding.save({ why: next, whyAt: at, step: "records" })
      router.replace("/onboarding/syncing")
      return
    }

    const flagged = typeof value === "string" && needsHelp(value)
    if (flagged) next.flagged = true
    const to = nextTurn(at + 1, next)
    arrived.current = true
    setReady(false)
    setAnswers(next)
    setAt(to)
    onboarding.save({ why: next, whyAt: to })
    if (flagged) {
      setHelp(true)
    }
  }

  function send() {
    if (!input || !open) return
    const own = draft.trim()
    if (input.type === "reply") {
      if (own) answer(own)
      return
    }
    if (input.type === "scale") {
      const n = typedScale(own)
      if (n !== undefined) answer(n, input.words[n - 1])
      return
    }
    if (input.type === "pick") {
      const all = own ? [...picked, own] : picked
      if (all.length) answer(all)
      return
    }
    // Sent empty: skipped, and said so.
    answer(own, own || "Skip")
  }

  /* The thread: every turn so far with what the patient said, then the
     current turn once the assistant has "thought". */
  const past = TURNS.slice(0, at).filter((t) => t.id in a.said)
  const canSend =
    open &&
    (input.type === "text" ||
      (input.type === "pick" && (picked.length > 0 || !!draft.trim())) ||
      (input.type === "reply" && !!draft.trim()) ||
      (input.type === "scale" && typedScale(draft) !== undefined))
  const placeholder = !input
    ? "Type your answer"
    : input.type === "text"
      ? (input.placeholder ?? "Type your answer")
      : input.type === "scale"
        ? "Or type a number from 1 to 5"
        : "Or type your own"

  // The open question's options, inside its last message.
  const ask =
    !input ? null : input.type === "reply" ? (
      <Options options={input.options} live picked={[]} onPick={(o) => answer(o)} />
    ) : input.type === "pick" ? (
      <Options
        options={input.options}
        live
        multi
        picked={picked}
        onPick={(o) => setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]))}
      />
    ) : input.type === "text" ? (
      input.ideas?.length ? (
        // Quick answers: each tap adds one to the reply (or takes it out),
        // so several combine and the patient can still edit before sending.
        <Options
          options={input.ideas}
          live
          multi
          picked={input.ideas.filter((idea) => parts(draft).includes(idea))}
          onPick={(idea) => {
            const now = parts(draft)
            setDraft((now.includes(idea) ? now.filter((x) => x !== idea) : [...now, idea]).join(", "))
          }}
        />
      ) : null
    ) : (
      <FaceScale words={input.words} onPick={(n) => answer(n, input.words[n - 1])} />
    )

  return (
    <View style={styles.screen}>
      <DarkStatusBar />
      <FlowBar back={false} />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scroll}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          // The composer rising shrinks the thread: keep the question in view.
          onLayout={() => scroll.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading} accessibilityRole="header">
            Your why
          </Text>
          {past.map((t) => (
            <React.Fragment key={t.id}>
              <AssistantGroup>
                <Lines lines={t.say(a, name)} a={a} onEdit={openEdit} after={<Answered input={t.input(a)} said={a.said[t.id]} settle={t.id === justAnswered.current} />} />
              </AssistantGroup>
              <Mine text={a.said[t.id]} />
            </React.Fragment>
          ))}
          {help ? (
            <Appear>
              <GetHelp onContinue={() => setHelp(false)} />
            </Appear>
          ) : (
            turn && (
              <AssistantGroup>
                <Live
                  key={turn.id}
                  lines={turn.say(a, name)}
                  a={a}
                  onEdit={openEdit}
                  wait={arrived.current ? THINK_MS : ARRIVE_MS}
                  onDone={() => setReady(true)}
                  after={open ? ask : null}
                />
              </AssistantGroup>
            )
          )}
        </ScrollView>

        {turn && (
          <ChatBar
            inputRef={field}
            value={draft}
            onChange={setDraft}
            onSend={send}
            canSend={canSend}
            placeholder={placeholder}
            bottom={bottom}
            multiline={input?.type !== "scale"}
            keyboardType={input?.type === "scale" ? "number-pad" : "default"}
            idle={
              open && input.type === "text" && !draft.trim()
                ? { label: "Skip", onPress: send }
                : open && input.type === "pick" && picked.length > 0
                  ? { label: "Send", onPress: send }
                  : undefined
            }
          />
        )}
      </KeyboardAvoidingView>
      {editing && (
        <Sheet title="Edit" onClose={() => setEditing(undefined)}>
          <TextField label={WHY_LABELS[editing]} value={edit} onChangeText={setEdit} autoFocus multiline />
          <Button onPress={saveEdit}>Save</Button>
        </Sheet>
      )}
    </View>
  )
}

/* ------------------------------------------------------------ thread -- */

function Lines({ lines, a, onEdit, after }: { lines: Line[]; a: Answers; onEdit: (key: WhyKey) => void; after?: React.ReactNode }) {
  const end = endsOnCard(lines) ? -1 : lastText(lines)
  return (
    <>
      {lines.map((line, i) =>
        typeof line === "string" ? (
          <TheirBubble key={i} wide={i === end && !!after}>
            <Text style={bubbleText()}>{line}</Text>
            {i === end && after}
          </TheirBubble>
        ) : (
          <View key={i} style={styles.card}>
            {line.card === "why" ? <WhyCard a={a} onEdit={onEdit} /> : <FlourishCard answers={a.flourish} />}
          </View>
        )
      )}
      {end < 0 && after && (
        <TheirBubble wide style={styles.optionsAlone}>
          {after}
        </TheirBubble>
      )}
    </>
  )
}

/** The current turn, as the assistant writes it: it types, the line streams
    in, it types the next. The composer comes up once the last line lands. */
function Live({
  lines,
  a,
  onEdit,
  wait,
  onDone,
  after,
}: {
  lines: Line[]
  a: Answers
  onEdit: (key: WhyKey) => void
  wait: number
  onDone: () => void
  after?: React.ReactNode
}) {
  const end = endsOnCard(lines) ? -1 : lastText(lines)
  const [at, setAt] = React.useState(0)
  const [typing, setTyping] = React.useState(true)

  const done = React.useRef(onDone)
  done.current = onDone
  React.useEffect(() => {
    if (at >= lines.length) {
      done.current()
      return
    }
    if (!typing) return
    const id = setTimeout(() => setTyping(false), at === 0 ? wait : BETWEEN_MS)
    return () => clearTimeout(id)
  }, [at, typing, lines.length, wait])

  const next = React.useCallback(() => {
    setAt((n) => n + 1)
    setTyping(true)
  }, [])

  // A card has nothing to stream: it rises in, then the turn moves on.
  const card = at < lines.length && !typing && typeof lines[at] !== "string"
  React.useEffect(() => {
    if (!card) return
    const id = setTimeout(next, 400)
    return () => clearTimeout(id)
  }, [card, next])

  const shown = lines.slice(0, typing ? at : at + 1)
  return (
    <>
      {shown.map((line, i) =>
        typeof line === "string" ? (
          // A bubble holding options takes 88% of the thread, so the wrapper
          // must span it; otherwise it shrinks to the question's length.
          <Appear key={i} lift={4} style={i === end && !!after ? styles.card : undefined}>
            <TheirBubble wide={i === end && !!after}>
              <StreamedText text={line} playing={i === at} onDone={i === at ? next : undefined} style={bubbleText()} />
              {i === end && after && <Appear>{after}</Appear>}
            </TheirBubble>
          </Appear>
        ) : (
          <Appear key={i} style={styles.card}>
            {line.card === "why" ? <WhyCard a={a} onEdit={onEdit} /> : <FlourishCard answers={a.flourish} />}
          </Appear>
        )
      )}
      {typing && at < lines.length && <TypingBubble />}
      {end < 0 && after && at >= lines.length && (
        <Appear lift={4} style={styles.card}>
          <TheirBubble wide style={styles.optionsAlone}>
            {after}
          </TheirBubble>
        </Appear>
      )}
    </>
  )
}

/** A reply split back into the quick answers it was built from. */
const parts = (draft: string) =>
  draft
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)

/** The last spoken line of a turn: its options go inside it. */
const lastText = (lines: Line[]) => lines.map((l) => typeof l === "string").lastIndexOf(true)

/** A turn that ends on a card asks about the card, so its options go below
    it, in a bubble of their own, rather than above it in the last line. */
const endsOnCard = (lines: Line[]) => lines.length > 0 && typeof lines[lines.length - 1] !== "string"

/** A past question's options, locked, with the answer ticked. */
function Answered({ input, said, settle }: { input: Input | null; said?: string; settle?: boolean }) {
  if (!input || !said || (input.type !== "reply" && input.type !== "pick")) return null
  const picked = input.options.filter((o) => said === o || said.includes(o))
  return <Options options={input.options} live={false} multi={input.type === "pick"} settle={settle} picked={picked} onPick={() => {}} />
}

function Mine({ text }: { text?: string }) {
  if (!text) return null
  const skipped = text === "Skip"
  return <MyBubble text={skipped ? "Skipped" : text} muted={skipped} />
}

/** The script stops for anything that needs a person now. */
function GetHelp({ onContinue }: { onContinue: () => void }) {
  const clinic = PATIENT.practicePhone.replace(/\D/g, "")
  return (
    <View style={styles.help} accessibilityRole="alert">
      <Text style={styles.helpTitle}>You don't have to handle this alone</Text>
      <Text style={styles.helpText}>
        If you're thinking about harming yourself, call or text 988 to reach the Suicide and Crisis Lifeline, any time. In an
        emergency, call 911. We've let your care team at {PATIENT.practice} know.
      </Text>
      <View style={styles.helpActions}>
        <Pill label="Call or text 988" selected onPress={() => Linking.openURL("tel:988")} />
        <Pill label="Call my clinic" onPress={() => Linking.openURL(`tel:${clinic}`)} />
        <Pill label="Keep going" onPress={onContinue} />
      </View>
    </View>
  )
}

/* ------------------------------------------------------------ inputs -- */

function Pill({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [styles.pill, selected && styles.pillOn, pressed && styles.pressed]}
    >
      {selected && <IconCheck size={14} color={color.onPrimary} strokeWidth={2.4} />}
      <Text style={[styles.pillText, selected && styles.pillTextOn]}>{label}</Text>
    </Pressable>
  )
}

/** Five faces, 1 to 5, a word under each. One tap pops the face in its
    colour and sends it. */
function FaceScale({ words, onPick }: { words: string[]; onPick: (n: number) => void }) {
  const [picked, setPicked] = React.useState<number>()
  const pops = React.useRef(words.map(() => new Animated.Value(1))).current
  return (
    <View style={styles.faces} accessibilityRole="radiogroup">
      {words.map((word, i) => {
        const n = i + 1
        const on = n === picked
        const tone = FACE_TONES[i]
        return (
          <Pressable
            key={word + i}
            onPress={() => {
              if (picked !== undefined) return
              setPicked(n)
              pops[i].setValue(0.75)
              Animated.spring(pops[i], { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }).start()
              setTimeout(() => onPick(n), 260)
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={word}
            style={styles.faceCol}
          >
            <Animated.View style={[styles.faceDisc, on && { backgroundColor: tone.bg }, { transform: [{ scale: pops[i] }] }]}>
              <IconFace face={i} size={28} color={on ? tone.fg : color.muted} />
            </Animated.View>
            <Text
              style={[styles.faceWord, on && { color: tone.fg, fontFamily: font.semibold }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {word}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Red through amber to green, lowest face first. */
const FACE_TONES = [
  { fg: color.high, bg: color.highTint },
  { fg: color.high, bg: color.highTint },
  { fg: color.low, bg: color.lowTint },
  { fg: color.ok, bg: color.okTint },
  { fg: color.ok, bg: color.okTint },
]

const column = { width: "100%", maxWidth: 420 + gutter * 2, alignSelf: "center", paddingHorizontal: gutter } as const

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  fill: { flex: 1 },
  pressed: { opacity: 0.8 },

  thread: { ...column, paddingTop: 4, paddingBottom: 20, gap: 10 },
  heading: { fontFamily: font.semibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.6, color: color.text, marginBottom: 10 },

  card: { alignSelf: "stretch" },
  // Options has its own top margin, which a bubble with no text above it
  // does not need.
  optionsAlone: { paddingTop: 4, paddingBottom: 10 },

  help: { backgroundColor: color.highTint, borderRadius: 20, padding: 16, gap: 10 },
  helpTitle: { fontFamily: font.semibold, fontSize: 16, color: color.text },
  helpText: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.text },
  helpActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: color.primary,
    backgroundColor: color.background,
  },
  pillOn: { backgroundColor: color.primary },
  pillText: { fontFamily: font.medium, fontSize: 14, color: color.primary },
  pillTextOn: { color: color.onPrimary },


  // Bleeds past the bubble's padding so each word fits on one line.
  faces: { flexDirection: "row", marginHorizontal: -8, marginTop: 8 },
  faceCol: { flex: 1, minWidth: 0, alignItems: "center", gap: 6 },
  faceDisc: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.background, alignItems: "center", justifyContent: "center" },
  faceWord: { fontFamily: font.medium, fontSize: 11, letterSpacing: -0.2, color: color.muted, textAlign: "center" },
})
