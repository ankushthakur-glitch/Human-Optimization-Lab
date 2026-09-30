import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { DarkStatusBar } from "@/components/error-state"
import { Badge } from "@/components/flow"
import { ChatBar, MyBubble, OptionRow, Options, TheirBubble, TypingBubble, bubbleText, optionTextStyle } from "@/components/chat"
import { IconCheck, IconClose, IconFace, IconSparkle, RATING_FACES } from "@/components/icons"
import { Button, useTopInset } from "@/components/ui"
import {
  ASKABLE_MEDICINES,
  CONCERNS,
  FREE_QUESTIONS,
  QUESTIONS,
  TOPICS,
  WRAP_UP,
  medicineAnswer,
  recordAnswer,
  suggest,
  type QuestionId,
  type Suggestion,
  type Topic,
} from "@/lib/assistant"
import { needsHelp } from "@/lib/conversation"
import { monthKey } from "@/lib/dates"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { TIERS, programName, type Tier } from "@/lib/plans"
import { BIOMARKERS, inRange } from "@/lib/record"
import { color, font, gutter } from "@/lib/theme"

/* The assistant, opened full screen from the round button beside the tab
   bar. It runs like the support chats in food and grocery apps: it greets
   the patient and offers a short list of topics inside its own message;
   each topic narrows with one more list (a result, a medicine, a concern),
   a tapped option is sent as the patient's reply and the list locks, the
   answer comes back in the thread, and the chat closes with a rating.
   Typing works at any point: a typed reply answers the open question, or
   starts a consult of its own. Anything that sounds urgent stops for a
   safety message first. The free record gets a few questions a month. */

type Message = { id: number; at: string } & (
  | { kind: "text"; from: "patient" | "assistant"; text: string }
  /** A question with its options inside the bubble; locks once answered. */
  | { kind: "ask"; text: string; options: string[]; picked?: string; onPick: Step }
  /** The patient's results to choose one from. */
  | { kind: "results"; text: string; picked?: string }
  /** Asks for a note to the care team, written in a sheet. */
  | { kind: "details"; text: string; sent?: boolean }
  | { kind: "plan"; suggestions: Suggestion[] }
  | { kind: "sent" }
  | { kind: "closed" }
  | { kind: "rate"; value?: number }
)
type Draft = Message extends infer M ? (M extends Message ? Omit<M, "id" | "at"> : never) : never

/** What the patient's next reply, tapped or typed, answers. */
type Step = "topic" | "concern" | "concernText" | "question" | "result" | "medicine" | "wrap" | "free"

const THINK_MS = 800
const INK = "#18181A"
const FACE_LABELS = ["Awful", "Poor", "Okay", "Good", "Excellent"]

const clock = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

