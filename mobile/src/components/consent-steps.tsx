import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

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
import { IconLock } from "@/components/icons"
import { IconTile, List, ListRow } from "@/components/list"
import { RecordIcon } from "@/components/record-icons"
import { Button } from "@/components/ui"
import { DEFAULT_PERIOD, PERIODS } from "@/lib/consent"
import { PATIENT } from "@/lib/patient"
import { color, font } from "@/lib/theme"

/* The consent as three pages, one statement each, shared by setup and by
   Connect your records on the dashboard. 1: the records, who sees them,
   for how long, and the authorization. 2: the privacy policy and terms.
   Both boxes are needed to go on. 3: texts about her care, her choice;
   either answer signs. Each page is its own route, so the swipe goes back
   a page. The period travels to the last page as a route param. Reading a
   document is never required. The wording of the documents lives in
   lib/consent.ts. */

const AUTHORIZE = `I authorize Inlay Health to collect my health records and share them with ${PATIENT.practice}.`
const TERMS = "I agree to Inlay’s privacy policy, terms of service and lab request terms"
const TEXTS = "Inlay can text and message me about my care, like new results and reminders."

/** A period from a route param, or the default when it is missing or no
    longer offered. */
export const periodParam = (p: unknown) => (typeof p === "string" && PERIODS.includes(p) ? p : DEFAULT_PERIOD)

/** The Agree button, looking inert until its box is ticked but still
    answering a press with the reminder above it. */
function AgreeFooter({ page, label, onAgree }: { page: ReturnType<typeof useConsentPage>; label: string; onAgree: () => void }) {
  return (
    <>
      <MissingTick show={page.missing} />
      <View style={!page.checked && styles.waiting}>
        <Button onPress={() => page.agree(onAgree)}>{label}</Button>
      </View>
    </>
  )
}

/** Page 1: what is collected, who sees it, for how long, and the
    authorization. */
export function ConsentRecords({ onNext }: { onNext: (period: string) => void }) {
  const page = useConsentPage()
  const [period, setPeriod] = React.useState(DEFAULT_PERIOD)
  return (
    <ConsentShell
      sheets={page}
      title="Connect your health records"
      art={<Shield />}
      footer={<AgreeFooter page={page} label="Agree and continue" onAgree={() => onNext(period)} />}
    >
      <List>
        <ListRow
          icon={<IconTile size={40}><IconLock size={18} color={color.primary} /></IconTile>}
          label="Who sees them"
          title={`You and ${PATIENT.practice}`}
        />
        <ListRow
          icon={<IconTile size={40}><RecordIcon name="labs" size={18} color={color.primary} /></IconTile>}
          label="What we collect"
          title="Visits, labs and 7 more"
          onPress={() => page.setSheet("types")}
          action="See all"
          accessibilityLabel="What we collect: see all"
        />
      </List>
      <View style={styles.period}>
        <Text style={styles.label} accessibilityRole="header">
          How long
        </Text>
        <PeriodList value={period} onChange={setPeriod} />
      </View>
      <ConsentCheck checked={page.checked} onChange={page.setChecked} label={AUTHORIZE}>
        {`${AUTHORIZE} `}
        <DocLink onPress={() => page.setSheet("authorization")}>Read the authorization</DocLink>
      </ConsentCheck>
    </ConsentShell>
  )
}

/** Page 2: the privacy policy and terms. */
export function ConsentTerms({ onNext }: { onNext: () => void }) {
  const page = useConsentPage()
  return (
    <ConsentShell
      sheets={page}
      title="Privacy and terms"
      art={<Art name="document" size={112} />}
      footer={<AgreeFooter page={page} label="Agree and continue" onAgree={onNext} />}
    >
      <ConsentCheck checked={page.checked} onChange={page.setChecked} label={TERMS}>
        {"I agree to Inlay’s "}
        <DocLink onPress={() => page.setSheet("privacy")}>privacy policy</DocLink>
        {", "}
        <DocLink onPress={() => page.setSheet("terms")}>terms of service</DocLink>
        {" and "}
        <DocLink onPress={() => page.setSheet("lab")}>lab request terms</DocLink>
      </ConsentCheck>
    </ConsentShell>
  )
}

/** Page 3: texts about her care. Optional, so it asks rather than ticks:
    either answer signs the consent and moves on. */
export function ConsentTexts({
  period,
  onSigned,
}: {
  period: string
  onSigned: (signedAs: string, period: string) => Promise<void>
}) {
  const [sheet, setSheet] = React.useState<ConsentSheet | null>(null)
  const { sign, pending } = useSignConsent(onSigned)
  return (
    <ConsentShell
      sheets={{ sheet, setSheet }}
      title="Updates about your care"
      art={<Art name="bell" size={112} />}
      footer={
        <>
          <Button onPress={() => sign(period, true)} pending={pending === true} disabled={pending === false}>
            Allow texts
          </Button>
          <Button variant="outline" onPress={() => sign(period, false)} pending={pending === false} disabled={pending === true}>
            Not now
          </Button>
        </>
      }
    >
      <Text style={styles.statement}>
        {`${TEXTS} `}
        <DocLink onPress={() => setSheet("texts")}>Messaging terms</DocLink>
      </Text>
    </ConsentShell>
  )
}

const styles = StyleSheet.create({
  period: { gap: 10 },
  label: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.text },
  statement: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: color.text },
  // The same fade as a disabled button (components/ui.tsx).
  waiting: { opacity: 0.4 },
})
