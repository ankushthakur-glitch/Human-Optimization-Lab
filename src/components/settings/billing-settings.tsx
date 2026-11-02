"use client"

import {
  NumberInput,
  SettingsFrame,
  SettingsSection,
  ValueCard,
  ValueRow,
  useSettings,
} from "@/components/settings/settings-kit"
import { Switch } from "@/design-system/ui/switch"

/* The Super Admin's billing settings, from the 29 Oct 2026 walkthrough:
   how patients pay, and the cancellation
   policy. Each practice's own billing is set on the practice. The catalogue and each
   practice's own billing live in the Billing module.
   Fees and terms are placeholders until the vendors and Dr. Blanchard
   confirm them, so each one stays configurable. */

/* -------------------------------------------------------------------------- */
/*  Patient payments                                                           */
/* -------------------------------------------------------------------------- */

const PATIENT_METHODS = [
  { key: "card", label: "Card" },
  { key: "hsa", label: "HSA and FSA card" },
  { key: "apple", label: "Apple Pay" },
  { key: "google", label: "Google Pay" },
  { key: "bnpl", label: "Buy now, pay later" },
] as const

export function PatientPayments() {
  const settings = useSettings("patient-payments", {
    methods: {
      card: true,
      hsa: true,
      apple: true,
      google: true,
      bnpl: false,
    } as Record<string, boolean>,
    bnplFrom: 500,
  })
  const d = settings.draft
  return (
    <SettingsFrame action={settings.actions}>
      <SettingsSection title="Payment methods">
        <ValueCard>
          {PATIENT_METHODS.map((m) => (
            <ValueRow key={m.key} label={m.label}>
              <Switch
                checked={d.methods[m.key]}
                aria-label={m.label}
                onCheckedChange={(on) =>
                  settings.patch({ methods: { ...d.methods, [m.key]: on } })
                }
              />
            </ValueRow>
          ))}
          {d.methods.bnpl && (
            <ValueRow label="Offer pay later from">
              <NumberInput
                label="Offer pay later from"
                prefix="$"
                value={d.bnplFrom}
                onChange={(bnplFrom) => settings.patch({ bnplFrom })}
              />
            </ValueRow>
          )}
        </ValueCard>
      </SettingsSection>
    </SettingsFrame>
  )
}

/* -------------------------------------------------------------------------- */
/*  Cancellations and refunds                                                  */
/* -------------------------------------------------------------------------- */

/* One standard policy for every vendor, per Ed. Fees stay at zero until
   the vendors set theirs. */
export function CancellationPolicy() {
  const settings = useSettings("cancellation-policy", {
    window: 24,
    lateFee: 0,
    rescheduleFee: 0,
  })
  const d = settings.draft
  return (
    <SettingsFrame action={settings.actions}>
      <SettingsSection title="Policy">
        <ValueCard>
          <ValueRow label="Free cancellation up to">
            <NumberInput
              label="Free cancellation window"
              unit="hours before"
              value={d.window}
              onChange={(window) => settings.patch({ window })}
              className="w-48"
            />
          </ValueRow>
          <ValueRow label="Late cancellation fee">
            <NumberInput
              label="Late cancellation fee"
              prefix="$"
              value={d.lateFee}
              onChange={(lateFee) => settings.patch({ lateFee })}
            />
          </ValueRow>
          <ValueRow label="Late reschedule fee">
            <NumberInput
              label="Late reschedule fee"
              prefix="$"
              value={d.rescheduleFee}
              onChange={(rescheduleFee) => settings.patch({ rescheduleFee })}
            />
          </ValueRow>
        </ValueCard>
      </SettingsSection>
    </SettingsFrame>
  )
}
