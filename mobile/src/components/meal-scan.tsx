import * as React from "react"
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native"

import { useReducedMotion } from "@/components/chat"
import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { Barcode, Flashlight, MagnifyingGlass, Minus, Package, PencilSimple, Plus, Scan, Warning } from "@/components/ph"
import { Block, Card, ChipRow, Group, HUE, NeedsRow, Tabs, Tag } from "@/components/record-kit"
import {
  MANY,
  SCANNED,
  amountIn,
  amountText,
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
import { saveLabel, slotName, type LogDay } from "@/components/today-food-meals"
import { TextField } from "@/components/ui"
import { MEAL_SLOTS, NUTRIENTS, totalsOf, type Amount, type Meal, type MealSlot, type Nutrients, type NutrientId } from "@/lib/member"
import { cardRadius, color, hairline, ink, space, type } from "@/lib/theme"
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
type Sheeted = "name"

export function ScanStep({
  slot,
  onFound,
  onSave,
  onBack,
}: {
  slot: MealSlot
  /** A product typed in from its label, still to ask how much of. */
  onFound: (product: Product, servings?: number) => void
  /** The scanned item and the amount she entered, saved as the meal. */
  onSave: (meal: Omit<Meal, "id" | "time">) => void | Promise<void>
  onBack: () => void
}) {
  const [mode, setMode] = React.useState<Mode>("scan")
  const [sheet, setSheet] = React.useState<Sheeted>()
  // A code that no one has, once the lookup came back empty.
  const [missing, setMissing] = React.useState<string>()
  // The product the camera (or a search) found, shown in the popup before
  // she goes on to say how much.
  const [product, setProduct] = React.useState<Product>()

  async function resolve(code: string) {
    const found = await lookupBarcode(code)
    if (found) setProduct(found)
    else {
      setSheet(undefined)
      setMissing(code)
    }
  }

  if (mode === "manual") return <ManualStep onBack={() => setMode("scan")} onDone={onFound} />

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Sheet popup title={product ? "Scanned item" : "Scan food"} onClose={onBack}>
        {product ? (
          <ScannedItem product={product} onSave={(servings) => onSave(scanDraft(product, servings, slot))} />
        ) : missing ? (
          <NotFound code={missing} onAgain={() => setMissing(undefined)} onSearch={() => setSheet("name")} onManual={() => setMode("manual")} />
        ) : (
          <Viewfinder paused={!!sheet} onFound={() => resolve(SCANNED.barcode)} />
        )}
      </Sheet>
      {sheet === "name" && <SearchSheet onClose={() => setSheet(undefined)} onPick={(p) => (setSheet(undefined), setProduct(p))} onManual={() => (setSheet(undefined), setMode("manual"))} />}
    </View>
  )
}

/** The camera view: a teal tinted frame with corner marks and a line sweeping
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
          <Barcode size={56} color={found ? HUE.green.ink : color.primaryLine} />
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
          <Flashlight size={20} color={torch ? color.onPrimary : ink.primary} />
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

/** What was found: the product, its label serving and the main nutrients
    for that serving. A nutrient the label leaves out shows a dash. */
const ITEM_ROWS: NutrientId[] = ["calories", "protein", "fiber", "addedSugar", "sodium"]

/** The meal a scanned item makes for an amount in servings. */
function scanDraft(product: Product, servings: number, slot: MealSlot): Omit<Meal, "id" | "time"> {
  return {
    slot,
    how: "scan",
    title: product.name,
    foods: [{ name: product.name, portion: portionWords(product, servings, "serving"), confidence: "high", nutrients: nutrientsFor(product, servings) }],
    status: "confirmed",
  }
}

function ScannedItem({ product, onSave }: { product: Product; onSave: (servings: number) => void | Promise<void> }) {
  const [saving, setSaving] = React.useState(false)
  return (
    <View style={styles.item}>
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
      <Card style={styles.table} accessibilityLabel={`Nutrition for ${servingName(product)}`}>
        <View style={styles.tableHead}>
          <Text style={styles.tableLabel}>Nutrition</Text>
          <Text style={[styles.tableLabel, styles.colPer]} numberOfLines={1}>
            {servingName(product)}
          </Text>
        </View>
        {ITEM_ROWS.map((id) => {
          const v = product.nutrients[id]
          return (
            <View key={id} style={styles.tableRow}>
              <Text style={styles.tableName}>{NUTRIENTS[id].name}</Text>
              <Text style={[styles.tableAdd, styles.colPer]} numberOfLines={1}>
                {v === undefined ? "—" : `${formatNumber(Math.round(v * 10) / 10)}${id === "calories" ? "" : ` ${NUTRIENTS[id].unit}`}`}
              </Text>
            </View>
          )
        })}
      </Card>
      <PrimaryButton
        onPress={async () => {
          setSaving(true)
          try {
            await onSave(1)
          } finally {
            setSaving(false)
          }
        }}
        disabled={saving}
      >
        Save
      </PrimaryButton>
    </View>
  )
}

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