/** "A, B and C" */
const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`)

export default function AssistantScreen() {
  const top = useTopInset()
  const { bottom } = useSafeAreaInsets()
  const onboarding = useOnboarding()
  const sex = onboarding.profile?.sex ?? "female"
  const name = onboarding.profile?.preferredName || onboarding.profile?.firstName || PATIENT.firstName

  const [messages, setMessages] = React.useState<Message[]>([])
  const [draft, setDraft] = React.useState("")
  const [thinking, setThinking] = React.useState(false)
  const [step, setStep] = React.useState<Step>("topic")
  const [closed, setClosed] = React.useState(false)
  // The consult: the concern, then each question in turn.
  const [concern, setConcern] = React.useState<string | null>(null)
  const [answers, setAnswers] = React.useState<Partial<Record<QuestionId, string>>>({})
  // The membership picked from the plan card in the thread, once picked.
  const [chosen, setChosen] = React.useState<Tier | null>(null)
  // The care team note sheet, and the message that opened it.
  const [noteFor, setNoteFor] = React.useState<number | null>(null)
  const [note, setNote] = React.useState("")

  const nextId = React.useRef(0)
  const scroll = React.useRef<ScrollView>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])

  const say = (m: Draft[]) =>
    setMessages((all) => [...all, ...m.map((x) => ({ ...x, id: nextId.current++, at: clock() }) as Message)])
  const patch = (id: number, change: Partial<Message>) =>
    setMessages((all) => all.map((m) => (m.id === id ? ({ ...m, ...change } as Message) : m)))

  /** The assistant answers after a short pause, as if thinking, then waits
      for the reply `next` names. */
  function reply(m: Draft[], next: Step, then?: () => void) {
    setThinking(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setThinking(false)
      say(m)
      setStep(next)
      if (then) timer.current = setTimeout(then, THINK_MS)
    }, THINK_MS)
  }

  const member = onboarding.membership?.tier === "optimization" && !onboarding.membership.paused
  const month = monthKey()
  const used = onboarding.asked?.month === month ? onboarding.asked.count : 0
  const left = Math.max(0, FREE_QUESTIONS - used)

  const topics: Draft = { kind: "ask", text: "What can I help you with?", options: Object.values(TOPICS), onPick: "topic" }
  const wrapUp: Draft = { kind: "ask", text: "Is there anything else I can help with?", options: Object.values(WRAP_UP), onPick: "wrap" }

  /** Spends one of the month's free questions; false, with the reason in
      the thread, when none are left. */
  function spend() {
    if (member) return true
    if (left === 0) {
      reply(
        [
          {
            kind: "text",
            from: "assistant",
            text: `You've used this month's ${FREE_QUESTIONS} free questions. They come back on the 1st, or Optimization has no limit.`,
          },
          wrapUp,
        ],
        "wrap"
      )
      return false
    }
    onboarding.save({ asked: { month, count: used + 1 } })
    return true
  }

  function greet(fresh: boolean) {
    const hello: Draft = {
      kind: "text",
      from: "assistant",
      text: fresh ? `Hi ${name}, I'm your Inlay assistant. I answer from your health record.` : `Welcome back, ${name}.`,
    }
    return [hello, topics]
  }

  // The chat opens on the greeting, then any question it was opened with.
  const { ask } = useLocalSearchParams<{ ask?: string }>()
  const started = React.useRef(false)
  React.useEffect(() => {
    if (started.current) return
    started.current = true
    say(greet(true))
    if (ask) typed(ask)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startOver() {
    setClosed(false)
    setConcern(null)
    setAnswers({})
    setChosen(null)
    say(greet(false))
    setStep("topic")
  }

  function close() {
    clearTimeout(timer.current)
    setThinking(false)
    setClosed(true)
    setStep("free")
    say([{ kind: "closed" }, { kind: "rate" }])
  }

  /** A typed message: the crisis check first, then whatever is open. */
  function typed(text: string) {
    const said = text.trim()
    if (!said || thinking) return
    setDraft("")
    if (closed) {
      setClosed(false)
      setConcern(null)
      setAnswers({})
      setChosen(null)
    }
    say([{ kind: "text", from: "patient", text: said }])
    if (needsHelp(said) || /chest pain|can't breathe|cannot breathe|faint|stroke/i.test(said)) {
      reply(
        [
          {
            kind: "text",
            from: "assistant",
            text: `This sounds like it needs a person now. In an emergency call 911, or call or text 988 any time. You can also call ${PATIENT.practice} at ${PATIENT.practicePhone}. I've let your care team know.`,
          },
          wrapUp,
        ],
        "wrap"
      )
      return
    }
    // A typed reply to an open list answers it when it matches an option.
    const open = [...messages].reverse().find((m) => m.kind === "ask" && !m.picked)
    const match = open?.kind === "ask" && open.options.find((o) => o.toLowerCase() === said.toLowerCase())
    if (open && match) {
      patch(open.id, { picked: match })
      answer(open.onPick, match)
      return
    }
    if (step === "question" || step === "concernText") answer(step, said)
    else freeText(said)
  }

  /** A question typed in the patient's own words. */
  function freeText(said: string) {
    if (!spend()) return
    const fromRecord = recordAnswer(said)
    if (fromRecord) {
      reply([...fromRecord.map((t) => ({ kind: "text" as const, from: "assistant" as const, text: t })), wrapUp], "wrap")
      return
    }
    consult(said)
  }

  function consult(said: string) {
    setConcern(said)
    setAnswers({})
    reply(
      [
        { kind: "text", from: "assistant", text: "Thanks for telling me. A few quick questions so I can point you to the right plan." },
        { kind: "ask", text: QUESTIONS[0].text, options: QUESTIONS[0].options, onPick: "question" },
      ],
      "question"
    )
  }

  /** A tapped option: sent as the patient's reply, and the list locks. */
  function pick(m: Message, option: string) {
    if (thinking || m.kind !== "ask" || m.picked) return
    patch(m.id, { picked: option })
    say([{ kind: "text", from: "patient", text: option }])
    answer(m.onPick, option)
  }

  function answer(to: Step, value: string) {
    switch (to) {
      case "topic":
        return topic((Object.keys(TOPICS) as Topic[]).find((k) => TOPICS[k] === value) ?? "concern")
      case "concern":
        if (value === "Something else") {
          return reply([{ kind: "text", from: "assistant", text: "Tell me in a few words what's bothering you." }], "concernText")
        }
        return consult(value)
      case "concernText":
        return consult(value)
      case "question": {
        const asked = QUESTIONS[Object.keys(answers).length]
        if (!asked || !concern) return freeText(value)
        const next = { ...answers, [asked.id]: value }
        setAnswers(next)
        const following = QUESTIONS[Object.keys(next).length]
        if (following) {
          return reply([{ kind: "ask", text: following.text, options: following.options, onPick: "question" }], "question")
        }
        return reply(
          [
            { kind: "text", from: "assistant", text: "Based on what you told me and your health record, this is the plan I recommend." },
            { kind: "plan", suggestions: suggest(concern, next, sex) },
          ],
          "free"
        )
      }
      case "medicine":
        return reply(
          [...medicineAnswer(value).map((t) => ({ kind: "text" as const, from: "assistant" as const, text: t })), wrapUp],
          "wrap"
        )
      case "wrap":
        if (value === WRAP_UP.more) return reply([topics], "topic")
        if (value === WRAP_UP.team) return topic("team")
        return reply([{ kind: "text", from: "assistant", text: "Glad I could help. Take care." }], "free", close)
      default:
        return freeText(value)
    }
  }

  function topic(t: Topic) {
    switch (t) {
      case "result":
        if (!spend()) return
        return reply([{ kind: "results", text: "Which result would you like me to explain?" }], "result")
      case "concern":
        if (!spend()) return
        return reply([{ kind: "ask", text: "What's bothering you?", options: CONCERNS, onPick: "concern" }], "concern")
      case "visit": {
        if (!spend()) return
        const lines = recordAnswer("questions for my doctor") ?? []
        return reply([...lines.map((t) => ({ kind: "text" as const, from: "assistant" as const, text: t })), wrapUp], "wrap")
      }
      case "medicine":
        if (!spend()) return
        return reply(
          [{ kind: "ask", text: "Which medicine is it about?", options: ASKABLE_MEDICINES.map((m) => m.name), onPick: "medicine" }],
          "medicine"
        )
      case "team":
        return reply([{ kind: "details", text: "Tell your care team what's going on. Sam Ortiz reads every message." }], "free")
    }
  }

  function pickResult(m: Message, id: string) {
    if (thinking || m.kind !== "results" || m.picked) return
    const marker = BIOMARKERS.find((b) => b.id === id)!
    patch(m.id, { picked: id })
    say([{ kind: "text", from: "patient", text: marker.name }])
    const lines = recordAnswer(marker.name) ?? []
    reply([...lines.map((t) => ({ kind: "text" as const, from: "assistant" as const, text: t })), wrapUp], "wrap")
  }

  function sendNote() {
    const text = note.trim()
    if (!text || noteFor === null) return
    patch(noteFor, { sent: true })
    setNoteFor(null)
    setNote("")
    say([{ kind: "text", from: "patient", text }])
    reply([{ kind: "sent" }, wrapUp], "wrap")
  }

  async function choose(tier: Tier, programs: Suggestion["program"][]) {
    if (chosen || thinking) return
    setChosen(tier)
    const paid = TIERS.optimization
    say([{ kind: "text", from: "patient", text: tier === "optimization" ? `Start ${paid.name}` : "Stay on the free record" }])
    const starting = tier === "optimization" && onboarding.membership?.tier !== "optimization"
    await onboarding.save({ membership: { tier, programs }, ...(starting ? { setupDone: [], plan: undefined } : {}) })
    reply(
      [
        tier === "optimization"
          ? {
              kind: "text",
              from: "assistant",
              text: `You're on ${paid.name}. Your plan covers ${list(programs.map(programName))}. Next, a few steps to set it up, on the Plan tab.`,
            }
          : { kind: "text", from: "assistant", text: "No problem, your free record stays as it is. You can start a plan from here any time." },
        wrapUp,
      ],
      "wrap"
    )
  }

  // Only the newest list takes a tap; earlier ones are history.
  const lastList = [...messages].reverse().find((m) => m.kind === "ask" || m.kind === "results")?.id
  const placeholder =
    step === "concernText" ? "Describe what's bothering you" : step === "question" ? "Type your answer" : "Chat with your assistant"

  return (
    <View style={styles.screen}>
      <DarkStatusBar />
      <View style={[styles.head, { paddingTop: top + 8 }]}>
        <View style={styles.headInner}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
          >
            <IconClose color={color.text} />
          </Pressable>
          <View style={styles.headCenter}>
            <Text style={styles.headTitle} accessibilityRole="header">
              Assistant
            </Text>
            <Text style={styles.headMeta}>
              {member ? "Your personal health assistant" : left === 1 ? "1 free question left this month" : `${left} free questions left this month`}
            </Text>
          </View>
          {closed ? (
            <View style={styles.headSpace} />
          ) : (
            <Pressable onPress={close} hitSlop={8} accessibilityRole="button" style={styles.endChat}>
              <Text style={styles.endChatText}>End chat</Text>
            </Pressable>
          )}
        </View>
      </View>

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scroll}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.day}>Today</Text>
          {messages.map((m) => {
            switch (m.kind) {
              case "text":
                return m.from === "patient" ? (
                  <MyBubble key={m.id} text={m.text} at={m.at} />
                ) : (
                  <TheirBubble key={m.id} at={m.at} named>
                    <Text style={bubbleText()}>{m.text}</Text>
                  </TheirBubble>
                )
              case "ask": {
                const live = m.id === lastList && !m.picked && !closed
                return (
                  <TheirBubble key={m.id} at={m.at} named wide>
                    <Text style={bubbleText()}>{m.text}</Text>
                    <Options options={m.options} live={live} picked={m.picked ? [m.picked] : []} onPick={(o) => pick(m, o)} />
                  </TheirBubble>
                )
              }
              case "results": {
                const live = m.id === lastList && !m.picked && !closed
                return (
                  <TheirBubble key={m.id} at={m.at} named wide>
                    <Text style={bubbleText()}>{m.text}</Text>
                    <View style={styles.options}>
                      {BIOMARKERS.slice(0, 5).map((b) => {
                        const last = b.points.at(-1)!
                        const ok = inRange(b, last.value)
                        return (
                          <OptionRow key={b.id} live={live} picked={m.picked === b.id} onPress={() => pickResult(m, b.id)}>
                            <Text style={optionTextStyle(!live && m.picked !== b.id)}>{b.name}</Text>
                            <View style={styles.resultMeta}>
                              <View style={[styles.dot, { backgroundColor: ok ? color.ok : color.high }]} />
                              <Text style={styles.resultMetaText}>
                                {last.shown ?? last.value} {b.unit}, {last.date}
                              </Text>
                            </View>
                          </OptionRow>
                        )
                      })}
                      {live && (
                        <Pressable onPress={() => router.push("/results")} accessibilityRole="button" style={styles.moreLink}>
                          <Text style={styles.moreLinkText}>See all results</Text>
                        </Pressable>
                      )}
                    </View>
                  </TheirBubble>
                )
              }
              case "details":
                return (
                  <TheirBubble key={m.id} at={m.at} named wide>
                    <Text style={bubbleText()}>{m.text}</Text>
                    {m.sent ? (
                      <View style={styles.sentRow}>
                        <IconCheck size={14} color={color.ok} strokeWidth={2.4} />
                        <Text style={styles.sentRowText}>Details added</Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => !closed && setNoteFor(m.id)}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.inlineAction, pressed && styles.pressed]}
                      >
                        <Text style={styles.inlineActionText}>Add details</Text>
                      </Pressable>
                    )}
                  </TheirBubble>
                )
              case "plan":
                return (
                  <Suggestions
                    key={m.id}
                    list={m.suggestions}
                    chosen={chosen}
                    member={onboarding.membership?.tier === "optimization"}
                    onChoose={(tier) => choose(tier, m.suggestions.map((x) => x.program))}
                  />
                )
              case "sent":
                return (
                  <View key={m.id} style={styles.status}>
                    <View style={styles.statusBody}>
                      <Text style={styles.statusTitle}>Sent to your care team</Text>
                      <Text style={styles.statusMeta}>Sam Ortiz usually replies within 1 business day</Text>
                    </View>
                    <View style={[styles.dot, styles.statusDot]} />
                  </View>
                )
              case "closed":
                return (
                  <View key={m.id} style={styles.closed}>
                    <IconCheck size={14} color={color.ok} strokeWidth={2.4} />
                    <Text style={styles.closedText}>This conversation has been closed</Text>
                  </View>
                )
              case "rate":
                return (
                  <View key={m.id} style={styles.rate}>
                    <Text style={styles.rateTitle}>{m.value === undefined ? "How well did I help?" : "Thanks for rating this chat"}</Text>
                    <View style={styles.faces}>
                      {RATING_FACES.map((_, i) => {
                        const on = m.value === i
                        return (
                          <Pressable
                            key={i}
                            onPress={() => m.value === undefined && patch(m.id, { value: i })}
                            disabled={m.value !== undefined}
                            accessibilityRole="button"
                            accessibilityLabel={FACE_LABELS[i]}
                            style={[styles.face, on && styles.faceOn]}
                          >
                            <IconFace face={i} size={30} color={on ? color.primary : m.value === undefined ? INK : color.border} />
                          </Pressable>
                        )
                      })}
                    </View>
                    <Pressable onPress={startOver} hitSlop={8} accessibilityRole="button">
                      <Text style={styles.rateLink}>
                        Still have a question? <Text style={styles.rateLinkAction}>Start a new chat</Text>
                      </Text>
                    </Pressable>
                  </View>
                )
            }
          })}
          {thinking && <TypingBubble />}
        </ScrollView>

        <ChatBar
          value={draft}
          onChange={setDraft}
          onSend={() => typed(draft)}
          canSend={!thinking}
          placeholder={placeholder}
          bottom={bottom}
        />
      </KeyboardAvoidingView>

      {/* The note to the care team, written in a sheet over the chat. */}
      <Modal visible={noteFor !== null} transparent animationType="slide" onRequestClose={() => setNoteFor(null)}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.scrim} onPress={() => setNoteFor(null)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { paddingBottom: Math.max(bottom - 12, 16) }]}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Add details</Text>
              <Pressable
                onPress={() => setNoteFor(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
              >
                <IconClose color={color.text} size={18} />
              </Pressable>
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="What would you like your care team to know?"
              placeholderTextColor={color.placeholder}
              multiline
              autoFocus
              style={styles.noteInput}
              accessibilityLabel="Details"
            />
            <Button onPress={sendNote} disabled={!note.trim()}>
              Send to care team
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

/** The recommended plan, in the thread: the programs that fit, each with
    why, merged into the one Optimization membership, with its price, what
    it includes, and the choice to start it or stay on the free record. */
function Suggestions({
  list,
  chosen,
  member,
  onChoose,
}: {
  list: Suggestion[]
  chosen: Tier | null
  member: boolean
  onChoose: (tier: Tier) => void
}) {
  const paid = TIERS.optimization
  const picked = chosen ?? (member ? "optimization" : null)
  return (
    <View style={styles.planCard}>
      <View style={styles.planTop}>
        <View style={styles.tierIcon}>
          <IconSparkle color={color.onPrimary} size={16} />
        </View>
        <View style={styles.tierBody}>
          <Text style={styles.tierName}>{paid.name}</Text>
          <Text style={styles.tierPrice}>
            {paid.price} {paid.per}
          </Text>
        </View>
        <Badge>{picked === "optimization" ? "Your plan" : "Recommended"}</Badge>
      </View>

      <View style={styles.programs}>
        {list.map((s) => (
          <View key={s.program} style={styles.plan}>
            <Text style={styles.planName}>{programName(s.program)}</Text>
            <View style={styles.reasons}>
              {s.reasons.map((r) => (
                <View key={r} style={styles.reason}>
                  <View style={styles.reasonDot} />
                  <Text style={styles.reasonText}>{r}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.features}>
        {paid.features.slice(1, 6).map((f) => (
          <View key={f} style={styles.feature}>
            <IconCheck size={14} color={color.primary} strokeWidth={2.4} />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {picked ? (
        <View style={styles.done}>
          <IconCheck size={16} color={color.ok} strokeWidth={2.4} />
          <Text style={styles.doneText}>{picked === "optimization" ? `${paid.name} started` : "Staying on the free record"}</Text>
        </View>
      ) : (
        <View style={styles.planActions}>
          <Button onPress={() => onChoose("optimization")}>{`Start ${paid.name} · ${paid.price} ${paid.per}`}</Button>
          <Button variant="outline" onPress={() => onChoose("free")}>
            Stay on the free record
          </Button>
          <Pressable
            onPress={() => router.push({ pathname: "/plans", params: { programs: list.map((s) => s.program).join(",") } })}
            hitSlop={8}
            accessibilityRole="button"
            style={styles.compare}
          >
            <Text style={styles.compareText}>Compare plans and add ons</Text>
          </Pressable>
        </View>
      )}
      <Text style={styles.review}>Your care team reviews every plan before it starts.</Text>
    </View>
  )
}

const column = { width: "100%", maxWidth: 420 + gutter * 2, alignSelf: "center", paddingHorizontal: gutter } as const

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  fill: { flex: 1 },
  pressed: { opacity: 0.8 },

  head: { backgroundColor: color.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  headInner: { ...column, paddingHorizontal: gutter - 4, paddingBottom: 10, flexDirection: "row", alignItems: "center" },
  headCenter: { flex: 1, alignItems: "center", gap: 1 },
  headTitle: { textAlign: "center", fontFamily: font.semibold, fontSize: 17, color: color.text },
  headMeta: { fontFamily: font.regular, fontSize: 12, color: color.muted },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: color.canvas },
  closePressed: { backgroundColor: color.border },
  headSpace: { width: 64, height: 40 },
  endChat: { width: 64, height: 40, alignItems: "flex-end", justifyContent: "center" },
  endChatText: { fontFamily: font.semibold, fontSize: 14, color: color.high },

  thread: { ...column, paddingTop: 12, paddingBottom: 20, gap: 10 },
  day: { alignSelf: "center", fontFamily: font.medium, fontSize: 12, color: color.muted, marginBottom: 2 },


  options: { gap: 6, marginTop: 6 },
  resultMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  resultMetaText: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  dot: { width: 7, height: 7, borderRadius: 4 },
  moreLink: { alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 4 },
  moreLinkText: { fontFamily: font.semibold, fontSize: 14, color: color.primary },

  inlineAction: {
    marginTop: 6,
    height: 44,
    borderRadius: 14,
    backgroundColor: color.background,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineActionText: { fontFamily: font.semibold, fontSize: 15, color: color.primary },
  sentRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  sentRowText: { fontFamily: font.medium, fontSize: 13, color: color.ok },

  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: INK,
    borderRadius: 20,
    padding: 16,
    marginVertical: 4,
  },
  statusBody: { flex: 1, gap: 2 },
  statusTitle: { fontFamily: font.semibold, fontSize: 15, color: "#FFFFFF" },
  statusMeta: { fontFamily: font.regular, fontSize: 13, color: "#FFFFFF", opacity: 0.7 },
  statusDot: { backgroundColor: color.ok, width: 10, height: 10, borderRadius: 5 },

  closed: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: color.okTint,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 6,
  },
  closedText: { fontFamily: font.medium, fontSize: 13, color: color.ok },
  rate: { alignItems: "center", gap: 14, paddingVertical: 12 },
  rateTitle: { fontFamily: font.semibold, fontSize: 15, color: color.text },
  faces: { flexDirection: "row", gap: 10 },
  face: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  faceOn: { backgroundColor: color.primaryTint },
  rateLink: { fontFamily: font.regular, fontSize: 14, color: color.muted },
  rateLinkAction: { fontFamily: font.semibold, color: color.primary },

  planCard: {
    borderWidth: 1.5,
    borderColor: color.primaryHalo,
    borderRadius: 22,
    padding: 16,
    gap: 14,
    marginVertical: 4,
  },
  planTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  tierIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tierBody: { flex: 1, gap: 1 },
  tierName: { fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.2, color: color.text },
  tierPrice: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  programs: { gap: 8 },
  plan: { backgroundColor: color.canvas, borderRadius: 14, padding: 12, gap: 6 },
  planName: { fontFamily: font.semibold, fontSize: 15, color: color.text },
  reasons: { gap: 4 },
  reason: { flexDirection: "row", alignItems: "center", gap: 8 },
  reasonDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: color.primary },
  reasonText: { flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.muted },

  features: { gap: 8 },
  feature: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.text },
  planActions: { gap: 10 },
  compare: { alignSelf: "center", paddingVertical: 4 },
  compareText: { fontFamily: font.semibold, fontSize: 14, color: color.primary },
  done: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: color.okTint, borderRadius: 12, padding: 12 },
  doneText: { fontFamily: font.medium, fontSize: 14, color: color.ok },
  review: { fontFamily: font.regular, fontSize: 12, color: color.muted, textAlign: "center" },

  input: {
    minHeight: 32,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontFamily: font.regular,
    fontSize: 17,
    color: color.text,
    ...Platform.select({ web: { outlineStyle: "none" } as unknown as TextStyle }),
  },

  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: color.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: gutter,
    paddingTop: 16,
    gap: 14,
  },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontFamily: font.semibold, fontSize: 18, color: color.text },
  noteInput: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: color.border,
    padding: 14,
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 21,
    color: color.text,
    textAlignVertical: "top",
    ...Platform.select({ web: { outlineStyle: "none" } as unknown as TextStyle }),
  },
})
