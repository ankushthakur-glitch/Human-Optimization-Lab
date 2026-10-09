import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { keepTogether as holdTogether } from "@/components/care-gap"
import { DotGraph } from "@/components/charts"
import { Appear, OptionRow, Options, TheirBubble, bubbleText, optionTextStyle } from "@/components/chat"
import { CaretRight, Check, Phone } from "@/components/ph"
import { DateBlock, Dot, Group, Nudge, SaveQuestion, SmallAction, Status, TextAction, toast } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { Button } from "@/components/ui"
import { FOLLOW_ON, FOOTER_LINE, LIMIT, PHONE_NUMBERS, URGENT, type Answer, type Fact, type NextVisit } from "@/lib/assistant"
import { TOP_UP } from "@/lib/allowance"
import { call } from "@/lib/links"
import { withQuestion } from "@/lib/member"
import { useOffer, useShown, type Offer } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { card, cardRadius, color, font, hairline, ink, space, type } from "@/lib/theme"
import { chartInput, pointDate, type Trend } from "@/lib/trends"

/* The assistant thread's own pieces (FINAL-SPEC C.4), composed from the
   chat bubbles in chat.tsx and the record kit: the result a conversation
   is about, the answer with its folded parts, the lists to choose a result
   or a medicine from, the next visit, the urgent message, the card at the
   AI credit's limit, and the facts behind an answer. The screen
   (app/assistant.tsx) decides what is said; these only draw it. */

/* ------------------------------------------------------------ context -- */

/** Where a result came from, under its value. */
const SOURCE_NAME: Record<string, string> = {
  lab: "Quest Diagnostics",
  doctor: "Harborview Longevity Clinic",
  hospital: "Scripps Memorial Hospital",
  you: "Added by you",
}

/** The result a scoped conversation is about, as the first message: a
    white card with the name, the latest value, its status and the tile's
    dot graph. */
export function ContextCard({ t }: { t: Trend }) {
  const b = t.marker
  const unit = b.unit === "%" ? "%" : ` ${b.unit}`
  return (
    <TheirBubble wide style={styles.context}>
      <View style={styles.contextTop}>
        <Text style={styles.contextName} numberOfLines={2}>
          {b.name}
        </Text>
        <Status level={t.status} />
      </View>
      {t.latest ? (
        <>
          <Text style={styles.contextValue} accessibilityLabel={`${t.valueWithUnit}, ${t.statusWord}`}>
            {t.value}
            <Text style={styles.contextUnit}>{unit}</Text>
          </Text>
          <Text style={styles.contextMeta}>{`${pointDate(t.latest)}, ${SOURCE_NAME[t.latest.origin] ?? "Your record"}`}</Text>
          <View style={styles.contextGraph}>
            <DotGraph {...chartInput(t)} height={44} playKey={`assistant:${b.id}`} />
          </View>
        </>
      ) : (
        <Text style={styles.contextMeta}>No results yet</Text>
      )}
    </TheirBubble>
  )
}

/* ------------------------------------------------------------ answers -- */

const PARTS = [
  { key: "shows", title: "What your record shows" },
  { key: "limits", title: "What it doesn't tell us" },
  { key: "ask", title: "Something to ask Dr. Patel" },
] as const

type Part = (typeof PARTS)[number]["key"]

/** One folded part of an answer: a row that opens in place. */
function Fold({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <View>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.foldHead, pressed && styles.pressed]}
      >
        <Text style={styles.foldTitle}>{title}</Text>
        <View style={{ transform: [{ rotate: open ? "-90deg" : "90deg" }] }}>
          <CaretRight size={16} color={card.chevron} />
        </View>
      </Pressable>
      {open && <Appear lift={4} style={styles.foldBody}>{children}</Appear>}
    </View>
  )
}

/** Words that never part at the end of a line: the app's own (care-gap.ts:
    "Dr. Patel", a date, and the last two words, so a message never ends
    on one word alone, "about your / A1c?"), and the assistant's: a lone
    "I" and the word after it ("assistant. I / answer"). */
export const keepTogether = (text: string) => holdTogether(text).replace(/\bI /g, "I\u00A0")

/** A centred note of short sentences, a sentence a line, so the next one
    never starts at the end of a line ("...in real time. In / an
    emergency, call 911."). */
