import * as React from "react"
import { AppState, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { DarkStatusBar } from "@/components/error-state"
import { IconFaceId } from "@/components/icons"
import { Button, useTopInset } from "@/components/ui"
import { useAuth } from "@/lib/auth"
import { checkFaceId } from "@/lib/face-id"
import { useOnboarding } from "@/lib/onboarding"
import { color, font, gutter } from "@/lib/theme"

/** Covers the app when it opens, or comes back from the background, while
    the patient has Face ID turned on in their profile. It asks for their
    face straight away; signing in with the password instead is always there.
    `ready` holds the first prompt back until the launch screen has gone. */
export function FaceIdLock({ ready }: { ready: boolean }) {
  const { status, signOut } = useAuth()
  const { faceId } = useOnboarding()
  const on = status === "signedIn" && !!faceId
  // Locked from the start when it's on, so the record never shows unlocked.
  const [locked, setLocked] = React.useState(on)
  const [checking, setChecking] = React.useState(false)
  const top = useTopInset()
  const { bottom } = useSafeAreaInsets()

  // Turning Face ID on in the profile shouldn't lock the screen it's on.
  React.useEffect(() => {
    if (!on) setLocked(false)
  }, [on])

  React.useEffect(() => {
    if (!on) return
    const subscription = AppState.addEventListener("change", (state) => state === "background" && setLocked(true))
    return () => subscription.remove()
  }, [on])

  const unlock = React.useCallback(async () => {
    setChecking(true)
    const ok = await checkFaceId("Unlock Inlay Health")
    setChecking(false)
    if (ok) setLocked(false)
  }, [])

  const show = on && locked
  React.useEffect(() => {
    if (show && ready) unlock()
  }, [show, ready, unlock])

  if (!show) return null
  return (
    <View style={[StyleSheet.absoluteFill, styles.screen, { paddingTop: top + 24, paddingBottom: Math.max(bottom - 12, 16) + 8 }]} accessibilityViewIsModal>
      <DarkStatusBar />
      <View style={styles.body}>
        <View style={styles.mark}>
          <IconFaceId size={40} color={color.primary} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Unlock Inlay Health
        </Text>
      </View>
      <View style={styles.actions}>
        <Button icon={IconFaceId} onPress={unlock} pending={checking}>
          Unlock with Face ID
        </Button>
        <Button variant="outline" onPress={signOut}>
          Sign in with password
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: color.background, paddingHorizontal: gutter },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  mark: { width: 88, height: 88, borderRadius: 44, backgroundColor: color.primaryTint, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: font.semibold, fontSize: 20, lineHeight: 28, color: color.text, textAlign: "center" },
  actions: { gap: 10 },
})
