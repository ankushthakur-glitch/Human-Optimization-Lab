import { router } from "expo-router"

import { OfflineState } from "@/components/error-state"

/** The offline state on its own, for review without pulling the network.
    In the app it is OfflineGate that shows it, over whatever screen is open. */
export default function OfflinePreviewScreen() {
  return <OfflineState onRetry={() => router.back()} />
}
