import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { Block, Card, Group, KeyValue, Tag } from "@/components/record-kit"
import { color, ink, space, type } from "@/lib/theme"
import { AT_HOME, PROJECTIONS } from "@/lib/v14"

/* Ask Inlay's predictive answer (Journey_14 screen 51): the question every
   patient asks around month three, answered from her own pace with a
   likelihood on each window. Every figure is framed as an estimate from
   patients like her who kept going, never as a promise. */

export default function V14Ask() {
  return (
    <FlowScreen page title="Ask Inlay">
      <View style={styles.asked}>
        <Text style={styles.askedText}>If I stay the course, where will I be in 30, 60 and 120 days, and in a year?</Text>
      </View>

      <Card style={styles.answer}>
        <Text style={type.body}>
          Here is where your current pace points, if you keep to the plan as you have so far. These are estimates, drawn from your twelve weeks and from people with a similar start who stayed on track.
        </Text>
      </Card>

      <Block title="Your projected results" meta={`From ${AT_HOME.now.weight} lb today`}>
        <View style={styles.grid}>
          {PROJECTIONS.map((p) => (
            <Card key={p.label} style={styles.cell} accessibilityLabel={`${p.label}: ${p.range ?? p.weight} pounds, waist ${p.waist} inches, body fat ${p.fat}. About ${p.likely}% likely.`}>
              <Text style={type.label}>{p.label}</Text>
              <Text style={type.hero}>
                {p.range ?? p.weight}
                <Text style={type.unitLarge}> lb</Text>
              </Text>
              <Text style={type.meta}>{`${p.waist} in waist`}</Text>
              <Text style={type.meta}>{`Body fat ${p.fat}`}</Text>
              <Tag tone={p.likely >= 80 ? "ok" : "primary"}>{`About ${p.likely}% likely`}</Tag>
            </Card>
          ))}
        </View>
      </Block>

      <Block title="Weight, actual then projected">
        <Group>
          <KeyValue label="Jul 1, start" value="178 lb" />
          <KeyValue label="Today" value={`${AT_HOME.now.weight} lb`} />
          {PROJECTIONS.map((p, i) => (
            <KeyValue key={p.label} label={`In ${p.label}`} value={`${p.range ?? p.weight} lb`} tag={{ tone: "muted", label: "Projected" }} last={i === PROJECTIONS.length - 1} />
          ))}
        </Group>
      </Block>

      <Text style={type.meta}>Projections are personal to you and move with your numbers and how closely you follow the plan. They are not medical advice. Dr. Patel sees the same figures.</Text>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  asked: { alignSelf: "flex-end", maxWidth: "85%", backgroundColor: color.primary, borderRadius: 16, borderBottomRightRadius: 4, paddingVertical: space.inline, paddingHorizontal: space.card },
  askedText: { ...type.body, color: ink.onColor },
  answer: { gap: space.stack },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  cell: { flexBasis: "47%", flexGrow: 1, gap: space.stack, alignItems: "flex-start" },
})
