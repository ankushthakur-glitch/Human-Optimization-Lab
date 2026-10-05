import * as React from "react"
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native"

import { CaretRight, Check, PaperPlaneRight } from "@/components/ph"
import { card, color, font, gutter, hairline, ink } from "@/lib/theme"

/* Every chat in the app (the assistant, and the "your why" conversation in
   setup) is drawn from these pieces, after the support chats in food and
   grocery apps: the assistant's messages carry its name and the time, a
   question lists its options inside the message and locks once one is
   picked, the patient's replies sit on the right, and the chat bar is a
   card pinned under the thread at every step. Motion follows the portal's
   agent components: a typing bubble while it "thinks", replies that stream
   in word by word, and a soft rise for anything new. All of it stands still
   when the phone asks for reduced motion.

   Drawn in the Figma "Hol" language (5 Oct 2026): the assistant speaks on
   the teal tint inside the Primary/02 edge its ask button wears, her
   replies sit on the brand teal, both at radius 12; options are white rows
   at radius 8; the chat bar is the page's white footer holding a Figma
   field (white, #DFDFE4 edge, radius 8) and a teal send button. */

const native = Platform.OS !== "web"

export function useReducedMotion() {
  const [still, setStill] = React.useState(false)
  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setStill)
      .catch(() => {})
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setStill)
    return () => sub.remove()
  }, [])
  return still
}

/** Fades and lifts its children in once, on mount. */
export function Appear({
  delay = 0,
  lift = 8,
  style,
  children,
}: {
  delay?: number
  lift?: number
  style?: StyleProp<ViewStyle>
  children: React.ReactNode
}) {
  const still = useReducedMotion()
  const t = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    const run = Animated.timing(t, { toValue: 1, duration: 280, delay, easing: Easing.out(Easing.cubic), useNativeDriver: native })
    run.start()
    return () => run.stop()
  }, [t, delay])
  if (still) return <View style={style}>{children}</View>
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [lift, 0] })
  return <Animated.View style={[style, { opacity: t, transform: [{ translateY }] }]}>{children}</Animated.View>
}

/** The assistant's run of messages: its name over the first. */
export function AssistantGroup({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.lines}>
      <Text style={styles.sender} accessibilityLabel="Inlay assistant">
        Inlay
      </Text>
      {children}
    </View>
  )
}

/** One of the assistant's messages. `named` puts its name on top, for a
    message that stands alone; `wide` is for one that holds a list. */
export function TheirBubble({
  at,
  named,
  wide,
  style,
  children,
}: {
  at?: string
  named?: boolean
  wide?: boolean
  style?: StyleProp<ViewStyle>
  children: React.ReactNode
}) {
  return (
    <View style={[styles.bubble, styles.theirs, wide && styles.wide, style]}>
      {named && <Text style={styles.sender}>Inlay</Text>}
      {children}
      {at && <Text style={styles.time}>{at}</Text>}
    </View>
  )
}

/** The patient's reply; `muted` for one they skipped. */
export function MyBubble({ text, at, muted }: { text: string; at?: string; muted?: boolean }) {
  return (
    <Appear style={[styles.bubble, styles.mine, muted && styles.mineMuted]}>
      <Text style={[styles.bubbleText, styles.mineText, muted && styles.mineMutedText]}>{text}</Text>
      {at && <Text style={[styles.time, styles.mineTime, muted && styles.mineMutedTime]}>{at}</Text>}
    </Appear>
  )
}

export const bubbleText = (): StyleProp<TextStyle> => styles.bubbleText

/** A question's options, inside its message. Tappable while it is the
    newest question, then locked, with what was picked ticked. `multi`
    lists them as checkboxes, for a question that takes several. Once it
    locks, the rows not picked fold away; `settle` plays that fold for a
    question that arrives already answered (the one just sent). */
