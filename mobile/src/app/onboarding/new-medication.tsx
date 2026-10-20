import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { FlowScreen, Section } from "@/components/flow"
import { Pill, Warning } from "@/components/ph"
import { Group, HUE, NeedsRow, Tile } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { MEDICATIONS, ORIGIN_LABEL, medDifference, type Medication, type Origin } from "@/lib/record"
import { space } from "@/lib/theme"

/* The record tour's second step: the medicines the providers' lists
   brought into her record, in the Upcoming appointments layout: a white
   card per source (her doctor, Scripps Memorial), a row per medicine with
   its name and dose, and an amber mark on the right where the lists
   disagree, for her doctor to settle (a thing to look at, not a
   diagnosis). Next: the results trending the wrong way. */

const NEXT = "/onboarding/trends" as const

const differs = (m: Medication) => medDifference(m) === "Doses differ"

export default function NewMedicationScreen() {
  const groups = React.useMemo(() => {
    const out: { origin: Origin; meds: Medication[] }[] = []
    for (const m of MEDICATIONS.filter((x) => x.kind === "medicine" && !x.resolved)) {
      const origin = m.lists[0].origin
      const g = out.find((x) => x.origin === origin) ?? (out.push({ origin, meds: [] }), out.at(-1)!)
      g.meds.push(m)
    }
    return out
  }, [])

  return (
    <FlowScreen hol title="New medication" description="Medicines from your providers' lists, by where they came from." footer={<Button onPress={() => router.push(NEXT)}>Continue</Button>}>
      <View style={styles.groups}>
        {groups.map((g) => (
          <Section key={g.origin} title={`From ${g.origin === "doctor" ? "your doctor" : ORIGIN_LABEL[g.origin]}`}>
            <Group>
              {g.meds.map((m) => (
                <NeedsRow
                  key={m.id}
                  icon={<Pill size={16} color={HUE.teal.ink} />}
                  title={m.name}
                  meta={differs(m) ? `${m.lists[0].dose} · Doses differ` : m.lists[0].dose}
                  right={
                    differs(m) ? (
                      <Tile hue="amber" size={32}>
                        <Warning size={16} color={HUE.amber.ink} />
                      </Tile>
                    ) : undefined
                  }
                  chevron={false}
                />
              ))}
            </Group>
          </Section>
        ))}
      </View>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  groups: { gap: space.section },
})
