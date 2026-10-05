import { router } from "expo-router"
import * as React from "react"
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from "react-native-svg"

import { DarkStatusBar } from "@/components/error-state"
import { IconChevronLeft } from "@/components/icons"
import { CaretLeft, Check } from "@/components/ph"
import { PageFooter, PageGround, PageHeader } from "@/components/hol"
import { ButtonLook, useTopInset } from "@/components/ui"
import { card, color, font, gutter, hairline, ink, space, type } from "@/lib/theme"

/* The first-run screens after the password. Before the consent ("Is this
   you?") they keep the classic look the user approved: white, calm and
   roomy in the manner of Superpower, a back button on top, one title, the
   content, and the step's action pinned to the foot. From the consent on
   (`hol`) they take the Figma "Hol" Consent's language (5 Oct 2026): a
   white status bar over the page's soft gradient, a round grey back
   button, the content on lifted white cards, and the action in a white
   footer bar. */

export function FlowScreen({
  title,
  art,
  children,
  footer,
  back = true,
  onBack,
  bar,
  page = false,
  hol = false,
  action,
}: {
  /** A setup screen from the consent on: the Figma "Hol" look. Without it
      (and without `page`) the classic look, classic buttons included. */
  hol?: boolean
  /** The signed-in record's look (Figma "Hol"): the white header bar with
      the back caret and the title, the page gradient, and the footer as a
      white bar. Setup screens leave it off. */
  page?: boolean
  /** Replaces going back a screen, e.g. to the previous question. */
  onBack?: () => void
  /** Centred in the top bar, e.g. a review switcher. */
  bar?: React.ReactNode
  /** A page's text action on the right of its header ("Update test"). */
  action?: { label: string; onPress: () => void; icon?: React.ReactNode }
  title: string
  /** Sits above the title, centred. */
  art?: React.ReactNode
  children?: React.ReactNode
  /** The step's action(s), pinned to the foot. */
  footer?: React.ReactNode
  back?: boolean
}) {
  if (page)
    return (
      <View style={styles.screen}>
        <DarkStatusBar />
        <PageHeader title={title} back={back} onBack={onBack} action={action} right={bar} />
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.fill}>
            <PageGround />
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={[styles.body, styles.bodyPage]}>
                {art && <View style={styles.art}>{art}</View>}
                {children}
              </View>
            </ScrollView>
          </View>
          {footer && <PageFooter>{footer}</PageFooter>}
        </KeyboardAvoidingView>
      </View>
    )

  if (!hol) return <ClassicFlow {...{ title, art, footer, back, onBack, bar }}>{children}</ClassicFlow>

  return (
    <View style={styles.screen}>
      <DarkStatusBar />
      <View style={styles.fill}>
        <PageGround />
        <HolBar back={back} onBack={onBack} bar={bar} />
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.holBody}>
              {art && <View style={styles.holArt}>{art}</View>}
              <Text style={[styles.holTitle, !!art && styles.holTitleCentred]} accessibilityRole="header">
                {title}
              </Text>
              {children}
            </View>
          </ScrollView>
          {footer && <PageFooter>{footer}</PageFooter>}
        </KeyboardAvoidingView>
      </View>
    </View>
  )
}

/** The classic setup screen, as approved before the consent: white, the
    title, the content, and the action pinned to the foot over a hairline,
    with the classic buttons. */