export function Options({
  options,
  live,
  picked = [],
  multi,
  settle,
  onPick,
}: {
  options: string[]
  live: boolean
  picked?: string[]
  multi?: boolean
  settle?: boolean
  onPick: (option: string) => void
}) {
  return (
    <View style={styles.options}>
      {options.map((o) => (
        <OptionRow key={o} live={live} multi={multi} settle={settle} picked={picked.includes(o)} onPress={() => onPick(o)}>
          <Text style={[styles.optionText, !live && !picked.includes(o) && styles.optionTextOff]}>{o}</Text>
        </OptionRow>
      ))}
    </View>
  )
}

/** One option row; the children are its label, or a label with a detail. */
export function OptionRow({
  live,
  picked,
  multi,
  settle,
  onPress,
  children,
}: {
  live: boolean
  picked: boolean
  multi?: boolean
  settle?: boolean
  onPress: () => void
  children: React.ReactNode
}) {
  const off = !live && !picked
  return (
    <Fold gone={off} settle={settle}>
      {multi ? (
        <Pressable
        onPress={onPress}
        disabled={!live}
        accessibilityRole="checkbox"
        accessibilityState={{ disabled: !live, checked: picked }}
        style={({ pressed }) => [styles.option, off && styles.optionOff, pressed && styles.pressed]}
      >
        <View style={[styles.box, picked && styles.boxOn, !live && !picked && styles.boxOff]}>
          {picked && <Check size={14} color={color.onPrimary} weight="bold" />}
        </View>
        <View style={styles.optionBody}>{children}</View>
        </Pressable>
      ) : (
        <Pressable
          onPress={onPress}
          disabled={!live}
          accessibilityRole="button"
          accessibilityState={{ disabled: !live, selected: picked }}
          style={({ pressed }) => [styles.option, off && styles.optionOff, pressed && styles.pressed]}
        >
          <View style={styles.optionBody}>{children}</View>
          {picked ? <Check size={16} color={color.primary} weight="bold" /> : live && <CaretRight size={16} color={card.chevron} />}
        </Pressable>
      )}
    </Fold>
  )
}

/** The space between option rows; a folding row takes its gap with it. */
const OPTION_GAP = 6

/** An option row that folds away once `gone`: it fades, then its height
    closes. A row already gone when it mounts is simply left out, unless
    `settle` asks to see it fold. */
function Fold({ gone, settle, children }: { gone: boolean; settle?: boolean; children: React.ReactNode }) {
  const still = useReducedMotion()
  const [folded, setFolded] = React.useState(gone && !settle)
  const [height, setHeight] = React.useState<number | null>(null)
  const t = React.useRef(new Animated.Value(1)).current

  React.useEffect(() => {
    if (!gone || folded || height === null) return
    if (still) {
      setFolded(true)
      return
    }
    const run = Animated.timing(t, { toValue: 0, duration: 320, easing: Easing.inOut(Easing.cubic), useNativeDriver: false })
    run.start(({ finished }) => finished && setFolded(true))
    return () => run.stop()
  }, [gone, folded, height, still, t])

  if (folded) return null
  if (height === null) return <View onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>{children}</View>
  return (
    <Animated.View
      style={{
        height: t.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
        marginBottom: t.interpolate({ inputRange: [0, 1], outputRange: [-OPTION_GAP, 0] }),
        opacity: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] }),
        overflow: "hidden",
      }}
    >
      {children}
    </Animated.View>
  )
}

export const optionTextStyle = (off: boolean): StyleProp<TextStyle> => [styles.optionText, off && styles.optionTextOff]

// The message field: one line when empty. Once the answer wraps, it grows
// to two lines; past two it scrolls.
const FIELD_MIN = 44
const FIELD_MAX = 21 * 2 + 11 * 2

/** The chat bar, pinned under the thread, one row: the message and the
    round send button, greyed out until there is text. `idle` swaps the
    send button for another action while the field is empty (setup's Skip). */
