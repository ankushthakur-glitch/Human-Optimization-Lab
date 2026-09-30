import { useLocalSearchParams } from "expo-router"

import { RECORD_READY_VARIANTS } from "@/components/record-ready-variants"
import NotFoundScreen from "../+not-found"

/** One take on "Your record is ready", opened from the review index. */
export default function RecordReadyVariantScreen() {
  const { variant } = useLocalSearchParams<{ variant: string }>()
  const found = RECORD_READY_VARIANTS.find((v) => v.id === variant)
  if (!found) return <NotFoundScreen />
  return <found.Screen />
}
