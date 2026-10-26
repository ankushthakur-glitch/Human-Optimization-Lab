import * as React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from "react-native-svg"

import { Tag } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { Button } from "@/components/ui"
import { WAIST_GUIDE } from "@/lib/topics"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* The Measure page's waist guide (variation 2 of ten, picked 26 Oct 2026):
   "How to measure" opens a sheet that shows one step a slide, each with its
   drawing, the instruction and its tips. Swipe, or Back and Next; the last
   slide's button opens today's numbers. The drawings are placeholders until
   real illustrations come. */

/** The page's door to the guide: a small tertiary link, grey words centred
    under the ways, no icon, fill or edge, so it never competes with them. */
export function WaistGuideButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <Text style={styles.linkText}>How to measure</Text>
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
                  <WaistArt step={i} />
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

/* ------------------------------------------------------------ drawings -- */

const T = color.primary
const SKIN = "#F3E3D7"
const LINE = "#C9B4A4"
const INK = "#2B2B2B"
const MUTE = "#9A9AA0"
const label = { fontFamily: font.semibold, fontSize: 9 } as const

const Torso = () => <Path d="M50 8 C 44 38, 40 62, 48 96 L 112 96 C 120 62, 116 38, 110 8 Z" fill={SKIN} stroke={LINE} strokeWidth={1.5} />

/** Each step's drawing on a 160 by 100 board, filling its slide's width. */
function WaistArt({ step }: { step: number }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {ART[step]}
    </Svg>
  )
}

