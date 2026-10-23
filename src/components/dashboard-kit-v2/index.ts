/* Dashboard kit, version 2: TailAdmin's dashboard anatomy on the build's
   tokens, with shadcn/ui charts. Built for the provider home and shared by
   the patient dashboards. */

export { Avatar } from "@/components/dashboard-kit-v2/avatar"
export { Badge, type Tone, type Trend } from "@/components/dashboard-kit-v2/badge"
export { Card, CardBody, CardFooter, CardHeader } from "@/components/dashboard-kit-v2/card"
export {
  AXIS_PROPS,
  ChartCard,
  ChartCardSkeleton,
  Grid,
  Legend,
  PALETTE,
  pressableBar,
  useReducedMotion,
} from "@/components/dashboard-kit-v2/charts"
export { DIVIDER, FOCUS, type IconDef, KitIcon } from "@/components/dashboard-kit-v2/icon"
export { MetricCard, MetricCardSkeleton } from "@/components/dashboard-kit-v2/metric-card"
export { DockedPanel, SidePanel } from "@/components/dashboard-kit-v2/side-panel"
export { Sparkline } from "@/components/dashboard-kit-v2/sparkline"
export {
  type ResultStatus,
  STATUS_COLOR,
  StatusDefs,
  StatusTrace,
  resultStatus,
  statusColors,
  statusSeries,
} from "@/components/dashboard-kit-v2/status-trend"
export { DataTable, Row, Td, Th } from "@/components/dashboard-kit-v2/table"
export { SegmentedControl, type TabItem } from "@/components/dashboard-kit-v2/tabs"
export { FlagText, type TrendTone } from "@/components/dashboard-kit-v2/trend-text"
export {
  RE_COLORS,
  ReAreaChart,
  ReBarChart,
  type ReDatum,
  ReDonut,
  ReDonutLegend,
  type ReFill,
  ReLegend,
  ReRadar,
  ReRadial,
  type ReRing,
  type ReSeries,
  type ReSlice,
} from "@/components/dashboard-kit-v2/reui-charts"
