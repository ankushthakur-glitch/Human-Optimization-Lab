import { BlurView } from "expo-blur"
import { router } from "expo-router"
import * as React from "react"
import { Image, Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { CaretLeft, Sparkle } from "@/components/ph"
import { useTopInset } from "@/components/ui"
import { SiriSheet } from "@/components/voiceorbs/siri-sheet"
import { card, color, font, hairline, ink, space, type } from "@/lib/theme"

/* The page frame of the signed-in screens, from the Figma "Hol" file
   (5 Oct 2026): a white header bar with a hairline under it, the content
   on a soft grey gradient, and a white footer bar with a hairline over it
   holding the page's actions. The header names the page beside a back
   caret; the footer holds "Ask to Health Agent" and the page's one
   primary button. */

const ORB = require("../../assets/images/orb.png")

/** The page's soft gradient (158deg, #F8F8F8 to #F1F5F9), drawn at the
    measured size: react-native-svg sizes a percentage Svg only once on a
    phone. Put it first inside a view that holds the page's content. */
export function PageGround() {
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null)
  const id = `ground${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((s) => (s && Math.abs(s.w - width) < 0.5 && Math.abs(s.h - height) < 0.5 ? s : { w: width, h: height }))
  }
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: color.page }]} onLayout={onLayout} pointerEvents="none">
      {size && (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id={id} x1="0.32" y1="0" x2="0.68" y2="1">
              <Stop offset="0" stopColor={color.pageFrom} />
              <Stop offset="1" stopColor={color.page} />
            </LinearGradient>
          </Defs>
          <Rect width={size.w} height={size.h} fill={`url(#${id})`} />
        </Svg>
      )}
    </View>
  )
}

/** The white bar on top of a page: the back caret and the page's title,
    and an optional text action on the right ("Update test", "Mark all
    read"). `back={false}` for a tab's own title. `children` replaces the
    title row (the home's greeting). */
export function PageHeader({
  title,
  back = true,
  onBack,
  action,
  right,
  children,
  compact,
  floating,
  onTitlePress,
}: {
  title?: string
  /** Makes the title a button (a demo shortcut, e.g. the flourishing result). */
  onTitlePress?: () => void
  back?: boolean
  onBack?: () => void
  /** A text action on the right, in the darker teal. */
  action?: { label: string; onPress: () => void; icon?: React.ReactNode }
  /** Anything else on the right. Wins over `action`. */
  right?: React.ReactNode
  children?: React.ReactNode
  /** 12 above and below instead of 16: the home's greeting row. */
  compact?: boolean
  /** No bar of its own: the page shows through (put it over a Frost), and
      the back caret sits in a light grey circle. */
  floating?: boolean
}) {
  const top = useTopInset()
  const canBack = back && (!!onBack || router.canGoBack())
  return (
    <View style={[styles.header, { paddingTop: top + (compact ? 12 : 16) }, compact && styles.headerCompact, floating && styles.headerFloating]}>
      <View style={styles.headerInner}>
        {children ?? (
          <View style={styles.headerTitleRow}>
            {canBack && (
              <Pressable
                onPress={onBack ?? (() => router.back())}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={({ pressed }) => [floating && styles.backCircle, pressed && styles.pressed]}
              >
                <CaretLeft size={floating ? 20 : 24} color={ink.detail} />
              </Pressable>
            )}
            {!!title &&
              (onTitlePress ? (
                <Pressable onPress={onTitlePress} hitSlop={8} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => pressed && styles.pressed}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {title}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
                  {title}
                </Text>
              ))}
          </View>
        )}
        {right ??
          (action && (
            <Pressable onPress={action.onPress} hitSlop={10} accessibilityRole="button" style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}>
              {action.icon}
              <Text style={styles.headerActionText}>{action.label}</Text>
            </Pressable>
          ))}
      </View>
    </View>
  )
}

