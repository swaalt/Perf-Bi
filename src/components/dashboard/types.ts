export type WidgetType =
  | "bar" | "line" | "pie" | "table" | "kpi"
  | "stat" | "text" | "gauge" | "divider" | "image" | "filter" | "icon"
  | "metric" | "shape" | "progress"
  | "scatter" | "boxplot" | "heatmap" | "histogram" | "funnel" | "treemap" | "radar" | "waterfall"

export const ACCENT_COLORS = {
  indigo:  "#6366f1", violet:  "#8b5cf6", cyan:    "#06b6d4",
  emerald: "#10b981", amber:   "#f59e0b", rose:    "#f43f5e",
  orange:  "#f97316", sky:     "#0ea5e9", pink:    "#ec4899", teal: "#14b8a6",
} as const
export type AccentColor = keyof typeof ACCENT_COLORS

export interface WidgetConfig {
  // Data
  dataSourceId?: string
  query?: string

  // Chart
  color?: AccentColor
  xField?: string
  yField?: string
  valueField?: string
  showLegend?: boolean
  showTitle?: boolean
  subtitle?: string
  format?: "number" | "currency" | "percent"

  // Stat widget
  icon?: string          // lucide icon name (for stat header)
  trend?: number
  trendPeriod?: string

  // Standalone icon widget
  iconName?: string      // lucide icon name for "icon" type
  iconSizePx?: number
  iconColorHex?: string

  // Gauge
  gaugeMin?: number
  gaugeMax?: number
  gaugeUnit?: string

  // Text
  text?: string
  isHtml?: boolean       // render content as HTML (imported Markdown / Superset)
  textSize?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl"
  textAlign?: "left" | "center" | "right"
  textColor?: string
  bold?: boolean
  italic?: boolean

  // Image
  imageUrl?: string
  imageFit?: "contain" | "cover" | "fill"

  // Divider
  dividerLabel?: string
  dividerStyle?: "solid" | "dashed" | "dotted"

  // Metric (enhanced KPI with sparkline)
  sparkField?: string        // column name for sparkline data
  deltaValue?: number        // manual delta %
  deltaPeriod?: string       // e.g. "vs mes ant."
  metricTarget?: number      // optional target value for progress bar inside metric

  // Shape (decorative background box)
  shapeRadius?: number       // border-radius px (default 12)
  shapeLabel?: string        // optional centered text label

  // Progress bar
  progressValue?: number     // static value (or use dataSourceId+query+valueField)
  progressMax?: number       // default 100
  progressUnit?: string      // e.g. "%" or "ventas"
  progressShowPercent?: boolean
  progressGradient?: boolean // show gradient fill
  progressLabel?: string

  // Scatter / Bubble
  sizeField?: string        // optional 3rd dimension for bubble size

  // Boxplot
  groupField?: string       // category axis (groups data by this column for box computation)

  // Heatmap
  heatValueField?: string   // value for cell color intensity

  // Histogram
  binCount?: number         // number of bins (default 10)

  // Radar
  radarFields?: string      // comma-separated list of value columns
  radarMax?: number         // max value for all axes (default auto)

  // Waterfall
  isAbsolute?: boolean      // if true, show running total bars; if false, show delta bars

  // Filter
  filterName?: string
  filterType?: "text" | "select" | "date" | "buttons" | "multi" | "range" | "number" | "slider"
  filterMin?: number
  filterMax?: number
  filterStep?: number
  filterOptions?: string
  filterDefault?: string
  filterLabel?: string
  linkedWidgetIds?: string[]    // widget IDs that auto-rerun when this filter changes

  // Style overrides
  bgColor?: string
  noBorder?: boolean
  borderColor?: string
  opacity?: number

  // AI-generated static data (used as fallback when no live query is connected)
  staticData?: { columns: string[]; rows: unknown[][] }
}

export interface Widget {
  id: string
  type: WidgetType
  title: string
  x: number    // canvas left (px)
  y: number    // canvas top (px)
  w: number    // width (px)
  h: number    // height (px)
  z: number    // z-index
  config: WidgetConfig
}

export type PaperSize = "canvas" | "a4" | "letter" | "legal" | "a3" | "tabloid"
export type PaperOrientation = "landscape" | "portrait"

