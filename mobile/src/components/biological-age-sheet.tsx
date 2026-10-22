import { ScrollView, StyleSheet, Text, View } from "react-native"

import { BiologicalAgeCard, useBiologicalAge } from "@/components/biological-age-card"
import { BiomarkerTrend } from "@/components/charts"
import { ArrowDownRight, ArrowUpRight } from "@/components/ph"
import { Sheet } from "@/components/sheet"
import { Button } from "@/components/ui"
import { chartSeries } from "@/lib/trends"
import { chart, color, hairline, ink, outOfRangeColor, space, type } from "@/lib/theme"

/* The last thing setup shows before the dashboard opens: her biological age
   and the few results driving it, as a sheet that slides up over the page
   (the client's reference). The same Sheet as every other bottom sheet; the
   hero is the teal card, then how it has moved over time (21 Oct 2026
   call), then the drivers, her own results. The biological age
   is a sample until the model exists (lib/biological-age.ts). */

export function BiologicalAgeSheet({ onStart, onClose }: { onStart: () => void; onClose: () => void }) {
  const { list, trend } = useBiologicalAge()
  // A sample has no source to name in the readout.
  const series = chartSeries(trend)
  const over = { ...series, readings: series.readings.map((r) => ({ ...r, source: undefined })) }

  return (
    <Sheet title="Your biological age" onClose={onClose} dismissOnScrim={false} tall>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BiologicalAgeCard trend={false} />

        {trend.count > 1 && (
          <>
            <Text style={styles.label}>Over time</Text>
            <View style={styles.chart}>
              <BiomarkerTrend {...over}spoken={trend.spoken} playKey="biological-age:over-time" />
            </View>
          </>
        )}

        {list.length > 0 && (
          <>
            <Text style={styles.label}>What is driving it</Text>
            <View style={styles.list}>
              {list.map((t) => {
                const tone = t.status === "out" ? outOfRangeColor() : chart.borderline
                const Arrow = t.side === "below" ? ArrowDownRight : ArrowUpRight
                return (
                  <View key={t.id} style={styles.row} accessible accessibilityLabel={`${t.marker.name}. ${t.spoken}`}>
                    <View style={styles.rowIcon}>
                      <Arrow size={14} color={tone} weight="bold" />
                    </View>
                    <View style={styles.rowBody}>
                      <View style={styles.rowHead}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {t.marker.name}
                        </Text>
                        <Text style={[styles.rowValue, { color: tone }]}>{t.valueWithUnit}</Text>
                      </View>
                      <Text style={styles.rowNote}>{t.takeaway}</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </>
        )}
      </ScrollView>
      <Button onPress={onStart}>See optimization plan</Button>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1, flexGrow: 1 },
  content: { gap: space.item },

  label: { ...type.sectionLabel, marginTop: space.inline },
  chart: { padding: space.card, borderRadius: 8, borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.background },
  list: { gap: space.inline },
  row: { flexDirection: "row", gap: space.lead, padding: space.card, borderRadius: 8, borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.background },
  rowIcon: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: color.errorTint },
  rowBody: { flex: 1, gap: 2 },
  rowHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.inline },
  rowName: { ...type.title, flexShrink: 1 },
  rowValue: { ...type.value },
  rowNote: { ...type.label, color: ink.secondary },
})
