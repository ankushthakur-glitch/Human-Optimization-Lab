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
}: {
  title?: string
  back?: boolean
  onBack?: () => void
  /** A text action on the right, in the darker teal. */
  action?: { label: string; onPress: () => void; icon?: React.ReactNode }
  /** Anything else on the right. Wins over `action`. */
  right?: React.ReactNode
  children?: React.ReactNode
  /** 12 above and below instead of 16: the home's greeting row. */
  compact?: boolean
}) {
  const top = useTopInset()
  const canBack = back && (!!onBack || router.canGoBack())
  return (
    <View style={[styles.header, { paddingTop: top + (compact ? 12 : 16) }, compact && styles.headerCompact]}>
      <View style={styles.headerInner}>
        {children ?? (
          <View style={styles.headerTitleRow}>
            {canBack && (
              <Pressable
                onPress={onBack ?? (() => router.back())}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={({ pressed }) => pressed && styles.pressed}
              >
                <CaretLeft size={24} color={ink.detail} />
              </Pressable>
            )}
            {!!title && (
              <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
            )}
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

/** The white bar at the foot of a page, holding its actions 8 apart. */
export function PageFooter({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { bottom } = useSafeAreaInsets()
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(bottom, space.gutter) }, style]}>
      <View style={styles.footerInner}>{children}</View>
    </View>
  )
}

/** The page's assistant button, the one way to the health agent on a
    page. Made to stand out (user, 5 Oct 2026): the home banners' teal
    gradient with their soft circles, the orb in a glowing ring, the words
    in white and a sparkle at the end. Opens the assistant, with `params`
    when given. */
export function AskButton({
  label = "Ask to Health Agent",
  onPress,
  params,
}: {
  label?: string
  onPress?: () => void
  /** What to open the assistant about: a marker, a topic, or a question. */
  params?: { marker?: string; topic?: string; ask?: string }
}) {
  const open = onPress ?? (() => router.push(params ? { pathname: "/assistant", params } : "/assistant"))
  const [w, setW] = React.useState(0)
  const id = `ask${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`
  return (
    <Pressable
      onPress={open}
      onLayout={(e) => {
        const width = Math.round(e.nativeEvent.layout.width)
        setW((old) => (old === width ? old : width))
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.ask, pressed && styles.askPressed]}
    >
      {w > 0 && (
        <Svg style={StyleSheet.absoluteFill} width={w} height={ASK_H}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#2D6F7B" />
              <Stop offset="1" stopColor="#4FA3A5" />
            </LinearGradient>
          </Defs>
          <Rect width={w} height={ASK_H} fill={`url(#${id})`} />
          <Circle cx={w * 0.18} cy={ASK_H * 1.1} r={34} fill="#000" fillOpacity={0.08} />
          <Circle cx={w * 0.78} cy={-6} r={40} fill="#FFF" fillOpacity={0.1} />
          <Circle cx={w * 0.95} cy={ASK_H} r={26} fill="#000" fillOpacity={0.08} />
        </Svg>
      )}
      <View style={styles.askGlow}>
        <Image source={ORB} style={styles.askOrb} accessibilityIgnoresInvertColors />
      </View>
      <Text style={styles.askText}>{label}</Text>
      <Sparkle size={16} color="#FFFFFF" weight="fill" />
    </Pressable>
  )
}

/** The ask button's height. */
const ASK_H = 48

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
      <Text style={styles.primaryText}>{children}</Text>
    </Pressable>
  )
}

/** The assistant's circle beside the tab bar: the live orb in a teal edged
    ring, and around it an arc for how much of this month's AI credit is
    used (Figma's four variants): green up to 60%, orange above 60%, red
    above 90%. A member has no count, so no arc. */
export function OrbButton({ used = 0, onPress }: { used?: number; onPress: () => void }) {
  const r = 24.7
  const c = 2 * Math.PI * r
  const s = Math.min(Math.max(used, 0), 1)
  const arc = s > 0.9 ? ORB_ARC.high : s > 0.6 ? ORB_ARC.mid : ORB_ARC.low
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={s > 0 ? `Ask the assistant, ${Math.round(s * 100)}% of this month's questions used` : "Ask the assistant"}
      style={({ pressed }) => [styles.orb, pressed && styles.pressed]}
    >
      <Svg width={52} height={52} style={StyleSheet.absoluteFill}>
        {s > 0 && (
          <Circle
            cx={26}
            cy={26}
            r={r}
            stroke={arc}
            strokeWidth={2.6}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${c * s} ${c}`}
            transform="rotate(-90 26 26)"
          />
        )}
      </Svg>
      <View style={styles.orbInner}>
        <SiriSheet size={44} background={ORB_GROUND} />
      </View>
    </Pressable>
  )
}

/** The arc's three steps (Success/07, Warning/07, Error/07) and the dark
    ground the orb glows on. */
const ORB_ARC = { low: "#2F7F4D", mid: "#C8641B", high: "#D9363E" } as const
const ORB_GROUND = "#0B1214"

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
  footerInner: { gap: space.inline, width: "100%", maxWidth: 420, alignSelf: "center" },

  ask: {
    height: ASK_H,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#3B8790",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 14,
    boxShadow: "0 6px 16px rgba(45, 111, 123, 0.28)",
  },
  askPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  // The orb in a soft white ring, as if lit.
  askGlow: { width: 32, height: 32, borderRadius: 16, padding: 2, backgroundColor: "rgba(255, 255, 255, 0.28)", boxShadow: "0 0 10px rgba(194, 255, 240, 0.55)" },
  askOrb: { width: 28, height: 28, borderRadius: 14 },
  askText: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: "#FFFFFF" },

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
  danger: { backgroundColor: "#C72B32", borderColor: "#C72B32" },
  primaryPressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
  primaryText: { fontFamily: font.medium, fontSize: 16, lineHeight: 20, color: color.onPrimary },

  orb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(230, 243, 242, 0.9)",
    // See-through over the page's blur (the tab bar draws it behind).
    backgroundColor: "rgba(242, 247, 247, 0.55)",
    overflow: "hidden",
  },
  // The orb sits 3 in from the ring's outer edge, inside a 1 pt teal edge.
  orbInner: {
    position: "absolute",
    left: 3 - 1,
    top: 3 - 1,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: color.primaryLine,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
})
