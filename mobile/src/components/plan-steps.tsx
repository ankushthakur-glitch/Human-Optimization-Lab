import { router } from "expo-router"
import type * as React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { DarkStatusBar } from "@/components/error-state"
import { PageFooter, PageGround, PageHeader } from "@/components/hol"
import { CaretLeft, CaretRight } from "@/components/ph"
import { Button } from "@/components/ui"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/** The plan set-up's four steps (client deck, 27 Oct 2026): what all nine
    need (/plan-tests), taking one out (/plan-remove), /enrollment and
    /payment. */
export const PLAN_STEPS = 4

/** Where Back goes from each step when there is no screen behind it (the
    step opened from a link): the list of nine before the first steps, else
    the step before. */
const BEFORE = ["/plan-tests", "/plan-tests", "/plan-tests", "/enrollment"] as const

function backFrom(step?: number) {
  if (router.canGoBack()) router.back()
  else router.replace(step ? (BEFORE[step - 1] ?? "/plan") : "/")
}

/** "1 of 4" in the header's corner, the steps as short dashes under it,
    those done in teal. */
export function PlanSteps({ step, total = PLAN_STEPS }: { step: number; total?: number }) {
  return (
    <View style={styles.steps} accessibilityRole="progressbar" accessibilityLabel={`Step ${step} of ${total}`}>
      <Text style={styles.stepText}>{`${step} of ${total}`}</Text>
      <View style={styles.dashes}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.dash, i < step && styles.dashOn]} />
        ))}
      </View>
    </View>
  )
}

/** One step of the plan set-up, the same frame on every step: "Your plan"
    with the steps, the heading kept in place, only the list scrolling
    between it and the actions, and a slim foot with Back and Continue
    and no band behind either. `overlay` sits over it all (a sheet). The
    last step names its own button (`nextLabel`) and holds it pending
    while it pays; `nextWide` gives it the whole foot, with no Back
    (the header's caret and the swipe still go back). With no `step` it
    is a page of its own after the set-up (scheduling the paid tests): no
    steps in the header. */
export function PlanStepPage({
  step,
  total,
  onBack,
  later,
  skip,
  noBack,
  backLabel = "Back",
  header,
  headerTitle = "Your plan",
  onTitlePress,
  title,
  lead,
  onNext = () => {},
  noFoot,
  nextLabel = "Continue",
  nextDisabled,
  nextPending,
  nextWide,
  nextOneLine,
  overlay,
  aboveFoot,
  children,
}: {
  step?: number
  /** How many steps there are, when not the plan's six (the life questions: eight). */
  total?: number
  /** Replaces going back a screen, e.g. to the previous question. */
  onBack?: () => void
  /** Words and action that stand in for "Back" in the foot (the header's caret still goes back). */
  later?: { label: string; onPress: () => void }
  /** A "Skip" beside Back, for a step she may leave unanswered. */
  skip?: () => void
  /** No "Back" in the foot (the header's caret and the swipe still go back). */
  noBack?: boolean
  /** The word beside the foot's caret, when it is not "Back" ("All nine"). */
  backLabel?: string
  /** Replaces the header bar: the pages before the set-up wear the Inlay mark. */
  header?: React.ReactNode
  /** The header's words: "Your plan", or "Payment method" on the last step. */
  headerTitle?: string
  /** Makes the header's words a button (a demo shortcut). */
  onTitlePress?: () => void
  /** The heading over the list; none on the last step, whose header names it. */
  title?: string
  lead?: string
  onNext?: () => void
  /** No foot at all: the page is read, and the header's caret goes back. */
  noFoot?: boolean
  nextLabel?: string
  nextDisabled?: boolean
  nextPending?: boolean
  nextWide?: boolean
  /** A long label stays on one line: the button takes the room Back leaves. */
  nextOneLine?: boolean
  overlay?: React.ReactNode
  /** Fixed over Continue, outside the scrolling list (a running total). */
  aboveFoot?: React.ReactNode
  children: React.ReactNode
}) {
  const { bottom } = useSafeAreaInsets()
  const back = onBack ?? (() => backFrom(step))
  return (
    <View style={styles.screen}>
      <DarkStatusBar />
      <PageGround />
      {header ?? <PageHeader title={headerTitle} onTitlePress={onTitlePress} onBack={back} right={step ? <PlanSteps step={step} total={total} /> : undefined} />}
      {!!title && (
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {!!lead && <Text style={styles.lead}>{lead}</Text>}
        </View>
      )}
      <ScrollView style={styles.fill} contentContainerStyle={[styles.list, !title && styles.listUntitled]} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {/* A slimmer foot than other pages, so more of the list shows. */}
      {!noFoot && (
      <PageFooter
        style={{
          backgroundColor: "transparent",
          borderTopWidth: 0,
          paddingTop: space.item,
          // 4 higher than the slimmest foot.
          paddingBottom: Math.max(bottom - 10, space.item + 4),
        }}
      >
        {aboveFoot && <View style={styles.aboveFoot}>{aboveFoot}</View>}
        <View style={styles.footer}>
          {!nextWide && (
            <View style={styles.backs}>
              {later ? (
                <Pressable onPress={later.onPress} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
                  <Text style={styles.backText}>{later.label}</Text>
                </Pressable>
              ) : (
                !noBack && (
                <Pressable onPress={back} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
                  <CaretLeft size={16} color={ink.secondary} />
                  <Text style={styles.backText}>{backLabel}</Text>
                </Pressable>
                )
              )}
              {skip && (
                <Pressable onPress={skip} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
                  <Text style={styles.backText}>Skip</Text>
                </Pressable>
              )}
            </View>
          )}
          <View style={nextWide ? styles.fill : nextOneLine ? styles.hug : styles.next}>
            <Button onPress={onNext} disabled={nextDisabled} pending={nextPending} oneLine={nextOneLine} trailing={({ color: c }) => <CaretRight size={16} weight="bold" color={c} />}>
              {nextLabel}
            </Button>
          </View>
        </View>
      </PageFooter>
      )}
      {overlay}
    </View>
  )
}

const styles = StyleSheet.create({
  steps: { alignItems: "flex-end", gap: space.mark },
  stepText: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: ink.secondary },
  dashes: { flexDirection: "row", gap: 4 },
  dash: { width: 16, height: 5, borderRadius: 2.5, backgroundColor: hairline.outline },
  dashOn: { backgroundColor: color.primary },

  screen: { flex: 1, backgroundColor: color.background },
  fill: { flex: 1 },
  hug: { flexShrink: 0, marginLeft: "auto" },
  pressed: { opacity: 0.7 },
  head: { gap: space.inline, paddingHorizontal: space.gutter, paddingTop: space.section, paddingBottom: space.item },
  title: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2, color: ink.strong },
  lead: { ...type.body },
  // No heading of its own: the first content sits as far under the header bar as a heading would.
  listUntitled: { paddingTop: space.section },
  list: { gap: space.inline, paddingHorizontal: space.gutter, paddingTop: space.line, paddingBottom: space.item },

  aboveFoot: { marginBottom: space.item },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.section },
  backs: { flexDirection: "row", alignItems: "center", gap: space.section },
  back: { flexDirection: "row", alignItems: "center", gap: space.line, paddingVertical: space.inline },
  backText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: ink.secondary },
  next: { width: "52%" },
})
