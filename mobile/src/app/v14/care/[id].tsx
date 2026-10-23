import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { AskButton } from "@/components/hol"
import { Check, Info, User } from "@/components/ph"
import { Block, Card, EmptyState, Tag } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { color, ink, space, type } from "@/lib/theme"
import { PATIENT, itemOf } from "@/lib/v14"

/* Deck screen 53, a catalog item: what the test does, what it cannot tell
   you, who writes the order, and one button that orders and pays. The
   limits get the same weight as the benefits, in the calm clay, never
   red, so it informs rather than sells. The price card puts the member
   price, the standard price and how long results take before she
   decides. */

function Line({ text, ok }: { text: string; ok: boolean }) {
  return (
    <View style={styles.line}>
      <View style={[styles.mark, { backgroundColor: ok ? color.primaryTint : color.lowTint }]}>
        {ok ? <Check size={12} color={color.primary} weight="bold" /> : <Info size={12} color={color.low} weight="bold" />}
      </View>
      <Text style={[type.body, styles.grow]}>{text}</Text>
    </View>
  )
}

export default function CareItem() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const item = itemOf(String(id))
  if (!item)
    return (
      <FlowScreen page title="Test">
        <EmptyState title="This test is not in the catalog" line="Go back to Care to browse what can be ordered." />
      </FlowScreen>
    )
  return (
    <FlowScreen
      page
      title={item.name}
      description={`${item.by}. ${item.visit}.`}
      footer={
        <View style={styles.foot}>
          <Button onPress={() => router.push(`/v14/book/${item.id}` as never)}>{`Order and pay $${item.price}`}</Button>
          <AskButton label="Ask about this test" params={{ ask: `What would ${item.name.toLowerCase()} tell me?` }} />
        </View>
      }
    >
      <View style={styles.list}>
        <Card style={styles.price}>
          <View style={styles.priceRow}>
            <View style={styles.grow}>
              <Text style={type.display}>{`$${item.price}`}</Text>
              <Text style={type.label}>{`Member price. Standard $${item.standard}`}</Text>
            </View>
            <Tag tone="primary">{`Results in ${item.results}`}</Tag>
          </View>
          <Text style={type.meta}>{`Drawn at ${item.where.toLowerCase()}. Paid in cash, not billed to insurance.`}</Text>
        </Card>

        <Block title="What it does">
          <Card style={styles.lines}>
            {item.does.map((d) => (
              <Line key={d} text={d} ok />
            ))}
          </Card>
        </Block>

        <Block title="What it cannot tell you">
          <Card style={styles.lines}>
            {item.cannot.map((d) => (
              <Line key={d} text={d} ok={false} />
            ))}
          </Card>
        </Block>

        <Block title="Who does what">
          <Card style={styles.who}>
            <User size={18} color={color.primary} />
            <Text style={[type.body, styles.grow]}>
              <Text style={styles.strong}>{`${PATIENT.physician} writes and holds the order.`}</Text>
              {" Inlay connects you to GRAIL, schedules the draw and brings the result back to your record. Inlay does not practise medicine or bill insurance."}
            </Text>
          </Card>
        </Block>
      </View>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  list: { gap: space.section },
  grow: { flex: 1, minWidth: 0 },
  foot: { gap: space.inline },
  price: { gap: space.inline },
  priceRow: { flexDirection: "row", alignItems: "flex-start", gap: space.item },
  lines: { gap: space.item },
  line: { flexDirection: "row", alignItems: "flex-start", gap: space.inline },
  mark: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 1 },
  who: { flexDirection: "row", gap: space.inline, alignItems: "flex-start" },
  strong: { ...type.title, color: ink.strong },
})
