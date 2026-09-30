import { StyleSheet, Text, View } from "react-native"
import Svg, { Path } from "react-native-svg"

import { DOMAINS, flourishScore } from "@/lib/conversation"
import { color, font } from "@/lib/theme"

/* The Human Flourishing Index as a gauge: the overall score on a half dial,
   then each domain as a bar. The first reading of what becomes the Inlay
   score. */

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
      <Text style={styles.title}>Human Flourishing Index</Text>
      <View
        style={styles.dial}
        accessibilityRole="image"
        accessibilityLabel={`Flourishing ${overall.toFixed(1)} out of 5`}
      >
        <Svg width={W} height={H}>
          <Path d={arc(1)} stroke={color.canvas} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
          <Path d={arc(overall / 5)} stroke={color.primary} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
        </Svg>
        <View style={styles.score}>
          <Text style={styles.scoreValue}>{overall.toFixed(1)}</Text>
          <Text style={styles.scoreOf}>out of 5</Text>
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
              <View style={[styles.bar, { width: `${Math.max(2, domains[i] * 20)}%` }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 16,
    gap: 14,
    marginVertical: 4,
    backgroundColor: color.background,
    boxShadow: "0 1px 3px rgba(16, 24, 40, 0.08), 0 10px 28px rgba(16, 24, 40, 0.10)",
  },
  title: { fontFamily: font.semibold, fontSize: 16, color: color.text },
  dial: { alignItems: "center" },
  score: { position: "absolute", bottom: 0, alignItems: "center" },
  scoreValue: { fontFamily: font.semibold, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: color.text },
  scoreOf: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  domains: { gap: 12 },
  domain: { gap: 6 },
  domainHead: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  domainName: { flex: 1, fontFamily: font.regular, fontSize: 14, color: color.text },
  domainValue: { fontFamily: font.semibold, fontSize: 14, color: color.text },
  track: { height: 6, borderRadius: 3, backgroundColor: color.canvas, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 3, backgroundColor: color.primary },
})
