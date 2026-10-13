import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { Sparkle } from "@/components/ph"
import { Banner, Card, HUE, toast } from "@/components/record-kit"
import { addedHref } from "@/components/record-rows"
import { Button, TextField } from "@/components/ui"
import { addKindOf, asksHowTaken } from "@/lib/add-record"
import { showDate } from "@/lib/dates"
import { useOnboarding, type Added } from "@/lib/onboarding"
import { checkSupplement } from "@/lib/supplement-check"
import { space } from "@/lib/theme"

/* One record typed in by the patient (a medicine, an allergy, a visit...),
   from "Add to your record" or a list's own "Add" action (user, 5 Oct
   2026). Saved, it joins that list under "Added by you", being checked,
   and its details page opens in place of the form. A medicine or supplement
   also saves how she takes it (its dose and how often, in her words) as a
   dated answer for Dr. Patel, and a supplement is checked against her
   record as she types its name. */
export default function AddRecordScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>()
  const info = addKindOf(kind)
  const onboarding = useOnboarding()
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [error, setError] = React.useState<string>()
  // The name settles for a moment before the check reads it.
  const typed = (values.name ?? "").trim()
  const [checked, setChecked] = React.useState("")
  React.useEffect(() => {
    const t = setTimeout(() => setChecked(typed), 600)
    return () => clearTimeout(t)
  }, [typed])
  if (!info) return <PageNotFoundState />

  const [first, ...rest] = info.fields
  const warning = info.kind === "supplements" ? checkSupplement(checked) : undefined

  async function save() {
    if (!info) return
    const name = (values[first.id] ?? "").trim()
    if (!name) {
      setError(`Add the ${first.label.toLowerCase()}.`)
      return
    }
    const added: Added = {
      id: `added-${Date.now()}`,
      title: name,
      detail: info.name,
      at: showDate(),
      kind: info.kind,
      fields: rest.map((f): [string, string] => [f.label, (values[f.id] ?? "").trim()]).filter(([, v]) => v),
      via: "typed",
    }
    const how = ["dose", "often"].map((id) => (values[id] ?? "").trim()).filter(Boolean).join(", ")
    await onboarding.save({
      added: [...(onboarding.added ?? []), added],
      ...(asksHowTaken(info.kind) && how
        ? { meds: { ...onboarding.meds, [added.id]: { medication: name, shown: [], answer: "taking" as const, note: how, at: new Date().toISOString() } } }
        : {}),
    })
    toast("Added to your record")
    router.replace(addedHref(added))
  }

  return (
    <FlowScreen page title={info.action} footer={<Button onPress={save}>Add to my record</Button>}>
      <Card style={styles.fields}>
        {info.fields.map((f) => (
          <TextField
            key={f.id}
            label={f.label}
            required={f.required}
            value={values[f.id] ?? ""}
            onChangeText={(v) => {
              setValues((x) => ({ ...x, [f.id]: v }))
              if (f.id === first.id) setError(undefined)
            }}
            placeholder={f.placeholder}
            error={f.id === first.id ? error : undefined}
          />
        ))}
      </Card>
      {warning && (
        <View accessibilityLiveRegion="polite">
          <Banner hue="amber" icon={<Sparkle size={16} color={HUE.amber.ink} weight="fill" />} title={warning.title} meta={warning.why} />
        </View>
      )}
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  // Frontline's form card: 16 inside and 16 between its fields.
  fields: { gap: space.card },
})
