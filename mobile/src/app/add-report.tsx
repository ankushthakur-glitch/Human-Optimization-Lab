import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Art } from "@/components/art"
import { FlowScreen } from "@/components/flow"
import { IconCamera, IconUpload } from "@/components/icons"
import { RecordIcon } from "@/components/record-icons"
import { Block, Card, Group, LiveDot, Tile, toast } from "@/components/record-kit"
import { ItemRow } from "@/components/record-rows"
import { Button } from "@/components/ui"
import { showDate } from "@/lib/dates"
import { useOnboarding } from "@/lib/onboarding"
import { color, space, type } from "@/lib/theme"

/* A report that never reaches the doctor otherwise (a private clinic's
   body scan, a test she paid for), photographed or uploaded (F-94). It is
   read automatically; she checks what was read, and anything the reading
   is unsure of goes to a person on Inlay's team before it counts. Saved, it
   joins "Added by you" as "Being checked" (F-95). The prototype reads a
   sample scan. Reached from the Record tab's "Add to your record". */

type Stage = "choose" | "reading" | "read"

/** How long the sample takes to read. */
const READ_MS = 2200

const SAMPLE = {
  title: "Body composition scan",
  where: "Coastal Imaging, Del Mar",
  date: "Jul 18, 2026",
  values: [
    { name: "Body fat", value: "34.1%", clear: true },
    { name: "Lean mass", value: "101.2 lb", clear: true },
    { name: "Bone density, T score", value: "-0.6", clear: true },
    { name: "Visceral fat", value: "", clear: false },
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
    toast("Added to your record")
    router.back()
  }

  if (stage === "reading")
    return (
      <FlowScreen page title="Add a report">
        <Card style={styles.reading}>
          <Art name="document" size={96} />
          <View style={styles.readingLine} accessible accessibilityRole="progressbar" accessibilityLabel="Reading your report">
            <LiveDot />
            <Text style={type.section}>Reading your report</Text>
          </View>
        </Card>
      </FlowScreen>
    )

  if (stage === "read")
    return (
      <FlowScreen
        page
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
        <Card style={styles.doc}>
          <Tile size={44}>
            <RecordIcon name="documents" size={20} color={color.primary} />
          </Tile>
          <View style={styles.docBody}>
            <Text style={type.section}>{SAMPLE.title}</Text>
            <Text style={type.label}>{SAMPLE.where}</Text>
            <Text style={type.meta}>{SAMPLE.date}</Text>
          </View>
        </Card>
        <Block title="Values" meta={`${SAMPLE.values.length - unclear} of ${SAMPLE.values.length} read`}>
          <Group>
            {SAMPLE.values.map((v) =>
              v.clear ? (
                <ItemRow key={v.name} title={v.name} count={v.value} />
              ) : (
                <ItemRow key={v.name} title={v.name} tag={{ tone: "muted", label: "Being checked" }} />
              )
            )}
          </Group>
        </Block>
      </FlowScreen>
    )

  return (
    <FlowScreen page title="Add a report">
      <Group>
        <ItemRow
          icon={
            <Tile>
              <IconCamera size={18} color={color.primary} />
            </Tile>
          }
          title="Take a photo"
          onPress={() => setStage("reading")}
        />
        <ItemRow
          icon={
            <Tile>
              <IconUpload size={18} color={color.primary} />
            </Tile>
          }
          title="Choose a file"
          onPress={() => setStage("reading")}
        />
      </Group>
      <Block title="Good to add">
        <Group>
          <ItemRow title="Scans from a private clinic" meta="Body composition, DEXA, heart scans" />
          <ItemRow title="Tests you paid for" meta="Home kits, longevity panels" />
          <ItemRow title="Results from another country" meta="In any language" />
        </Group>
      </Block>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  // 24 above and below (Frontline's largest step), as the kit's empty state.
  reading: { alignItems: "center", gap: space.card, paddingVertical: 24, paddingHorizontal: space.card },
  readingLine: { flexDirection: "row", alignItems: "center", gap: space.mark },
  doc: { flexDirection: "row", alignItems: "center", gap: space.lead, padding: space.card },
  // A 16 pt title over its lines: 4 apart (Frontline).
  docBody: { flex: 1, gap: space.stack },
})
