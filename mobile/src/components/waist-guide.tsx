import * as React from "react"
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import { Tag } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { Button } from "@/components/ui"
import { WAIST_GUIDE } from "@/lib/topics"
import { color, hairline, ink, space, type } from "@/lib/theme"

/* The Measure page's waist guide (variation 2 of ten, picked 26 Oct 2026):
   "How to measure" opens a sheet that shows one step a slide, each with its
   drawing, the instruction and its tips. Swipe, or Back and Next; the last
   slide's button opens today's numbers. The illustrations are the user's
   own set, added 26 Oct 2026, cropped to the card in assets/images/waist. */

/** The page's door to the guide: a small tertiary link, grey words centred
    under the ways, no icon, fill or edge, so it never competes with them. */
export function WaistGuideButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <Text style={styles.linkText}>How to measure?</Text>
    </Pressable>
  )
}

/** The guide, a step a slide. `onEnter` opens today's numbers. */
export function WaistGuideSheet({ onClose, onEnter }: { onClose: () => void; onEnter: () => void }) {
  const [width, setWidth] = React.useState(0)
  const [at, setAt] = React.useState(0)
  const ref = React.useRef<ScrollView>(null)
  const count = WAIST_GUIDE.length
  const last = at === count - 1
  const go = (i: number) => {
    const to = Math.max(0, Math.min(count - 1, i))
    setAt(to)
    ref.current?.scrollTo({ x: to * width, animated: true })
  }
  const settle = (x: number) => width && setAt(Math.round(x / width))

  return (
    <Sheet title="How to measure your waist" onClose={onClose}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <ScrollView
            ref={ref}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
            onScroll={(e) => settle(e.nativeEvent.contentOffset.x)}
            scrollEventThrottle={64}
          >
            {WAIST_GUIDE.map((g, i) => (
              <View key={g.title} style={[styles.slide, { width }]} accessible accessibilityLabel={`Step ${i + 1} of ${count}. ${g.title}. ${g.says}`}>
                <View style={styles.art}>
                  <Image source={ART[i]} style={styles.img} resizeMode="cover" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
                </View>
                <Text style={type.meta}>
                  Step {i + 1} of {count}
                </Text>
                <Text style={[type.section, styles.center]}>{g.title}</Text>
                <Text style={[type.body, styles.center]}>{g.says}</Text>
                <View style={styles.tips}>
                  {g.tips.map((t) => (
                    <Tag key={t} tone="primary">
                      {t}
                    </Tag>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        <View style={styles.dots}>
          {WAIST_GUIDE.map((g, i) => (
            <Pressable key={g.title} onPress={() => go(i)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Step ${i + 1}`}>
              <View style={[styles.dot, i === at && styles.dotOn]} />
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.pair}>
        {at > 0 && (
          <View style={styles.fill}>
            <Button variant="outline" oneLine onPress={() => go(at - 1)}>
              Back
            </Button>
          </View>
        )}
        <View style={styles.fill}>
          <Button oneLine onPress={() => (last ? (onClose(), onEnter()) : go(at + 1))}>
            {last ? "Enter today's numbers" : "Next"}
          </Button>
        </View>
      </View>
    </Sheet>
  )
}

/* --------------------------------------------------------- illustrations -- */

/** Each step's illustration, in WAIST_GUIDE's order. */
const ART = [
  require("../../assets/images/waist/ready.jpg"),
  require("../../assets/images/waist/navel.jpg"),
  require("../../assets/images/waist/wrap.jpg"),
  require("../../assets/images/waist/breathe.jpg"),
  require("../../assets/images/waist/read.jpg"),
  require("../../assets/images/waist/units.jpg"),
  require("../../assets/images/waist/same.jpg"),
]

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  link: { alignSelf: "center", paddingVertical: space.stack },
  linkText: { ...type.metaStrong, fontSize: 13, lineHeight: 18, color: ink.tertiary },
  center: { textAlign: "center" },
  // Each slide keeps a gutter inside its own width, so text never meets the edge.
  slide: { alignItems: "center", gap: space.inline, paddingHorizontal: space.stack },
  art: { width: "100%", aspectRatio: 10 / 7, borderRadius: 16, overflow: "hidden", backgroundColor: color.primaryTint, marginBottom: space.stack },
  img: { width: "100%", height: "100%" },
  tips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.mark, paddingTop: space.stack },
  dots: { flexDirection: "row", justifyContent: "center", gap: space.mark, paddingVertical: space.item },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: hairline.outline },
  dotOn: { width: 18, backgroundColor: color.primary },
  pair: { flexDirection: "row", gap: space.inline },
})