export const sentenceLines = (text: string) => keepTogether(text).replace(/\. (?=[A-Z])/g, ".\n")

/** "My A1c went from 5.3 to 5.9 ..." in curly quotes. */
const quoted = (text: string) => `“${keepTogether(text)}”`

/** The tick before a line of sentence text, centred on its first line
    however many lines the words take. */
function Tick() {
  return (
    <View style={styles.tick}>
      <Check size={14} color={color.primary} weight="bold" />
    </View>
  )
}

/** An answer in the thread (S-34, S-38): the direct answer first, then
    what the record shows, what it doesn't tell us and the question to
    ask, each folded; the confidence line; "Why Inlay said this"; at the
    end of an answer about a result that may lead to the plan, the plan offer; and under the
    conversation's first answer, the educational line. */
export function AnswerBubble({
  answer,
  at,
  onWhy,
  followOn,
  footer,
}: {
  answer: Answer
  at?: string
  /** Opens the facts behind it. */
  onWhy?: () => void
  /** The follow on line's conversation, when this answer may carry it. */
  followOn?: { key: string; eligible: boolean }
  /** The conversation's first answer: the educational line follows it. */
  footer?: boolean
}) {
  const [open, setOpen] = React.useState<Partial<Record<Part, boolean>>>(answer.askOpen ? { ask: true } : {})
  const parts = PARTS.filter((p) => answer[p.key])
  // The plan offer shows when the cap service allows it (touchpoint
  // assistant-answer), in place of the educational line, so no physician
  // is named beside an offer (D.1.2).
  const offer = useOffer("assistant-answer", { eligible: Boolean(followOn?.eligible), key: followOn?.key })
  useShown(offer)
  // The way to the plan page under an answer about the plan is an offer
  // too (touchpoint assistant-plan): it shows only when the cap service
  // allows it, never at low readiness, in her first session or after "Not
  // for me". The answer's words stand without it.
  const planLink = useOffer("assistant-plan", { eligible: answer.link?.offer === true })
  useShown(planLink)
  const link = answer.link && (!answer.link.offer || planLink.show) ? answer.link : undefined
  return (
    <View style={styles.turn}>
      <TheirBubble at={at} named wide>
        <Text style={bubbleText()}>{keepTogether(answer.text)}</Text>

        {parts.length > 0 && (
          <Group inset style={styles.panel}>
            {parts.map((p) => (
              <Fold key={p.key} title={p.title} open={Boolean(open[p.key])} onToggle={() => setOpen((o) => ({ ...o, [p.key]: !o[p.key] }))}>
                {p.key === "ask" ? (
                  <>
                    <Text style={styles.foldText}>{quoted(answer.ask!)}</Text>
                    {/* An answer about a concern, a diagnosis or a medicine ends
                        on the words of C.4.2. */}
                    <SaveQuestion text={answer.ask!} about={answer.about} label={answer.askOpen ? "Save for my next visit" : undefined} />
                  </>
                ) : (
                  <Text style={styles.foldText}>{keepTogether(answer[p.key] ?? "")}</Text>
                )}
              </Fold>
            ))}
          </Group>
        )}

        {!!answer.questions?.length && (
          <Group inset style={styles.panel}>
            {answer.questions.map((q) => (
              <View key={q} style={styles.question}>
                <Text style={[styles.foldText, styles.flex]}>{quoted(q)}</Text>
                <View style={styles.trailing}>
                  <SaveQuestion text={q} about={answer.about} />
                </View>
              </View>
            ))}
          </Group>
        )}

        {!!answer.points?.length && (
          <Group inset style={styles.panel}>
            {answer.points.map((p) => (
              <View key={p} style={styles.point}>
                <Tick />
                <Text style={[styles.foldText, styles.flex]}>{keepTogether(p)}</Text>
              </View>
            ))}
          </Group>
        )}

        {link && (
          <SmallAction
            tone="outline"
            onPress={() => {
              if (link.offer) planLink.markOpened()
              router.push(link.href as never)
            }}
            style={styles.link}
          >
            {link.label}
          </SmallAction>
        )}

        {(!!answer.confidence || (!!answer.facts?.length && onWhy)) && (
          <View style={styles.basis}>
            {!!answer.confidence && <Text style={styles.confidence}>{keepTogether(answer.confidence)}</Text>}
            {!!answer.facts?.length && onWhy && <TextAction onPress={onWhy}>Why Inlay said this</TextAction>}
          </View>
        )}

      </TheirBubble>

      {offer.show && <FollowOn offer={offer} />}

      {footer && !offer.show && <Text style={styles.centerLine}>{sentenceLines(FOOTER_LINE)}</Text>}
    </View>
  )
}

