import { StyleSheet, Text, View } from "react-native"
import Svg, { Path } from "react-native-svg"

import { DOMAINS, flourishScore } from "@/lib/conversation"
import { card, chart, color, font, ink, space, type } from "@/lib/theme"

/* The Human Flourishing Index as a gauge: the overall score on a half dial,
   then each domain as a bar, on the Figma "Hol" card. The first reading of
   what becomes the Inlay score. */

const R = 80
const STROKE = 14
const W = R * 2 + STROKE
const H = R + STROKE

/** A half circle arc from the left end, `fraction` of the way round. */
function arc(fraction: number) {
  const f = Math.max(0.001, Math.min(1, fraction))
  const angle = Math.PI * (1 - f)
  const cx = W / 2
  const cy = R + STROKE / 2
  const x = cx + R * Math.cos(angle)
  const y = cy - R * Math.sin(angle)
  return `M ${STROKE / 2} ${cy} A ${R} ${R} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`
}

export function FlourishCard({ answers }: { answers: number[] }) {
  const { overall, domains } = flourishScore(answers)
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your Flourishing Profile</Text>
      <View
        style={styles.dial}
        accessibilityRole="image"
        accessibilityLabel={`Flourishing ${overall.toFixed(1)} out of 10`}
      >
        <Svg width={W} height={H}>
          <Path d={arc(1)} stroke={chart.track} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
          <Path d={arc(overall / 10)} stroke={color.primary} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
        </Svg>
        <View style={styles.score}>
          <Text style={styles.scoreValue}>{overall.toFixed(1)}</Text>
          <Text style={styles.scoreOf}>out of 10</Text>
        </View>
      </View>
      <View style={styles.domains}>
        {DOMAINS.map((name, i) => (
          <View key={name} style={styles.domain}>
            <View style={styles.domainHead}>
              <Text style={styles.domainName}>{name}</Text>
              <Text style={styles.domainValue}>{domains[i].toFixed(1)}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${Math.max(2, domains[i] * 10)}%` }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // The Figma "Hol" card: white at 60%, radius 8, 12 inside, the softest lift.
  card: {
    borderRadius: 8,
    padding: space.card,
    gap: space.item,
    marginVertical: space.stack,
    backgroundColor: card.fill,
    boxShadow: card.shadow,
  },
  title: { ...type.section, color: ink.content },
  dial: { alignItems: "center" },
  score: { position: "absolute", bottom: 0, alignItems: "center" },
  scoreValue: { ...type.display, color: ink.content },
  scoreOf: { ...type.label },
  domains: { gap: space.item },
  domain: { gap: space.mark },
  domainHead: { flexDirection: "row", justifyContent: "space-between", gap: space.item },
  domainName: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink.detail },
  domainValue: { ...type.value, color: ink.content },
  track: { height: 6, borderRadius: 3, backgroundColor: chart.track, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 3, backgroundColor: color.primary },
})
