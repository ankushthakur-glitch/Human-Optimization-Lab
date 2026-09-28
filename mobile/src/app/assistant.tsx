import { router } from "expo-router"
import * as React from "react"
import {
  KeyboardAvoidingView,
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
import { Badge, SoftOrb } from "@/components/flow"
import { IconCheck, IconChevronRight, IconClose, IconSend, IconSparkle } from "@/components/icons"
import { Button, useTopInset } from "@/components/ui"
import { QUESTIONS, STARTERS, suggest, type QuestionId, type Suggestion } from "@/lib/assistant"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { TIERS, programName, type Tier } from "@/lib/plans"
import { color, font, gutter } from "@/lib/theme"

/* The assistant, opened full screen from the round button beside the tab
   bar. It opens on a greeting and a few ways to start; the patient says
   what is bothering them, answers three short questions (tap an answer or
   type one), and gets the programs that fit and the membership they come
   in, right in the thread, to start there or stay on the free record. */

type Draft = { from: "patient" | "assistant"; text: string } | { from: "assistant"; suggestions: Suggestion[] }
type Message = Draft & { id: number }

const THINK_MS = 800

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
  // Where the consult is: the concern, then each question in turn.
  const [concern, setConcern] = React.useState<string | null>(null)
  const [answers, setAnswers] = React.useState<Partial<Record<QuestionId, string>>>({})
  const asked = concern === null ? null : QUESTIONS[Object.keys(answers).length] ?? null

  // The membership picked from the plan card in the thread, once picked.
  const [chosen, setChosen] = React.useState<Tier | null>(null)

  const nextId = React.useRef(0)
  const scroll = React.useRef<ScrollView>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])

  const say = (m: Draft[]) => setMessages((list) => [...list, ...m.map((x) => ({ ...x, id: nextId.current++ }))])

  /** The assistant answers after a short pause, as if thinking. */
  function reply(m: Draft[]) {
    setThinking(true)
    timer.current = setTimeout(() => {
      setThinking(false)
      say(m)
    }, THINK_MS)
  }

  function send(text: string) {
    const said = text.trim()
    if (!said || thinking) return
    setDraft("")
    say([{ from: "patient", text: said }])

    // A new concern (the first message, or one after the programs are in).
    if (concern === null || asked === null) {
      setConcern(said)
      setAnswers({})
      reply([
        { from: "assistant", text: "Thanks for telling me. A few quick questions so I can point you to the right plan." },
        { from: "assistant", text: QUESTIONS[0].text },
      ])
      return
    }

    const next = { ...answers, [asked.id]: said }
    setAnswers(next)
    const following = QUESTIONS[Object.keys(next).length]
    if (following) {
      reply([{ from: "assistant", text: following.text }])
    } else {
      reply([
        { from: "assistant", text: "Based on what you told me and your health record, this is the plan I recommend." },
        { from: "assistant", suggestions: suggest(concern, next, sex) },
      ])
    }
  }

  async function choose(tier: Tier, programs: Suggestion["program"][]) {
    if (chosen || thinking) return
    setChosen(tier)
    const paid = TIERS.optimization
    say([{ from: "patient", text: tier === "optimization" ? `Start ${paid.name}` : "Stay on the free record" }])
    await onboarding.save({ membership: { tier, programs } })
    reply(
      tier === "optimization"
        ? [
            {
              from: "assistant",
              text: `You're on ${paid.name}. Your plan covers ${list(programs.map(programName))}. You'll find it on the Plan tab.`,
            },
          ]
        : [{ from: "assistant", text: "No problem, your free record stays as it is. You can start a plan from here any time." }]
    )
  }

  const empty = messages.length === 0
  const options = !thinking && asked ? asked.options : []

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
          <Text style={styles.headTitle} accessibilityRole="header">
            Assistant
          </Text>
          <View style={styles.headSpace} />
        </View>
      </View>

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scroll}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={[styles.thread, empty && styles.threadEmpty]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {empty ? (
            <View style={styles.welcome}>
              <SoftOrb size={132} />
              <Text style={styles.greeting}>Hi {name}, what's on your mind?</Text>
              <View style={styles.starters}>
                {STARTERS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => send(s)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.starter, pressed && styles.pressed]}
                  >
                    <Text style={styles.starterText}>{s}</Text>
                    <IconChevronRight color={color.muted} size={16} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            messages.map((m) =>
              "suggestions" in m ? (
                <Suggestions
                  key={m.id}
                  list={m.suggestions}
                  chosen={chosen}
                  member={onboarding.membership?.tier === "optimization"}
                  onChoose={(tier) => choose(tier, m.suggestions.map((x) => x.program))}
                />
              ) : (
                <View key={m.id} style={[styles.bubble, m.from === "patient" ? styles.mine : styles.theirs]}>
                  <Text style={[styles.bubbleText, m.from === "patient" && styles.mineText]}>{m.text}</Text>
                </View>
              )
            )
          )}
          {thinking && <Typing />}
          {options.length > 0 && (
            <View style={styles.replies}>
              {options.map((o) => (
                <Pressable
                  key={o}
                  onPress={() => send(o)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.reply, pressed && styles.pressed]}
                >
                  <Text style={styles.replyText}>{o}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: Math.max(bottom, 12) + 8 }]}>
          <View style={styles.composerInner}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => send(draft)}
              placeholder={asked ? "Type your answer" : "Describe what's bothering you"}
              placeholderTextColor={color.placeholder}
              returnKeyType="send"
              submitBehavior="submit"
              style={styles.input}
              accessibilityLabel="Message"
            />
            <Pressable
              onPress={() => send(draft)}
              disabled={!draft.trim() || thinking}
              accessibilityRole="button"
              accessibilityLabel="Send"
              style={({ pressed }) => [
                styles.send,
                (!draft.trim() || thinking) && styles.sendOff,
                pressed && styles.pressed,
              ]}
            >
              <IconSend color={color.onPrimary} size={18} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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

