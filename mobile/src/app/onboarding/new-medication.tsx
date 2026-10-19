import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text } from "react-native"

import { FlowScreen, Section } from "@/components/flow"
import { Pill } from "@/components/ph"
import { Group, NeedsRow, Status } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { MEDICATIONS, ORIGIN_LABEL, medDifference } from "@/lib/record"
import { color, type } from "@/lib/theme"

/* The second screen of the pair that replaced "Your record works for you":
   New medication. It is its own page, never part of Upcoming appointments,
   and its cards are the medication card, the appointment card's twin. It
   lists the medicines the providers' lists brought into the record that the
   patient's doctor has not settled yet (medDifference), so each one is a
   thing to look at, not a diagnosis. Nothing here is off track, risk,
   biological age, a price or an upgrade. The patient moves on to the
   results that are trending the wrong way. */

const NEXT = "/onboarding/trends" as const

export default function NewMedicationScreen() {
  const fresh = React.useMemo(
    () => MEDICATIONS.filter((m) => m.kind === "medicine" && !!medDifference(m)),
    [],
  )
  const none = fresh.length === 0

  return (
    <FlowScreen
      hol
      back
      title="New medication"
      footer={<Button onPress={() => router.push(NEXT)}>Show me around</Button>}
    >
      {!none && (
        <Section title={`${fresh.length} ${fresh.length === 1 ? "medicine" : "medicines"} new to your record`}>
          <Group>
            {fresh.map((m) => {
              const differs = medDifference(m) === "Doses differ"
              const first = m.lists[0]
              return (
                <NeedsRow
                  key={m.id}
                  icon={<Pill size={16} color={color.primary} />}
                  title={m.name}
                  meta={[first.dose, ORIGIN_LABEL[first.origin]].filter(Boolean).join(", ")}
                  right={
                    differs ? (
                      <Status level="borderline" bare>
                        Records differ
                      </Status>
                    ) : undefined
                  }
                  tag={differs ? undefined : { tone: "primary", label: "New" }}
                  chevron={false}
                />
              )
            })}
          </Group>
        </Section>
      )}

      {none && <Text style={styles.note}>No new medicines turned up in your record.</Text>}
      <Text style={styles.note}>From your own record. General information, not medical advice.</Text>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  note: { ...type.meta, textAlign: "center" },
})
