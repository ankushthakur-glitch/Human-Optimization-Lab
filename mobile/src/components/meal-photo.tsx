import * as ImagePicker from "expo-image-picker"
import * as React from "react"

import { Alert, Image, Linking, Platform, StyleSheet, View } from "react-native"

import { Camera, Images } from "@/components/ph"
import { toast } from "@/components/record-kit"
import { Row, Rows } from "@/components/settings-rows"
import { Sheet, useKeyboardHeight } from "@/components/sheet"
import { Button, TextField } from "@/components/ui"
import { color, space } from "@/lib/theme"

/* Log a meal's photo: "Take a photo" asks where it comes from, the camera or
   her library (14 Oct 2026). Either way one photo comes back as a uri for the
   preview; leaving the camera or the library without one changes nothing. Both
   rows show everywhere: a phone's browser opens its camera for the first, a
   desktop browser its file chooser. */

export type PhotoSource = "camera" | "library"

/** The camera needs her say-so; the library's own picker does not. Resolves
    to undefined when she cancels or the camera is not allowed. */
export async function pickMealPhoto(source: PhotoSource): Promise<string | undefined> {
  if (source === "camera") {
    // Ask only when the system still lets us; once she has said no for good,
    // point her to Settings instead of a prompt that will never show.
    let allowed = await ImagePicker.getCameraPermissionsAsync()
    if (!allowed.granted && allowed.canAskAgain) allowed = await ImagePicker.requestCameraPermissionsAsync()
    if (!allowed.granted) {
      if (Platform.OS === "web") toast("Allow the camera in your browser to take a photo")
      else
        Alert.alert("Camera is off", "Allow the camera in Settings to take a photo of your meal.", [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ])
      return undefined
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
    return r.canceled ? undefined : r.assets[0]?.uri
  }
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: false, quality: 0.8 })
  return r.canceled ? undefined : r.assets[0]?.uri
}

/** The photo she chose, in a small sheet over Log a meal: the picture with a
    round icon beside it to retake it (a camera shot) or replace it (one from
    her library), an optional description, and Continue. The sheet rides above
    the keyboard while she types. */
export function PhotoPreviewSheet({
  uri,
  source,
  onRetake,
  onDone,
  onClose,
}: {
  uri: string
  source: PhotoSource
  onRetake: () => void
  onDone: (note: string) => void
  onClose: () => void
}) {
  const [note, setNote] = React.useState("")
  const keyboard = useKeyboardHeight()
  const label = source === "camera" ? "Retake" : "Choose Another Image"
  return (
    <View style={[styles.frame, { bottom: keyboard }]} pointerEvents="box-none">
      <Sheet title="Your meal photo" onClose={onClose}>
        <Image source={{ uri }} style={styles.photo} resizeMode="cover" accessibilityLabel="Your meal photo" />
        <TextField label="Description (optional)" value={note} onChangeText={setNote} multiline returnKeyType="done" submitBehavior="blurAndSubmit" />
        <View style={styles.actions}>
          <Button variant="outline" onPress={onRetake}>
            {label}
          </Button>
          <Button onPress={() => onDone(note.trim())}>Continue</Button>
        </View>
      </Sheet>
    </View>
  )
}

export function PhotoSheet({ onPick, onClose }: { onPick: (source: PhotoSource) => void; onClose: () => void }) {
  return (
    <Sheet title="Add a photo of your meal" onClose={onClose}>
      <Rows>
        <Row icon={<Camera size={16} color={color.primary} />} title="Take Photo" onPress={() => onPick("camera")} />
        <Row icon={<Images size={16} color={color.primary} />} title="Upload Picture" onPress={() => onPick("library")} />
      </Rows>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  frame: { position: "absolute", top: 0, left: 0, right: 0 },
  photo: { width: "100%", height: 140, borderRadius: 8, backgroundColor: "#F2F2F7" },
  // The secondary action sits right above Continue, a tighter gap than the sheet's.
  actions: { gap: space.item },
})
