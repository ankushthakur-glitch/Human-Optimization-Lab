import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { Check, MapPin } from "@/components/ph"
import { Block, Card, Chip, Group, KeyValue, Tabs, toast } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { Button } from "@/components/ui"
import { color, hairline, ink, space, type } from "@/lib/theme"
import { DAYS, PATIENT, SITES, TIMES, itemOf } from "@/lib/v14"

/* Deck screen 54, "Order, then straight to a time": paying opens the
   calendar, not a waiting room. The three nearest Quest sites with their
   distance and next opening, then four days and their times, a time
   already gone shown as gone. The physician's order is signed in the
   background and never blocks the booking; the screen says so once.

   Beyond the deck: the button repeats the chosen day and time so the tap
   confirms exactly what she sees, and a short sheet confirms the booking
   with the details before she leaves. */

export default function BookDraw() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const item = itemOf(String(id))
  const [site, setSite] = React.useState(SITES[0].id)
  const [day, setDay] = React.useState("fri")
  const [time, setTime] = React.useState("8:15")
  const [done, setDone] = React.useState(false)
  const d = DAYS.find((x) => x.id === day) ?? DAYS[0]
  const s = SITES.find((x) => x.id === site) ?? SITES[0]
  const when = `${d.weekday} Oct ${d.day}, ${time} am`

  return (
    <>
      <FlowScreen
        page
        title="Book your draw"
        description={`${item?.name ?? "Your test"}, paid. ${item?.visit ?? ""}.`}
        footer={<Button onPress={() => setDone(true)}>{`Confirm ${when}`}</Button>}
      >
        <View style={styles.list}>
          <Block title="Where" meta="Nearest three">
            <Group>
              {SITES.map((x) => {
                const on = x.id === site
                return (
                  <Pressable key={x.id} onPress={() => setSite(x.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={({ pressed }) => [styles.site, pressed && styles.pressed]}>
                    <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
                    <View style={styles.grow}>
                      <Text style={type.title}>{x.name}</Text>
                      <Text style={type.label}>{`${x.address}, ${x.miles} miles`}</Text>
                    </View>
                    <View style={styles.next}>
                      <Text style={type.meta}>Next</Text>
                      <Text style={[type.metaStrong, { color: ink.good }]}>{x.next}</Text>
                    </View>
                  </Pressable>
                )
              })}
            </Group>
          </Block>

          <Block title="When" meta={s.name.split(", ")[1]}>
            <Tabs options={DAYS.map((x) => ({ value: x.id, label: `${x.weekday} ${x.day}` }))} value={day} onChange={setDay} snug />
            <View style={styles.times} accessibilityRole="radiogroup" accessibilityLabel="Time">
              {TIMES.map((t) =>
                t.open ? (
                  <View key={t.time} style={styles.time}>
                    <Chip label={t.time} selected={t.time === time} onPress={() => setTime(t.time)} radio tick={false} />
                  </View>
                ) : (
                  <View key={t.time} style={[styles.time, styles.gone]} accessible accessibilityLabel={`${t.time}, taken`}>
                    <Text style={styles.goneText}>{t.time}</Text>
                  </View>
                ),
              )}
            </View>
          </Block>

          <Card style={styles.check}>
            <Check size={16} color={color.primary} weight="bold" />
            <Text style={[type.body, styles.grow]}>Nothing to bring and nothing to print. Quest has the order before you arrive. Give your name at the desk.</Text>
          </Card>
          <Text style={type.meta}>{`${PATIENT.physician}'s order reached the physician portal when you paid and is signed in the background. Your booking does not wait on it.`}</Text>
        </View>
      </FlowScreen>
      {done && (
        <Sheet title="You're booked" onClose={() => setDone(false)}>
          <View style={styles.sheet}>
            <Group>
              <KeyValue label="Test" value={item?.name ?? "Your test"} />
              <KeyValue label="When" value={when} />
              <KeyValue label="Where" value={`${s.name}, ${s.address}`} last />
            </Group>
            <View style={styles.row}>
              <MapPin size={14} color={ink.tertiary} />
              <Text style={type.meta}>We remind you the day before. You can move it from To do.</Text>
            </View>
            <Button variant="outline" onPress={() => toast("Added to your calendar")}>
              Add to calendar
            </Button>
            <Button
              onPress={() => {
                setDone(false)
                router.replace("/v14/care" as never)
              }}
            >
              Done
            </Button>
          </View>
        </Sheet>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  list: { gap: space.section },
  grow: { flex: 1, minWidth: 0, gap: space.line },
  pressed: { opacity: 0.7 },
  site: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY, paddingHorizontal: space.rowX },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: hairline.outline, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: color.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.primary },
  next: { alignItems: "flex-end" },
  times: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  time: { width: "22%", flexGrow: 1 },
  gone: { height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F7FA" },
  goneText: { ...type.chip, color: ink.tertiary, textDecorationLine: "line-through" },
  check: { flexDirection: "row", gap: space.inline, alignItems: "flex-start" },
  sheet: { gap: space.item, paddingBottom: space.item },
  row: { flexDirection: "row", alignItems: "center", gap: space.stack },
})
