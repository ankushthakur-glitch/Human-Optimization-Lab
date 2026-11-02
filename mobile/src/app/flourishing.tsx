import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text } from "react-native"

import { FilmPlayer } from "@/components/film-player"
import { PlanStepPage } from "@/components/plan-steps"
import { Card, Steps, type Step } from "@/components/record-kit"
import { FLOURISH } from "@/lib/conversation"
import { demoToResult } from "@/lib/flourishing"
import { MEMBER } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { space, type } from "@/lib/theme"

/* "Are you flourishing?" (16 Oct call): the moment before the flourishing
   questions, opened by Confirm on "Tell us about you" (/health-profile).
   Why first, then what. Top to bottom:
   - the video;
   - "How it works", the three steps as the kit's track: watch, answer,
     see your result. Watching to the end ticks the first;
   "Start the questions" opens the questionnaire (/flourishing-questions).
   Demo only: tapping "Flourishing" in the header jumps to the result.
   The questions are needed before the plan starts, so there is no skip;
   the video can be passed, and back still goes back.

   The clip is the flourishing film (components/film-frames, 30 seconds)
   until the real one is made, played with the player's own controls. */

export default function FlourishingScreen() {
  const onboarding = useOnboarding()
  const [watched, setWatched] = React.useState(false)
  const steps: Step[] = [
    { label: "Watch the video", date: "30 seconds", state: watched ? "done" : "now" },
    { label: `Answer ${FLOURISH.length} questions`, date: "One at a time, about 5 minutes", state: watched ? "now" : "next" },
    { label: "See your flourishing result", date: `Shared with ${MEMBER.doctorShort}`, state: "next" },
  ]
  return (
    <PlanStepPage
      headerTitle="Flourishing"
      onTitlePress={() => void demoToResult(onboarding)}
      title="Are you flourishing?"
      lead="A short video, then a few questions about your life."
      onNext={() => router.push("/flourishing-questions")}
      nextLabel="Start the questions"
      nextWide
    >
      <FilmPlayer film="flourishing" label="Are you flourishing? A 30 second video" onEnd={() => setWatched(true)} />

      <Card style={styles.card}>
        <Text style={type.section} accessibilityRole="header">
          How it works
        </Text>
        <Steps steps={steps} />
      </Card>

    </PlanStepPage>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.item, marginTop: space.item },
})
