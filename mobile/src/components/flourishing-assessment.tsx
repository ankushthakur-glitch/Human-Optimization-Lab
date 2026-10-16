import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import {
  Brain,
  CaretDown,
  Check,
  Coins,
  Compass,
  Heart,
  Heartbeat,
  Scales,
  Smiley,
  Target,
  UsersThree,
} from "@/components/ph"
import { HUE, type Hue } from "@/components/record-kit"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* The Inlay Human Flourishing Assessment, as the goals step asks it: eight
   domains, each a card that opens to its questions, every question on one
   0 to 10 scale where higher is always better. A card says how many of its
   questions are answered, and ticks when all are. */

type Icon = React.ComponentType<{ size?: number; color?: string; weight?: "regular" | "bold" | "fill" }>

type Question = {
  text: string
  /** The patient may decline (spirituality is not assumed). */
  optional?: boolean
}

export type Domain = {
  id: string
  title: string
  /** The line under the title, before it opens. */
  lead: string
  /** What she is asked to think about, over the questions. */
  prompt?: string
  icon: Icon
  hue: Hue
  low: string
  high: string
  questions: Question[]
}

export const DOMAINS: Domain[] = [
  {
    id: "physical",
    title: "Physical health & vitality",
    lead: "Your body, energy and strength",
    prompt: "Thinking about your health and how you have felt recently…",
    icon: Heartbeat,
    hue: "red",
    low: "Very poor",
    high: "Excellent",
    questions: [
      { text: "How would you rate your overall physical health?" },
      { text: "How satisfied are you with your energy and vitality?" },
      { text: "How well does your physical health allow you to do the things you want and need to do?" },
      { text: "How satisfied are you with your current level of strength, mobility and physical capability?" },
    ],
  },
  {
    id: "emotional",
    title: "Emotional health & resilience",
    lead: "Mood, stress and bouncing back",
    icon: Smiley,
    hue: "violet",
    low: "Not at all",
    high: "Completely",
    questions: [
      { text: "How would you rate your overall emotional and mental well-being?" },
      { text: "How well are you able to manage stress in your life?" },
      { text: "How well do you recover from setbacks or difficult situations?" },
      { text: "How much control do you feel you have over your emotions and reactions?" },
      { text: "How optimistic are you about your future?" },
    ],
  },
  {
    id: "relationships",
    title: "Relationships & social connection",
    lead: "The people who matter to you",
    icon: UsersThree,
    hue: "blue",
    low: "Not at all",
    high: "Completely",
    questions: [
      { text: "How satisfied are you with your closest relationships?" },
      { text: "To what extent do you have people you can rely on when you need help?" },
      { text: "How connected do you feel to family, friends or your community?" },
      { text: "How satisfied are you with the amount of meaningful time you spend with people important to you?" },
      { text: "How strongly do you feel that you belong and are valued by others?" },
    ],
  },
  {
    id: "purpose",
    title: "Purpose, meaning & spiritual well-being",
    lead: "What matters most to you",
    prompt: "Define spirituality in your own way. Faith, values or nature all count.",
    icon: Compass,
    hue: "amber",
    low: "Not at all",
    high: "Completely",
    questions: [
      { text: "To what extent does your life feel meaningful?" },
      { text: "How clearly do you understand your purpose or what is most important to you?" },
      { text: "How well does the way you live your life align with your values?" },
      { text: "How much does your life provide opportunities to serve or contribute to something beyond yourself?" },
      {
        text: "To what extent do faith, spirituality, personal values, nature or another source of meaning provide strength and direction in your life?",
        optional: true,
      },
    ],
  },
  {
    id: "intellectual",
    title: "Intellectual growth & cognitive engagement",
    lead: "Learning, focus and curiosity",
    icon: Brain,
    hue: "teal",
    low: "Not at all",
    high: "Completely",
    questions: [
      { text: "How mentally engaged and stimulated do you feel in your daily life?" },
      { text: "How satisfied are you with the amount you are learning and growing?" },
      { text: "How would you rate your ability to concentrate and think clearly?" },
      { text: "How often are you intellectually curious or interested in learning something new?" },
      { text: "How satisfied are you with the way you are developing your knowledge, abilities or skills?" },
    ],
  },
  {
    id: "contribution",
    title: "Contribution & life balance",
    lead: "How you spend your time",
    prompt: "Work, family, community or other responsibilities: whatever fills your days.",
    icon: Scales,
    hue: "green",
    low: "Not at all",
    high: "Completely",
    questions: [
      { text: "How meaningful do you find the way you spend most of your time?" },
      { text: "How satisfied are you with what you contribute through your work, family, community or other responsibilities?" },
      { text: "How much control do you feel you have over how you spend your time?" },
      { text: "How satisfied are you with the balance between your responsibilities and the rest of your life?" },
      { text: "How well does your current daily life support your health and well-being?" },
    ],
  },
  {
    id: "financial",
    title: "Financial & material well-being",
    lead: "Security and freedom to choose",
    icon: Coins,
    hue: "amber",
    low: "Not at all",
    high: "Completely",
    questions: [
      { text: "How confident are you that you can meet your normal financial needs?" },
      { text: "How financially secure do you feel?" },
      { text: "How prepared do you feel for an unexpected financial expense?" },
      { text: "How much freedom does your financial situation give you to make choices that support your health and quality of life?" },
      { text: "How confident are you about your longer-term financial future?" },
    ],
  },
  {
    id: "agency",
    title: "Health agency & self-efficacy",
    lead: "Knowing and shaping your health",
    icon: Target,
    hue: "teal",
    low: "Not at all",
    high: "Completely",
    questions: [
      { text: "How well do you understand your current health?" },
      { text: "How confident are you that you know what you can do to improve your health?" },
      { text: "How confident are you that you can make meaningful changes in your health behaviors?" },
      { text: "How much control do you believe your daily choices have over your future health?" },
      { text: "How confident are you navigating the healthcare system and making healthcare decisions?" },
    ],
  },
]

