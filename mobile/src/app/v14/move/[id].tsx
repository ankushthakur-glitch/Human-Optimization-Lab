import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Line, Rect } from "react-native-svg"

import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { VideoCamera, WarningCircle } from "@/components/ph"
import { Block, Card, EmptyState, Group, NeedsRow, Tag, TextAction } from "@/components/record-kit"
import { color, hairline, ink, space, type } from "@/lib/theme"
import { LIFTS, liftOf } from "@/lib/v14"

/* How to do one lift (v14 dummy, Journey_14 screen 32), opened from Form
   on a lift in today's session. The 22 Oct call settled on drawn stills
   for version 1 and video later, so the three positions lead and the
   video is a quiet row saying it is coming. The page opens mid set without
   losing her place: Back returns to the session as she left it. */

const go = (path: string) => router.push(path as never)

type Joint = [number, number]

/** A side view figure in one of three positions: standing, on the way
    down, and at the bottom. Drawn, not photographed, so every lift on
    every plan can carry one. */
const POSES: { head: Joint; hip: Joint; knee: Joint; foot: Joint; hand: Joint; shoulder: Joint }[] = [
  { head: [40, 14], shoulder: [40, 26], hip: [40, 52], knee: [40, 70], foot: [40, 88], hand: [46, 34] },
  { head: [48, 24], shoulder: [44, 34], hip: [30, 56], knee: [44, 70], foot: [40, 88], hand: [52, 42] },
  { head: [46, 36], shoulder: [42, 46], hip: [26, 68], knee: [48, 70], foot: [40, 88], hand: [52, 52] },
]

function Figure({ pose }: { pose: number }) {
  const p = POSES[pose] ?? POSES[0]
  const limb = { stroke: color.primary, strokeWidth: 5, strokeLinecap: "round" as const }
  return (
    <Svg width={80} height={96} viewBox="0 0 80 96" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Line x1={10} y1={90} x2={70} y2={90} stroke={hairline.outline} strokeWidth={2} />
      <Line x1={p.shoulder[0]} y1={p.shoulder[1]} x2={p.hip[0]} y2={p.hip[1]} {...limb} />
      <Line x1={p.hip[0]} y1={p.hip[1]} x2={p.knee[0]} y2={p.knee[1]} {...limb} />
      <Line x1={p.knee[0]} y1={p.knee[1]} x2={p.foot[0]} y2={p.foot[1]} {...limb} />
      <Line x1={p.shoulder[0]} y1={p.shoulder[1]} x2={p.hand[0]} y2={p.hand[1]} {...limb} />
      <Rect x={p.hand[0] - 4} y={p.hand[1] - 5} width={9} height={10} rx={2} fill={color.amber} />
      <Circle cx={p.head[0]} cy={p.head[1]} r={7} fill={color.primary} />
    </Svg>
  )
}

export default function V14Move() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const lift = liftOf(id ?? "")
  if (!lift)
    return (
      <FlowScreen page title="Exercise">
        <EmptyState title="This lift is not in today's session" line="Go back to your session and tap Form on a lift." />
      </FlowScreen>
    )
  const index = LIFTS.indexOf(lift)
  const next = LIFTS[index + 1]
  const up = lift.last !== undefined && lift.last < lift.load
  return (
    <FlowScreen
      page
      title={lift.name}
      footer={
        <View style={styles.foot}>
          <PrimaryButton onPress={() => (next ? router.replace(`/v14/move/${next.id}` as never) : router.back())}>{next ? `Next lift: ${next.name}` : "Back to your session"}</PrimaryButton>
          {next && (
            <TextAction tone="muted" onPress={() => router.back()}>
              Back to your session
            </TextAction>
          )}
        </View>
      }
    >
      <View style={styles.page}>
        <View style={styles.head}>
          <Tag tone="primary">{`Lift ${index + 1} of ${LIFTS.length}`}</Tag>
          <Text style={type.body}>
            {`${lift.sets} x ${lift.reps} at `}
            <Text style={type.value}>{`${lift.load} lb`}</Text>
            {up ? `, up from ${lift.last} lb last session` : ", same as last session"}
          </Text>
        </View>
        <View style={styles.stills}>
          {lift.stills.map((s, i) => (
            <Card key={s.label} style={styles.still} accessibilityLabel={`${s.label}: ${s.cue}`}>
              <Figure pose={i} />
              <Text style={type.title}>{s.label}</Text>
              <Text style={[type.meta, styles.center]}>{s.cue}</Text>
            </Card>
          ))}
        </View>
        <Group>
          <NeedsRow icon={<VideoCamera size={16} color={ink.tertiary} />} hue="neutral" title="Form video" meta="Coming soon. The drawings show the same three positions." tag={{ tone: "soon", label: "Coming soon" }} chevron={false} />
        </Group>
        <Block title="How to do it" meta="Three cues">
          <Card style={styles.cues}>
            {lift.cues.map((c, i) => (
              <View key={c} style={styles.cue}>
                <View style={styles.num}>
                  <Text style={styles.numText}>{i + 1}</Text>
                </View>
                <Text style={[type.body, styles.grow]}>{c}</Text>
              </View>
            ))}
          </Card>
        </Block>
        <Block title="Common mistakes" meta="Watch for these">
          <Group>
            {lift.mistakes.map((m) => (
              <NeedsRow key={m.what} icon={<WarningCircle size={16} color={color.low} />} hue="amber" title={m.what} meta={m.fix} chevron={false} />
            ))}
          </Group>
        </Block>
        <Text style={type.meta}>Open this between sets whenever you need it. Your session keeps your place.</Text>
        <TextAction onPress={() => go("/assistant?topic=plan")} chevron>
          Ask about this lift
        </TextAction>
      </View>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  page: { gap: space.section },
  head: { gap: space.inline, alignItems: "flex-start" },
  stills: { flexDirection: "row", gap: space.inline },
  still: { flex: 1, alignItems: "center", gap: space.stack, paddingHorizontal: space.stack },
  center: { textAlign: "center" },
  cues: { gap: space.item },
  cue: { flexDirection: "row", gap: space.lead, alignItems: "flex-start" },
  num: { width: 22, height: 22, borderRadius: 11, backgroundColor: color.primarySoft, alignItems: "center", justifyContent: "center", marginTop: 1 },
  numText: { ...type.captionStrong, color: ink.primary },
  grow: { flex: 1 },
  foot: { gap: space.inline, alignItems: "stretch" },
})