export function ChatBar({
  value,
  onChange,
  onSend,
  canSend,
  placeholder,
  bottom,
  idle,
  multiline = true,
  keyboardType,
  inputRef,
}: {
  value: string
  onChange: (text: string) => void
  onSend: () => void
  canSend: boolean
  placeholder: string
  bottom: number
  idle?: { label: string; onPress: () => void }
  multiline?: boolean
  keyboardType?: KeyboardTypeOptions
  inputRef?: React.Ref<TextInput>
}) {
  const typed = value.trim().length > 0
  const own = React.useRef<TextInput | null>(null)
  const ref = React.useCallback(
    (node: TextInput | null) => {
      own.current = node
      if (typeof inputRef === "function") inputRef(node)
      else if (inputRef) (inputRef as React.MutableRefObject<TextInput | null>).current = node
    },
    [inputRef]
  )
  const [height, setHeight] = React.useState(FIELD_MIN)
  const grow = (h: number) => setHeight(Math.min(FIELD_MAX, Math.max(FIELD_MIN, Math.ceil(h))))
  // The web textarea never reports a smaller size on its own: measure it
  // collapsed so the bar shrinks back as text is deleted or sent.
  React.useLayoutEffect(() => {
    if (Platform.OS !== "web" || !multiline) return
    const node = own.current as unknown as HTMLTextAreaElement | null
    if (!node?.style) return
    const prev = node.style.height
    node.style.height = "0px"
    const h = node.scrollHeight
    node.style.height = prev
    grow(h)
  }, [value, multiline])
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottom, 16) }]}>
      <View style={styles.barRow}>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSend}
          placeholder={placeholder}
          placeholderTextColor={color.placeholder}
          returnKeyType="send"
          submitBehavior="submit"
          multiline={multiline}
          keyboardType={keyboardType}
          maxLength={600}
          onContentSizeChange={
            multiline && Platform.OS !== "web" ? (e) => grow(e.nativeEvent.contentSize.height) : undefined
          }
          style={[
            styles.input,
            multiline && height > FIELD_MIN ? { height: FIELD_MAX } : { height: FIELD_MIN },
          ]}
          accessibilityLabel="Message"
        />
        <View style={styles.tools}>
          {!typed && idle ? (
            <Pressable
              onPress={idle.onPress}
              accessibilityRole="button"
              style={({ pressed }) => [styles.idle, pressed && styles.pressed]}
            >
              <Text style={styles.idleText}>{idle.label}</Text>
            </Pressable>
          ) : (
            // Greyed and inert until there is something to send.
            <Pressable
              onPress={onSend}
              disabled={!typed || !canSend}
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: !typed || !canSend }}
              style={({ pressed }) => [styles.send, (!typed || !canSend) && styles.sendOff, pressed && styles.pressed]}
            >
              <PaperPlaneRight color={color.onPrimary} size={20} weight="fill" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  )
}

/** Three dots that rise in turn: the assistant is writing. */
export function TypingBubble({ style }: { style?: StyleProp<ViewStyle> }) {
  const still = useReducedMotion()
  const dots = React.useRef([0, 1, 2].map(() => new Animated.Value(0))).current
  React.useEffect(() => {
    if (still) return
    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(d, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: native }),
          Animated.timing(d, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: native }),
          Animated.delay((2 - i) * 150 + 200),
        ])
      )
    )
    loops.forEach((l) => l.start())
    return () => loops.forEach((l) => l.stop())
  }, [dots, still])

  return (
    <Appear lift={4} style={[styles.typing, style]}>
      <View style={styles.dots} accessibilityLabel="Assistant is typing" accessibilityLiveRegion="polite">
        {dots.map((d, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
              },
            ]}
          />
        ))}
      </View>
    </Appear>
  )
}

/** Reveals `text` a word at a time. The words still to come are laid out
    but clear, so the bubble keeps its size and the thread never jumps. */
export function StreamedText({
  text,
  playing = true,
  speed = 38,
  onDone,
  style,
}: {
  text: string
  playing?: boolean
  speed?: number
  onDone?: () => void
  style?: StyleProp<TextStyle>
}) {
  const still = useReducedMotion()
  const words = React.useMemo(() => text.match(/\S+\s*/g) ?? [], [text])
  const [shown, setShown] = React.useState(playing ? 0 : words.length)
  const all = still || shown >= words.length

  const done = React.useRef(onDone)
  done.current = onDone
  React.useEffect(() => {
    if (all) {
      done.current?.()
      return
    }
    const id = setTimeout(() => setShown((n) => n + 1), speed)
    return () => clearTimeout(id)
  }, [all, shown, speed])

  if (all) return <Text style={style}>{text}</Text>
  return (
    <Text style={style} accessibilityLabel={text}>
      {words.slice(0, shown).join("")}
      <Text style={styles.clear}>{words.slice(shown).join("")}</Text>
    </Text>
  )
}