/** The plan offer under an answer about a result (touchpoint
    assistant-answer): once a conversation, at the moment she understands
    why the number matters. Never a price, never the doctor. */
function FollowOn({ offer }: { offer: Offer }) {
  return (
    <Nudge
      compact
      title={FOLLOW_ON.title}
      body={keepTogether(FOLLOW_ON.body)}
      action={FOLLOW_ON.action}
      onAction={() => {
        offer.markOpened()
        router.push("/plan")
      }}
    />
  )
}

/* ------------------------------------------------------ choosing one -- */

/** A marker as an option: its name, then its status mark and latest value. */
function MarkerOption({ t, off }: { t: Trend; off: boolean }) {
  return (
    <>
      <Text style={optionTextStyle(off)} numberOfLines={2}>
        {t.marker.name}
      </Text>
      {t.latest && (
        <View style={styles.optionDetail}>
          <Dot level={t.status} />
          <Text style={styles.optionDetailText}>
            {t.valueWithUnit}, {t.statusWord.toLowerCase()}
          </Text>
        </View>
      )}
    </>
  )
}

/** "Explain one of my results": every marker, those to watch first; the
    steady ones open in place; "See all results" opens the Record's list. */
export function ResultChooser({
  text,
  at,
  watch,
  rest,
  live,
  picked,
  onPick,
}: {
  text: string
  at?: string
  watch: Trend[]
  rest: Trend[]
  live: boolean
  picked?: string
  onPick: (id: string) => void
}) {
  const [more, setMore] = React.useState(false)
  const row = (t: Trend) => (
    <OptionRow key={t.id} live={live} picked={picked === t.id} onPress={() => onPick(t.id)}>
      <MarkerOption t={t} off={!live && picked !== t.id} />
    </OptionRow>
  )
  return (
    <TheirBubble at={at} named wide>
      <Text style={bubbleText()}>{keepTogether(text)}</Text>
      <View style={styles.options}>
        {live && watch.length > 0 && <Text style={styles.groupLabel}>{`${watch.length} to watch`}</Text>}
        {watch.map(row)}
        {live && rest.length > 0 && !more && (
          <Pressable onPress={() => setMore(true)} accessibilityRole="button" hitSlop={4} style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
            <Text style={styles.moreText}>{`Show ${rest.length} steady results`}</Text>
            <View style={{ transform: [{ rotate: "90deg" }] }}>
              <CaretRight size={14} color={color.primary} />
            </View>
          </Pressable>
        )}
        {(more || !live) && (
          <>
            {live && <Text style={[styles.groupLabel, styles.groupLabelNext]}>{`${rest.length} steady`}</Text>}
            {rest.map(row)}
          </>
        )}
        {live && (
          <Pressable onPress={() => router.push("/results")} accessibilityRole="link" hitSlop={4} style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
            <Text style={styles.moreText}>See all results</Text>
            <CaretRight size={14} color={color.primary} />
          </Pressable>
        )}
      </View>
    </TheirBubble>
  )
}

/** "A question about my medicines": the medicines whose lists differ
    first, each with its dose or "Records differ". */
export function MedicineChooser({
  text,
  at,
  choices,
  live,
  picked,
  onPick,
}: {
  text: string
  at?: string
  choices: { id: string; name: string; differs: boolean; dose: string }[]
  live: boolean
  picked?: string
  onPick: (id: string) => void
}) {
  return (
    <TheirBubble at={at} named wide>
      <Text style={bubbleText()}>{keepTogether(text)}</Text>
      <View style={styles.options}>
        {choices.map((c) => {
          const off = !live && picked !== c.id
          return (
            <OptionRow key={c.id} live={live} picked={picked === c.id} onPress={() => onPick(c.id)}>
              <Text style={optionTextStyle(off)}>{c.name}</Text>
              <View style={styles.optionDetail}>
                {c.differs && <Dot tone="low" />}
                <Text style={styles.optionDetailText}>{c.differs ? "Records differ" : c.dose}</Text>
              </View>
            </OptionRow>
          )
        })}
      </View>
    </TheirBubble>
  )
}

