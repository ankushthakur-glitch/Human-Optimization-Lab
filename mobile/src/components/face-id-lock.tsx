import * as React from "react"
import { AppState, StyleSheet, Text, View } from "react-native"

import { DarkStatusBar } from "@/components/error-state"
import { PageFooter, PageGround } from "@/components/hol"
import { ScanSmiley } from "@/components/ph"
import { Button, useTopInset } from "@/components/ui"
import { useAuth } from "@/lib/auth"
import { checkFaceId } from "@/lib/face-id"
import { useOnboarding } from "@/lib/onboarding"
import { color, font, ink, space } from "@/lib/theme"

/** Face ID on the buttons, Phosphor as the Figma draws it. */
const FaceIdIcon = ({ color }: { color: string }) => <ScanSmiley size={20} color={color} />

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
    <View style={[StyleSheet.absoluteFill, styles.screen]} accessibilityViewIsModal>
      <DarkStatusBar />
      <View style={[styles.statusBar, { height: top }]} />
      <View style={styles.body}>
        <PageGround />
        <View style={styles.mark}>
          <ScanSmiley size={36} color={color.primary} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Unlock Inlay Health
        </Text>
      </View>
      <PageFooter>
        <Button icon={FaceIdIcon} onPress={unlock} pending={checking}>
          Unlock with Face ID
        </Button>
        <Button variant="outline" onPress={signOut}>
          Sign in with password
        </Button>
      </PageFooter>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: color.background },
  statusBar: { backgroundColor: color.background },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.section, paddingHorizontal: space.gutter },
  // The Figma's teal tinted tile, grown to hold the one mark on the page.
  mark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: color.primaryEdge,
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: font.medium, fontSize: 18, lineHeight: 26, color: ink.content, textAlign: "center" },
})
