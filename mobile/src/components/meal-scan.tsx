import * as React from "react"
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native"

import { useReducedMotion } from "@/components/chat"
import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { Barcode, Flashlight, Keyboard, MagnifyingGlass, Minus, Package, PencilSimple, Plus, Scan, Warning } from "@/components/ph"
import { Block, Card, ChipRow, Group, HUE, NeedsRow, Tabs, Tag } from "@/components/record-kit"
import {
  MANY,
  SCANNED,
  amountIn,
  amountText,
  isBarcode,
  lookupBarcode,
  nutrientsFor,
  portionWords,
  searchProducts,
  servingsOf,
  stepOf,
  unitsOf,
  type Product,
  type Unit,
} from "@/components/scan-food"
import { Sheet, useKeyboardHeight } from "@/components/sheet"
import { TotalsHead, nutrientLine, saveLabel, type LogDay } from "@/components/today-food-meals"
import { Button, TextField } from "@/components/ui"
import { MEAL_SLOTS, totalsOf, type Meal, type MealSlot, type Nutrients, type NutrientId } from "@/lib/member"
import { color, ink, space, type } from "@/lib/theme"
import { formatNumber } from "@/lib/trends"

/* Scan food on Log a meal. Two steps and a fallback:

   1. Scan: the camera looks for a barcode (or she types the number, or
      searches by name). A found product goes straight to step 2.
   2. How much: the product as found, the label's serving as the starting
      amount, a stepper and a unit (serving, g or ml, package), the
      nutrients for that amount, and one button that saves. Nothing is
      saved until she presses it.
   Fallback: a code nobody has says so plainly and offers a search by name
   or typing the label's numbers in. A nutrient left blank stays unknown,
   never zero (M-17).

   The prototype's camera finds the same product after a moment, like the
   voice sheet always hears the same meal; the real build swaps in the
   camera's barcode events at `lookupBarcode`. */

const native = Platform.OS !== "web"

/* ---------------------------------------------------------------- scan -- */

type Mode = "scan" | "manual"
type Sheeted = "code" | "name"

export function ScanStep({
  onFound,
  onBack,
}: {
  /** A product to ask about: found, searched for or typed in. */
  onFound: (product: Product) => void
  onBack: () => void
}) {
  const [mode, setMode] = React.useState<Mode>("scan")
  const [sheet, setSheet] = React.useState<Sheeted>()
  // A code that no one has, once the lookup came back empty.
  const [missing, setMissing] = React.useState<string>()

  async function resolve(code: string) {
    const found = await lookupBarcode(code)
    if (found) onFound(found)
    else {
      setSheet(undefined)
      setMissing(code)
    }
  }

  if (mode === "manual") return <ManualStep onBack={() => setMode("scan")} onDone={onFound} />

  return (
    <View style={styles.fill}>
      <FlowScreen page title="Scan food" onBack={onBack}>
        {missing ? (
          <NotFound code={missing} onAgain={() => setMissing(undefined)} onSearch={() => setSheet("name")} onManual={() => setMode("manual")} />
        ) : (
          <>
            <Viewfinder paused={!!sheet} onFound={() => resolve(SCANNED.barcode)} />
            <Block title="Can't scan it?">
              <Group>
                <NeedsRow icon={<Keyboard size={16} color={HUE.teal.ink} />} title="Enter the barcode number" onPress={() => setSheet("code")} />
                <NeedsRow icon={<MagnifyingGlass size={16} color={HUE.teal.ink} />} title="Search by name" onPress={() => setSheet("name")} />
              </Group>
            </Block>
          </>
        )}
      </FlowScreen>
      {sheet === "code" && <CodeSheet onClose={() => setSheet(undefined)} onDone={resolve} />}
      {sheet === "name" && <SearchSheet onClose={() => setSheet(undefined)} onPick={onFound} onManual={() => (setSheet(undefined), setMode("manual"))} />}
    </View>
  )
}

/** The camera view: a dark frame with corner marks and a line sweeping
    down it, one line of status under it, and a torch for dim kitchens.
    Reduce Motion keeps the line still. The prototype "reads" the barcode
    after 2.2 s. */
