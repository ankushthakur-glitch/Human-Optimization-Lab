import { useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { MedicineDetails, UpdateSheet } from "@/components/medicines"
import { MEDICATIONS } from "@/lib/record"

/* One medicine's details, opened from its list on the Record tab or Your
   medicines, as every record item opens on its own page (user, 9 Oct
   2026). "Update what you take" opens its sheet over the page. */
export default function MedicineScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const m = MEDICATIONS.find((x) => x.id === id)
  const [updating, setUpdating] = React.useState(false)
  if (!m) return <PageNotFoundState />
  return (
    <View style={styles.fill}>
      <FlowScreen page title={m.name}>
        <MedicineDetails m={m} onUpdate={() => setUpdating(true)} />
      </FlowScreen>
      {updating && <UpdateSheet m={m} onClose={() => setUpdating(false)} />}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
