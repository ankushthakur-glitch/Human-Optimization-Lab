import { useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { MedicineConfirm, MedicineSheet, type MedicineView } from "@/components/medicines"
import { Plus } from "@/components/ph"
import { AddToRecordSheet, AddedOfKind } from "@/components/record-rows"
import type { Medication } from "@/lib/record"
import { color } from "@/lib/theme"

/** Your medicines (FINAL-SPEC C.10): every list in one place, the ones that
    differ with a question each, answered in place and saved at once. Once
    everything is checked, current and past medicines on a segmented
    control, each opening its details in a sheet over the page; "Update
    what you take" there brings the questions back. Opened from Home's
    "Check 2 medicines" and Your medicines, To do and the Record tab; `?id=`
    (a medicine she tapped by name) lands on that medicine. Before anything
    is collected there is nothing to list, and it says when there will be.
    A clinical page: no offer and no object. */
export default function MedicationsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const [view, setView] = React.useState<MedicineView>()
  const [open, setOpen] = React.useState<Medication | null>(null)
  const [adding, setAdding] = React.useState(false)
  const onOpen = React.useCallback((m: Medication) => setOpen(m), [])
  return (
    <View style={styles.fill}>
      <FlowScreen page title="Your medicines" action={{ label: "Add medicine", icon: <Plus size={16} color={color.primary} />, onPress: () => setAdding(true) }}>
        <AddedOfKind kind="medicines" />
        <MedicineConfirm focus={id} view={view} onOpen={onOpen} />
      </FlowScreen>
      {open && (
        <MedicineSheet
          m={open}
          onClose={() => setOpen(null)}
          onUpdate={() => {
            setOpen(null)
            setView("check")
          }}
        />
      )}
      {adding && <AddToRecordSheet kind="medicines" onClose={() => setAdding(false)} />}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