/** A see-through bar: the page blurred behind a wash of its own grey, so
    content that scrolls under a floating header or footer stays readable. */
export function Frost() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.frostWash]} />
    </View>
  )
}

/** The white bar at the foot of a page, holding its actions 8 apart.
    `floating`: no white bar, pinned to the bottom over the page, which
    scrolls under it through a Frost; `onLayout` gives its height. */
export function PageFooter({
  children,
  style,
  floating,
  onLayout,
}: {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  floating?: boolean
  onLayout?: (e: LayoutChangeEvent) => void
}) {
  const { bottom } = useSafeAreaInsets()
  return (
    <View style={[styles.footer, floating && styles.footerFloating, { paddingBottom: Math.max(bottom, space.gutter) }, style]} onLayout={onLayout}>
      {floating && <Frost />}
      <View style={styles.footerInner}>{children}</View>
    </View>
  )
}

/** The page's assistant button, the one way to the health agent on a
    page: flat brand teal, the orb, the words in white and a sparkle at the
    end. Opens the assistant, with `params` when given. `secondary` draws
    it as the secondary button (teal tint, teal words) under a page's
    primary one, the orb and sparkle kept. */
export function AskButton({
  label = "Ask Inlay",
  onPress,
  params,
  secondary,
}: {
  label?: string
  secondary?: boolean
  onPress?: () => void
  /** What to open the assistant about: a marker, a topic, or a question. */
  params?: { marker?: string; topic?: string; ask?: string }
}) {
  const open = onPress ?? (() => router.push(params ? { pathname: "/assistant", params } : "/assistant"))
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.ask, secondary && styles.askSecondary, pressed && (secondary ? styles.askSecondaryPressed : styles.askPressed)]}
    >
      <Image source={ORB} style={styles.askOrb} accessibilityIgnoresInvertColors />
      <Text style={[styles.askText, secondary && styles.askTextSecondary]}>{label}</Text>
      <Sparkle size={14} color={secondary ? ASK_SECONDARY_INK : "#FFFFFF"} weight="fill" />
    </Pressable>
  )
}

/** The secondary ask button's words and sparkle. */
const ASK_SECONDARY_INK = "#015D59"

/** The page's one primary button, Figma's 16 medium on the brand teal at
    radius 8. */
export function PrimaryButton({ children, onPress, disabled, tone = "primary" }: { children: string; onPress: () => void; disabled?: boolean; tone?: "primary" | "danger" }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.primary, tone === "danger" && styles.danger, pressed && styles.primaryPressed, disabled && styles.disabled]}
    >
      <Text style={[styles.primaryText, tone === "danger" && { color: color.error }]}>{children}</Text>
    </Pressable>
  )
}

/** The assistant's circle beside the tab bar: the live orb in a teal edged
    ring, and around it an arc for how much of this week's AI credit is
    used (Figma's four variants): green up to 60%, orange above 60%, red
    above 90%. A member has no count, so no arc. */