function Typing() {
  return (
    <View style={[styles.bubble, styles.theirs, styles.typing]} accessibilityLabel="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.dot, { opacity: 0.35 + i * 0.25 }]} />
      ))}
    </View>
  )
}

const column = { width: "100%", maxWidth: 420 + gutter * 2, alignSelf: "center", paddingHorizontal: gutter } as const

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  fill: { flex: 1 },
  pressed: { opacity: 0.8 },

  head: { backgroundColor: color.background },
  headInner: { ...column, paddingHorizontal: gutter - 4, paddingBottom: 8, flexDirection: "row", alignItems: "center" },
  headTitle: { flex: 1, textAlign: "center", fontFamily: font.semibold, fontSize: 17, color: color.text },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: color.canvas },
  closePressed: { backgroundColor: color.border },
  headSpace: { width: 40, height: 40 },

  thread: { ...column, paddingTop: 12, paddingBottom: 20, gap: 10 },
  threadEmpty: { flexGrow: 1, justifyContent: "center" },

  welcome: { alignItems: "center", gap: 20 },
  greeting: {
    fontFamily: font.semibold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.7,
    color: color.text,
    textAlign: "center",
  },
  starters: { alignSelf: "stretch", gap: 8, marginTop: 4 },
  starter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.canvas,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  starterText: { flex: 1, fontFamily: font.medium, fontSize: 15, color: color.text },

  bubble: { maxWidth: "85%", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  theirs: { alignSelf: "flex-start", backgroundColor: color.canvas, borderBottomLeftRadius: 6 },
  mine: { alignSelf: "flex-end", backgroundColor: color.primary, borderBottomRightRadius: 6 },
  bubbleText: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: color.text },
  mineText: { color: color.onPrimary },
  typing: { flexDirection: "row", gap: 5, paddingVertical: 15 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.muted },

  replies: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  reply: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: color.primary,
    justifyContent: "center",
  },
  replyText: { fontFamily: font.medium, fontSize: 14, color: color.primary },

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

  composer: { borderTopWidth: 1, borderTopColor: color.border, backgroundColor: color.background, paddingTop: 10 },
  composerInner: { ...column, paddingHorizontal: gutter - 8, flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.canvas,
    paddingHorizontal: 18,
    fontFamily: font.regular,
    fontSize: 15,
    color: color.text,
    ...Platform.select({ web: { outlineStyle: "none" } as unknown as TextStyle }),
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOff: { backgroundColor: color.primaryHalo },
})
