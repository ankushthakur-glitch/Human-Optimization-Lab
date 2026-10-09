import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { StatusBanner } from "@/components/home-header"
import { Plus } from "@/components/ph"
import { MedicineConfirm, MedicineSheet } from "@/components/medicines"
import { ChipRow, Group, Heading, ResultRow } from "@/components/record-kit"
import { KindList, RECORD_TITLES, sinceLine } from "@/components/record-lists"
import { AddToRecordSheet, openItem } from "@/components/record-rows"
import { TabScreen } from "@/components/tab-bar"
import { useExperience, useMarkers } from "@/lib/experience"
import { useOnboarding } from "@/lib/onboarding"
import { addKindOf } from "@/lib/add-record"
import { BODY_SYSTEMS, type Medication } from "@/lib/record"
import { color, space, type } from "@/lib/theme"
import { homeBanner } from "@/lib/todo"
import { classify, type Status } from "@/lib/trends"

/* The Record tab (from the client's reference image, 6 Oct 2026): one
   list of every result, every part of the record one tap away.

   1. The header names the tab and holds "+ Add to your record" (a photo of
      a record, or something she tells us).
   2. Category pills: each one swaps the section below in place
      (Biomarkers, Medicines, Conditions, Visits, Allergies, Tests and
      orders, Immunizations, Procedures, and Added by you once she has
      added something).
   3. "Biomarkers and results", body system chips to narrow
      it (All first), and every result as a row (record-kit ResultRow):
      out of range first, then borderline, then in range. A member's row
      says how far it has moved since she started.

   With sharing turned off, the same banner as every tab, over what was
   collected before. Opening the tab reads any new results. */

type Category = "biomarkers" | "medicines" | "conditions" | "visits" | "allergies" | "tests" | "immunizations" | "procedures" | "added"

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "biomarkers", label: "Biomarkers" },
  { value: "medicines", label: "Medicines" },
  { value: "conditions", label: "Conditions" },
  { value: "visits", label: "Visits" },
  { value: "allergies", label: "Allergies" },
  { value: "tests", label: "Tests and orders" },
  { value: "immunizations", label: "Immunizations" },
  { value: "procedures", label: "Procedures" },
]

/** The chips' short names for the record's body systems. */
const SYSTEM_LABEL: Record<string, string> = {
  "Blood pressure and weight": "Heart and weight",
  "Vitamins and minerals": "Vitamins",
}

const STATUS_ORDER: Record<Status, number> = { out: 0, borderline: 1, in: 2 }

export function RecordTab() {
  const onboarding = useOnboarding()
  const info = useExperience()
  const [adding, setAdding] = React.useState(false)
  const [category, setCategory] = React.useState<Category>("biomarkers")
  const [medicine, setMedicine] = React.useState<Medication | null>(null)

  // Opening the record reads any new results: the home's "New results are
  // in" goes.
  const { save, batches } = onboarding
  React.useEffect(() => {
    if (!batches?.some((b) => !b.opened)) return
    save({ batches: batches.map((b) => ({ ...b, opened: true })) }).catch(() => {})
  }, [batches, save])

  // A member with a plan reads each result against where she started.
  const member = info.experience === "member" || info.experience === "paused"
  // The add sheet opens on the part of the record she is looking at.
  const addKind = category === "medicines" ? "medicines" : category === "biomarkers" ? undefined : addKindOf(category)?.kind
  return (
    <TabScreen
      tab="results"
      title="Record"
      headerRight={<AddAction onPress={() => setAdding(true)} />}
      overlay={
        adding ? (
          <AddToRecordSheet kind={addKind} onClose={() => setAdding(false)} />
        ) : medicine ? (
          <MedicineSheet
            m={medicine}
            onClose={() => setMedicine(null)}
            onUpdate={() => {
              setMedicine(null)
              router.push("/medications")
            }}
          />
        ) : undefined
      }
    >
      <RecordBanner />
      <Categories value={category} onChange={setCategory} />
      {category === "biomarkers" ? (
        <Results member={member} />
      ) : category === "medicines" ? (
        <View style={styles.results}>
          <Heading title="Medicines" variant="title" onSeeAll={() => router.push("/medications")} />
          <MedicineConfirm view="list" onOpen={setMedicine} />
        </View>
      ) : (
        <View style={styles.results}>
          <Heading title={RECORD_TITLES[category]} variant="title" />
          <KindList kind={category} onOpen={openItem} onAdd={() => setAdding(true)} />
        </View>
      )}
    </TabScreen>
  )
}

/** The header's "+ Add to your record": the Plus 18 in Primary/07 and the
    words 14 medium in Primary/08, 8 apart. */
function AddAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
      <Plus size={18} color={color.primaryText} />
      <Text style={styles.addText}>Add to your record</Text>
    </Pressable>
  )
}

/** The banner every tab shares when sharing is off or ending, or a place
    had nothing; the others belong to Home. */
function RecordBanner() {
  const onboarding = useOnboarding()
  const banner = homeBanner(onboarding)
  const kinds = ["sharing-off", "sharing-ended", "sharing-ends", "not-found"]
  if (!banner || !kinds.includes(banner.kind)) return null
  return <StatusBanner tab="results" />
}

/* ------------------------------------------------------ categories -- */

function Categories({ value, onChange }: { value: Category; onChange: (c: Category) => void }) {
  const onboarding = useOnboarding()
  const added = onboarding.added ?? []
  const options = added.length ? [...CATEGORIES, { value: "added" as const, label: "Added by you" }] : CATEGORIES
  return <ChipRow options={options} value={value} onChange={onChange} label="Part of your record" />
}

/* --------------------------------------------------------- results -- */

function Results({ member }: { member: boolean }) {
  const markers = useMarkers()
  const [system, setSystem] = React.useState("all")
  // Only the body systems the record holds, in the record's order.
  const systems = BODY_SYSTEMS.filter((g) => markers.some((m) => m.group === g))
  const chips = [{ value: "all", label: "All" }, ...systems.map((g) => ({ value: g as string, label: SYSTEM_LABEL[g] ?? g }))]
  const rows = markers
    .filter((m) => system === "all" || m.group === system)
    .map(classify)
    .filter((t) => t.latest)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
  return (
    <View style={styles.results}>
      <Heading title="Biomarkers and results" variant="title" />
      <ChipRow options={chips} value={system} onChange={setSystem} label="Body system" />
      <Group>
        {rows.map((t) => (
          <ResultRow
            key={t.id}
            trend={t}
            since={member ? sinceLine(t.marker) : undefined}
            onPress={() =>
              router.push({
                pathname: "/biomarker/[id]",
                params: { id: t.id },
              })
            }
          />
        ))}
      </Group>
    </View>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  add: { flexDirection: "row", alignItems: "center", gap: space.inline },
  addText: { ...type.link },

  // The heading, its chips and the list, 12 apart.
  results: { gap: space.item },
})
