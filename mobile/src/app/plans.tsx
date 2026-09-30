import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Badge, Card, Chip, FlowScreen, Row, Section } from "@/components/flow"
import { IconCheck, IconSparkle } from "@/components/icons"
import { Button } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { ADD_ONS, PROGRAMS, TIERS, programName, recommend, type ProgramId, type Tier } from "@/lib/plans"
import { color, font, gutter } from "@/lib/theme"

/* Suggested plans, opened from the dashboard, the Plan tab or the assistant: what the record suggests and
   what to sign up for. The programs the
   clinic data points to come first, each with the results behind it, and
   start selected; the rest can be added. Then the free record against the
   one paid Optimization membership (which merges the chosen programs into a
   single tailored plan), and the add-ons sold on top of either. */

const PREVIEW = 5

export default function PlansScreen() {
  const onboarding = useOnboarding()
  const sex = onboarding.profile?.sex ?? "female"
  const recommended = React.useMemo(recommend, [])
  // The assistant opens this screen with the programs it suggested.
  const { programs: asked } = useLocalSearchParams<{ programs?: string }>()
  const [programs, setPrograms] = React.useState<ProgramId[]>(() => {
    const fromAssistant = asked?.split(",").filter((id): id is ProgramId => PROGRAMS.some((p) => p.id === id))
    if (fromAssistant?.length) return fromAssistant
    return onboarding.membership?.programs ?? recommended.map((r) => r.program)
  })
  const [tier, setTier] = React.useState<Tier>(onboarding.membership?.tier ?? "optimization")
  const [allFeatures, setAllFeatures] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const others = PROGRAMS.filter((p) => (!p.only || p.only === sex) && !recommended.some((r) => r.program === p.id))
  const toggle = (id: ProgramId) =>
    setPrograms((list) => (list.includes(id) ? list.filter((p) => p !== id) : [...list, id]))

  async function finish() {
    setPending(true)
    const starting = tier === "optimization" && onboarding.membership?.tier !== "optimization"
    // A new subscription starts the paid setup from its first step.
    await onboarding.save({ membership: { tier, programs }, ...(starting ? { setupDone: [], plan: undefined } : {}) })
    setPending(false)
    setConfirming(false)
    if (starting) router.replace("/optimize/questionnaire")
    else router.back()
  }

  const paid = TIERS.optimization
  return (
    <View style={styles.fill}>
      <FlowScreen
        title="Suggested plans"
        footer={
          tier === "optimization" ? (
            <Button onPress={() => setConfirming(true)} disabled={!programs.length}>
              {`Start Optimization · ${paid.price} ${paid.per}`}
            </Button>
          ) : (
            <Button onPress={finish} pending={pending}>
              Stay on the free record
            </Button>
          )
        }
      >
        <Section title="Recommended for you" gap={10}>
          {recommended.map((r, i) => {
            const on = programs.includes(r.program)
            return (
              <Card key={r.program} selected={on} onPress={() => toggle(r.program)}>
                <View style={styles.programTop}>
                  <View style={styles.programIcon}>
                    <IconSparkle color={color.primary} size={18} />
                  </View>
                  <Text style={styles.programName}>{programName(r.program)}</Text>
                  <View style={[styles.radio, on && styles.radioOn]}>
                    {on && <IconCheck size={13} color={color.onPrimary} strokeWidth={2.6} />}
                  </View>
                </View>
                {i === 0 && (
                  <View style={styles.topMatch}>
                    <Badge>Top match</Badge>
                  </View>
                )}
                <View style={styles.reasons}>
                  {r.reasons.map((reason) => (
                    <View key={reason} style={styles.reason}>
                      <View style={styles.reasonDot} />
                      <Text style={styles.reasonText}>{reason}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )
          })}
        </Section>

        <Section title="More programs">
          <View style={styles.chips}>
            {others.map((p) => (
              <Chip key={p.id} label={p.name} selected={programs.includes(p.id)} onPress={() => toggle(p.id)} />
            ))}
          </View>
        </Section>

        <Section title="Choose your membership" gap={10}>
          <Card selected={tier === "optimization"} onPress={() => setTier("optimization")}>
            <TierHead tier="optimization" selected={tier === "optimization"} badge="Recommended" />
            <Features
              list={allFeatures ? paid.features : paid.features.slice(0, PREVIEW)}
              more={
                paid.features.length > PREVIEW && (
                  <Pressable onPress={() => setAllFeatures((v) => !v)} hitSlop={8} accessibilityRole="button">
                    <Text style={styles.link}>
                      {allFeatures ? "Show less" : `Show all ${paid.features.length}`}
                    </Text>
                  </Pressable>
                )
              }
            />
          </Card>
          <Card selected={tier === "free"} onPress={() => setTier("free")}>
            <TierHead tier="free" selected={tier === "free"} badge="Included" />
            <Features list={TIERS.free.features} />
          </Card>
        </Section>

        <Section title="Add-ons">
          <Card style={styles.rows}>
            {ADD_ONS.map((a, i) => (
              <View key={a.name} style={[styles.addOn, i < ADD_ONS.length - 1 && styles.rule]}>
                <Text style={styles.addOnName}>{a.name}</Text>
                <Text style={styles.addOnDetail}>{a.detail}</Text>
              </View>
            ))}
          </Card>
        </Section>
      </FlowScreen>

      {confirming && (
        <ConfirmSheet
          programs={programs}
          pending={pending}
          onCancel={() => setConfirming(false)}
          onConfirm={finish}
        />
      )}
    </View>
  )
}

function TierHead({ tier, selected, badge }: { tier: Tier; selected: boolean; badge: string }) {
  const t = TIERS[tier]
  return (
    <View style={styles.tierHead}>
      <View style={styles.tierTitle}>
        <View style={styles.tierNameRow}>
          <Text style={styles.tierName}>{t.name}</Text>
          <Badge tone={tier === "optimization" ? "primary" : "ok"}>{badge}</Badge>
        </View>
        <Text style={styles.price}>
          {t.price}
          {t.per && <Text style={styles.per}> {t.per}</Text>}
        </Text>
      </View>
      <View style={[styles.radio, styles.radioRound, selected && styles.radioOn]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </View>
  )
}

function Features({ list, more }: { list: readonly string[]; more?: React.ReactNode }) {
  return (
    <View style={styles.features}>
      {list.map((f) => (
        <View key={f} style={styles.feature}>
          <IconCheck size={16} color={color.primary} />
          <Text style={styles.featureText}>{f}</Text>
        </View>
      ))}
      {more}
    </View>
  )
}

/** A bottom sheet over the screen (not a native modal, so the web build
    keeps it inside the drawn phone). */
function ConfirmSheet({
  programs,
  pending,
  onCancel,
  onConfirm,
}: {
  programs: ProgramId[]
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { bottom } = useSafeAreaInsets()
  const paid = TIERS.optimization
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: Math.max(bottom - 12, 16) }]} accessibilityViewIsModal>
        <View style={styles.grabber} />
        <Text style={styles.sheetTitle} accessibilityRole="header">
          Confirm your membership
        </Text>
        <Card style={styles.rows}>
          <Row label="Membership" value={paid.name} />
          <Row label="Programs" value={programs.map(programName).join(", ")} />
          <Row label="Practice" value={PATIENT.practice} />
          <Row label="Billed" value={`${paid.price} ${paid.per}`} last />
        </Card>
        <View style={styles.sheetActions}>
          <Button onPress={onConfirm} pending={pending}>
            Confirm and start
          </Button>
          <Button variant="outline" onPress={onCancel}>
            Cancel
          </Button>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  programTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  programIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  programName: { flex: 1, fontFamily: font.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2, color: color.text },
  topMatch: { marginTop: 10, marginLeft: 48 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: color.inputBorder,
    backgroundColor: color.background,
    alignItems: "center",
    justifyContent: "center",
  },
  radioRound: { borderRadius: 12 },
  radioOn: { backgroundColor: color.primary, borderColor: color.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.onPrimary },
  reasons: { marginTop: 10, marginLeft: 48, gap: 6 },
  reason: { flexDirection: "row", alignItems: "center", gap: 8 },
  reasonDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: color.high },
  reasonText: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  tierHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  tierTitle: { flex: 1, gap: 6 },
  tierNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierName: { fontFamily: font.semibold, fontSize: 17, color: color.text },
  price: { fontFamily: font.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.8, color: color.text },
  per: { fontFamily: font.regular, fontSize: 15, letterSpacing: 0, color: color.muted },
  features: { marginTop: 14, gap: 10 },
  feature: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  featureText: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.text },
  link: { fontFamily: font.semibold, fontSize: 14, color: color.primary, marginTop: 2 },

  rows: { paddingVertical: 2 },
  rule: { borderBottomWidth: 1, borderBottomColor: color.border },
  addOn: { paddingVertical: 11, gap: 2 },
  addOnName: { fontFamily: font.medium, fontSize: 15, color: color.text },
  addOnDetail: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.muted },

  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0, 0, 0, 0.3)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: gutter,
    paddingTop: 10,
    gap: 18,
  },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: color.border },
  sheetTitle: { fontFamily: font.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5, color: color.text },
  sheetActions: { gap: 10 },
})
