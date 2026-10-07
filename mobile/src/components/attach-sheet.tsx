import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import * as React from "react"
import { Platform } from "react-native"

import { toast } from "@/components/record-kit"
import { Camera, FileText, Images } from "@/components/ph"
import { Chevron, Row, Rows } from "@/components/settings-rows"
import { Sheet } from "@/components/sheet"
import { color } from "@/lib/theme"

/* The chat bar's "+": a photo from the library, a new photo, or a file
   (a lab report, a discharge letter). Each comes back as an Attachment the
   bar shows over the field until it is sent. */

export type Attachment = { id: string; kind: "image" | "file"; uri: string; name: string }

/** Up to this many on one message. */
export const MAX_ATTACHMENTS = 4

const id = () => Math.random().toString(36).slice(2, 10)

export function AttachSheet({ room, onAdd, onClose }: { room: number; onAdd: (files: Attachment[]) => void; onClose: () => void }) {
  async function photos() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: room, quality: 0.8 })
    if (r.canceled) return
    onAdd(r.assets.slice(0, room).map((a) => ({ id: id(), kind: "image", uri: a.uri, name: a.fileName ?? "Photo" })))
  }

  async function camera() {
    const allowed = await ImagePicker.requestCameraPermissionsAsync()
    if (!allowed.granted) return toast("Allow the camera in Settings to take a photo")
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
    if (r.canceled) return
    onAdd(r.assets.map((a) => ({ id: id(), kind: "image", uri: a.uri, name: a.fileName ?? "Photo" })))
  }

  async function file() {
    const r = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*", "text/plain"], multiple: true, copyToCacheDirectory: true })
    if (r.canceled) return
    onAdd(
      r.assets.slice(0, room).map((a) => ({
        id: id(),
        kind: a.mimeType?.startsWith("image/") ? "image" : "file",
        uri: a.uri,
        name: a.name,
      }))
    )
  }

  // Close first, then open the system picker over the app.
  const go = (pick: () => Promise<unknown>) => () => {
    onClose()
    pick().catch(() => toast("That couldn't be added"))
  }

  return (
    <Sheet title="Add to chat" onClose={onClose}>
      <Rows>
        <Row icon={<Images size={16} color={color.primary} />} title="Photos" onPress={go(photos)} right={<Chevron />} />
        {/* A browser opens its file chooser for the camera too; one row there. */}
        {Platform.OS !== "web" && <Row icon={<Camera size={16} color={color.primary} />} title="Take a photo" onPress={go(camera)} right={<Chevron />} />}
        <Row icon={<FileText size={16} color={color.primary} />} title="Files" onPress={go(file)} right={<Chevron />} />
      </Rows>
    </Sheet>
  )
}
