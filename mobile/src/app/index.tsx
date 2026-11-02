import * as React from "react"
import { StyleSheet, View } from "react-native"

import { FreeHome } from "@/components/home-free"
import { OptimizedHome } from "@/components/home-optimized"
import { WelcomeVideo } from "@/components/welcome-video"
import { homeFor, useExperience } from "@/lib/experience"
import { useOnboarding } from "@/lib/onboarding"

/* Home: one of two first screens, chosen by the one selector screens use
   to tell the patients apart (lib/experience.ts, FINAL-SPEC A.3). A member
   with a live plan gets the free home with her plan woven in (12 Oct
   2026): what needs her, yesterday's score and goals, today's plan, then
   her record.
   Everyone else gets the free home (free, building, declined, paused, and
   a cancelled member or one who turned sharing off, both on the free
   record), which also draws the not connected, record arriving and paused
   states. Each home draws its own tab screen and header, so it can pass
   its sheets over the tab bar.
   The first time she reaches Home, the welcome video opens over all of it
   (components/welcome-video), once; closing it shows what was under it. */

export default function HomeScreen() {
  const { experience } = useExperience()
  const onboarding = useOnboarding()
  const [welcome, setWelcome] = React.useState(false)
  React.useEffect(() => {
    if (onboarding.loaded && !onboarding.introSeen) setWelcome(true)
  }, [onboarding.loaded, onboarding.introSeen])

  return (
    <View style={styles.fill}>
      {homeFor(experience) === "member" ? <OptimizedHome /> : <FreeHome />}
      {welcome && (
        <WelcomeVideo
          onClose={() => {
            setWelcome(false)
            void onboarding.save({ introSeen: true })
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({ fill: { flex: 1 } })