function Viewfinder({ paused, onFound }: { paused: boolean; onFound: () => void }) {
  const still = useReducedMotion()
  const sweep = React.useRef(new Animated.Value(0)).current
  const [torch, setTorch] = React.useState(false)
  const [found, setFound] = React.useState(false)

  React.useEffect(() => {
    if (still || paused || found) return
    sweep.setValue(0)
    const loop = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: native }))
    loop.start()
    return () => loop.stop()
  }, [still, paused, found, sweep])

  React.useEffect(() => {
    if (paused || found) return
    const t = setTimeout(() => setFound(true), 2200)
    return () => clearTimeout(t)
  }, [paused, found])

  React.useEffect(() => {
    if (!found) return
    const t = setTimeout(onFound, 600)
    return () => clearTimeout(t)
  }, [found, onFound])

  const y = sweep.interpolate({ inputRange: [0, 1], outputRange: [0, FRAME_H - 4] })
  const status = found ? "Found it. Looking up the product" : "Point the camera at the barcode"
  return (
    <View style={styles.stage}>
      <View style={styles.camera} accessible accessibilityLabel={status} accessibilityLiveRegion="polite">
        <View style={styles.frame}>
          {(["tl", "tr", "bl", "br"] as const).map((c) => (
            <View key={c} style={[styles.corner, CORNER[c], found && styles.cornerFound]} />
          ))}
          <Barcode size={56} color={found ? HUE.green.ink : "rgba(255,255,255,0.5)"} />
          {!found && <Animated.View style={[styles.sweep, still ? styles.sweepStill : { transform: [{ translateY: y }] }]} />}
        </View>
        <Pressable
          onPress={() => setTorch((t) => !t)}
          accessibilityRole="button"
          accessibilityLabel="Torch"
          accessibilityState={{ selected: torch }}
          hitSlop={8}
          style={({ pressed }) => [styles.torch, torch && styles.torchOn, pressed && styles.pressed]}
        >
          <Flashlight size={20} color={torch ? ink.strong : "#FFFFFF"} />
        </Pressable>
      </View>
      <Text style={styles.status}>{status}</Text>
    </View>
  )
}

const FRAME_H = 120
const CORNER = {
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
} as const

/** A code nobody has: say so, show the code, and give three ways on. */
function NotFound({ code, onAgain, onSearch, onManual }: { code: string; onAgain: () => void; onSearch: () => void; onManual: () => void }) {
  return (
    <>
      <Card style={styles.missing}>
        <View style={styles.missingMark}>
          <Warning size={22} color={HUE.amber.ink} />
        </View>
        <Text style={styles.heading} accessibilityRole="header">
          We couldn’t find this product
        </Text>
        <Text style={styles.centred}>{`Barcode ${code} isn’t in our food list yet. You can find it by name or add it from its label.`}</Text>
      </Card>
      <Group>
        <NeedsRow icon={<MagnifyingGlass size={16} color={HUE.teal.ink} />} title="Search by name" onPress={onSearch} />
        <NeedsRow icon={<PencilSimple size={16} color={HUE.teal.ink} />} title="Enter the nutrition details" meta="From the label on the package" onPress={onManual} />
        <NeedsRow icon={<Scan size={16} color={HUE.teal.ink} />} title="Scan again" onPress={onAgain} />
      </Group>
    </>
  )
}

/* -------------------------------------------------------------- sheets -- */

/** Type the number printed under the barcode. */
function CodeSheet({ onDone, onClose }: { onDone: (code: string) => void; onClose: () => void }) {
  const [text, setText] = React.useState("")
  const [touched, setTouched] = React.useState(false)
  const keyboard = useKeyboardHeight()
  const field = React.useRef<TextInput>(null)
  React.useEffect(() => {
    const t = setTimeout(() => field.current?.focus(), 300)
    return () => clearTimeout(t)
  }, [])
  const ok = isBarcode(text)
  const go = () => (ok ? onDone(text) : setTouched(true))
  return (
    <View style={[styles.sheetFrame, { bottom: keyboard }]} pointerEvents="box-none">
      <Sheet title="Enter the barcode number" onClose={onClose}>
        <TextField
          ref={field}
          label="Barcode"
          value={text}
          onChangeText={(t) => setText(t.replace(/\D/g, "").slice(0, 14))}
          keyboardType="number-pad"
          returnKeyType="done"
          placeholder="The digits under the bars"
          error={touched && !ok ? "A barcode has 8 to 14 digits" : undefined}
          onSubmitEditing={go}
        />
        <Button onPress={go} disabled={!text}>
          Look it up
        </Button>
      </Sheet>
    </View>
  )
}