export function OrbButton({ used = 0, onPress }: { used?: number; onPress: () => void }) {
  // Thicker than the ring's edge so the usage reads at a glance, on a
  // faint track of its own colour for the part still left (user, 5 Oct).
  const sw = 3.5
  const r = 26 - sw / 2
  const c = 2 * Math.PI * r
  const s = Math.min(Math.max(used, 0), 1)
  const arc = creditTone(s)
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={s > 0 ? `Ask the assistant, ${Math.round(s * 100)}% of this week's AI credit used` : "Ask the assistant"}
      style={({ pressed }) => [styles.orb, pressed && styles.pressed]}
    >
      <View style={styles.orbInner}>
        <SiriSheet size={44} background={ORB_GROUND} />
      </View>
      {/* Drawn last, on the ring's outer edge: the arc and the circle share
          one centre (26, 26). */}
      {s > 0 && (
        <Svg width={52} height={52} style={styles.orbArc} pointerEvents="none">
          <Circle cx={26} cy={26} r={r} stroke={arc} strokeOpacity={0.2} strokeWidth={sw} fill="none" />
          <Circle
            cx={26}
            cy={26}
            r={r}
            stroke={arc}
            strokeWidth={sw}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${c * s} ${c}`}
            transform="rotate(-90 26 26)"
          />
        </Svg>
      )}
    </Pressable>
  )
}

/** The arc's three steps (Success/07, Warning/07, Error/07) and the dark
    ground the orb glows on. */
const ORB_ARC = { low: "#2F7F4D", mid: "#C8641B", high: "#D9363E" } as const

/** The AI credit's colour for how much is used, 0 to 1: green up to 60%,
    orange above 60%, red above 90%. The orb's arc and the credit bar. */
export const creditTone = (used: number) => (used > 0.9 ? ORB_ARC.high : used > 0.6 ? ORB_ARC.mid : ORB_ARC.low)
export const ORB_GROUND = "#0B1214"

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  header: {
    backgroundColor: color.background,
    borderBottomWidth: 1,
    borderBottomColor: hairline.rule,
    paddingHorizontal: space.gutter,
    paddingBottom: 16,
  },
  headerCompact: { paddingBottom: 12 },
  headerFloating: { backgroundColor: "transparent", borderBottomWidth: 0 },
  // The floating header's back caret: a light grey circle with a soft shadow.
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF0F3",
    shadowColor: "#101828",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  frostWash: { backgroundColor: "rgba(241, 245, 249, 0.72)" },
  headerInner: { flexDirection: "row", alignItems: "center", gap: space.item, width: "100%", maxWidth: 420, alignSelf: "center" },
  headerTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.inline },
  headerTitle: { ...type.tabTitle, flexShrink: 1 },
  headerAction: { flexDirection: "row", alignItems: "center", gap: space.mark },
  headerActionText: { fontFamily: font.medium, fontSize: 14, lineHeight: 18, color: ink.primary },

  footer: {
    backgroundColor: color.background,
    borderTopWidth: 1,
    borderTopColor: hairline.edge,
    paddingHorizontal: space.gutter,
    paddingTop: space.gutter,
  },
  footerFloating: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "transparent", borderTopWidth: 0, overflow: "hidden" },
  footerInner: { gap: space.inline, width: "100%", maxWidth: 420, alignSelf: "center" },

  ask: {
    height: 48,
    borderRadius: 12,
    backgroundColor: color.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  askPressed: { opacity: 0.85 },
  // The kit's secondary button colours (ui Button "outline").
  askSecondary: { borderWidth: 1, borderColor: "#C2E1E0", backgroundColor: "#F2F7F7" },
  askSecondaryPressed: { backgroundColor: "#E6F3F2" },
  askTextSecondary: { color: ASK_SECONDARY_INK },
  askOrb: { width: 24, height: 24, borderRadius: 12 },
  askText: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: color.onPrimary },

  primary: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.primary,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    boxShadow: card.shadowXs,
  },
  danger: { backgroundColor: color.errorTint, borderColor: color.errorTint },
  primaryPressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
  primaryText: { fontFamily: font.medium, fontSize: 16, lineHeight: 20, color: color.onPrimary },

  // The ring's 1 pt edge is drawn by the button itself; the orb and the
  // arc are placed against its outer box so all three share a centre.
  orb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(230, 243, 242, 0.9)",
    // See-through over the page's blur (the tab bar draws it behind).
    backgroundColor: "rgba(242, 247, 247, 0.55)",
  },
  // The orb 4 in from the ring's outer edge all round (inside a 1 pt
  // border, so 3 from the padding box).
  orbInner: {
    position: "absolute",
    left: 3,
    top: 3,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: color.primaryLine,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  // Out of the 1 pt border, to the button's outer corner.
  orbArc: { position: "absolute", left: -1, top: -1 },
})
