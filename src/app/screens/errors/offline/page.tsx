"use client"

import { useRouter } from "next/navigation"

import { OfflineState } from "@/components/error-state"

/** The offline state on its own, for review without pulling the network.
    In the app it is OfflineGate that shows it, over whatever page is open. */
export default function OfflinePreviewScreen() {
  const router = useRouter()
  return <OfflineState onRetry={() => router.back()} />
}