/** Search the food list by name or brand. An empty result offers the
    label form instead of a dead end. */
function SearchSheet({ onPick, onManual, onClose }: { onPick: (p: Product) => void; onManual: () => void; onClose: () => void }) {
  const [text, setText] = React.useState("")
  const keyboard = useKeyboardHeight()
  const field = React.useRef<TextInput>(null)
  React.useEffect(() => {
    const t = setTimeout(() => field.current?.focus(), 300)
    return () => clearTimeout(t)
  }, [])
  const results = searchProducts(text)
  return (
    <View style={[styles.sheetFrame, { bottom: keyboard }]} pointerEvents="box-none">
      <Sheet title="Search by name" onClose={onClose}>
        <TextField ref={field} label="Product or brand" value={text} onChangeText={setText} returnKeyType="search" placeholder="Greek yogurt" icon={SearchIcon} />
        {!!text.trim() && (
          <Group inset>
            {results.slice(0, 4).map((p) => (
              <NeedsRow key={p.barcode} icon={<Package size={16} color={HUE.teal.ink} />} title={p.name} meta={[p.brand, p.serving.words].filter(Boolean).join(", ")} onPress={() => onPick(p)} />
            ))}
            <NeedsRow
              icon={<PencilSimple size={16} color={HUE.teal.ink} />}
              title={results.length ? "Not here? Enter it yourself" : "No match. Enter it yourself"}
              meta="From the label on the package"
              onPress={onManual}
            />
          </Group>
        )}
      </Sheet>
    </View>
  )
}

const SearchIcon = ({ color: c }: { color: string }) => <MagnifyingGlass size={18} color={c} />

/* ------------------------------------------------------------- manual -- */

const LABEL_FIELDS: { id: Exclude<NutrientId, "calories">; label: string; unit: string }[] = [
  { id: "protein", label: "Protein", unit: "g" },
  { id: "fiber", label: "Fiber", unit: "g" },
  { id: "addedSugar", label: "Added sugar", unit: "g" },
  { id: "sodium", label: "Sodium", unit: "mg" },
  { id: "satFat", label: "Saturated fat", unit: "g" },
  { id: "calcium", label: "Calcium", unit: "mg" },
]

/** The label typed in: a name, the serving size and calories are needed;
    the rest is optional and stays unknown when left blank. Everything is
    per serving, as the label prints it. */
function ManualStep({ onBack, onDone }: { onBack: () => void; onDone: (p: Product) => void }) {
  const [name, setName] = React.useState("")
  const [measure, setMeasure] = React.useState<"g" | "ml">("g")
  const [size, setSize] = React.useState("")
  const [values, setValues] = React.useState<Record<string, string>>({})
  const set = (id: string) => (t: string) => setValues((v) => ({ ...v, [id]: amountText(t) }))

  const amount = Number(size)
  const kcal = values.calories ? Number(values.calories) : undefined
  const ready = !!name.trim() && amount > 0 && kcal !== undefined && kcal >= 0
  function done() {
    const nutrients: Nutrients = { calories: kcal }
    for (const f of LABEL_FIELDS) if (values[f.id]) nutrients[f.id] = Number(values[f.id])
    onDone({ barcode: "", name: name.trim(), measure, serving: { amount, words: `${formatNumber(amount)} ${measure}` }, nutrients, custom: true })
  }

  return (
    <FlowScreen
      page
      title="Enter the nutrition details"
      onBack={onBack}
      footer={
        <PrimaryButton onPress={done} disabled={!ready}>
          Continue
        </PrimaryButton>
      }
    >
      <Text style={styles.body}>Copy these from the Nutrition Facts label, for one serving.</Text>
      <View style={styles.form}>
        <TextField label="Product name" required value={name} onChangeText={setName} returnKeyType="next" />
        <ChipRow
          label="The serving is measured in"
          options={[
            { value: "g", label: "Grams" },
            { value: "ml", label: "Millilitres" },
          ]}
          value={measure}
          onChange={setMeasure}
          wrap
        />
        <TextField label="Serving size" required value={size} onChangeText={(t) => setSize(amountText(t))} keyboardType="decimal-pad" trailing={<Text style={styles.unit}>{measure}</Text>} style={styles.input} />
        <TextField label="Calories" required value={values.calories ?? ""} onChangeText={set("calories")} keyboardType="decimal-pad" trailing={<Text style={styles.unit}>kcal</Text>} style={styles.input} />
      </View>
      <Block title="More from the label (optional)">
        <View style={styles.form}>
          {LABEL_FIELDS.map((f) => (
            <TextField key={f.id} label={f.label} value={values[f.id] ?? ""} onChangeText={set(f.id)} keyboardType="decimal-pad" trailing={<Text style={styles.unit}>{f.unit}</Text>} style={styles.input} />
          ))}
        </View>
      </Block>
    </FlowScreen>
  )
}

