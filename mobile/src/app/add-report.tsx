import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { Badge, FlowScreen, Section, SoftOrb } from "@/components/flow"
import { IconChevronRight } from "@/components/icons"
import { IconTile, List, ListRow } from "@/components/list"
import { RecordIcon } from "@/components/record-icons"
import { Button } from "@/components/ui"
import { showDate } from "@/lib/dates"
import { useOnboarding } from "@/lib/onboarding"
import { color, font } from "@/lib/theme"

/* A report that never reaches the doctor otherwise (a private clinic's
   body scan, a test the patient paid for), photographed or uploaded. It is
   read automatically; the patient checks what was read, and anything the
   reading is unsure of goes to a person on Inlay's team before it counts.
   The prototype reads a sample scan. */

type Stage = "choose" | "reading" | "read"

const READ_MS = 2200

const SAMPLE = {
  title: "Body composition scan",
  where: "Coastal Imaging, Del Mar",
  date: "Jul 18, 2026",
  values: [
    { name: "Body fat", value: "34.1 %", clear: true },
    { name: "Lean mass", value: "101.2 lb", clear: true },
    { name: "Bone density, T score", value: "-0.6", clear: true },
    { name: "Visceral fat", value: "2.? lb", clear: false },
  ],
}

export default function AddReportScreen() {
  const onboarding = useOnboarding()
  const [stage, setStage] = React.useState<Stage>("choose")

  React.useEffect(() => {
    if (stage !== "reading") return
    const t = setTimeout(() => setStage("read"), READ_MS)
    return () => clearTimeout(t)
  }, [stage])

  const unclear = SAMPLE.values.filter((v) => !v.clear).length

  async function add() {
    await onboarding.save({
      added: [
        ...(onboarding.added ?? []),
        {
          id: `report-${Date.now()}`,
          title: SAMPLE.title,
          detail: `${SAMPLE.values.length - unclear} values read, ${unclear} being checked`,
          at: showDate(),
          unclear,
        },
      ],
    })
    router.back()
  }

  if (stage === "reading") {
    return (
      <FlowScreen title="Reading your report" art={<SoftOrb size={130} orbit />} back={false}>
        <Text style={styles.centred}>Finding the date, the values and their units.</Text>
      </FlowScreen>
    )
  }

  if (stage === "read") {
    return (
      <FlowScreen
        title="Check what we read"
        footer={
          <>
            <Button onPress={add}>Add to my record</Button>
            <Button variant="outline" onPress={() => setStage("choose")}>
              Try another photo
            </Button>
          </>
        }
      >
        <View style={styles.doc}>
          <IconTile>
            <RecordIcon name="documents" size={18} color={color.primary} />
          </IconTile>
          <View style={styles.docBody}>
            <Text style={styles.docTitle}>{SAMPLE.title}</Text>
            <Text style={styles.docMeta}>
              {SAMPLE.where}, {SAMPLE.date}
            </Text>
          </View>
        </View>
        <Section title="Values">
          <List>
            {SAMPLE.values.map((v) => (
              <ListRow
                key={v.name}
                title={v.name}
                note={v.clear ? undefined : { text: "Unclear, a person on our team will check it" }}
                right={v.clear ? <Text style={styles.value}>{v.value}</Text> : <Badge tone="low">Checking</Badge>}
              />
            ))}
          </List>
        </Section>
        <Text style={styles.small}>Your original photo is kept with the values, so anyone can see where they came from.</Text>
      </FlowScreen>
    )
  }

  return (
    <FlowScreen title="Add a report">
      <View style={styles.options}>
        <Option title="Take a photo" meta="Each page, flat and in good light" onPress={() => setStage("reading")} />
        <Option title="Choose a file" meta="A PDF or an image" onPress={() => setStage("reading")} />
      </View>
      <Section title="Good to add">
        <List>
          <ListRow title="Scans from a private clinic" meta="Body composition, DEXA, heart scans" />
          <ListRow title="Tests you paid for" meta="Home kits, longevity panels" />
          <ListRow title="Results from another country" meta="Any language, we'll read it" />
        </List>
      </Section>
    </FlowScreen>
  )
}

function Option({ title, meta, onPress }: { title: string; meta: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
      <IconTile tone="solid" size={44}>
        <RecordIcon name="documents" size={20} color={color.onPrimary} />
      </IconTile>
      <View style={styles.docBody}>
        <Text style={styles.docTitle}>{title}</Text>
        <Text style={styles.docMeta}>{meta}</Text>
      </View>
      <IconChevronRight color={color.muted} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  centred: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.muted, textAlign: "center", marginTop: -12 },
  options: { gap: 10 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.canvas, borderRadius: 20, padding: 14 },
  doc: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.canvas, borderRadius: 18, padding: 14 },
  docBody: { flex: 1, gap: 2 },
  docTitle: { fontFamily: font.semibold, fontSize: 15, color: color.text },
  docMeta: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  value: { fontFamily: font.semibold, fontSize: 15, color: color.text },
  small: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.muted },
})