function ClassicFlow({
  title,
  art,
  children,
  footer,
  back,
  onBack,
  bar,
}: {
  title: string
  art?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  back: boolean
  onBack?: () => void
  bar?: React.ReactNode
}) {
  const { bottom } = useSafeAreaInsets()
  return (
    <ButtonLook.Provider value="figma">
      <View style={styles.screen}>
        <DarkStatusBar />
        <FlowBar back={back} onBack={onBack} bar={bar} />
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.body}>
              {art && <View style={styles.art}>{art}</View>}
              <Text style={[styles.title, !!art && styles.titleCentred]} accessibilityRole="header">
                {title}
              </Text>
              {children}
            </View>
          </ScrollView>
          {footer && (
            <View style={[styles.footer, { paddingBottom: Math.max(bottom - 12, 16) }]}>
              <View style={styles.footerInner}>{footer}</View>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </ButtonLook.Provider>
  )
}

/** The top of every classic setup screen: back, when there is somewhere to
    go back to. */
export function FlowBar({
  back = true,
  onBack,
  bar,
  floating = false,
  title,
}: {
  /** The record's screens name themselves beside the back button. */
  title?: string
  back?: boolean
  onBack?: () => void
  bar?: React.ReactNode
  /** The record's screens: no bar, a white back button over the page. */
  floating?: boolean
}) {
  const top = useTopInset()
  const canBack = back && (!!onBack || router.canGoBack())
  // A screen that never goes back keeps only the safe area, not an empty row.
  if (!back && !bar) return <View style={[styles.bar, { paddingTop: top + 8 }]} />
  if (!back)
    return (
      <View style={[styles.bar, { paddingTop: top + 8 }]}>
        <View style={[styles.barInner, styles.barCentred]}>{bar}</View>
      </View>
    )
  return (
    <View style={[styles.bar, floating && styles.barFloating, { paddingTop: top + 8 }]}>
      <View style={[styles.barInner, floating && styles.barInnerFloating]}>
        {canBack ? (
          <Pressable
            onPress={onBack ?? (() => router.back())}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({ pressed }) => [styles.back, floating && styles.backFloating, pressed && styles.backPressed]}
          >
            <IconChevronLeft color={color.text} />
          </Pressable>
        ) : (
          <View style={styles.backSpace} />
        )}
        {!!title && (
          <Text style={styles.barTitle} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        )}
      </View>
    </View>
  )
}

/** The top of a setup screen from the consent on: the white status bar,
    then the Figma's round grey back button, when there is somewhere to go
    back to. Sits on the page gradient, so put it inside the view that
    draws it. */
export function HolBar({ back = true, onBack, bar }: { back?: boolean; onBack?: () => void; bar?: React.ReactNode }) {
  const top = useTopInset()
  const canBack = back && (!!onBack || router.canGoBack())
  const status = <View style={[styles.statusBar, { height: top }]} />
  // A screen that never goes back keeps only a breath under the status bar.
  if (!canBack && !bar)
    return (
      <>
        {status}
        <View style={styles.barEmpty} />
      </>
    )
  return (
    <>
      {status}
      <View style={styles.holBarInner}>
        {canBack ? (
          <Pressable
            onPress={onBack ?? (() => router.back())}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({ pressed }) => [styles.holBack, pressed && styles.holBackPressed]}
          >
            <CaretLeft size={20} color={ink.detail} />
          </Pressable>
        ) : (
          <View style={styles.holBackSpace} />
        )}
        {bar && <View style={styles.holBarCentred}>{bar}</View>}
        {bar && <View style={styles.holBackSpace} />}
      </View>
    </>
  )
}

/** A section: its quiet label, 12 above its content (Figma "Hol"). */
export function Section({
  title,
  action,
  children,
  gap = 12,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  gap?: number
}) {
  return (
    <View style={{ gap }}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  )
}

/** The Figma's card: white at 60% on the page, radius 8, 12 inside, the
    softest lift. With `onPress` it is an option: white with a 1 pt grey
    edge, the chosen one on the teal tint with a teal edge. */
export function Card({
  children,
  selected,
  onPress,
  style,
}: {
  children: React.ReactNode
  selected?: boolean
  onPress?: () => void
  style?: object
}) {
  const body = <View style={[styles.card, !!onPress && styles.cardOption, selected && styles.cardSelected, style]}>{children}</View>
  if (!onPress) return body
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: !!selected }}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {body}
    </Pressable>
  )
}

/** Two or three options as the Figma's option cards side by side, the
    chosen one on the teal tint with a teal edge. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value?: T
  onChange: (value: T) => void
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const on = o.value === value
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={[styles.option, on && styles.optionOn]}
            >
              <Text style={[styles.optionText, on && styles.optionTextOn]}>{o.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: string
}) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={styles.checkRow}
      hitSlop={6}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked && <Check size={12} color={color.onPrimary} weight="bold" />}
      </View>
      <Text style={styles.checkText}>{children}</Text>
    </Pressable>
  )
}

/** A selectable pill, e.g. a program. */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.pressed]}
    >
      {selected && <Check size={14} color={ink.primary} />}
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  )
}

