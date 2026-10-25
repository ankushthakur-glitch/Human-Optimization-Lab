import * as React from "react"
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
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

import type { Attachment } from "@/components/attach-sheet"
import { ArrowUp, CaretRight, Check, File, Microphone, PaperPlaneRight, Plus, StopSquare, Warning, X } from "@/components/ph"
import { VoiceBeam } from "@/components/voice-beam"
import { useVoiceInput } from "@/lib/voice"
import { card, color, font, gutter, hairline, ink, type } from "@/lib/theme"

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
export function MyBubble({ text, at, muted, files }: { text: string; at?: string; muted?: boolean; files?: Attachment[] }) {
  return (
    <Appear style={[styles.bubble, styles.mine, muted && styles.mineMuted]}>
      {/* What was attached, over the words: photos as small thumbnails,
          files by name. */}
      {!!files?.length && (
        <View style={styles.sentFiles}>
          {files.map((f) =>
            f.kind === "image" ? (
              <Image key={f.id} source={{ uri: f.uri }} style={styles.sentThumb} accessibilityLabel={f.name} />
            ) : (
              <View key={f.id} style={styles.sentFile}>
                <File size={16} color={color.onPrimary} />
                <Text style={[styles.fileName, styles.mineText]} numberOfLines={1}>
                  {f.name}
                </Text>
              </View>
            )
          )}
        </View>
      )}
      {!!text && <Text style={[styles.bubbleText, styles.mineText, muted && styles.mineMutedText]}>{text}</Text>}
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
  bare,
  notice,
  voice,
  sendOutside,
  attachments = [],
  onAttach,
  onRemoveAttachment,
}: {
  /** A strip joined to the top of the field, as Claude's session limit
      sits on its composer: the words, a small action and a close; the
      field's edge takes its colour. */
  notice?: { words: string; hue: "amber" | "red"; action?: { label: string; onPress: () => void }; onClose: () => void }
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
  /** No white bar or rule behind it: the field and button sit on the
      page's own ground (the assistant). */
  bare?: boolean
  /** A microphone in the field: speak the question, the voice beam
      glowing along the field's edge while it listens (lib/voice). */
  voice?: boolean
  /** Keep the send button beside the field, as the setup chat draws it,
      instead of as the round arrow at the field's end. */
  sendOutside?: boolean
  /** A "+" in the field that opens the screen's attach sheet; what was
      added shows over the text until it is sent. */
  onAttach?: () => void
  attachments?: Attachment[]
  onRemoveAttachment?: (id: string) => void
}) {
  const typed = value.trim().length > 0 || attachments.length > 0
  const speech = useVoiceInput(onChange)
  const hearing = speech.state !== "idle"
  const tooled = voice || !!onAttach
  const listening = speech.state === "listening"
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
  // A pixel or two of rounding over one line is still one line.
  const grow = (h: number) => setHeight(h <= FIELD_MIN + 2 ? FIELD_MIN : Math.min(FIELD_MAX, Math.ceil(h)))
  // The web textarea never reports a smaller size on its own: measure it
  // collapsed so the bar shrinks back as text is deleted or sent.
  React.useLayoutEffect(() => {
    if (Platform.OS !== "web" || !multiline) return
    // Empty: one line, the same height as the send button, whatever the
    // placeholder measures.
    if (!value) {
      setHeight(FIELD_MIN)
      return
    }
    const node = own.current as unknown as HTMLTextAreaElement | null
    if (!node?.style) return
    const prev = node.style.height
    node.style.height = "0px"
    const h = node.scrollHeight
    node.style.height = prev
    grow(h)
  }, [value, multiline])
  const field = (
    <TextInput
      ref={ref}
      value={value}
      onChangeText={onChange}
      onSubmitEditing={onSend}
      placeholder={hearing ? "Listening…" : placeholder}
      placeholderTextColor={color.placeholder}
      returnKeyType="send"
      submitBehavior="submit"
      multiline={multiline}
      keyboardType={keyboardType}
      maxLength={600}
      editable={!hearing}
      onContentSizeChange={
        multiline && Platform.OS !== "web" ? (e) => grow(e.nativeEvent.contentSize.height) : undefined
      }
      style={[
        styles.input,
        // In its column now, the field keeps its own height.
        { flex: 0 },
        multiline && height > FIELD_MIN ? { height: FIELD_MAX } : { height: FIELD_MIN },
        notice && { borderColor: NOTICE[notice.hue].edge, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
        tooled && styles.inputInBox,
      ]}
      accessibilityLabel="Message"
    />
  )
  return (
    <View style={[styles.bar, bare && styles.barBare, { paddingBottom: Math.max(bottom, 16) }]}>
      <View style={styles.barRow}>
        <View style={styles.fieldCol}>
        {voice && (hearing || speech.problem) && (
          <View
            style={[styles.voiceNote, speech.problem && styles.voiceNoteProblem]}
            accessibilityRole={speech.problem ? "alert" : undefined}
            accessibilityLiveRegion="polite"
          >
            {speech.problem ? (
              <>
                <Warning size={14} color={color.amber} weight="fill" />
                <Text style={[styles.voiceNoteText, { color: color.amber }]}>{speech.problem.words}</Text>
                {speech.problem.action && (
                  <Pressable onPress={speech.problem.action.onPress} accessibilityRole="button" hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
                    <Text style={[styles.noticeAction, { color: color.amber }]}>{speech.problem.action.label}</Text>
                  </Pressable>
                )}
                <Pressable onPress={speech.dismiss} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
                  <X size={14} color={color.amber} />
                </Pressable>
              </>
            ) : (
              <>
                <RecDot live={listening} />
                <Text style={styles.voiceNoteText}>{listening ? "Listening… tap the square when you're done" : "Finishing up…"}</Text>
              </>
            )}
          </View>
        )}
        {notice && (
          <View style={[styles.notice, { backgroundColor: NOTICE[notice.hue].tint, borderColor: NOTICE[notice.hue].edge }]}>
            <Text style={[styles.noticeText, { color: NOTICE[notice.hue].ink }]} numberOfLines={1}>
              {notice.words}
            </Text>
            {notice.action && (
              <Pressable onPress={notice.action.onPress} accessibilityRole="button" hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
                <Text style={[styles.noticeAction, { color: NOTICE[notice.hue].ink }]}>{notice.action.label}</Text>
              </Pressable>
            )}
            <Pressable onPress={notice.onClose} accessibilityRole="button" accessibilityLabel="Hide" hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
              <X size={14} color={NOTICE[notice.hue].ink} />
            </Pressable>
          </View>
        )}
        {tooled ? (
          <VoiceBeam
            level={speech.level}
            active={hearing}
            processing={speech.state === "processing"}
            style={[styles.fieldBox, notice && { borderColor: NOTICE[notice.hue].edge, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}
          >
            {attachments.length > 0 && (
              <View style={styles.files}>
                {attachments.map((a) => (
                  <View key={a.id} style={styles.file}>
                    {a.kind === "image" ? <Image source={{ uri: a.uri }} style={styles.fileThumb} /> : <File size={16} color={ink.detail} />}
                    <Text style={styles.fileName} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Pressable
                      onPress={() => onRemoveAttachment?.(a.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${a.name}`}
                      hitSlop={8}
                      style={({ pressed }) => pressed && styles.pressed}
                    >
                      <X size={12} color={ink.detail} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.boxRow}>
              {onAttach && (
                <Pressable
                  onPress={onAttach}
                  disabled={hearing}
                  accessibilityRole="button"
                  accessibilityLabel="Add a photo or file"
                  hitSlop={6}
                  style={({ pressed }) => [styles.fieldTool, hearing && styles.sendOff, pressed && styles.pressed]}
                >
                  <Plus size={20} color={ink.detail} />
                </Pressable>
              )}
              {field}
              {voice && (
                <Pressable
                  onPress={() => (hearing ? speech.stop() : speech.start(value))}
                  disabled={speech.state === "processing"}
                  accessibilityRole="button"
                  accessibilityLabel={hearing ? "Stop listening" : "Speak"}
                  hitSlop={6}
                  style={({ pressed }) => [styles.fieldTool, hearing && styles.fieldToolOn, pressed && styles.pressed]}
                >
                  {hearing ? <StopSquare size={16} color={color.primary} weight="fill" /> : <Microphone size={20} color={ink.detail} />}
                </Pressable>
              )}
              {/* The send sits in the field, a round arrow at its end. */}
              {!sendOutside && !(!typed && idle) && (
                <Pressable
                  onPress={onSend}
                  disabled={!typed || !canSend || hearing}
                  accessibilityRole="button"
                  accessibilityLabel="Send"
                  accessibilityState={{ disabled: !typed || !canSend || hearing }}
                  style={({ pressed }) => [styles.sendIn, (!typed || !canSend || hearing) && styles.sendOff, pressed && styles.pressed]}
                >
                  <ArrowUp color={color.onPrimary} size={18} weight="bold" />
                </Pressable>
              )}
            </View>
          </VoiceBeam>
        ) : (
          field
        )}
        </View>
        {(!tooled || sendOutside || (!typed && idle)) && (
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
              disabled={!typed || !canSend || hearing}
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: !typed || !canSend || hearing }}
              style={({ pressed }) => [styles.send, (!typed || !canSend || hearing) && styles.sendOff, pressed && styles.pressed]}
            >
              <PaperPlaneRight color={color.onPrimary} size={20} weight="fill" />
            </Pressable>
          )}
        </View>
        )}
      </View>
    </View>
  )
}

/** The red-free "recording" dot: it breathes while the microphone is open. */
function RecDot({ live }: { live: boolean }) {
  const still = useReducedMotion()
  const pulse = React.useRef(new Animated.Value(1)).current
  React.useEffect(() => {
    if (!live || still) {
      pulse.setValue(1)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [live, still, pulse])
  return <Animated.View style={[styles.voiceDot, live && styles.voiceDotLive, { opacity: pulse }]} />
}

/* The notice strip's two hues, as the record kit's banners draw amber and
   red (HUE in record-kit, which imports this file). */
const NOTICE = {
  amber: { ink: color.amber, tint: color.amberTint, edge: color.amberEdge },
  red: { ink: color.high, tint: color.highTint, edge: "#FECDCA" },
} as const

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

/** A 1 to 10 rating as a grid of small chips. Tapping one answers at
    once, with no selected state or press effect. Any other option (not
    applicable) is a quiet link underneath. */
export function ScoreChips({
  options,
  onSelect,
  low = "Not at all",
  high = "Completely",
}: {
  options: string[]
  onSelect: (option: string) => void
  low?: string
  high?: string
}) {
  const scores = options.filter((o) => /^\d+$/.test(o))
  const other = options.filter((o) => !/^\d+$/.test(o))
  return (
    <View style={styles.scores}>
      <View style={styles.chips}>
        {scores.map((o) => (
          <Pressable key={o} onPress={() => onSelect(o)} accessibilityRole="button" accessibilityLabel={o} style={styles.score}>
            <Text style={styles.scoreText}>{o}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.ends}>
        <Text style={styles.endText}>1 {low}</Text>
        <Text style={styles.endText}>{Math.max(...scores.map(Number))} {high}</Text>
      </View>
      {other.map((o) => (
        <Pressable
          key={o}
          onPress={() => onSelect(o)}
          accessibilityRole="button"
          style={styles.otherOption}
        >
          <Text style={styles.endText}>{o}</Text>
        </Pressable>
      ))}
    </View>
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
  sentFiles: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 6, paddingTop: 2 },
  sentThumb: { width: 96, height: 96, borderRadius: 8 },
  sentFile: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: 200, height: 32, paddingHorizontal: 8, borderRadius: 8, backgroundColor: "rgba(255, 255, 255, 0.16)" },
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
  barBare: { backgroundColor: "transparent", borderTopWidth: 0 },
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
    ...Platform.select({ web: { outlineStyle: "none", scrollbarWidth: "none" } as unknown as TextStyle }),
  },
  tools: { flexDirection: "row", alignItems: "center", gap: 2 },
  // The field as a box when it holds tools: the input's edge and ground
  // move to it, the "+" and the microphone sit inside at either end.
  fieldBox: {
    backgroundColor: color.background,
    borderWidth: 1,
    borderColor: hairline.outline,
    borderRadius: 8,
    boxShadow: card.shadowXs,
  },
  boxRow: { flexDirection: "row", alignItems: "flex-end" },
  inputInBox: { flex: 1, borderWidth: 0, boxShadow: "none", backgroundColor: "transparent", paddingHorizontal: 4 },
  fieldTool: { width: 36, height: 36, margin: 3, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  fieldToolOn: { backgroundColor: color.primaryTint },
  files: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 8, paddingTop: 8 },
  file: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 160,
    height: 32,
    paddingLeft: 4,
    paddingRight: 8,
    borderRadius: 8,
    backgroundColor: color.canvas,
  },
  fileThumb: { width: 24, height: 24, borderRadius: 4 },
  fileName: { ...type.meta, color: ink.content, flexShrink: 1 },
  fieldCol: { flex: 1 },
  // What the microphone is doing, or why it cannot: a small line over the field.
  voiceNote: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, paddingBottom: 8 },
  voiceNoteProblem: { backgroundColor: color.amberTint, borderWidth: 1, borderColor: color.amberEdge, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  voiceNoteText: { ...type.meta, flex: 1, color: ink.primary },
  voiceDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.primaryEdge },
  voiceDotLive: { backgroundColor: color.primary },
  // Claude's limit strip: tinted, its edge running into the field's.
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  noticeText: { ...type.metaStrong, flex: 1 },
  noticeAction: { ...type.metaStrong, textDecorationLine: "underline" },
  send: { width: 44, height: 44, borderRadius: 8, backgroundColor: color.primary, alignItems: "center", justifyContent: "center" },
  sendIn: { width: 36, height: 36, margin: 3, borderRadius: 18, backgroundColor: color.primary, alignItems: "center", justifyContent: "center" },
  sendOff: { opacity: 0.4 },
  idle: { height: 44, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: color.primaryEdge, backgroundColor: color.primaryTint, alignItems: "center", justifyContent: "center" },
  idleText: { fontFamily: font.medium, fontSize: 14, lineHeight: 18, color: ink.primary },

  typing: { alignSelf: "flex-start", backgroundColor: color.primaryTint, borderWidth: 1, borderColor: color.primaryEdge, borderRadius: 12, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 14 },
  dots: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: color.primary },


  // The rating chips: 6 a row, 44 square, 8 apart.
  scores: { gap: 10, marginTop: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  score: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: color.background,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: card.shadowXs,
  },
  scoreText: { fontFamily: font.regular, fontSize: 16, lineHeight: 20, color: ink.content },
  ends: { flexDirection: "row", justifyContent: "space-between" },
  endText: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink.secondary },
  otherOption: { alignSelf: "flex-start", paddingVertical: 4 },
})
