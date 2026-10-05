import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import * as React from "react"
import { Image, Platform, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from "react-native"

import { PageFooter, PageGround } from "@/components/hol"
import { Button, useTopInset } from "@/components/ui"
import { color, font, ink, space } from "@/lib/theme"

/* The full-screen states, the app's take on the portal's "Error states"
   (src/components/error-state.tsx): the same illustrations in the app's teal
   (scripts/gen-mobile-error-illustrations.mjs), a title and one paragraph on
   the Figma "Hol" page gradient, and the actions stacked full width in the
   white footer bar, in reach of a thumb. Each state is its own export so the
   screen that shows it only says which one. */

export const ART = {
  notFound: require("../../assets/illustrations/errors/not-found.png"),
  offline: require("../../assets/illustrations/errors/offline.png"),
  sessionExpired: require("../../assets/illustrations/errors/session-expired.png"),
  crash: require("../../assets/illustrations/errors/something-went-wrong.png"),
}

export function ErrorState({
  illustration,
  title,
  description,
  children,
}: {
  illustration: ImageSourcePropType
  title: string
  description: string
  /** One or two Buttons, the main one first. */
  children: React.ReactNode
}) {
  const top = useTopInset()
  return (
    <View style={styles.screen}>
      <DarkStatusBar />
      <View style={[styles.statusBar, { height: top }]} />
      <View style={styles.fill}>
        <PageGround />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.body}>
            <View style={styles.art}>
              <Image source={illustration} style={styles.artImage} resizeMode="cover" />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
      <PageFooter>{children}</PageFooter>
    </View>
  )
}

/* The app's status bar is light for the teal band; these screens are white.
   On the web build the phone frame draws the status bar, so it is told too. */
let darkScreens = 0
export function DarkStatusBar() {
  React.useEffect(() => {
    if (Platform.OS !== "web") return
    const device = document.getElementById("device")
    darkScreens += 1
    device?.classList.add("status-dark")
    return () => {
      darkScreens -= 1
      if (!darkScreens) device?.classList.remove("status-dark")
    }
  }, [])
  return <StatusBar style="dark" />
}

/** Back where the patient came from, or home when there's nowhere to go back to. */
function goBack() {
  if (router.canGoBack()) router.back()
  else router.replace("/")
}

/* ---------------------------------------------------------------- states -- */

/** Any link or address with no screen behind it. */
export function PageNotFoundState() {
  return (
    <ErrorState
      illustration={ART.notFound}
      title="Oops! Page not found"
      description="The page you’re looking for doesn’t exist, has been moved, or the link may be incorrect."
    >
      <Button onPress={() => router.replace("/")}>Go to home</Button>
      {router.canGoBack() && (
        <Button variant="outline" onPress={() => router.back()}>
          Go back
        </Button>
      )}
    </ErrorState>
  )
}

/** Signed out after a spell with no taps; see IDLE_MS in lib/auth. */
export function SessionExpiredState({ onSignIn }: { onSignIn: () => void }) {
  return (
    <ErrorState
      illustration={ART.sessionExpired}
      title="Session expired"
      description="For your security, you were signed out after 15 minutes of inactivity. Sign in again to continue."
    >
      <Button onPress={onSignIn}>Sign in again</Button>
    </ErrorState>
  )
}

/** Laid over whatever screen is open while the device has no connection. */
export function OfflineState({
  onRetry,
  retrying,
  illustration = ART.offline,
}: {
  onRetry: () => void
  retrying?: boolean
  /** On the web build, a copy fetched while still online; see OfflineGate. */
  illustration?: ImageSourcePropType
}) {
  return (
    <ErrorState
      illustration={illustration}
      title="No internet connection"
      description="You’re offline. Check your Wi-Fi or mobile data, then try again."
    >
      <Button onPress={onRetry} pending={retrying}>
        Try again
      </Button>
    </ErrorState>
  )
}

/** A screen that crashed. `canLeave` is false when the whole app went down
    with it, so there is no navigator left to go back with. */
export function SomethingWentWrongState({ onRetry, canLeave = true }: { onRetry: () => void; canLeave?: boolean }) {
  return (
    <ErrorState
      illustration={ART.crash}
      title="Something went wrong"
      description="This screen ran into a problem and couldn’t load. Try again, or go back and pick up where you left off."
    >
      <Button onPress={onRetry}>Try again</Button>
      {canLeave && (
        <Button variant="outline" onPress={goBack}>
          Go back
        </Button>
      )}
    </ErrorState>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  statusBar: { backgroundColor: color.background },
  fill: { flex: 1 },
  // The copy sits in the middle of the space the footer leaves.
  scroll: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 420 + space.gutter * 2,
    alignSelf: "center",
    paddingHorizontal: space.gutter,
    paddingVertical: space.section,
  },
  body: { flex: 1, justifyContent: "center", gap: space.section },
  // The art is drawn 3:2 or 4:3 with room around it; 3:2 crops only margin.
  art: { width: "100%", aspectRatio: 3 / 2, overflow: "hidden" },
  // Sized outright: on the web an Image left to size itself takes the file's pixels.
  artImage: { width: "100%", height: "100%" },
  copy: { gap: space.inline },
  title: { fontFamily: font.semibold, fontSize: 20, lineHeight: 28, color: ink.content, textAlign: "center" },
  description: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: ink.detail, textAlign: "center" },
})
