import * as React from "react"
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { RecordIcon } from "@/components/record-icons"
import { Sheet } from "@/components/sheet"
import { Button } from "@/components/ui"
import { LEGAL, PERIODS, endDate, monthsLabel } from "@/lib/consent"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { DATA_TYPES } from "@/lib/record"
import { color, font } from "@/lib/theme"

/* The consent's parts, shared by setup and Connect your records: the draft
   (ticked, period, open sheet), the three sheets (what we collect, the
   period, the full authorization) and the shield. */

export const SHIELD = require("../../assets/images/consent-shield.png")

export const Shield = ({ size = 112 }: { size?: number }) => (
  <Image source={SHIELD} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
)

export type ConsentSheet = "types" | "legal" | "period"

export function useConsentDraft(onSigned: (signedAs: string, months: number) => Promise<void>) {
  const onboarding = useOnboarding()
  const [agreed, setAgreedState] = React.useState(false)
  const [months, setMonths] = React.useState("6")
  const [sheet, setSheet] = React.useState<ConsentSheet | null>(null)
  const [missing, setMissing] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const legalName = `${onboarding.profile?.firstName ?? PATIENT.firstName} ${onboarding.profile?.lastName ?? PATIENT.lastName}`

  const setAgreed = (v: boolean) => {
    setAgreedState(v)
    setMissing(false)
  }

  /** Signs as the patient, once the box is ticked. */
  async function sign() {
    if (!agreed) {
      setMissing(true)
      return
    }
    setPending(true)
    await onSigned(legalName, Number(months))
  }

  return { agreed, setAgreed, months, setMonths, sheet, setSheet, missing, pending, legalName, sign }
}

export type ConsentDraft = ReturnType<typeof useConsentDraft>

/** The consent's frame: the setup screen and its sheets. */
export function ConsentShell({
  draft,
  children,
  ...flow
}: React.ComponentProps<typeof FlowScreen> & { draft: ConsentDraft }) {
  return (
    <View style={styles.fill}>
      <FlowScreen {...flow}>{children}</FlowScreen>
      <ConsentSheets draft={draft} />
    </View>
  )
}

export function ConsentSheets({ draft }: { draft: ConsentDraft }) {
  const close = () => draft.setSheet(null)
  if (draft.sheet === "types")
    return (
      <Sheet title="What we collect" onClose={close}>
        <View style={styles.types}>
          {DATA_TYPES.map((t) => (
            <View key={t.key} style={styles.type}>
              <RecordIcon name={t.icon} size={15} color={color.primary} />
              <Text style={styles.typeText}>{t.label}</Text>
            </View>
          ))}
        </View>
        <Button onPress={close}>Done</Button>
      </Sheet>
    )
  if (draft.sheet === "period")
    return (
      <Sheet title="Keep collecting for" onClose={close}>
        <PeriodList value={draft.months} onChange={draft.setMonths} />
        <Button onPress={close}>Done</Button>
      </Sheet>
    )
  if (draft.sheet === "legal")
    return (
      <Sheet title="HIPAA authorization" onClose={close}>
        <ScrollView style={styles.legalScroll} contentContainerStyle={styles.legal}>
          {LEGAL.map((p) => (
            <Text key={p} style={styles.legalText}>
              {p}
            </Text>
          ))}
        </ScrollView>
        <Button onPress={close}>Done</Button>
      </Sheet>
    )
  return null
}

/** The periods as radio rows, each with the day it would end. */
export function PeriodList({
  value,
  onChange,
  recommended,
}: {
  value: string
  onChange: (m: string) => void
  recommended?: string
}) {
  return (
    <View style={styles.periodList} accessibilityRole="radiogroup" accessibilityLabel="Keep collecting for">
      {PERIODS.map((m) => {
        const on = m === value
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={({ pressed }) => [styles.periodRow, on && styles.periodRowOn, pressed && !on && styles.pressed]}
          >
            <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
            <View style={styles.periodBody}>
              <View style={styles.periodHead}>
                <Text style={styles.periodName}>{monthsLabel(m)}</Text>
                {m === recommended && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>Recommended</Text>
                  </View>
                )}
              </View>
              <Text style={styles.periodUntil}>Until {endDate(m)}</Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

/** A small teal link, e.g. to the full authorization. */
export function ConsentLink({
  children,
  onPress,
  centred,
}: {
  children: string
  onPress: () => void
  centred?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      style={({ pressed }) => [styles.link, centred && styles.linkCentred, pressed && styles.pressed]}
    >
      <RecordIcon name="documents" size={16} color={color.primary} />
      <Text style={styles.linkText}>{children}</Text>
    </Pressable>
  )
}

export function MissingTick({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <Text style={styles.missing} accessibilityRole="alert">
      Tick the box to agree first.
    </Text>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pressed: { opacity: 0.6 },

  types: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  type: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: color.primaryTint,
  },
  typeText: { fontFamily: font.medium, fontSize: 14, color: color.text },

  legalScroll: { maxHeight: 420 },
  legal: { gap: 12 },
  legalText: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: color.muted },

  periodList: { gap: 8 },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: color.background,
  },
  periodRowOn: { borderColor: color.primary, backgroundColor: color.primaryTint },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: color.inputBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.background,
  },
  radioOn: { borderColor: color.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.primary },
  periodBody: { flex: 1, gap: 1 },
  periodHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  periodName: { fontFamily: font.medium, fontSize: 16, lineHeight: 22, color: color.text },
  periodUntil: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.muted },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: color.primary },
  tagText: { fontFamily: font.medium, fontSize: 11.5, lineHeight: 16, color: color.onPrimary },

  link: { flexDirection: "row", alignItems: "center", gap: 6 },
  linkCentred: { justifyContent: "center" },
  linkText: { fontFamily: font.semibold, fontSize: 14, color: color.primary },

  missing: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.error, marginTop: -4 },
})
