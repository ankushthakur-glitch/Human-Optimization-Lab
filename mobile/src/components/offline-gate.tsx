import { Asset } from "expo-asset"
import * as Network from "expo-network"
import * as React from "react"
import { Platform, StyleSheet, View, type ImageSourcePropType } from "react-native"

import { ART, OfflineState } from "@/components/error-state"

const isOffline = (state: Network.NetworkState) => state.isConnected === false || state.isInternetReachable === false

/* Stands in for the network round trip, so Try again visibly checks. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 600))

/** The web build loads its images from the server, which it can't reach
    once offline, so the art is fetched up front and held as a blob. On a
    phone it ships inside the app. */
function useOfflineArt() {
  const [source, setSource] = React.useState<ImageSourcePropType>(ART.offline)
  React.useEffect(() => {
    if (Platform.OS !== "web") return
    let url: string | undefined
    fetch(Asset.fromModule(ART.offline).uri)
      .then((response) => response.blob())
      .then((blob) => {
        url = URL.createObjectURL(blob)
        setSource({ uri: url })
      })
      .catch(() => {})
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [])
  return source
}

/** Covers the app with the offline state the moment the device loses its
    connection, and lifts when it's back. The screen underneath stays
    mounted, so a half filled form is still there afterwards. */
export function OfflineGate({ children }: { children: React.ReactNode }) {
  const live = Network.useNetworkState()
  const [state, setState] = React.useState(live)
  const [retrying, setRetrying] = React.useState(false)
  const art = useOfflineArt()
  React.useEffect(() => setState(live), [live])

  async function retry() {
    setRetrying(true)
    const [latest] = await Promise.all([Network.getNetworkStateAsync(), settle()])
    setState(latest)
    setRetrying(false)
  }

  const offline = isOffline(state)
  return (
    <View style={styles.fill}>
      <View
        style={styles.fill}
        importantForAccessibility={offline ? "no-hide-descendants" : "auto"}
        accessibilityElementsHidden={offline}
      >
        {children}
      </View>
      {offline && (
        <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
          <OfflineState onRetry={retry} retrying={retrying} illustration={art} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({ fill: { flex: 1 } })
