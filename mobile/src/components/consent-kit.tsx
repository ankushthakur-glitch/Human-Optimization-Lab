import { router } from "expo-router"
import * as React from "react"
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import { DarkStatusBar } from "@/components/error-state"
import { PageFooter, PageGround } from "@/components/hol"
import { CaretLeft, Check } from "@/components/ph"
import { RecordIcon } from "@/components/record-icons"
import { Sheet } from "@/components/sheet"
import { Button, useTopInset } from "@/components/ui"
import { DOCS, type Doc, PERIODS, docVersionLine, endDate, periodLabel } from "@/lib/consent"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { DATA_TYPES } from "@/lib/record"
import { card, color, font, hairline, ink, space, type } from "@/lib/theme"

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

/** Signs as the patient on the last page, keeping how she agreed to be
    contacted about her care (texts, calls, email) and when she chose. */
export function useSignConsent(onSigned: (signedAs: string, period: string) => Promise<void>) {
  const onboarding = useOnboarding()
  const [pending, setPending] = React.useState(false)
  const legalName = `${onboarding.profile?.firstName ?? PATIENT.firstName} ${onboarding.profile?.lastName ?? PATIENT.lastName}`

  async function sign(period: string, contact: { sms: boolean; call: boolean; email: boolean }) {
    setPending(true)
    await onboarding.save({
      smsConsent: contact.sms,
      smsConsentAt: new Date().toISOString(),
      notify: { ...onboarding.notify, ...contact },
    })
    await onSigned(legalName, period)
    setPending(false)
  }

  return { sign, pending }
}

/** A consent page's frame, as the Figma "Hol" Consent (5 Oct 2026): a
    white status bar over the page's soft gradient, a round grey back
    button, the page's object and its content 20 apart, and a white footer
    with a hairline over it holding the page's actions. `title` names the
    page for a screen reader; `showTitle` also prints it under the object,
    for the pages the Figma has no frame of (privacy and terms, texts). */
export function ConsentShell({
  sheets,
  title,
  showTitle = false,
  art,
  footer,
  children,
}: {
  sheets: Pick<ConsentPage, "sheet" | "setSheet">
  title: string
  showTitle?: boolean
  art?: React.ReactNode
  footer?: React.ReactNode
  children?: React.ReactNode
}) {
  const top = useTopInset()
  const canBack = router.canGoBack()
  return (
    <View style={styles.fill}>
      <DarkStatusBar />
      <View style={[styles.statusBar, { height: top }]} />
      <View style={styles.fill}>
        <PageGround />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.backRow}>
            {canBack && (
              <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
                <CaretLeft size={20} color={ink.detail} />
              </Pressable>
            )}
          </View>
          <View style={styles.body}>
            {art && <View style={styles.art}>{art}</View>}
            <Text style={showTitle ? styles.title : styles.hiddenTitle} accessibilityRole="header">
              {title}
            </Text>
            {children}
          </View>
        </ScrollView>
      </View>
      {footer && <PageFooter>{footer}</PageFooter>}
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
              <RecordIcon name={t.icon} size={14} color={color.primary} />
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
          <Text style={styles.docVersion}>{docVersionLine(page.sheet)}</Text>
        </ScrollView>
        <Button onPress={close}>Done</Button>
      </Sheet>
    )
  }
  return null
}

/** The periods as three cards side by side, each with the day it would
    end; the chosen one takes the teal tint and its teal edge. */
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
            style={({ pressed }) => [styles.period, on && styles.periodOn, pressed && !on && styles.pressed]}
          >
            <Text style={styles.periodName} numberOfLines={1}>
              {periodLabel(m)}
            </Text>
            <Text style={styles.periodUntil} numberOfLines={1}>
              {endDate(m)}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** One statement to agree to, on its lifted card. The box and the words
    both tick it; a link inside the words opens its document and ticks
    nothing. */
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
    <View style={styles.checkCard}>
      <Pressable
        onPress={toggle}
        hitSlop={12}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        style={[styles.box, checked && styles.boxOn]}
      >
        {checked && <Check size={12} color={color.onPrimary} weight="bold" />}
      </Pressable>
      <Text style={styles.checkText} onPress={toggle} suppressHighlighting>
        {children}
      </Text>
    </View>
  )
}

/** A teal underlined link inside a statement, e.g. "Read the
    authorization". */
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

/** Figma's 14 at a 1.6 line. */
const LINE_22 = 22

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  pressed: { opacity: 0.6 },

  statusBar: { backgroundColor: color.background },
  scroll: { flexGrow: 1, width: "100%", maxWidth: 420 + space.gutter * 2, alignSelf: "center" },
  // The back button's row: 16 around a 32 round grey button.
  backRow: { padding: space.gutter, minHeight: 32 + space.gutter * 2 },
  back: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EBEBEB", alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: space.gutter, paddingTop: space.gutter, paddingBottom: space.gutter, gap: space.section },
  // The object centred in a 140 tall band.
  art: { height: 140, alignItems: "center", justifyContent: "center" },
  title: { ...type.tabTitle, textAlign: "center" },
  // Named for a screen reader, drawn as nothing.
  hiddenTitle: { position: "absolute", width: 1, height: 1, opacity: 0 },

  types: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  type: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.mark,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: color.primaryEdge,
    backgroundColor: color.primaryTint,
  },
  typeText: { ...type.label, color: ink.primary },

  legalScroll: { maxHeight: 420 },
  legal: { gap: space.item },
  legalText: { ...type.body },
  docVersion: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: color.muted },

  periodList: { flexDirection: "row", gap: space.item },
  period: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.stack,
    paddingHorizontal: 11.5,
    paddingVertical: 7.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: card.fill,
    boxShadow: card.shadow,
  },
  periodOn: { backgroundColor: color.primaryTint, borderColor: color.primaryLine },
  periodName: { ...type.chip },
  periodUntil: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: color.muted },

  // The statement's card: white fading in from the page, lifted.
  checkCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.inline,
    padding: space.card,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    boxShadow: "2px 4px 12px rgba(0, 0, 0, 0.06)",
  },
  box: {
    width: 16,
    height: 16,
    marginTop: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#C6C6C8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.background,
  },
  boxOn: { backgroundColor: color.primary, borderColor: color.primary },
  checkText: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: LINE_22, color: ink.content },
  docLink: { color: color.primaryText, textDecorationLine: "underline" },

  missing: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.error },
})
