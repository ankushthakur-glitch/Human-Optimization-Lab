import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { Art } from "@/components/art"
import {
  ConsentCheck,
  ConsentShell,
  DocLink,
  MissingTick,
  PeriodList,
  Shield,
  type ConsentSheet,
  useConsentPage,
  useSignConsent,
} from "@/components/consent-kit"
import { Flask, Lock } from "@/components/ph"
import { Card } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { DEFAULT_PERIOD, PERIODS } from "@/lib/consent"
import { PATIENT } from "@/lib/patient"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* The consent as two pages, shared by setup and by Connect your records on
   the dashboard. 1: the records, who sees them, for how long, the
   authorization and the privacy policy and terms (the Figma "Hol" Consent,
   5 Oct 2026); both boxes are needed to go on. 2: how Inlay may contact
   her (texts, calls, email), a box each, all optional. Page 2 has no Figma frame of its own,
   so it wears page 1's frame with its title under the object. Each page is its own route, so the swipe
   goes back a page. The period travels to the last page as a route param.
   Reading a document is never required. The wording of the documents
   lives in lib/consent.ts. */

const AUTHORIZE = "I authorize Inlay Health to collect my health records."
const TERMS = "I agree to Inlay’s privacy policy, terms of service and lab request terms"
const TEXTS = "Inlay can text me about my care, like new results and reminders."
const CALLS = "Inlay can call me about my care."
const EMAILS = "Inlay can email me about my care."

/** A period from a route param, or the default when it is missing or no
    longer offered. */
export const periodParam = (p: unknown) => (typeof p === "string" && PERIODS.includes(p) ? p : DEFAULT_PERIOD)

/** One row of the records card: the tile, the title and its line, and
    "See all" when it opens more. */
function InfoRow({ icon, title, line, onSeeAll }: { icon: React.ReactNode; title: string; line: string; onSeeAll?: () => void }) {
  const body = (
    <>
      <View style={styles.tile}>{icon}</View>
      <View style={styles.rowWords}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowLine} numberOfLines={1}>
          {line}
        </Text>
      </View>
      {onSeeAll && <Text style={styles.seeAll}>See all</Text>}
    </>
  )
  if (!onSeeAll) return <View style={styles.row}>{body}</View>
  return (
    <Pressable onPress={onSeeAll} accessibilityRole="button" accessibilityLabel={`${title}: ${line}. See all`} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {body}
    </Pressable>
  )
}

/** Page 1: what is collected, who sees it, for how long, the
    authorization, and under it the privacy policy and terms (moved here
    from their own page by the user, 5 Oct 2026). Both boxes are needed to
    go on. */
export function ConsentRecords({ onNext }: { onNext: (period: string) => void }) {
  const page = useConsentPage()
  const [period, setPeriod] = React.useState(DEFAULT_PERIOD)
  const [terms, setTerms] = React.useState(false)
  const [missing, setMissing] = React.useState(false)
  const agree = () => (page.checked && terms ? onNext(period) : setMissing(true))
  return (
    <ConsentShell
      sheets={page}
      title="Connect your health records"
      art={<Shield />}
      footer={
        <>
          <MissingTick show={missing && !(page.checked && terms)} />
          <Button onPress={agree}>Agree and continue</Button>
        </>
      }
    >
      <Card style={styles.records}>
        <InfoRow icon={<Lock size={16} color={color.primary} />} title="Who sees them" line={`You and ${PATIENT.practice}`} />
        <View style={styles.rule} />
        <InfoRow icon={<Flask size={16} color={color.primary} />} title="What we collect" line="Visits, labs and 7 more" onSeeAll={() => page.setSheet("types")} />
      </Card>
      <View style={styles.period}>
        <Text style={styles.label} accessibilityRole="header">
          How long
        </Text>
        <PeriodList value={period} onChange={setPeriod} />
      </View>
      <View style={styles.checks}>
        <ConsentCheck checked={page.checked} onChange={page.setChecked} label={AUTHORIZE}>
          {`${AUTHORIZE} `}
          <DocLink onPress={() => page.setSheet("authorization")}>Read the authorization</DocLink>
        </ConsentCheck>
        <ConsentCheck checked={terms} onChange={setTerms} label={TERMS}>
          {"I agree to Inlay’s "}
          <DocLink onPress={() => page.setSheet("privacy")}>privacy policy</DocLink>
          {", "}
          <DocLink onPress={() => page.setSheet("terms")}>terms of service</DocLink>
          {" and "}
          <DocLink onPress={() => page.setSheet("lab")}>lab request terms</DocLink>
        </ConsentCheck>
      </View>
    </ConsentShell>
  )
}

/** Page 2: how Inlay may contact her about her care, one box for each
    way (texts, phone calls, email; user, 5 Oct 2026). Each is optional:
    "Agree and continue" signs with whatever she ticked. */
export function ConsentTexts({
  period,
  onSigned,
}: {
  period: string
  onSigned: (signedAs: string, period: string) => Promise<void>
}) {
  const [sheet, setSheet] = React.useState<ConsentSheet | null>(null)
  const { sign, pending } = useSignConsent(onSigned)
  const [contact, setContact] = React.useState({ sms: false, call: false, email: false })
  const set = (k: keyof typeof contact) => (on: boolean) => setContact((c) => ({ ...c, [k]: on }))
  return (
    <ConsentShell
      sheets={{ sheet, setSheet }}
      title="Updates about your care"
      showTitle
      art={<Art name="bell" size={112} />}
      footer={
        <Button onPress={() => sign(period, contact)} pending={pending}>
          Agree and continue
        </Button>
      }
    >
      <View style={styles.checks}>
        <ConsentCheck checked={contact.sms} onChange={set("sms")} label={TEXTS}>
          {`${TEXTS} `}
          <DocLink onPress={() => setSheet("texts")}>Messaging terms</DocLink>
        </ConsentCheck>
        <ConsentCheck checked={contact.call} onChange={set("call")} label={CALLS}>
          {CALLS}
        </ConsentCheck>
        <ConsentCheck checked={contact.email} onChange={set("email")} label={EMAILS}>
          {EMAILS}
        </ConsentCheck>
      </View>
    </ConsentShell>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  // The records card: two rows 12 apart over a hairline.
  records: { gap: space.card },
  rule: { height: 0.8, backgroundColor: hairline.rule },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  tile: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.primaryTint, alignItems: "center", justifyContent: "center" },
  rowWords: { flex: 1, gap: space.stack },
  rowTitle: { ...type.title, color: ink.detail },
  rowLine: { ...type.label },
  seeAll: { fontFamily: font.medium, fontSize: 12, lineHeight: 14, color: color.primaryText },

  period: { gap: space.item },
  checks: { gap: space.item },
  label: { ...type.title, color: ink.detail },
  statement: { fontFamily: font.regular, fontSize: 14, lineHeight: 22, color: ink.content },
  link: { color: color.primaryText, textDecorationLine: "underline" },
})
