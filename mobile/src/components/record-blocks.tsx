import * as React from "react"
import { Animated, Easing, Image, Platform, View } from "react-native"

import { useReducedMotion } from "@/components/chat"

/* The record building's art: four soft blocks, one per kind of record
   (visits, medicines, labs, and the heart for how you feel). The render is
   cut into layers so the loose heart block can bob above its stack while
   the record fills in, its shadow on the ground easing as it lifts. Layer
   boxes are fractions of the whole render, measured when it was cut. */

const BASE = require("../../assets/images/record-blocks-base.png")
const SHADOW = require("../../assets/images/record-blocks-shadow.png")
const HEART = require("../../assets/images/record-blocks-heart.png")

const ASPECT = 690 / 760
const SHADOW_BOX = { left: 0.4855, top: 0.4658, width: 0.5145, height: 0.075 }
const HEART_BOX = { left: 0.4826, top: 0.0276, width: 0.4812, height: 0.45 }

const HALF_MS = 1100
const native = Platform.OS !== "web"

export function RecordBlocks({ size = 150 }: { size?: number }) {
  const still = useReducedMotion()
  const lift = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    if (still) return
    const ease = Easing.inOut(Easing.sin)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(lift, { toValue: 1, duration: HALF_MS, easing: ease, useNativeDriver: native }),
        Animated.timing(lift, { toValue: 0, duration: HALF_MS, easing: ease, useNativeDriver: native }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [still, lift])

  const height = size / ASPECT
  const box = (b: typeof HEART_BOX) => ({
    position: "absolute" as const,
    left: b.left * size,
    top: b.top * height,
    width: b.width * size,
    height: b.height * height,
  })

  return (
    <View
      style={{ width: size, height }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image source={BASE} style={{ position: "absolute", left: 0, top: 0, width: size, height }} resizeMode="contain" />
      <Animated.Image
        source={SHADOW}
        style={[
          box(SHADOW_BOX),
          {
            opacity: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] }),
            transform: [{ scaleX: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) }],
          },
        ]}
      />
      <Animated.Image
        source={HEART}
        style={[
          box(HEART_BOX),
          {
            transform: [
              { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.06] }) },
              { rotate: lift.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-4deg"] }) },
            ],
          },
        ]}
      />
    </View>
  )
}