/** The quick chips for each unit: half, one and two servings, or half a
    package and a whole one. Grams and millilitres take half, one and one
    and a half of the label's serving, so a 170 g pot offers 85, 170 and
    255. */
function quickOf(p: Product, unit: Unit): number[] {
  if (unit === "serving") return [0.5, 1, 2]
  if (unit === "package") return [0.5, 1]
  return [0.5, 1, 1.5].map((m) => Math.round(m * p.serving.amount))
}
const quickLabel = (v: number, unit: Unit) => (unit === "g" || unit === "ml" ? `${v} ${unit}` : v === 0.5 ? "½" : String(v))

/** "1 pot" from "1 pot (170 g)": the serving as the label counts it. */
const servingName = (p: Product) => p.serving.words.replace(/\s*\(.*$/, "")

/** The button's words with the calories it adds: "Add 250 kcal to Dinner". */
function addLabel(kcal: number | undefined, slot: MealSlot, day: LogDay) {
  if (kcal === undefined) return saveLabel(slot, day)
  const add = `Add ${formatNumber(Math.round(kcal))} kcal`
  const name = slotName(slot)
  if (day.today) return slot === "snack" ? `${add} as a snack` : `${add} to ${name}`
  const lower = name.toLowerCase()
  if (day.yesterday) return slot === "snack" ? `${add} as yesterday’s snack` : `${add} to yesterday’s ${lower}`
  return slot === "snack" ? `${add} as a snack on ${day.label}` : `${add} to ${lower} on ${day.label}`
}

/** How much of the product: the label's serving to start, a stepper and
    a unit, the nutrients for that amount, and the one button that saves.
    Switching units keeps the same amount, counted the new way. */
export function ProductStep({
  product,
  servings: start = 1,
  slot,
  onSlot,
  day,
  ids,
  onBack,
  onSave,
}: {
  product: Product
  /** The amount already entered in the scan popup, in servings. */
  servings?: number
  slot: MealSlot
  onSlot: (slot: MealSlot) => void
  day: LogDay
  /** The plan's nutrients for the totals line, without calories. */
  ids: NutrientId[]
  onBack: () => void
  onSave: (meal: Omit<Meal, "id" | "time">) => void
}) {
  const [unit, setUnit] = React.useState<Unit>("serving")
  const [text, setText] = React.useState(trim(start))
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
  const quick = quickOf(product, unit)
  const rows: NutrientId[] = ["calories", ...ids.slice(0, 3)]

  return (
    <FlowScreen
      page
      title="How much did you have?"
      onBack={onBack}
      footer={
        <PrimaryButton onPress={() => onSave(draft)} disabled={!valid}>
          {valid ? addLabel(totals.calories?.value, slot, day) : saveLabel(slot, day)}
        </PrimaryButton>
      }
    >
      <Tabs snug options={slotTabs(slot)} value={slot} onChange={onSlot} />

      <Card>
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
      </Card>

      <Block title="How much?">
        <View style={styles.amount}>
          <View style={styles.stepper}>
            <StepButton label="Less" onPress={() => bump(-1)} disabled={valid && qty <= stepOf(unit)}>
              <Minus size={20} color={color.primary} />
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
              <Plus size={20} color={color.primary} />
            </StepButton>
          </View>
          {/* The unit on the left, the quick amounts on the right; they
              share a line when they fit and stack when they do not. */}
          <View style={styles.choices}>
            <ChipRow label="Unit" options={units} value={unit} onChange={change} wrap />
            <ChipRow
              label="Quick amounts"
              options={quick.map((v) => ({ value: String(v), label: quickLabel(v, unit) }))}
              value={valid && quick.includes(qty) ? String(qty) : undefined}
              onChange={(v) => setText(v)}
              wrap
              tick={false}
            />
          </View>
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

      <NutritionTable product={product} rows={rows} totals={valid ? totals : {}} />
    </FlowScreen>
  )
}

/** The label beside what she adds: one serving as printed, then the amount
    she picked. A nutrient the label leaves out shows a dash, never zero. */
function NutritionTable({ product, rows, totals }: { product: Product; rows: NutrientId[]; totals: Partial<Record<NutrientId, Amount>> }) {
  const per = servingName(product)
  const words = (id: NutrientId, v: number | undefined, unit: boolean) =>
    v === undefined ? "—" : `${formatNumber(Math.round(v * 10) / 10)}${unit || id !== "calories" ? ` ${NUTRIENTS[id].unit}` : ""}`
  return (
    <Card style={styles.table} accessibilityLabel="Nutrition, one serving and what you add">
      <View style={styles.tableHead}>
        <Text style={styles.tableLabel}>Nutrition</Text>
        <Text style={[styles.tableLabel, styles.colPer]} numberOfLines={1}>
          {per}
        </Text>
        <Text style={[styles.tableLabel, styles.colAdd, styles.addInk]} numberOfLines={1}>
          You add
        </Text>
      </View>
      {rows.map((id) => (
        <View key={id} style={styles.tableRow}>
          <Text style={styles.tableName}>{NUTRIENTS[id].name}</Text>
          <Text style={[styles.tablePer, styles.colPer]} numberOfLines={1}>
            {words(id, product.nutrients[id], false)}
          </Text>
          <Text style={[styles.tableAdd, styles.colAdd]} numberOfLines={1}>
            {words(id, totals[id]?.value, true)}
          </Text>
        </View>
      ))}
    </Card>
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
  camera: { height: 220, borderRadius: cardRadius, borderWidth: 1, borderColor: color.primaryEdge, backgroundColor: color.primarySoft, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  frame: { width: "72%", height: FRAME_H, alignItems: "center", justifyContent: "center" },
  corner: { position: "absolute", width: 28, height: 28, borderColor: color.primary },
  cornerFound: { borderColor: HUE.green.ink },
  sweep: { position: "absolute", top: 0, left: 8, right: 8, height: 2, borderRadius: 1, backgroundColor: color.primary },
  sweepStill: { top: FRAME_H / 2 },
  torch: { position: "absolute", top: space.item, right: space.item, width: 40, height: 40, borderRadius: 20, backgroundColor: color.background, borderWidth: 1, borderColor: hairline.outline, alignItems: "center", justifyContent: "center" },
  torchOn: { backgroundColor: color.primary, borderColor: color.primary },
  status: { ...type.title, textAlign: "center" },

  item: { gap: space.item },

  // A code nobody has.
  missing: { alignItems: "center", gap: space.item },
  missingMark: { width: 44, height: 44, borderRadius: 22, backgroundColor: HUE.amber.tint, alignItems: "center", justifyContent: "center" },

  // How much.
  productTop: { flexDirection: "row", alignItems: "center", gap: space.lead },
  productTile: { width: 40, height: 40, borderRadius: 20, backgroundColor: HUE.teal.tint, alignItems: "center", justifyContent: "center" },
  productWords: { flex: 1, gap: space.line },
  productName: { ...type.title },
  amount: { gap: space.item },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.item },
  step: { width: 52, height: 52, borderRadius: 26, backgroundColor: color.background, borderWidth: 1, borderColor: color.primaryEdge, alignItems: "center", justifyContent: "center" },
  stepOff: { opacity: 0.4 },
  entry: { flex: 1, height: 52, borderRadius: 12, backgroundColor: color.background, borderWidth: 1, borderColor: color.primaryEdge, justifyContent: "center" },
  entryInput: { ...type.hero, textAlign: "center", paddingVertical: 0, minWidth: 0 },
  warn: { flexDirection: "row", alignItems: "center", gap: space.inline, padding: space.compact, borderRadius: 8, backgroundColor: HUE.amber.tint },
  warnText: { ...type.label, flex: 1, color: HUE.amber.ink },
  choices: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: space.inline },

  // The label table: nutrient, one serving, what she adds.
  table: { paddingVertical: space.stack },
  tableHead: { flexDirection: "row", alignItems: "center", paddingVertical: space.inline },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: space.rowY, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hairline.rule },
  tableLabel: { ...type.metaStrong, flex: 1, minWidth: 0, color: ink.secondary },
  tableName: { ...type.body, flex: 1, minWidth: 0, color: ink.content },
  tablePer: { ...type.label },
  tableAdd: { ...type.value, color: ink.primary },
  addInk: { color: ink.primary },
  // The two number columns keep their width: `flex: 0` let the row squeeze
  // them, so a unit wrapped under its number and the headings overlapped.
  colPer: { flexGrow: 0, flexShrink: 0, flexBasis: 76, textAlign: "right" },
  colAdd: { flexGrow: 0, flexShrink: 0, flexBasis: 88, textAlign: "right" },
})