const column = { width: "100%", maxWidth: 420 + gutter * 2, alignSelf: "center" } as const

/** The words in a bubble, an option and the field: Figma's 14 body. */
const BODY = { fontFamily: font.regular, fontSize: 14, lineHeight: 21 } as const

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  lines: { gap: 6, alignItems: "flex-start" },
  // "Inlay" over a message: 12 medium in the text teal.
  sender: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: ink.primary },

  bubble: { maxWidth: "85%", borderRadius: 12, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, gap: 4 },
  // The assistant's: the ask button's teal tint and edge, its tail corner 4.
  theirs: { alignSelf: "flex-start", backgroundColor: color.primaryTint, borderWidth: 1, borderColor: color.primaryEdge, borderBottomLeftRadius: 4 },
  wide: { width: "88%", maxWidth: "88%" },
  // Hers: the brand teal. A one character reply (a rating) still reads as
  // a bubble, not a drop.
  mine: { alignSelf: "flex-end", minWidth: 52, alignItems: "center", paddingHorizontal: 14, backgroundColor: color.primary, borderBottomRightRadius: 4, marginVertical: 4 },
  mineMuted: { backgroundColor: color.background, borderWidth: 1, borderColor: hairline.outline },
  bubbleText: { ...BODY, color: ink.content },
  mineText: { color: color.onPrimary },
  mineMutedText: { color: ink.secondary },
  time: { alignSelf: "flex-end", fontFamily: font.regular, fontSize: 10, lineHeight: 14, color: ink.secondary },
  mineTime: { color: color.onPrimary, opacity: 0.8 },
  mineMutedTime: { color: ink.secondary, opacity: 1 },

  options: { gap: OPTION_GAP, marginTop: 6 },
  // An option: a white row at radius 8 inside the field's edge.
  option: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: color.background,
  },
  optionOff: { backgroundColor: "transparent", borderColor: color.primaryEdge },
  optionBody: { flex: 1, gap: 2 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: hairline.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: color.primary, borderColor: color.primary },
  boxOff: { opacity: 0.5 },
  optionText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: ink.content },
  optionTextOff: { color: ink.secondary, fontFamily: font.regular },

  // The page's white footer: a 1 pt edge on top, 16 inside.
  bar: { backgroundColor: color.background, borderTopWidth: 1, borderTopColor: hairline.edge, paddingHorizontal: 16, paddingTop: 12 },
  barRow: { ...column, flexDirection: "row", alignItems: "flex-end", gap: 8 },
  // A Figma field: white inside its #DFDFE4 edge at radius 8.
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 11,
    ...BODY,
    color: ink.content,
    backgroundColor: color.background,
    borderWidth: 1,
    borderColor: hairline.outline,
    borderRadius: 8,
    boxShadow: card.shadowXs,
    ...Platform.select({ web: { outlineStyle: "none" } as unknown as TextStyle }),
  },
  tools: { flexDirection: "row", alignItems: "center", gap: 2 },
  send: { width: 44, height: 44, borderRadius: 8, backgroundColor: color.primary, alignItems: "center", justifyContent: "center" },
  sendOff: { opacity: 0.4 },
  idle: { height: 44, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: color.primaryEdge, backgroundColor: color.primaryTint, alignItems: "center", justifyContent: "center" },
  idleText: { fontFamily: font.medium, fontSize: 14, lineHeight: 18, color: ink.primary },

  typing: { alignSelf: "flex-start", backgroundColor: color.primaryTint, borderWidth: 1, borderColor: color.primaryEdge, borderRadius: 12, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 14 },
  dots: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: color.primary },
  clear: { color: "transparent" },
})
