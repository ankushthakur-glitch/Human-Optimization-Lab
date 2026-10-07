import * as React from "react"
import { Image, StyleSheet, View } from "react-native"

/* The upgrade page's banner: the supplied picture is the whole card, words
   included ("A healthier tomorrow, built from your data today."), so it is
   drawn as-is and read aloud as one header. */

const HERO = require("../../assets/images/upgrade-hero.png")

export function UpgradeHero() {
  return (
    <View style={styles.hero} accessible accessibilityRole="header" accessibilityLabel="A healthier tomorrow, built from your data today. Personalized. Proactive. Physician-reviewed.">
      <Image source={HERO} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
    </View>
  )
}

const styles = StyleSheet.create({
  hero: { aspectRatio: 1536 / 1024, borderRadius: 12, overflow: "hidden", backgroundColor: "#2E5F63" },
  image: { width: "100%", height: "100%" },
})