export const PAPER_DEFS: Record<Exclude<PaperSize, "canvas">, { label: string; wL: number; hL: number }> = {
  a4:      { label: "A4",           wL: 297,   hL: 210   },
  letter:  { label: "Carta",        wL: 279.4, hL: 215.9 },
  legal:   { label: "Oficio/Legal", wL: 355.6, hL: 215.9 },
  a3:      { label: "A3",           wL: 420,   hL: 297   },
  tabloid: { label: "Tabloide",     wL: 431.8, hL: 279.4 },
}

export interface DashboardSettings {
  bg?: string
  gap?: number
  snapGrid?: boolean
  canvasW?: number
  canvasH?: number
  paperSize?: PaperSize
  paperOrientation?: PaperOrientation
}

export type QueryData = { columns: string[]; rows: unknown[][] }

export const TYPE_LABEL: Record<WidgetType, string> = {
  bar: "Barras", line: "Líneas", pie: "Pie", table: "Tabla", kpi: "KPI",
  stat: "Stat", text: "Texto", gauge: "Gauge", divider: "Divisor",
  image: "Imagen", filter: "Filtro", icon: "Ícono",
  metric: "Métrica", shape: "Forma", progress: "Progreso",
  scatter: "Scatter", boxplot: "Box Plot", heatmap: "Heatmap",
  histogram: "Histograma", funnel: "Embudo", treemap: "Treemap",
  radar: "Radar", waterfall: "Cascada",
}

export const TYPE_GROUPS: { label: string; types: WidgetType[] }[] = [
  { label: "Gráficos",    types: ["bar", "line", "pie", "gauge"] },
  { label: "Datos",       types: ["table", "kpi", "stat", "metric", "progress"] },
  { label: "Análisis",    types: ["scatter", "boxplot", "heatmap", "histogram", "radar", "waterfall"] },
  { label: "Especial",    types: ["funnel", "treemap"] },
  { label: "Contenido",   types: ["text", "image", "icon", "divider", "shape"] },
  { label: "Interacción", types: ["filter"] },
]

const PW: Record<WidgetType, number> = {
  bar: 520, line: 520, pie: 360, table: 640, kpi: 220,
  stat: 260, text: 480, gauge: 300, divider: 600,
  image: 320, filter: 280, icon: 100,
  metric: 280, shape: 400, progress: 320,
  scatter: 480, boxplot: 480, heatmap: 520, histogram: 420,
  funnel: 360, treemap: 480, radar: 360, waterfall: 520,
}
const PH: Record<WidgetType, number> = {
  bar: 300, line: 300, pie: 300, table: 360, kpi: 130,
  stat: 130, text: 76, gauge: 280, divider: 40,
  image: 260, filter: 72, icon: 100,
  metric: 140, shape: 200, progress: 80,
  scatter: 320, boxplot: 300, heatmap: 340, histogram: 280,
  funnel: 340, treemap: 300, radar: 320, waterfall: 300,
}

export function defaultWidget(type: WidgetType, x = 100, y = 100, z = 1): Widget {
  const configDefaults: Record<WidgetType, Partial<WidgetConfig>> = {
    bar:     { color: "indigo", showLegend: false },
    line:    { color: "indigo", showLegend: false },
    pie:     { color: "indigo", showLegend: true },
    table:   {},
    kpi:     { color: "indigo", format: "number" },
    stat:    { color: "indigo", icon: "TrendingUp", format: "number" },
    text:    { text: "Título de sección", textSize: "2xl", bold: true, textAlign: "left", textColor: "#f4f4f5" },
    gauge:   { color: "indigo", gaugeMin: 0, gaugeMax: 100, gaugeUnit: "%" },
    divider: { dividerStyle: "solid" },
    image:   { imageFit: "cover" },
    filter:  { filterName: "filtro1", filterType: "text", filterLabel: "Filtro", linkedWidgetIds: [] },
    icon:    { iconName: "Star", iconSizePx: 48, iconColorHex: "#6366f1" },
    metric:   { color: "indigo", format: "number" },
    shape:    { bgColor: "#6366f120", borderColor: "#6366f140", shapeRadius: 16 },
    progress: { color: "indigo", progressValue: 65, progressMax: 100, progressShowPercent: true, progressGradient: true },
    scatter:   { color: "indigo" },
    boxplot:   { color: "indigo" },
    heatmap:   { color: "indigo" },
    histogram: { color: "indigo", binCount: 10 },
    funnel:    { color: "indigo" },
    treemap:   { color: "indigo" },
    radar:     { color: "indigo" },
    waterfall: { color: "indigo" },
  }
  return {
    id: Math.random().toString(36).slice(2, 11),
    type, title: TYPE_LABEL[type],
    x, y, w: PW[type], h: PH[type], z,
    config: { ...(configDefaults[type] ?? {}) },
  }
}

