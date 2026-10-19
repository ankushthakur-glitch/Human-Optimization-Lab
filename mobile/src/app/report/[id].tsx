import { useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ImageSourcePropType } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { X } from "@/components/ph"
import { Block, Card, KeyValue } from "@/components/record-kit"
import { useReports } from "@/lib/reports"
import { cardRadius, color, ink, space, type } from "@/lib/theme"

/* One imaging report, opened from a scan measure's "Reports" (Dr.
   Blanchard, 12 Oct 2026): where and when it was done and who ordered it,
   what it says in plain words, then its pages and images, one at a time
   with a count. Tapping one opens it full screen, where it pinches to zoom
   (iOS) or zooms with a tap elsewhere. The scans are sample images (see
   lib/reports.ts) until the real reports arrive from the EHR. */
export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const report = useReports().find((r) => r.id === id)
  const [open, setOpen] = React.useState<number>()
  if (!report) return <PageNotFoundState />
  return (
    <FlowScreen page title={report.study}>
      <Card style={styles.facts}>
        <KeyValue label="From" value={report.place} />
        <KeyValue label="Date" value={report.date} />
        <KeyValue label="Ordered by" value={report.orderedBy} last />
      </Card>
      <Block title="In plain words">
        <Card>
          <Text style={styles.impression}>{report.impression}</Text>
        </Card>
      </Block>
      <Block title="Images">
        <Gallery images={report.images} onOpen={setOpen} />
      </Block>
      <FullScreen images={report.images} start={open} onClose={() => setOpen(undefined)} />
    </FlowScreen>
  )
}

/* ---------------------------------------------------------- gallery -- */

/** The report's images, swiped one at a time, "1 of 4" under them. */
function Gallery({ images, onOpen }: { images: ImageSourcePropType[]; onOpen: (i: number) => void }) {
  const [width, setWidth] = React.useState(0)
  const [page, setPage] = React.useState(0)
  return (
    <View style={styles.gallery} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          onScroll={(e) => Platform.OS === "web" && setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          scrollEventThrottle={64}
          style={styles.frames}
        >
          {images.map((src, i) => (
            <Pressable
              key={i}
              onPress={() => onOpen(i)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Image ${i + 1} of ${images.length}. Opens full screen.`}
              style={{ width, height: width }}
            >
              <Image source={src} style={styles.frame} resizeMode="contain" />
            </Pressable>
          ))}
        </ScrollView>
      )}
      <Text style={styles.count}>{`${page + 1} of ${images.length}`}</Text>
    </View>
  )
}

/* ------------------------------------------------------ full screen -- */

/** One image over everything, swiped like the gallery. On iOS it pinches
    to zoom; elsewhere a tap doubles it and the image scrolls. */
function FullScreen({ images, start, onClose }: { images: ImageSourcePropType[]; start?: number; onClose: () => void }) {
  const { width, height } = useWindowDimensions()
  const inset = useSafeAreaInsets()
  const [page, setPage] = React.useState(0)
  const pager = React.useRef<ScrollView>(null)
  React.useEffect(() => {
    if (start === undefined) return
    setPage(start)
    // The pager lays out first, then shows the image she tapped.
    requestAnimationFrame(() => pager.current?.scrollTo({ x: start * width, animated: false }))
  }, [start, width])
  return (
    <Modal visible={start !== undefined} animationType="fade" onRequestClose={onClose} supportedOrientations={["portrait", "landscape"]}>
      <View style={styles.dark}>
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          onScroll={(e) => Platform.OS === "web" && setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          scrollEventThrottle={64}
        >
          {images.map((src, i) => (
            <Zoomable key={i} source={src} width={width} height={height} />
          ))}
        </ScrollView>
        <View style={[styles.bar, { paddingTop: inset.top + space.item }]} pointerEvents="box-none">
          <Text style={styles.barCount}>{`${page + 1} of ${images.length}`}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <X size={20} color={color.background} />
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

function Zoomable({ source, width, height }: { source: ImageSourcePropType; width: number; height: number }) {
  const [big, setBig] = React.useState(false)
  if (Platform.OS === "ios")
    return (
      <ScrollView
        style={{ width, height }}
        contentContainerStyle={styles.center}
        maximumZoomScale={4}
        minimumZoomScale={1}
        centerContent
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <Image source={source} style={{ width, height }} resizeMode="contain" accessibilityLabel="Report image, pinch to zoom" />
      </ScrollView>
    )
  const scale = big ? 2 : 1
  return (
    <ScrollView style={{ width, height }} contentContainerStyle={!big && styles.center}>
      <ScrollView horizontal nestedScrollEnabled contentContainerStyle={!big && styles.center}>
        <Pressable onPress={() => setBig(!big)} accessibilityRole="button" accessibilityLabel={big ? "Zoom out" : "Zoom in"}>
          <Image source={source} style={{ width: width * scale, height: height * scale }} resizeMode="contain" />
        </Pressable>
      </ScrollView>
    </ScrollView>
  )
}

/** The scans' dark ground, the near black of a viewing screen. */
const SCAN_GROUND = "#0E1416"

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  facts: { paddingVertical: 0 },
  impression: { ...type.body, lineHeight: 22, color: ink.content },

  gallery: { gap: space.item },
  frames: { borderRadius: cardRadius, backgroundColor: SCAN_GROUND },
  frame: { width: "100%", height: "100%" },
  count: { ...type.label, textAlign: "center" },

  dark: { flex: 1, backgroundColor: SCAN_GROUND },
  center: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  bar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.gutter },
  barCount: { ...type.label, color: color.background },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255, 255, 255, 0.14)" },
})
