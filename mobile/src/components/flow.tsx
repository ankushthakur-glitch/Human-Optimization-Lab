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
import { IconCheck, IconChevronLeft } from "@/components/icons"
import { useTopInset } from "@/components/ui"
import { color, font, gutter } from "@/lib/theme"

/* The first-run screens after the password: white, calm and roomy in the
   manner of Superpower, built from the app's own pieces (the teal Button,
   the outlined TextField, Inter). A back button and a three part progress
   line on top, one large title, the content, and the step's action pinned to
   the foot in reach of a thumb. */

export const FLOW_STEPS = 3

export function FlowScreen({
  step,
  title,
  art,
  children,
  footer,
  back = true,
}: {
  /** 1 to FLOW_STEPS; leave out for a screen outside the count. */
  step?: number
  title: string
  /** Sits above the title, centred. */
  art?: React.ReactNode
  children?: React.ReactNode
  /** The step's action(s), pinned to the foot. */
  footer?: React.ReactNode
  back?: boolean
}) {
  const top = useTopInset()
  const { bottom } = useSafeAreaInsets()
  const canBack = back && router.canGoBack()

  return (
    <View style={styles.screen}>
      <DarkStatusBar />
      <View style={[styles.bar, { paddingTop: top + 8 }]}>
        <View style={styles.barInner}>
          {canBack ? (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
            >
              <IconChevronLeft color={color.text} />
            </Pressable>
          ) : (
            <View style={styles.backSpace} />
          )}
          {step !== undefined && <Progress step={step} />}
          <View style={styles.backSpace} />
        </View>
      </View>
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
          <View style={[styles.footer, { paddingBottom: Math.max(bottom, 16) + 8 }]}>
            <View style={styles.footerInner}>{footer}</View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  )
}

function Progress({ step }: { step: number }) {
  return (
    <View
      style={styles.progress}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${FLOW_STEPS}`}
      accessibilityValue={{ min: 0, max: FLOW_STEPS, now: step }}
    >
      {Array.from({ length: FLOW_STEPS }, (_, i) => (
        <View key={i} style={[styles.segment, i < step && styles.segmentOn]} />
      ))}
    </View>
  )
}

/** A light section: a small heading, a hairline, then its content. */
export function Section({
  title,
  action,
  children,
  gap = 14,
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

/** A soft grey card, the flow's main surface. */
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
  const body = <View style={[styles.card, selected && styles.cardSelected, style]}>{children}</View>
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

/** Two or three options on a grey track, the chosen one lifted in white. */
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
        {checked && <IconCheck size={14} color={color.onPrimary} strokeWidth={2.4} />}
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
      {selected && <IconCheck size={14} color={color.primary} />}
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  )
}

export function Badge({ children, tone = "primary" }: { children: string; tone?: "primary" | "high" | "low" | "ok" | "ink" }) {
  const tones = {
    primary: [color.primaryTint, color.primary],
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
  progress: { flex: 1, flexDirection: "row", gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: color.border },
  segmentOn: { backgroundColor: color.primary },

  scroll: { flexGrow: 1 },
  body: {
    width: "100%",
    maxWidth: 420 + gutter * 2,
    alignSelf: "center",
    paddingHorizontal: gutter,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 28,
  },
  art: { alignItems: "center", marginBottom: -12 },
  title: {
    fontFamily: font.semibold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.9,
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

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  sectionTitle: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22, color: color.text },

  card: { backgroundColor: color.canvas, borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: color.canvas },
  cardSelected: { backgroundColor: color.background, borderColor: color.primary },
  pressed: { opacity: 0.85 },

  field: { gap: 6 },
  label: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.text },
  track: { flexDirection: "row", backgroundColor: color.canvas, borderRadius: 14, padding: 4, gap: 4 },
  option: { flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  optionOn: { backgroundColor: color.background, boxShadow: "0 1px 3px rgba(16, 24, 40, 0.12)" },
  optionText: { fontFamily: font.medium, fontSize: 15, color: color.muted },
  optionTextOn: { color: color.text },

  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: color.inputBorder,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxOn: { backgroundColor: color.primary, borderColor: color.primary },
  checkText: { flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.text },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
  },
  chipOn: { borderColor: color.primary, backgroundColor: color.primaryTint },
  chipText: { fontFamily: font.medium, fontSize: 14, color: color.text },
  chipTextOn: { color: color.primary },

  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },

  row: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 10 },
  rowRule: { borderBottomWidth: 1, borderBottomColor: color.border },
  rowLabel: { fontFamily: font.regular, fontSize: 14, color: color.muted },
  rowValue: { flexShrink: 1, textAlign: "right", fontFamily: font.medium, fontSize: 14, color: color.text },
})
