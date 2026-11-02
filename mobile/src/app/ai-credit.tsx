import { Redirect, router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { CARDS, CardSheet, withCard } from "@/components/card-sheet"
import { ChoiceRow } from "@/components/care-orders-rows"
import { keepTogether } from "@/components/care-gap"
import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { PaidPopup } from "@/components/paid-popup"
import { Block, Card, Group, KeyValue, SmallAction, toast } from "@/components/record-kit"
import { TOP_UPS, topUpShare, useAllowance } from "@/lib/allowance"
import { useOnboarding } from "@/lib/onboarding"
import { paymentReceipt, type Receipt } from "@/lib/receipt"
import { space, type } from "@/lib/theme"

/* Add AI credit (29 Oct call, 30 Oct 2026): a member whose week of Ask
   Inlay is used adds dollars of credit, as Anthropic sells it, never "10
   more questions". Opened from the limit card in Ask Inlay ("Add more
   credit"), which sends her waiting question once she is back, and from
   her membership page. The packs Inlay offers (TOP_UPS, the admin's AI credit top ups), the
   card with Change, and one button. Credit she adds stays until she uses
   it; her plan, trends and analysis run on their own credit and never
   stop. The free record has no top up, so the page sends her to the
   plan. */

export default function AiCreditScreen() {
  const onboarding = useOnboarding()
  const credit = useAllowance()
  const m = onboarding.membership
  const [dollars, setDollars] = React.useState<number>(TOP_UPS[0])
  const [picking, setPicking] = React.useState(false)
  const [paid, setPaid] = React.useState<Receipt>()

  if (!paid && !credit.member) return <Redirect href="/plan" />

  const card = m?.card ?? CARDS[0]

  async function pay() {
    if (!m) return
    const receipt = paymentReceipt(`$${dollars} of AI credit`, dollars, card)
    credit.topUp(dollars)
    await onboarding.save({ membership: { ...m, card, creditBuys: [...(m.creditBuys ?? []), { at: new Date().toISOString(), dollars, card }] } })
    setPaid(receipt)
  }

  async function chooseCard(c: string) {
    setPicking(false)
    if (!m || c === m.card) return
    await onboarding.save({ membership: withCard(m, c) })
    toast("Card updated")
  }

  return (
    <View style={styles.fill}>
      <FlowScreen page title="Add AI credit" footer={<PrimaryButton onPress={pay}>{`Add $${dollars} of credit`}</PrimaryButton>}>
        <Block title="Add credit">
          <View accessibilityRole="radiogroup" accessibilityLabel="Add credit">
            <Group>
              {TOP_UPS.map((d) => (
                <ChoiceRow key={d} title={`$${d} of AI credit`} meta={`About ${topUpShare(d)}% of a week`} selected={d === dollars} onPress={() => setDollars(d)} />
              ))}
            </Group>
          </View>
        </Block>

        <Block title="Paid with">
          <Card style={styles.rows}>
            <KeyValue label="Card" value={keepTogether(card)} action={<SmallAction onPress={() => setPicking(true)}>Change</SmallAction>} last />
          </Card>
        </Block>

        <Text style={styles.note}>
          {keepTogether("Credit you add stays until you use it. Your plan, trends and reminders never use it.")}
        </Text>
      </FlowScreen>

      {picking && <CardSheet current={m?.card} onUse={chooseCard} onClose={() => setPicking(false)} />}
      {paid && <PaidPopup receipt={paid} lead="Your AI credit has been added." onContinue={() => router.back()} />}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // The rows' own room above and below makes up the card's padding.
  rows: { paddingVertical: space.card - space.rowY },
  note: { ...type.meta },
})