/* ----------------------------------------------------------- how much -- */

const slotTabs = (slot: MealSlot) => MEAL_SLOTS.filter((m) => m.main || m.id === slot).map((m) => ({ value: m.id, label: m.name }))

const trim = (v: number) => String(Math.round(v * 100) / 100)

/** What a quick chip says, for each unit. */
const QUICK: Record<"serving" | "package", number[]> = { serving: [0.5, 1, 2], package: [0.5, 1] }
const quickLabel = (v: number) => (v === 0.5 ? "½" : String(v))

/** How much of the product: the label's serving to start, a stepper and
    a unit, the nutrients for that amount, and the one button that saves.
    Switching units keeps the same amount, counted the new way. */
export function ProductStep({
  product,
  slot,
  onSlot,
  day,
  ids,
  onBack,
  onSave,
}: {
  product: Product
  slot: MealSlot
  onSlot: (slot: MealSlot) => void
  day: LogDay
  /** The plan's nutrients for the totals line, without calories. */
  ids: NutrientId[]
  onBack: () => void
  onSave: (meal: Omit<Meal, "id" | "time">) => void
}) {
  const [unit, setUnit] = React.useState<Unit>("serving")
  const [text, setText] = React.useState("1")
  const qty = Number(text)
  const valid = Number.isFinite(qty) && qty > 0
  const servings = valid ? servingsOf(product, qty, unit) : 0
  const units = unitsOf(product)

  const change = (next: Unit) => {
    if (next === unit) return
    setText(trim(valid ? amountIn(product, servings, next) || stepOf(next) : 1))
    setUnit(next)
  }
  const bump = (dir: 1 | -1) => {
    const step = stepOf(unit)
    const base = valid ? qty : 0
    setText(trim(Math.max(step, Math.round((base + dir * step) * 100) / 100)))
  }

  const nutrients = valid ? nutrientsFor(product, servings) : {}
  const draft: Omit<Meal, "id" | "time"> = {
    slot,
    how: "scan",
    title: product.name,
    foods: [{ name: product.name, portion: valid ? portionWords(product, qty, unit) : "", confidence: "high", nutrients }],
    status: "confirmed",
  }
  const totals = totalsOf([{ ...draft, id: "draft", time: "" }])
  const many = servings > MANY
  const measure = valid ? `${trim(servings * product.serving.amount)} ${product.measure}` : undefined
  const quick = unit === "serving" || unit === "package" ? QUICK[unit] : undefined

  return (
    <FlowScreen
      page
      title="How much did you have?"
      onBack={onBack}
      footer={
        <PrimaryButton onPress={() => onSave(draft)} disabled={!valid}>
          {saveLabel(slot, day)}
        </PrimaryButton>
      }
    >
      <Tabs snug options={slotTabs(slot)} value={slot} onChange={onSlot} />

      <Card style={styles.product}>
        <View style={styles.productTop}>
          <View style={styles.productTile}>
            <Package size={20} color={HUE.teal.ink} />
          </View>
          <View style={styles.productWords}>
            <Text style={styles.productName}>{product.name}</Text>
            {!!product.brand && <Text style={styles.label}>{product.brand}</Text>}
          </View>
          <Tag tone="muted">{product.custom ? "You entered" : "From the label"}</Tag>
        </View>
        <Text style={styles.label}>{`One serving is ${product.serving.words}${product.perPackage && product.perPackage > 1 ? `, ${product.perPackage} in the package` : ""}`}</Text>
      </Card>

      <Block title="How much?">
        <View style={styles.amount}>
          <View style={styles.stepper}>
            <StepButton label="Less" onPress={() => bump(-1)} disabled={valid && qty <= stepOf(unit)}>
              <Minus size={20} color={ink.strong} />
            </StepButton>
            <View style={styles.entry}>
              <TextInput
                value={text}
                onChangeText={(t) => setText(amountText(t))}
                keyboardType="decimal-pad"
                returnKeyType="done"
                selectTextOnFocus
                accessibilityLabel={`Amount in ${units.find((u) => u.value === unit)?.label.toLowerCase()}`}
                style={styles.entryInput}
              />
            </View>
            <StepButton label="More" onPress={() => bump(1)}>
              <Plus size={20} color={ink.strong} />
            </StepButton>
          </View>
          <ChipRow label="Unit" options={units} value={unit} onChange={change} wrap />
          {quick && (
            <ChipRow
              label="Quick amounts"
              options={quick.map((v) => ({ value: String(v), label: quickLabel(v) }))}
              value={valid && quick.includes(qty) ? String(qty) : undefined}
              onChange={(v) => setText(v)}
              wrap
              tick={false}
            />
          )}
          <Text style={styles.label} accessibilityLiveRegion="polite">
            {valid ? `${unit === "serving" ? "" : `${trim(servings)} ${servings === 1 ? "serving" : "servings"}, `}${measure}` : "Enter an amount"}
          </Text>
          {many && (
            <View style={styles.warn} accessibilityRole="alert">
              <Warning size={16} color={HUE.amber.ink} />
              <Text style={styles.warnText}>{`That’s ${trim(servings)} servings. Check the amount before you save.`}</Text>
            </View>
          )}
        </View>
      </Block>

      <Block title="You’re adding">
        <Card style={styles.totals}>
          <View style={styles.totalsTop}>
            <TotalsHead kcal={valid ? totals.calories : undefined} about={false} />
          </View>
          <Text style={styles.label}>{valid ? nutrientLine(totals, ids.slice(0, 3)) : "Enter an amount to see the nutrients."}</Text>
        </Card>
      </Block>
    </FlowScreen>
  )
}

