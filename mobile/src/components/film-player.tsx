import { useVideoPlayer, VideoView } from "expo-video"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { color, hairline } from "@/lib/theme"

/* One of the app's short videos (components/film-frames renders them):
   the clip in a rounded frame at its own shape, with the player's own
   controls. Silent, so a browser lets it start without a tap. Used by the
   Home popup (components/welcome-video) and "Are you flourishing?"
   (/flourishing). */

const CLIPS = {
  welcome: require("../../assets/videos/welcome.mp4"),
  flourishing: require("../../assets/videos/flourishing.mp4"),
}

/** Every clip's shape: 1200 by 936. */
const RATIO = 1200 / 936

export function FilmPlayer({ film, label, autoplay = false, onEnd }: { film: keyof typeof CLIPS; label: string; autoplay?: boolean; onEnd?: () => void }) {
  const player = useVideoPlayer(CLIPS[film], (p) => {
    p.muted = true
  })

  // Starts once it is on screen, when the picture has somewhere to draw.
  React.useEffect(() => {
    if (autoplay) player.play()
  }, [player, autoplay])

  const ended = React.useRef(onEnd)
  ended.current = onEnd
  React.useEffect(() => {
    const sub = player.addListener("playToEnd", () => ended.current?.())
    return () => sub.remove()
  }, [player])

  return (
    <View style={styles.video}>
      <VideoView player={player} style={styles.picture} contentFit="contain" nativeControls accessibilityLabel={label} />
    </View>
  )
}

const styles = StyleSheet.create({
  // A light edge, so the pale picture doesn't melt into the page.
  video: { width: "100%", aspectRatio: RATIO, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.primaryTint },
  // On the web the video element keeps its own 1200 px unless told the size.
  picture: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
})
