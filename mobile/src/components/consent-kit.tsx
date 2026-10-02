import * as React from "react"
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { IconCheck } from "@/components/icons"
import { RecordIcon } from "@/components/record-icons"
import { Sheet } from "@/components/sheet"
import { Button } from "@/components/ui"
import { DOCS, type Doc, PERIODS, endDate, periodLabel } from "@/lib/consent"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { DATA_TYPES } from "@/lib/record"
import { color, font } from "@/lib/theme"

/* The consent's parts, shared by setup and Connect your records: each
   page's state (its box and the open sheet), the signing, the sheets (what
   we collect, and each document a statement links to), the box with its
   links, the periods and the shield. */

export const SHIELD = require("../../assets/images/consent-shield.png")

export const Shield = ({ size = 112 }: { size?: number }) => (
  <Image source={SHIELD} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
)

export type ConsentSheet = "types" | Doc

/** One consent page's state: its box, the reminder when Agree is pressed
    with the box empty, and the sheet open over it. */
export function useConsentPage() {
  const [checked, setCheckedState] = React.useState(false)
  const [missing, setMissing] = React.useState(false)
  const [sheet, setSheet] = React.useState<ConsentSheet | null>(null)
  const setChecked = (v: boolean) => {
    setCheckedState(v)
    setMissing(false)
  }
  /** Goes on once the box is ticked; otherwise shows the reminder. */
  const agree = (next: () => void) => (checked ? next() : setMissing(true))
  return { checked, setChecked, missing, sheet, setSheet, agree }
}

export type ConsentPage = ReturnType<typeof useConsentPage>

/** Signs as the patient on the last page, keeping her choice about texts
    and when she made it. */
export function useSignConsent(onSigned: (signedAs: string, period: string) => Promise<void>) {
  const onboarding = useOnboarding()
  const [pending, setPending] = React.useState<boolean | null>(null)
  const legalName = `${onboarding.profile?.firstName ?? PATIENT.firstName} ${onboarding.profile?.lastName ?? PATIENT.lastName}`

  async function sign(period: string, texts: boolean) {
    setPending(texts)
    await onboarding.save({
      smsConsent: texts,
      smsConsentAt: new Date().toISOString(),
      notify: { ...onboarding.notify, sms: texts },
    })
    await onSigned(legalName, period)
    setPending(null)
  }

  return { sign, pending }
}

/** A consent page's frame: the setup screen and its sheets. */
export function ConsentShell({
  sheets,
  children,
  ...flow
}: React.ComponentProps<typeof FlowScreen> & { sheets: Pick<ConsentPage, "sheet" | "setSheet"> }) {
  return (
    <View style={styles.fill}>
      <FlowScreen {...flow}>{children}</FlowScreen>
      <ConsentSheets page={sheets} />
    </View>
  )
}

export function ConsentSheets({ page }: { page: Pick<ConsentPage, "sheet" | "setSheet"> }) {
  const close = () => page.setSheet(null)
  if (page.sheet === "types")
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
  if (page.sheet) {
    const doc = DOCS[page.sheet]
    return (
      <Sheet title={doc.title} onClose={close}>
        <ScrollView style={styles.legalScroll} contentContainerStyle={styles.legal}>
          {doc.text.map((p) => (
            <Text key={p} style={styles.legalText}>
              {p}
            </Text>
          ))}
        </ScrollView>
        <Button onPress={close}>Done</Button>
      </Sheet>
    )
  }
  return null
}

/** The periods as three tiles side by side, each with the day it would
    end; the chosen one takes the teal border and tint. */
export function PeriodList({ value, onChange }: { value: string; onChange: (m: string) => void }) {
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
            accessibilityLabel={`${periodLabel(m)}, until ${endDate(m)}`}
            style={({ pressed }) => [styles.periodRow, on && styles.periodRowOn, pressed && !on && styles.pressed]}
          >
            <Text style={[styles.periodName, on && styles.periodNameOn]}>{periodLabel(m)}</Text>
            <Text style={styles.periodUntil} numberOfLines={1}>
              {endDate(m)}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** One statement to agree to. The box and the words both tick it; a link
    inside the words opens its document and ticks nothing. */
export function ConsentCheck({
  checked,
  onChange,
  label,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  /** The statement in plain words, for a screen reader on the box. */
  label: string
  children: React.ReactNode
}) {
  const toggle = () => onChange(!checked)
  return (
    <View style={styles.checkRow}>
      <Pressable
        onPress={toggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        style={[styles.box, checked && styles.boxOn]}
      >
        {checked && <IconCheck size={14} color={color.onPrimary} strokeWidth={2.4} />}
      </Pressable>
      <Text style={styles.checkText} onPress={toggle} suppressHighlighting>
        {children}
      </Text>
    </View>
  )
}

/** A teal link inside a statement, e.g. "Read the authorization". */
export function DocLink({ children, onPress }: { children: string; onPress: () => void }) {
  return (
    <Text style={styles.docLink} onPress={onPress} accessibilityRole="link" suppressHighlighting>
      {children}
    </Text>
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

  periodList: { flexDirection: "row", gap: 8 },
  periodRow: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: 64,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: color.background,
  },
  periodRowOn: { borderColor: color.primary, backgroundColor: color.primaryTint },
  periodName: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: color.text },
  periodNameOn: { color: color.primary },
  periodUntil: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: color.muted },

  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: color.inputBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.background,
  },
  boxOn: { backgroundColor: color.primary, borderColor: color.primary },
  checkText: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: color.text },
  docLink: { fontFamily: font.semibold, color: color.primary },

  missing: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.error, marginTop: -4 },
})