export function Badge({ children, tone = "primary" }: { children: string; tone?: "primary" | "high" | "low" | "ok" | "ink" }) {
  const tones = {
    primary: [color.primaryTint, ink.primary],
    high: [color.highTint, color.high],
    low: [color.lowTint, color.low],
    ok: [color.okTint, color.ok],
    ink: [color.text, color.onPrimary],
  } as const
  const [bg, fg] = tones[tone]
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{children}</Text>
    </View>
  )
}

/** A "Label : Value" row inside a card. */
export function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowRule]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

/* ------------------------------------------------------------------ art -- */

/** The flow's one object: a soft pearl sphere with a teal ring and a small
    teal moon, on white with a contact shadow. With `orbit` the moon circles,
    for the screen where the record is being built. */
export function SoftOrb({ size = 168, orbit = false }: { size?: number; orbit?: boolean }) {
  const spin = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    if (!orbit) return
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: Platform.OS !== "web" })
    )
    loop.start()
    return () => loop.stop()
  }, [orbit, spin])
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] })

  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id="orbShadow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#1B2B2A" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#1B2B2A" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="orbBody" cx="38%" cy="32%" r="72%">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.45" stopColor="#F1F3F2" />
            <Stop offset="0.85" stopColor="#D8DEDC" />
            <Stop offset="1" stopColor="#C9D2CF" />
          </RadialGradient>
          <RadialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color.primary} stopOpacity={0.22} />
            <Stop offset="1" stopColor={color.primary} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="moon" cx="35%" cy="30%" r="75%">
            <Stop offset="0" stopColor="#5FC2BC" />
            <Stop offset="0.6" stopColor={color.primary} />
            <Stop offset="1" stopColor="#015E5A" />
          </RadialGradient>
        </Defs>
        <Circle cx="100" cy="98" r="92" fill="url(#orbGlow)" />
        <Ellipse cx="100" cy="176" rx="54" ry="9" fill="url(#orbShadow)" />
        <Circle cx="100" cy="98" r="58" fill="url(#orbBody)" />
        <Ellipse
          cx="100"
          cy="104"
          rx="84"
          ry="22"
          fill="none"
          stroke={color.primary}
          strokeOpacity={0.35}
          strokeWidth={2}
          transform="rotate(-14 100 104)"
        />
        {!orbit && <Circle cx="170" cy="78" r="11" fill="url(#moon)" />}
      </Svg>
      {orbit && (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
          <Svg width={size} height={size} viewBox="0 0 200 200">
            <Defs>
              <RadialGradient id="moonSpin" cx="35%" cy="30%" r="75%">
                <Stop offset="0" stopColor="#5FC2BC" />
                <Stop offset="0.6" stopColor={color.primary} />
                <Stop offset="1" stopColor="#015E5A" />
              </RadialGradient>
            </Defs>
            <Circle cx="100" cy="14" r="9" fill="url(#moonSpin)" />
          </Svg>
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  barFloating: { backgroundColor: "transparent" },
  backFloating: { backgroundColor: color.background, boxShadow: "0 4px 12px rgba(16, 24, 40, 0.08)" },
  fill: { flex: 1 },
  bar: { backgroundColor: color.background },
  barInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    width: "100%",
    maxWidth: 420 + gutter * 2,
    alignSelf: "center",
    paddingHorizontal: gutter - 4,
    paddingBottom: 8,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.canvas,
  },
  backPressed: { backgroundColor: color.border },
  backSpace: { width: 40, height: 40 },
  // The record's pages: the signed-in gutter (Frontline 16), the back
  // button a tile's lead from the screen title (Frontline H2).
  barInnerFloating: { maxWidth: 420 + space.gutter * 2, paddingHorizontal: space.gutter - 4, gap: space.lead },
  barTitle: { flex: 1, ...type.tabTitle },
  barCentred: { justifyContent: "center" },

  scroll: { flexGrow: 1 },
  body: {
    width: "100%",
    maxWidth: 420 + gutter * 2,
    alignSelf: "center",
    paddingHorizontal: gutter,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 32,
  },
  // Figma "Hol": 16 around the content, 20 between its sections.
  bodyPage: { maxWidth: 420 + space.gutter * 2, paddingHorizontal: space.gutter, paddingTop: space.gutter, gap: space.section },
  art: { alignItems: "center", marginBottom: -12 },
  title: {
    fontFamily: font.semibold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: color.text,
  },
  titleCentred: { textAlign: "center" },

  footer: { borderTopWidth: 1, borderTopColor: color.border, backgroundColor: color.background, paddingTop: 12 },
  footerInner: {
    width: "100%",
    maxWidth: 420 + gutter * 2,
    alignSelf: "center",
    paddingHorizontal: gutter,
    gap: 10,
  },

  /* ------------------------------------------------- Figma "Hol" setup -- */
  statusBar: { backgroundColor: color.background },
  // The back button's row: 16 around a 32 round grey button (the Consent).
  holBarInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    width: "100%",
    maxWidth: 420 + space.gutter * 2,
    alignSelf: "center",
    padding: space.gutter,
  },
  barEmpty: { height: space.inline },
  holBack: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#EBEBEB" },
  holBackPressed: { opacity: 0.6 },
  holBackSpace: { width: 32, height: 32 },
  holBarCentred: { flex: 1, alignItems: "center" },
  holBody: {
    width: "100%",
    maxWidth: 420 + space.gutter * 2,
    alignSelf: "center",
    paddingHorizontal: space.gutter,
    paddingTop: space.stack,
    paddingBottom: space.gutter * 2,
    gap: space.section,
  },
  // The Consent's object, centred in a 140 tall band.
  holArt: { minHeight: 140, alignItems: "center", justifyContent: "center", marginBottom: -space.inline },
  // A hero title where the step leads with words; under an object, the
  // page title (18 medium) centred as the Consent names its pages.
  holTitle: { fontFamily: font.semibold, fontSize: 22, lineHeight: 30, color: ink.content },
  holTitleCentred: { ...type.tabTitle, textAlign: "center" },

  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 20 },
  sectionTitle: { ...type.sectionLabel },

  card: { backgroundColor: card.fill, borderRadius: 8, padding: space.card, boxShadow: card.shadow },
  cardOption: { backgroundColor: color.background, borderWidth: 1, borderColor: hairline.outline, padding: space.card - 1 },
  cardSelected: { backgroundColor: color.primaryTint, borderColor: color.primaryLine },
  pressed: { opacity: 0.7 },

  field: { gap: space.inline },
  label: { ...type.sectionLabel },
  track: { flexDirection: "row", gap: space.item },
  option: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: card.fill,
    boxShadow: card.shadow,
    alignItems: "center",
    justifyContent: "center",
  },
  optionOn: { backgroundColor: color.primaryTint, borderColor: color.primaryLine },
  optionText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink.content },
  optionTextOn: { color: ink.primary },

  // The Consent's checkbox: 16 at radius 4, a grey edge, teal when ticked.
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: space.inline },
  box: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#C6C6C8",
    backgroundColor: color.background,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
  },
  boxOn: { backgroundColor: color.primary, borderColor: color.primary },
  checkText: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 22, color: ink.content },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.mark,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: color.background,
  },
  chipOn: { borderColor: color.primaryLine, backgroundColor: color.primaryTint },
  chipText: { ...type.chip },
  chipTextOn: { color: ink.primary },

  badge: { alignSelf: "flex-start", borderRadius: 16, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontFamily: font.medium, fontSize: 10, lineHeight: 14 },

  row: { flexDirection: "row", justifyContent: "space-between", gap: space.item, paddingVertical: space.rowY },
  rowRule: { borderBottomWidth: 0.8, borderBottomColor: hairline.rule },
  rowLabel: { ...type.label, fontSize: 14, lineHeight: 20 },
  rowValue: { ...type.title, flexShrink: 1, textAlign: "right" },
})
