import { Image, type ImageStyle, type StyleProp } from "react-native"

/* The app's soft 3D objects: one pearl object per image, at most one accent
   in petrol, Inlay teal, mint or sand, floating over a soft shadow on a
   transparent ground. The same family as the consent shield and the record
   folder from onboarding (rendered in one studio, so they read as a set).
   At most one per screen, on a hero, an offer or an empty state, small
   enough to leave the data the focus. */

export const ART = {
  // The record.
  "record-tube": require("../../assets/images/objects/record-tube.png"),
  document: require("../../assets/images/objects/document.png"),
  "chart-block": require("../../assets/images/objects/chart-block.png"),
  magnifier: require("../../assets/images/objects/magnifier.png"),
  calendar: require("../../assets/images/objects/calendar.png"),
  pill: require("../../assets/images/objects/pill.png"),
  droplet: require("../../assets/images/objects/droplet.png"),
  heart: require("../../assets/images/objects/heart.png"),
  bell: require("../../assets/images/objects/bell.png"),
  shield: require("../../assets/images/consent-shield.png"),
  "shield-plus": require("../../assets/images/objects/shield-plus.png"),
  folder: require("../../assets/images/record-folder.png"),
  // The assistant and the plan.
  sparkle: require("../../assets/images/objects/sparkle.png"),
  compass: require("../../assets/images/objects/compass.png"),
  key: require("../../assets/images/objects/key.png"),
  target: require("../../assets/images/objects/target.png"),
  trophy: require("../../assets/images/objects/trophy.png"),
  seedling: require("../../assets/images/objects/seedling.png"),
  flame: require("../../assets/images/objects/flame.png"),
  // A member's day.
  bowl: require("../../assets/images/objects/bowl.png"),
  camera: require("../../assets/images/objects/camera.png"),
  dumbbell: require("../../assets/images/objects/dumbbell.png"),
  watch: require("../../assets/images/objects/watch.png"),
  ring: require("../../assets/images/objects/ring.png"),
  scale: require("../../assets/images/objects/scale.png"),
  moon: require("../../assets/images/objects/moon.png"),
} as const

export type ArtName = keyof typeof ART

/** One object, square, decorative (hidden from screen readers). */
export function Art({ name, size = 96, style }: { name: ArtName; size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={ART[name]}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessible={false}
      accessibilityIgnoresInvertColors
    />
  )
}