function StepButton({ label, onPress, disabled, children }: { label: string; onPress: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => [styles.step, disabled && styles.stepOff, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { ...type.body },
  label: { ...type.label },
  centred: { ...type.body, textAlign: "center" },
  heading: { ...type.section, textAlign: "center" },
  pressed: { opacity: 0.7 },
  unit: { ...type.unitLarge, paddingRight: 14 },
  input: { minWidth: 0 },
  form: { gap: space.item },
  sheetFrame: { position: "absolute", top: 0, left: 0, right: 0 },

  // The camera view.
  stage: { gap: space.item },
  camera: { height: 220, borderRadius: 16, backgroundColor: "#101417", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  frame: { width: "72%", height: FRAME_H, alignItems: "center", justifyContent: "center" },
  corner: { position: "absolute", width: 28, height: 28, borderColor: "#FFFFFF" },
  cornerFound: { borderColor: HUE.green.ink },
  sweep: { position: "absolute", top: 0, left: 8, right: 8, height: 2, borderRadius: 1, backgroundColor: color.primaryHalo },
  sweepStill: { top: FRAME_H / 2 },
  torch: { position: "absolute", top: 12, right: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  torchOn: { backgroundColor: "#FFFFFF" },
  status: { ...type.title, textAlign: "center" },

  // A code nobody has.
  missing: { alignItems: "center", gap: space.item },
  missingMark: { width: 44, height: 44, borderRadius: 22, backgroundColor: HUE.amber.tint, alignItems: "center", justifyContent: "center" },

  // How much.
  product: { gap: space.card },
  productTop: { flexDirection: "row", alignItems: "center", gap: space.lead },
  productTile: { width: 40, height: 40, borderRadius: 20, backgroundColor: HUE.teal.tint, alignItems: "center", justifyContent: "center" },
  productWords: { flex: 1, gap: space.line },
  productName: { ...type.title },
  amount: { gap: space.item },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.item },
  step: { width: 52, height: 52, borderRadius: 26, backgroundColor: color.background, borderWidth: 1, borderColor: color.inputBorder, alignItems: "center", justifyContent: "center" },
  stepOff: { opacity: 0.4 },
  entry: { flex: 1, height: 52, borderRadius: 12, backgroundColor: color.background, borderWidth: 1, borderColor: color.inputBorder, justifyContent: "center" },
  entryInput: { ...type.hero, textAlign: "center", paddingVertical: 0, minWidth: 0 },
  warn: { flexDirection: "row", alignItems: "center", gap: space.inline, padding: space.compact, borderRadius: 8, backgroundColor: HUE.amber.tint },
  warnText: { ...type.label, flex: 1, color: HUE.amber.ink },
  totals: { gap: space.stack },
  totalsTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item },
})
