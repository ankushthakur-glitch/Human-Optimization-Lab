import { router } from "expo-router"
import * as React from "react"

import { ConsentLink, ConsentShell, MissingTick, Shield, useConsentDraft } from "@/components/consent-kit"
import { Checkbox } from "@/components/flow"
import { IconCalendar, IconLock } from "@/components/icons"
import { IconTile, List, ListRow } from "@/components/list"
import { RecordIcon } from "@/components/record-icons"
import { Button } from "@/components/ui"
import { monthsLabel } from "@/lib/consent"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { color } from "@/lib/theme"

/* Step 2: the one consent as three rows: who sees the records, what is
   collected (See all opens the list) and how long (Change opens the
   periods). The full authorization is a tap away and the tick signs it as
   the signed-in patient. Nothing medical is read before this is signed.
   The wording lives in lib/consent.ts. */

/** Setup's step 2. Signing starts the record and moves on to the why. */
export default function ConsentScreen() {
  const onboarding = useOnboarding()
  return (
    <ConsentForm
      onSigned={async (signedAs, consentMonths) => {
        await onboarding.save({ signedAs, consent: "signed", consentAt: new Date().toISOString(), consentMonths, step: "why" })
        // No way back to an unsigned form: the record starts building while
        // the patient talks through their why.
        router.replace("/onboarding/why")
      }}
    />
  )
}

/** The consent itself, shared by setup and by Connect your records on the
    dashboard. */
export function ConsentForm({ onSigned }: { onSigned: (signedAs: string, months: number) => Promise<void> }) {
  const d = useConsentDraft(onSigned)
  return (
    <ConsentShell
      draft={d}
      title="Connect your health records"
      art={<Shield />}
      footer={
        <>
          {/* In the pinned footer, so signing never needs a scroll. */}
          <Checkbox checked={d.agreed} onChange={d.setAgreed}>
            I agree to share my health records with my care team
          </Checkbox>
          <MissingTick show={d.missing} />
          <Button onPress={() => d.sign()} pending={d.pending}>
            Agree and connect
          </Button>
        </>
      }
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
          onPress={() => d.setSheet("types")}
          action="See all"
          accessibilityLabel="What we collect: see all"
        />
        <ListRow
          icon={<IconTile size={40}><IconCalendar size={18} color={color.primary} /></IconTile>}
          label="How long"
          title={monthsLabel(d.months)}
          onPress={() => d.setSheet("period")}
          action="Change"
          accessibilityLabel={`How long: ${monthsLabel(d.months)}. Change`}
        />
      </List>
      <ConsentLink onPress={() => d.setSheet("legal")} centred>
        Read the HIPAA authorization
      </ConsentLink>
    </ConsentShell>
  )
}