export function migrateWidget(raw: Record<string, unknown>): Widget {
  if (typeof raw.x === "number") return raw as unknown as Widget
  const sizeMap: Record<string, number> = { sm: 3, md: 6, lg: 9, xl: 12 }
  const cols = typeof raw.w === "number" ? raw.w : (sizeMap[(raw.size as string) ?? "md"] ?? 6)
  const pxW = Math.round((cols / 12) * 1200)
  return { ...(raw as object), x: 40, y: 40, w: pxW, h: typeof raw.h === "number" ? raw.h : 280, z: 1 } as unknown as Widget
}

export const BG_PRESETS = [
  { label: "Default",      value: "#09090b" },
  { label: "Negro puro",   value: "#000000" },
  { label: "Zinc 900",     value: "#18181b" },
  { label: "Slate 950",    value: "#020617" },
  { label: "Indigo dark",  value: "linear-gradient(135deg,#0f0f1a 0%,#1a1040 100%)" },
  { label: "Blue dark",    value: "linear-gradient(135deg,#040d21 0%,#0c1f4a 100%)" },
  { label: "Teal dark",    value: "linear-gradient(135deg,#020f0f 0%,#042a2a 100%)" },
  { label: "Rose dark",    value: "linear-gradient(135deg,#120a0a 0%,#2a0f1a 100%)" },
  { label: "Zinc light",   value: "#f4f4f5" },
  { label: "Blanco",       value: "#ffffff" },
]

export const ICON_LIBRARY = [
  // Analytics
  "TrendingUp","TrendingDown","BarChart2","BarChart","BarChart3","LineChart","PieChart","Activity","Gauge",
  // Finance
  "DollarSign","CreditCard","Wallet","Coins","Receipt","BadgeDollarSign","Percent","ArrowUpRight","ArrowDownRight",
  // Commerce
  "ShoppingCart","ShoppingBag","Package","Truck","Store","Box","Tag","Boxes",
  // Users
  "User","Users","UserCheck","UserPlus","UserX","Contact","Building2","Briefcase",
  // Tech
  "Database","Server","Cpu","Monitor","Laptop","Smartphone","Globe","Wifi","Code2","Terminal",
  // Communication
  "Mail","Phone","MessageSquare","Bell","Send","MessageCircle","AtSign",
  // Status
  "CheckCircle2","XCircle","AlertCircle","AlertTriangle","Info","HelpCircle","CheckSquare","ShieldCheck",
  // Time
  "Clock","Calendar","Timer","AlarmClock","CalendarDays","Hourglass",
  // Files
  "FileText","File","Folder","Download","Upload","Archive","Paperclip",
  // Misc
  "Star","Heart","Bookmark","Flag","Target","Compass","Map","MapPin","Navigation",
  "Award","Medal","Trophy","Crown","Zap","Flame","Rocket","Sparkles","Gem","Diamond",
  "Lock","Key","Shield","Eye","Search","Filter","Settings","Settings2","Sliders",
  "Home","LayoutDashboard","Grid","Layers","Layout","Sidebar","PanelLeft",
  "Hash","Plus","Minus","X","ArrowUp","ArrowDown","ArrowRight","ArrowLeft","MoveRight",
  "RefreshCw","Link","Share2","ExternalLink","Copy","Edit","Trash2","MoreHorizontal",
  "Image","Camera","Video","Music","Play","Pause","Volume2","Radio",
  "Sun","Moon","Cloud","CloudRain","Thermometer","Wind","Droplets","Leaf",
  "Car","Plane","Ship","Train","Bike","Bus",
] as const
