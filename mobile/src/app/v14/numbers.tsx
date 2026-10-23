import * as React from "react"
import { StyleSheet, Text } from "react-native"

import { FlowScreen } from "@/components/flow"
import { Block, Group, KeyValue, StatRow, StatTile } from "@/components/record-kit"
import { space, type } from "@/lib/theme"

/* Yesterday in numbers (Journey_14 screen 40): the level under the score.
   Energy in, energy out and what that leaves, each against its target,
   then the macros under the calories and the movement against its goals.
   Resting metabolism is her own measured figure, which is what makes the
   deficit a number rather than a guess, so the page says so. */

export default function V14Numbers() {
  return (
    <FlowScreen page title="Yesterday in numbers" description="Mon, Oct 5">
      <Block title="Energy balance" meta="kcal">
        <Group>
          <KeyValue label="Food in" value="1,690 of 1,740" />
          <KeyValue label="Resting metabolism" value="1,310" tag={{ tone: "primary", label: "Measured" }} />
          <KeyValue label="Active energy" value="930" />
          <KeyValue label="Energy out" value="2,240" />
          <KeyValue label="Deficit" value="550 of 500" tag={{ tone: "ok", label: "50 past" }} last />
        </Group>
      </Block>

      <Block title="Macros" meta="Against target">
        <StatRow>
          <StatTile value={142} unit="g" label="Protein" meta="Of 150" />
          <StatTile value={148} unit="g" label="Carbs" meta="Of 160" />
          <StatTile value={61} unit="g" label="Fat" meta="Of 58" />
        </StatRow>
      </Block>

      <Block title="Movement" meta="From your Apple Watch">
        <StatRow>
          <StatTile value={930} unit="kcal" label="Active energy" meta="180 over goal" />
          <StatTile value={11240} label="Steps" meta="2,240 over goal" />
          <StatTile value={55} unit="min" label="Exercise" meta="10 over goal" />
        </StatRow>
      </Block>

      <Text style={[type.meta, styles.note]}>Resting metabolism is the figure from your own RMR test, not an estimate from height and weight. That is what makes the deficit a number rather than a guess.</Text>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  note: { marginTop: space.stack },
})
