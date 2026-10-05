import * as React from "react"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native"

import { chatGroups, type ChatGroup } from "@/components/chat-history"
import { PrimaryButton } from "@/components/hol"
import { Plus } from "@/components/ph"
import { Group, NeedsRow } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { TextField } from "@/components/ui"
import type { ChatCategory, PastChat } from "@/lib/onboarding"
import { color, space, type } from "@/lib/theme"

/* The first step of every chat opened from the nav bar (call, 5 Oct
   2026): she picks one of her categories, or makes a new one, and the
   chat in it starts at once. Past chats, filed by category, are in the
   history drawer (components/chat-history.tsx). General
   health questions take anything ad hoc ("Which hospital is best for
   thyroid cancer?"). */

const NAME_MAX = 40

const chatsWord = (n: number) => (n ? `${n} ${n === 1 ? "chat" : "chats"}` : "No chats yet")

export function CategoryPicker({
  chats,
  categories,
  planLive,
  onStart,
  onCreate,
}: {
  /** Past chats, filed under their categories. */
  chats: PastChat[]
  /** The categories she made. */
  categories?: ChatCategory[]
  /** "Your plan" shows for a live plan, or once it holds chats. */
  planLive: boolean
  /** A new chat in a category, started as soon as it is picked. */
  onStart: (group: ChatGroup) => void
  /** A new category, named: it is kept and returned, then a chat starts in it. */
  onCreate: (name: string) => ChatGroup
}) {
  const [adding, setAdding] = React.useState(false)
  const sorted = React.useMemo(
    () => [...chats].sort((a, b) => Date.parse(b.lastAt ?? b.startedAt) - Date.parse(a.lastAt ?? a.startedAt)),
    [chats]
  )
  const inGroup = (topic: string) => sorted.filter((c) => c.topic === topic)
  const groups = chatGroups(categories).filter((g) => g.topic !== "plan" || planLive || inGroup("plan").length > 0)

  /** A name she already has starts a chat in that category instead. */
  const create = (name: string) => {
    setAdding(false)
    const same = groups.find((g) => g.name.toLowerCase() === name.toLowerCase())
    onStart(same ?? onCreate(name))
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} accessibilityRole="header">
          Choose a category
        </Text>
        <Group>
          {groups.map((g) => (
            <NeedsRow key={g.topic} icon={<g.Icon size={16} color={color.primary} />} title={g.name} meta={chatsWord(inGroup(g.topic).length)} onPress={() => onStart(g)} />
          ))}
          <NeedsRow icon={<Plus size={16} color={color.primary} />} title="New category" onPress={() => setAdding(true)} />
        </Group>
      </ScrollView>
      {adding && <NewCategory onClose={() => setAdding(false)} onCreate={create} />}
    </>
  )
}

/** Names a new category in a sheet, over the keyboard. */
function NewCategory({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
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
  body: { width: "100%", maxWidth: 420 + space.gutter * 2, alignSelf: "center", paddingHorizontal: space.gutter, paddingTop: space.gutter, paddingBottom: space.section, gap: space.item },
  title: { ...type.hero },
})
