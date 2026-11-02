import * as React from "react"
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native"

import { OptionRow, TheirBubble, bubbleText, optionTextStyle } from "@/components/chat"
import { chatGroups, type ChatGroup } from "@/components/chat-history"
import { PrimaryButton } from "@/components/hol"
import { Plus } from "@/components/ph"
import { Sheet } from "@/components/sheet"
import { TextField } from "@/components/ui"
import type { ChatCategory, PastChat } from "@/lib/onboarding"
import { color, space } from "@/lib/theme"

/* The first step of every chat opened from the nav bar (call, 5 Oct
   2026): she picks one of her categories, or makes a new one, and the
   chat in it starts at once. Since 2 Nov 2026 (user) the choice is the
   chat's own first turn: Inlay's bubble asks, the categories are its
   option rows, and the composer waits below (a question typed instead
   goes to General health questions). Past chats, filed by category, are
   in the history drawer (components/chat-history.tsx). General health
   questions take anything ad hoc ("Which hospital is best for thyroid
   cancer?"). */

const NAME_MAX = 40

/** The bubble's question. */
export const CHOOSE = (name: string) => `Hi ${name}. What would you like to ask about?`

export function CategoryPicker({
  name,
  chats,
  categories,
  planLive,
  onStart,
  onNew,
}: {
  /** Her name, for the greeting. */
  name: string
  /** Past chats, filed under their categories. */
  chats: PastChat[]
  /** The categories she made. */
  categories?: ChatCategory[]
  /** "Your plan" shows for a live plan, or once it holds chats. */
  planLive: boolean
  /** A new chat in a category, started as soon as it is picked. */
  onStart: (group: ChatGroup) => void
  /** Opens the sheet that names a new category. */
  onNew: () => void
}) {
  const has = (topic: string) => chats.some((c) => c.topic === topic)
  const groups = chatGroups(categories).filter((g) => g.topic !== "plan" || planLive || has("plan"))
  return (
    <TheirBubble named wide>
      <Text style={bubbleText()}>{CHOOSE(name)}</Text>
      <View style={styles.options}>
        {groups.map((g) => (
          <OptionRow key={g.topic} live picked={false} onPress={() => onStart(g)}>
            <View style={styles.option}>
              <g.Icon size={16} color={color.primary} />
              <Text style={optionTextStyle(false)}>{g.name}</Text>
            </View>
          </OptionRow>
        ))}
        <OptionRow live picked={false} onPress={onNew}>
          <View style={styles.option}>
            <Plus size={16} color={color.primary} />
            <Text style={optionTextStyle(false)}>New category</Text>
          </View>
        </OptionRow>
      </View>
    </TheirBubble>
  )
}

/** A category she named, or one she already has under that name. */
export function categoryNamed(name: string, categories: ChatCategory[] | undefined, create: (name: string) => ChatGroup): ChatGroup {
  const same = chatGroups(categories).find((g) => g.name.toLowerCase() === name.toLowerCase())
  return same ?? create(name)
}

/** Names a new category in a sheet, over the keyboard. */
export function NewCategory({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = React.useState("")
  const trimmed = name.replace(/\s+/g, " ").trim()
  const create = () => trimmed && onCreate(trimmed)
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Sheet title="New category" onClose={onClose}>
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Thyroid"
          autoFocus
          maxLength={NAME_MAX}
          autoCapitalize="sentences"
          returnKeyType="done"
          onSubmitEditing={create}
        />
        <PrimaryButton onPress={create} disabled={!trimmed}>
          Create category
        </PrimaryButton>
      </Sheet>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  options: { gap: space.inline, marginTop: space.inline },
  option: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.inline },
})