const ART: React.ReactNode[] = [
  // Get ready: standing tall at a mirror, a soft tape beside her.
  <G key="ready">
    <Rect x={96} y={10} width={44} height={84} rx={6} fill="#EEF4F6" stroke="#CFDDE2" strokeWidth={1.5} />
    <Path d="M104 20 l10 -6 M104 32 l22 -14" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
    <Circle cx={56} cy={22} r={10} fill={SKIN} stroke={LINE} strokeWidth={1.5} />
    <Path d="M42 38 Q56 32 70 38 L72 72 L40 72 Z" fill={SKIN} stroke={LINE} strokeWidth={1.5} />
    <Path d="M46 72 v22 M66 72 v22" stroke={LINE} strokeWidth={5} strokeLinecap="round" />
    <Circle cx={22} cy={80} r={11} fill="#fff" stroke={T} strokeWidth={5} />
    <Circle cx={22} cy={80} r={4} fill={T} />
    <Path d="M33 80 h10" stroke={T} strokeWidth={5} strokeLinecap="round" />
  </G>,
  // Find your belly button: the mark, and the belt line below it.
  <G key="navel">
    <Torso />
    <Circle cx={80} cy={58} r={12} fill="none" stroke={T} strokeWidth={1.5} strokeDasharray="3 3" />
    <Circle cx={80} cy={58} r={3} fill={INK} />
    <Path d="M48 78 H112" stroke={MUTE} strokeWidth={1.2} strokeDasharray="3 3" />
    <SvgText x={116} y={81} fill={MUTE} {...label}>
      belt
    </SvgText>
    <Path d="M98 50 l18 -10" stroke={T} strokeWidth={1.2} />
    <SvgText x={118} y={40} fill={T} {...label}>
      here
    </SvgText>
  </G>,
  // Wrap it level: the tape all the way round, level both sides.
  <G key="wrap">
    <Torso />
    <Ellipse cx={80} cy={58} rx={40} ry={8} fill="none" stroke={T} strokeWidth={4} />
    <Circle cx={80} cy={66} r={2.5} fill={INK} />
    <Path d="M10 58 H30 M24 53 l6 5 -6 5 M150 58 H130 M136 53 l-6 5 6 5" stroke={MUTE} strokeWidth={1.5} fill="none" strokeLinecap="round" />
  </G>,
  // Breathe out: side on, the stomach relaxed, the breath going out.
  <G key="breathe">
    <Circle cx={62} cy={20} r={10} fill={SKIN} stroke={LINE} strokeWidth={1.5} />
    <Path d="M56 32 C 50 50, 48 64, 54 96 L 80 96 C 92 76, 94 60, 80 34 Z" fill={SKIN} stroke={LINE} strokeWidth={1.5} />
    <Path d="M90 62 H98" stroke={T} strokeWidth={3} strokeLinecap="round" />
    <Path d="M76 20 q10 -4 20 0 M78 26 q12 -3 26 2 M76 14 q8 -5 16 -3" stroke="#8FB6E8" strokeWidth={2} fill="none" strokeLinecap="round" />
    <SvgText x={104} y={66} fill={T} {...label}>
      relaxed
    </SvgText>
    <SvgText x={108} y={24} fill="#2F5DB3" {...label}>
      out
    </SvgText>
  </G>,
  // Read it: the zero end over the scale, read at 36 and a quarter.
  <G key="read">
    <Rect x={6} y={40} width={148} height={26} rx={3} fill="#FFF8E1" stroke="#E7C76B" strokeWidth={1.5} />
    {Array.from({ length: 25 }, (_, i) => (
      <Path key={i} d={`M${10 + i * 6} 40 v${i % 4 === 0 ? 10 : 5}`} stroke="#8C7A3C" strokeWidth={1} />
    ))}
    <SvgText x={8} y={62} fill="#8C7A3C" {...label}>
      35
    </SvgText>
    <SvgText x={56} y={62} fill="#8C7A3C" {...label}>
      36
    </SvgText>
    <Rect x={64} y={34} width={70} height={38} rx={3} fill={T} opacity={0.9} />
    <SvgText x={72} y={57} fill="#fff" {...label}>
      zero end
    </SvgText>
    <Path d="M64 24 V82" stroke="#B4473F" strokeWidth={1.5} />
    <SvgText x={30} y={20} fill={INK} {...label} fontSize={10}>
      36¼ in
    </SvgText>
  </G>,
  // Inches or centimeters: the two scales, and the sum.
  <G key="units">
    <Rect x={8} y={22} width={144} height={22} rx={3} fill="#fff" stroke="#CFDDE2" strokeWidth={1.5} />
    <Rect x={8} y={56} width={144} height={22} rx={3} fill="#fff" stroke="#CFDDE2" strokeWidth={1.5} />
    {Array.from({ length: 10 }, (_, i) => (
      <Path key={`in${i}`} d={`M${14 + i * 11} 22 v${i % 2 ? 6 : 10}`} stroke={T} strokeWidth={1.2} />
    ))}
    {Array.from({ length: 25 }, (_, i) => (
      <Path key={`cm${i}`} d={`M${14 + i * 4.4} 56 v${i % 5 ? 4 : 9}`} stroke="#2F5DB3" strokeWidth={1} />
    ))}
    <SvgText x={130} y={38} fill={T} {...label}>
      in
    </SvgText>
    <SvgText x={128} y={72} fill="#2F5DB3" {...label}>
      cm
    </SvgText>
    <SvgText x={30} y={95} fill={INK} {...label} fontSize={10}>
      92 cm ÷ 2.54 = 36.2 in
    </SvgText>
  </G>,
  // Same way every time: the morning, once a month.
  <G key="same">
    <Circle cx={40} cy={44} r={14} fill="#FFE08A" />
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4
      return <Path key={i} d={`M${40 + Math.cos(a) * 19} ${44 + Math.sin(a) * 19} L${40 + Math.cos(a) * 25} ${44 + Math.sin(a) * 25}`} stroke="#F2B930" strokeWidth={2.5} strokeLinecap="round" />
    })}
    <SvgText x={23} y={88} fill={INK} {...label}>
      7:00 am
    </SvgText>
    <Rect x={82} y={18} width={62} height={64} rx={8} fill="#fff" stroke="#CFDDE2" strokeWidth={1.5} />
    <Path d="M82 26 a8 8 0 0 1 8 -8 h46 a8 8 0 0 1 8 8 v8 h-62 Z" fill={T} />
    <Path d="M98 56 l8 8 16 -16" stroke={T} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <SvgText x={94} y={30} fill="#fff" {...label} fontSize={8}>
      Monthly
    </SvgText>
  </G>,
]

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  link: { alignSelf: "center", paddingVertical: space.stack },
  linkText: { ...type.metaStrong, fontSize: 13, lineHeight: 18, color: ink.tertiary },
  center: { textAlign: "center" },
  // Each slide keeps a gutter inside its own width, so text never meets the edge.
  slide: { alignItems: "center", gap: space.inline, paddingHorizontal: space.stack },
  art: { width: "100%", aspectRatio: 16 / 10, borderRadius: 16, overflow: "hidden", backgroundColor: color.primaryTint, marginBottom: space.stack, padding: space.inline },
  tips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.mark, paddingTop: space.stack },
  dots: { flexDirection: "row", justifyContent: "center", gap: space.mark, paddingVertical: space.item },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: hairline.outline },
  dotOn: { width: 18, backgroundColor: color.primary },
  pair: { flexDirection: "row", gap: space.inline },
})
