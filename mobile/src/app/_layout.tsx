import { Stack, type ErrorBoundaryProps } from "expo-router"
import { useFonts } from "expo-font"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import * as React from "react"
import { View } from "react-native"

import { DarkStatusBar, SomethingWentWrongState } from "@/components/error-state"
import { FaceIdLock } from "@/components/face-id-lock"
import { LaunchScreen } from "@/components/launch-screen"
import { OfflineGate } from "@/components/offline-gate"
import { ToastHost } from "@/components/toast"
import { AuthProvider, useAuth } from "@/lib/auth"
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding"
import { color } from "@/lib/theme"

SplashScreen.preventAutoHideAsync()

/* Inter, the portal's face, in the three weights the app uses. The files
   live in assets/fonts rather than coming from @expo-google-fonts: the web
   build keeps an asset's source path, and the repo's .gitignore drops
   anything under a node_modules folder, so fonts from a package never
   reached the deployed site. */
const FONTS = {
  Inter_400Regular: require("../../assets/fonts/Inter_400Regular.ttf"),
  Inter_500Medium: require("../../assets/fonts/Inter_500Medium.ttf"),
  Inter_600SemiBold: require("../../assets/fonts/Inter_600SemiBold.ttf"),
}

/* Which screens exist depends on the account state:
   signed out            activate, sign-in
   code accepted         set-password, over activate so Back returns to it
   signed in, new        onboarding/: about you, consent, your why, record builds
   signed in             tabs: home (index), results, to do (gaps), plan;
                         the assistant, plans, the record's pages (score,
                         timeline, what's open, a test to book,
                         notifications), care (booking a test with a
                         partner, an appointment), the member's day
                         (today's exercise and one move, the diet plan,
                         logging a meal, one day, progress, history),
                         membership, profile, connect later, and the paid
                         plan's setup
   signed out for idling session-expired
   The error states (+not-found, and the review index under errors/) and
   the review pages under demo/ (the review controls, a sample patient, the
   kit gallery) sit outside every guard, so they open whatever the account
   state.
   A screen whose guard turns false drops out of history, so Back never
   returns to a sign-in form after signing in. Every other screen can go
   back: the swipe and the back button both work, except on the first
   screen of each stage (activation or sign in, Is this you, home, and
   session expired), which has nothing behind it. */
function Routes() {
  const { status, activated, touch } = useAuth()
  const onboarding = useOnboarding()
  const [fontsLoaded] = useFonts(FONTS)
  const ready = fontsLoaded && status !== "loading" && onboarding.loaded
  const onboarded = onboarding.step === "done"
  const [launched, setLaunched] = React.useState(false)
  const endLaunch = React.useCallback(() => setLaunched(true), [])

  // The native splash hands over to the launch screen, which looks the same
  // at first, as soon as its font is in; the launch screen covers the rest.
  React.useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  const launch = !launched && (
    <>
      <DarkStatusBar />
      <LaunchScreen ready={ready} onDone={endLaunch} />
    </>
  )
  if (!ready) return <View style={{ flex: 1 }}>{launch}</View>

  return (
    // Any tap anywhere counts as activity for the idle timeout; the capture
    // handler only looks, so the tap still reaches what was tapped.
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => {
        touch()
        return false
      }}
    >
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.background } }}
        // A screen that throws shows the crash state; the stack stays up, so
        // Go back still works.
        unstable_screenErrorBoundary={ScreenErrorBoundary}
      >
        <Stack.Protected guard={status === "signedOut" || status === "mustSetPassword"}>
          {/* The first screen listed is where a signed-out patient lands: a new
              install starts at activation, a returning patient at sign in. */}
          {activated ? <Stack.Screen name="sign-in" /> : <Stack.Screen name="activate" />}
          {activated ? <Stack.Screen name="activate" /> : <Stack.Screen name="sign-in" />}
        </Stack.Protected>
        <Stack.Protected guard={status === "mustSetPassword"}>
          <Stack.Screen name="set-password" />
        </Stack.Protected>
        <Stack.Protected guard={status === "signedIn" && !onboarded}>
          {/* Opens on the step the patient left off on. */}
          <Stack.Screen name="onboarding/index" />
          <Stack.Screen name="onboarding/about-you" />
          <Stack.Screen name="onboarding/consent" />
          <Stack.Screen name="onboarding/consent-texts" />
          <Stack.Screen name="onboarding/why" />
          <Stack.Screen name="onboarding/syncing" />
        </Stack.Protected>
        <Stack.Protected guard={status === "signedIn" && onboarded}>
          {/* The four tabs swap in place; the assistant rises over them. */}
          <Stack.Screen name="index" options={{ animation: "none" }} />
          <Stack.Screen name="results" options={{ animation: "none" }} />
          <Stack.Screen name="plan" options={{ animation: "none" }} />
          <Stack.Screen name="gaps" options={{ animation: "none" }} />
          <Stack.Screen name="assistant" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="plans" />
          {/* The record, opened from home and Results. */}
          <Stack.Screen name="biomarker/[id]" />
          <Stack.Screen name="record/[kind]" />
          <Stack.Screen name="record/item" />
          <Stack.Screen name="record/add" />
          <Stack.Screen name="medications" />
          <Stack.Screen name="tell-us" />
          <Stack.Screen name="task/[id]" />
          <Stack.Screen name="order/[id]" />
          <Stack.Screen name="book/[id]" />
          <Stack.Screen name="visit/[id]" />
          <Stack.Screen name="score" />
          <Stack.Screen name="timeline" />
          <Stack.Screen name="notifications" />
          {/* The member's day, opened from the member home's doors and
              cards: today's exercise and each move, the diet plan, logging
              a meal, one day, progress since the start, and history. */}
          <Stack.Screen name="exercise/index" />
          <Stack.Screen name="exercise/[id]" />
          <Stack.Screen name="diet" />
          <Stack.Screen name="log-meal" />
          <Stack.Screen name="day/[date]" />
          <Stack.Screen name="progress" />
          <Stack.Screen name="history" />
          {/* The member's own billing page: pause, resume and cancel. */}
          <Stack.Screen name="membership" />
          <Stack.Screen name="profile" />
          {/* Under Profile: the sharing permission and every connection. */}
          <Stack.Screen name="access" />
          {/* Connecting later, after "Not now" at setup. */}
          <Stack.Screen name="connect" />
          <Stack.Screen name="connect-texts" />
          <Stack.Screen name="building" />
          {/* The paid plan's setup, straight after subscribing. */}
          <Stack.Screen name="optimize/questionnaire" />
          <Stack.Screen name="optimize/medicines" />
          <Stack.Screen name="optimize/devices" />
          <Stack.Screen name="optimize/tests" />
          <Stack.Screen name="optimize/tour" />
        </Stack.Protected>
        <Stack.Protected guard={status === "expired"}>
          <Stack.Screen name="session-expired" options={{ gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
      {/* One toast at a time ("Lunch saved") over every screen and sheet,
          under the Face ID lock and the launch screen. */}
      <ToastHost />
      <FaceIdLock ready={launched} />
      {launch}
    </View>
  )
}

function ScreenErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <SomethingWentWrongState onRetry={retry} />
}

/** The last resort, for an error outside any screen (the layout itself):
    there is no navigator left, so the only way on is to try again. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <SomethingWentWrongState onRetry={retry} canLeave={false} />
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        {/* Light icons: the sign-in screens open on the teal band. */}
        <StatusBar style="light" />
        <OfflineGate>
          <Routes />
        </OfflineGate>
      </OnboardingProvider>
    </AuthProvider>
  )
}