/** A saved answer: 0 to 10, or "na" for a question she chose not to answer. */
export type Answer = number | "na"
export type Answers = Record<string, Answer>

export const questionKey = (domain: string, index: number) => `${domain}.${index}`
export const TOTAL_QUESTIONS = DOMAINS.reduce((n, d) => n + d.questions.length, 0)

const SCALE = Array.from({ length: 11 }, (_, i) => i)

export function FlourishingAssessment({
  answers,
  onAnswer,
}: {
  answers: Answers
  onAnswer: (key: string, value: Answer) => void
}) {
  // One card open at a time keeps the page short; the first opens itself.
  const [open, setOpen] = React.useState<string | null>(DOMAINS[0].id)
  return (
    <View style={styles.group}>
      {DOMAINS.map((d, i) => (
        <DomainCard
          key={d.id}
          domain={d}
          number={i + 1}
          answers={answers}
          open={open === d.id}
          onToggle={() => setOpen(open === d.id ? null : d.id)}
          onAnswer={onAnswer}
        />
      ))}
    </View>
  )
}

function DomainCard({
  domain,
  number,
  answers,
  open,
  onToggle,
  onAnswer,
}: {
  domain: Domain
  number: number
  answers: Answers
  open: boolean
  onToggle: () => void
  onAnswer: (key: string, value: Answer) => void
}) {
  const Icon = domain.icon
  const done = domain.questions.filter((_, i) => answers[questionKey(domain.id, i)] !== undefined).length
  const all = done === domain.questions.length
  return (
    <View style={[styles.card, all && styles.cardDone]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${domain.title}, ${done} of ${domain.questions.length} answered`}
        style={({ pressed }) => [styles.head, pressed && styles.pressed]}
      >
        <View style={styles.icon}>
          <Icon size={20} color={HUE[domain.hue].ink} />
        </View>
        <View style={styles.headText}>
          <Text style={styles.title}>{domain.title}</Text>
          <Text style={styles.lead}>{domain.lead}</Text>
        </View>
        <View style={[styles.count, all && styles.countDone]}>
          {all ? (
            <Check size={12} weight="bold" color={color.onPrimary} />
          ) : (
            <Text style={styles.countText}>{`${done}/${domain.questions.length}`}</Text>
          )}
        </View>
        <View style={open && styles.flip}>
          <CaretDown size={16} color={ink.secondary} />
        </View>
      </Pressable>

      {open && (
        <View style={styles.body}>
          {!!domain.prompt && <Text style={styles.prompt}>{domain.prompt}</Text>}
          {domain.questions.map((q, i) => {
            const key = questionKey(domain.id, i)
            return (
              <QuestionRow
                key={key}
                n={`${number}.${i + 1}`}
                question={q}
                low={domain.low}
                high={domain.high}
                value={answers[key]}
                onChange={(v) => onAnswer(key, v)}
                last={i === domain.questions.length - 1}
              />
            )
          })}
        </View>
      )}
    </View>
  )
}

function QuestionRow({
  n,
  question,
  low,
  high,
  value,
  onChange,
  last,
}: {
  n: string
  question: Question
  low: string
  high: string
  value: Answer | undefined
  onChange: (v: Answer) => void
  last: boolean
}) {
  return (
    <View style={[styles.question, !last && styles.rule]}>
      <Text style={styles.qText}>
        <Text style={styles.qNum}>{`${n}  `}</Text>
        {question.text}
      </Text>
      <View style={styles.scale} accessibilityRole="radiogroup">
        {SCALE.map((v) => {
          const on = value === v
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              accessibilityRole="radio"
              accessibilityLabel={`${v} of 10`}
              accessibilityState={{ checked: on }}
              style={({ pressed }) => [styles.dot, on && styles.dotOn, pressed && styles.pressed]}
            >
              <Text style={[styles.dotText, on && styles.dotTextOn]}>{v}</Text>
            </Pressable>
          )
        })}
      </View>
      <View style={styles.ends}>
        <Text style={styles.endText}>{`0 ${low}`}</Text>
        <Text style={styles.endText}>{`10 ${high}`}</Text>
      </View>
      {question.optional && (
        <Pressable
          onPress={() => onChange("na")}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: value === "na" }}
          style={({ pressed }) => [styles.skip, value === "na" && styles.skipOn, pressed && styles.pressed]}
        >
          <Text style={[styles.skipText, value === "na" && styles.skipTextOn]}>Not applicable / I prefer not to answer</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  group: { gap: space.inline },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
    overflow: "hidden",
  },
  cardDone: { borderColor: color.primary },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: space.rowX,
  },
  icon: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headText: { flex: 1, gap: 2 },
  title: { ...type.title },
  lead: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink.tertiary },
  count: {
    minWidth: 32,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surface,
  },
  countDone: { backgroundColor: color.primary },
  countText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: ink.secondary },
  flip: { transform: [{ rotate: "180deg" }] },

  body: {
    paddingHorizontal: space.rowX,
    paddingBottom: space.rowY,
    gap: space.item,
    borderTopWidth: 1,
    borderTopColor: hairline.rule,
  },
  prompt: { ...type.body, color: ink.secondary, paddingTop: space.item },

  question: { gap: space.inline, paddingTop: space.item, paddingBottom: space.item },
  rule: { borderBottomWidth: 1, borderBottomColor: hairline.rule },
  qText: { ...type.title },
  qNum: { fontFamily: font.semibold, color: ink.primary },
  scale: { flexDirection: "row", gap: 3 },
  dot: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: color.background,
    alignItems: "center",
    justifyContent: "center",
  },
  dotOn: { borderColor: color.primary, backgroundColor: color.primary },
  dotText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: ink.content },
  dotTextOn: { color: color.onPrimary },
  ends: { flexDirection: "row", justifyContent: "space-between" },
  endText: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink.tertiary },
  skip: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: hairline.outline,
  },
  skipOn: { borderColor: color.primary, backgroundColor: "#E5F4F1" },
  skipText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: ink.secondary },
  skipTextOn: { color: ink.primary },
})
