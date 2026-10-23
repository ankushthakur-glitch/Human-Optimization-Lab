import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { Camera, Lock } from "@/components/ph"
import { Block, Card, Tabs, toast } from "@/components/record-kit"
import { PlanNote } from "@/components/v14-kit"
import { color, ink, space, type } from "@/lib/theme"
import { CHECK_INS } from "@/lib/v14"

/* Photo check in (Journey_14 screen 49): front and side on three dates,
   with weight and waist under each frame, so the change the scale is slow
   to show can be seen. The dummy has no photos, so each frame is a soft
   placeholder; the real app takes them with the camera. The privacy line
   comes first, before anyone is asked to undress for a phone. */

type View_ = "front" | "side"

export default function V14Photos() {
  const [side, setSide] = React.useState<View_>("front")
  return (
    <FlowScreen
      page
      title="Photo check in"
      description="Last taken Oct 5"
      footer={<PrimaryButton onPress={() => toast("Camera opens here in the real app")}>Take check in photos</PrimaryButton>}
    >
      <View style={styles.private}>
        <Lock size={14} color={ink.secondary} />
        <Text style={type.label}>Only you and Dr. Patel see these</Text>
      </View>

      <Tabs
        options={[
          { value: "front", label: "Front" },
          { value: "side", label: "Side" },
        ]}
        value={side}
        onChange={setSide}
      />

      <Block title={side === "front" ? "Front view" : "Side view"} meta="Start to today">
        <View style={styles.frames}>
          {CHECK_INS.map((c) => (
            <Card key={c.label} style={styles.frame} accessibilityLabel={`${c.label}, ${c.date}. ${c.weight} pounds, ${c.waist} inch waist.`}>
              <Text style={type.title}>{c.label}</Text>
              <Text style={type.meta}>{c.date}</Text>
              <View style={styles.photo}>
                <Camera size={22} color={color.primaryLine} />
              </View>
              <Text style={type.value}>{`${c.weight} lb`}</Text>
              <Text style={type.meta}>{`${c.waist} in waist`}</Text>
            </Card>
          ))}
        </View>
      </Block>

      <PlanNote>Your waist is down 2.5 inches since July. Both views show it, even in the weeks the scale barely moved.</PlanNote>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  private: { flexDirection: "row", alignItems: "center", gap: space.mark },
  frames: { flexDirection: "row", gap: space.inline },
  frame: { flex: 1, alignItems: "center", gap: space.line, paddingHorizontal: space.inline },
  photo: { alignSelf: "stretch", aspectRatio: 3 / 4, borderRadius: 8, backgroundColor: color.primaryTint, alignItems: "center", justifyContent: "center", marginVertical: space.inline },
})