/* ------------------------------------------------------------- visit -- */

/** "Prepare for my next visit": the visit, her saved questions, and two
    things worth taking, each ready to save. */
export function VisitBubble({ intro, at, visit, saved, suggestions }: { intro: string; at?: string; visit?: NextVisit; saved: string[]; suggestions: string[] }) {
  return (
    <TheirBubble at={at} named wide>
      <Text style={bubbleText()}>{keepTogether(intro)}</Text>
      {visit && (
        <Group inset style={styles.panel}>
          <Pressable
            onPress={() => router.push({ pathname: "/visit/[id]", params: { id: visit.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${visit.title}, ${visit.when}, ${visit.who}, ${visit.where}`}
            style={({ pressed }) => [styles.visit, pressed && styles.pressed]}
          >
            <DateBlock date={visit.date} />
            <View style={styles.visitBody}>
              <Text style={styles.visitTitle}>{visit.title}</Text>
              <Text style={styles.visitMeta}>{[visit.time, ...visit.where.split(", ").map((part) => part.replace(/ /g, "\u00A0"))].filter(Boolean).join(", ")}</Text>
            </View>
            <CaretRight size={16} color={card.chevron} />
          </Pressable>
        </Group>
      )}
      {saved.length > 0 && (
        <>
          <Text style={styles.panelLabel}>Questions you saved</Text>
          <Group inset style={styles.panel}>
            {saved.map((q) => (
              <View key={q} style={styles.point}>
                <Tick />
                <Text style={[styles.foldText, styles.flex]}>{keepTogether(q)}</Text>
              </View>
            ))}
          </Group>
        </>
      )}
      <Text style={styles.panelLabel}>Worth taking with you</Text>
      <Group inset style={styles.panel}>
        {suggestions.map((q) => (
          <View key={q} style={styles.question}>
            <Text style={[styles.foldText, styles.flex]}>{keepTogether(q)}</Text>
            <View style={styles.trailing}>
              <SaveQuestion text={q} forVisit={visit?.id} />
            </View>
          </View>
        ))}
      </Group>
    </TheirBubble>
  )
}

/* ------------------------------------------------------------ urgent -- */

/** Words with every phone number in them as a call (911, 988, the clinic). */
function Calls({ text }: { text: string }) {
  const parts = text.split(PHONE_NUMBERS)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={styles.call} accessibilityRole="link" accessibilityLabel={`Call ${part}`} onPress={() => call(part)}>
            {part.replace(" ", "\u00A0")}
          </Text>
        ) : (
          part
        )
      )}
    </>
  )
}

/** The urgent message: a person first, every number a call, and never a
    word about anyone having been told (L-32). Under it, a full row for
    each call, the easiest thing on the screen to hit; the calls stay live
    after she answers, and her two replies come last. */
export function UrgentBubble({ at, live, picked, onPick }: { at?: string; live: boolean; picked?: string; onPick: (option: string) => void }) {
  // The first sentence leads, in semibold.
  const cut = URGENT.message.indexOf(". ") + 1
  return (
    <TheirBubble at={at} named wide>
      <Text style={bubbleText()} accessibilityRole="alert">
        <Text style={styles.strong}>{URGENT.message.slice(0, cut)}</Text> <Calls text={keepTogether(URGENT.message.slice(cut + 1))} />
      </Text>
      <View style={styles.options}>
        {URGENT.calls.map((c) => (
          <Pressable
            key={c.tel}
            onPress={() => call(c.tel)}
            accessibilityRole="button"
            accessibilityLabel={c.spoken ?? c.label}
            style={({ pressed }) => [styles.callRow, pressed && styles.pressed]}
          >
            <Phone size={16} color={color.primary} />
            <View style={styles.callBody}>
              <Text style={[optionTextStyle(false), styles.callLabel]}>{c.label}</Text>
              {!!c.detail && <Text style={styles.optionDetailText}>{c.detail}</Text>}
            </View>
          </Pressable>
        ))}
      </View>
      <View style={styles.replies}>
        <Options options={[URGENT.safe, URGENT.end]} live={live} picked={picked ? [picked] : []} onPick={onPick} />
      </View>
    </TheirBubble>
  )
}

/* ------------------------------------------------------------- limit -- */

/** The calm card when a new chat finds this week's AI credit used
    (C.4.7, 5 Oct call; a chat in progress finishes on grace instead): the
    question waits in the composer. A member can add more, which sends the
    waiting question at once. Then saving it for the visit, and "See what
    members get" only when the cap service allows the offer (touchpoint
    allowance; never for a member, left out at low readiness). */
export function LimitCard({
  question,
  about,
  resetsOn,
  saved,
  onSaved,
  onGone,
  member,
  onTopUp,
}: {
  question: string
  about?: string
  resetsOn: string
  saved?: boolean
  onSaved: () => void
  onGone: () => void
  member: boolean
  onTopUp: () => void
}) {
  const onboarding = useOnboarding()
  const offer = useOffer("allowance")
  useShown(offer)
  const save = () => {
    onboarding.save({ questions: withQuestion(onboarding.questions, question, about) }).catch(() => {})
    toast("Saved for your next visit")
    onSaved()
  }
  // Saved: the kit's "Saved" (SaveQuestion), with the whole phrase.
  const savedRow = (
    <View style={styles.savedLine} accessible accessibilityRole="text">
      <Check size={14} color={color.primary} weight="bold" />
      <Text style={styles.savedLineText}>Saved for your next visit</Text>
    </View>
  )
  const lines = [LIMIT.body(resetsOn), ...(member ? [LIMIT.topUpBody(TOP_UP.share, TOP_UP.price)] : [])]
  const common = { art: "sparkle" as const, title: keepTogether(LIMIT.title), body: lines.map(keepTogether) }
  // A member adds more first, then "Save for my next visit", then the
  // card's ways out.
  const saveRow = (
    <View style={[styles.limitSave, styles.limitActions]}>
      {member && <Button onPress={onTopUp}>{LIMIT.topUp}</Button>}
      {saved ? (
        savedRow
      ) : (
        <Button variant="outline" onPress={save}>
          {LIMIT.save}
        </Button>
      )}
    </View>
  )
  // No offer at low readiness (C.4.7): the card shows without "See what
  // members get", only saving and "Not now".
  if (!offer.show)
    return (
      <Nudge {...common} onDismiss={onGone}>
        {saveRow}
      </Nudge>
    )
  return (
    <Nudge
      {...common}
      action={LIMIT.more}
      onAction={() => {
        offer.markOpened()
        router.push("/plan")
      }}
      onDismiss={() => {
        offer.notNow()
        onGone()
      }}
    >
      {saveRow}
    </Nudge>
  )
}

/* ------------------------------------------------------------- facts -- */

/** "Why Inlay said this": every fact the answer used, each result with its
    date and source. */
export function FactsSheet({ facts, onClose }: { facts: Fact[]; onClose: () => void }) {
  return (
    <Sheet title="Why Inlay said this" onClose={onClose}>
      <Group>
        {facts.slice(0, 8).map((f, i) => (
          <View key={i} style={styles.fact} accessible accessibilityLabel={[f.title, f.meta, f.value].filter(Boolean).join(", ")}>
            <View style={styles.flex}>
              <Text style={styles.factTitle} numberOfLines={1}>
                {f.title}
              </Text>
              {!!f.meta && (
                <Text style={styles.factMeta} numberOfLines={1}>
                  {f.meta}
                </Text>
              )}
            </View>
            {!!f.value && (
              <View style={styles.factSide}>
                {f.level && f.level !== "in" && <Dot level={f.level} />}
                <Text style={styles.factValue}>{f.value}</Text>
              </View>
            )}
          </View>
        ))}
      </Group>
      <Button variant="outline" onPress={onClose}>
        Close
      </Button>
    </Sheet>
  )
}

/* ---------------------------------------------------------- the end -- */

/** The end of a thread: ended by her, or older than 30 minutes. */
export function EndedRow({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.ended}>
      <View style={styles.endedRule}>
        <View style={styles.endedLine} />
        <Text style={styles.endedText}>Chat ended</Text>
        <View style={styles.endedLine} />
      </View>
      <SmallAction onPress={onStart} style={styles.center}>
        Start a new chat
      </SmallAction>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignSelf: "center" },
  pressed: { opacity: 0.7 },
  strong: { fontFamily: font.medium, color: ink.strong },
  call: { fontFamily: font.medium, color: ink.primary },

  // A card, not a message: radius 20 on every corner (C.4.3), over the
  // bubble's tail; the kit's edge, and a trend tile's compact padding
  // around the same name, value and dot graph (charts.tsx). Each side is
  // set on its own, so the bubble's padding never wins over it.
  context: {
    backgroundColor: card.fill,
    borderWidth: 0,
    boxShadow: card.shadow,
    borderBottomLeftRadius: cardRadius,
    paddingHorizontal: space.compact,
    paddingTop: space.compact,
    paddingBottom: space.compact,
    gap: 0,
  },
  contextTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.inline },
  // Down 2, so its first line centres on the status chip beside it.
  contextName: { ...type.title, flex: 1, paddingTop: space.line },
  contextValue: { ...type.stat, marginTop: space.mark },
  contextUnit: { ...type.unit },
  contextMeta: { ...type.meta, marginTop: space.line },
  contextGraph: { marginTop: space.item },

  turn: { gap: space.item },
  // Under the bubble's words, with the bubble's own 4: a heading's 12 to
  // what it heads.
  panel: { marginTop: space.inline },
  panelLabel: { ...type.metaStrong, marginTop: space.item, marginLeft: space.line },
  // A 44 pt row (C.0.9), as Frontline's rows in a grouped card.
  foldHead: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item, paddingVertical: space.rowY },
  foldTitle: { ...type.title, flexShrink: 1 },
  foldBody: { gap: space.item, paddingBottom: space.rowY },
  foldText: { ...type.body },
  question: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: space.rowY },
  trailing: { flexShrink: 0 },
  link: { marginTop: space.inline },
  basis: { marginTop: space.inline, gap: space.line },
  confidence: { ...type.meta },

  centerLine: { ...type.meta, textAlign: "center", alignSelf: "center", maxWidth: 300 },

  // The chat's own option list (chat.tsx): its rows fold away by this 6.
  options: { gap: 6, marginTop: 6 },
  groupLabel: { ...type.metaStrong, marginLeft: space.stack, marginTop: space.stack, marginBottom: space.line },
  // With the list's 6, a section's 16 over the steady group.
  groupLabelNext: { marginTop: 10 },
  optionDetail: { flexDirection: "row", alignItems: "center", gap: space.mark },
  optionDetailText: { ...type.label },
  more: { flexDirection: "row", alignItems: "center", gap: space.stack, alignSelf: "flex-start", paddingVertical: space.inline, paddingHorizontal: space.stack },
  moreText: { ...type.link },
  // A call row is an option row's size and shape (chat.tsx: 46 tall, 14
  // and 10 inside, radius 14), led by the phone and worded in teal like the
  // numbers in the message; her replies sit a little apart, under the
  // calls (with the list's own 6, 12 under them).
  callRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: space.mark, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: hairline.outline, backgroundColor: color.background },
  callBody: { flex: 1, gap: space.line },
  callLabel: { color: color.primary },
  replies: { marginTop: 6 },

  visit: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  visitBody: { flex: 1, gap: space.line },
  visitTitle: { ...type.title },
  visitMeta: { ...type.label },
  // A ticked line: a saved question, or what stays free.
  point: { flexDirection: "row", alignItems: "flex-start", gap: space.mark, paddingVertical: space.rowY },
  tick: { height: type.body.lineHeight, justifyContent: "center" },

  limitSave: { marginTop: space.line },
  limitActions: { gap: space.item },
  savedLine: { flexDirection: "row", alignItems: "center", gap: space.stack, minHeight: 32 },
  savedLineText: { ...type.action },

  fact: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: space.rowY },
  factTitle: { ...type.title },
  factMeta: { ...type.meta },
  factSide: { flexDirection: "row", alignItems: "center", gap: space.mark },
  factValue: { ...type.value, fontVariant: ["tabular-nums"] },

  ended: { gap: space.item, marginTop: space.inline, alignItems: "stretch" },
  // Frontline's divider in a thread: a hairline either side, 12 from the
  // words.
  endedRule: { flexDirection: "row", alignItems: "center", gap: space.item },
  endedLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: hairline.edge },
  endedText: { ...type.meta },
})
