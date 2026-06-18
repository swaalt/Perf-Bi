"use client"

import dynamic from "next/dynamic"
import * as LucideIcons from "lucide-react"
import { cn } from "@/lib/utils"
import type { Widget, QueryData, AccentColor, WidgetType } from "./types"
import { ACCENT_COLORS } from "./types"

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
    </div>
  ),
})

// ─── helpers ────────────────────────────────────────────────────────────────

const FX = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"]
const FY = [120, 200, 150, 80, 190, 230]
const FP = [{ name: "A", value: 35 }, { name: "B", value: 25 }, { name: "C", value: 20 }, { name: "D", value: 20 }]

const AXIS = {
  axisLine: { lineStyle: { color: "#3f3f46" } },
  axisTick: { show: false },
  axisLabel: { color: "#71717a", fontSize: 11 },
  splitLine: { lineStyle: { color: "#27272a" } },
}
const TIP = { backgroundColor: "#18181b", borderColor: "#27272a", textStyle: { color: "#f4f4f5", fontSize: 12 } }

function col(key?: AccentColor) { return ACCENT_COLORS[key ?? "indigo"] }
function getXY(w: Widget, data: QueryData | null) {
  // Priority: live query → AI static data → placeholder
  const src = data ?? (w.config.staticData ?? null)
  if (!src || !w.config.xField || !w.config.yField) return { x: FX, y: FY }
  if (!Array.isArray(src.columns) || !Array.isArray(src.rows)) return { x: FX, y: FY }
  const xi = src.columns.indexOf(w.config.xField)
  const yi = src.columns.indexOf(w.config.yField)
  if (xi < 0 || yi < 0) return { x: FX, y: FY }
  const rows = src.rows.filter(r => Array.isArray(r))
  const x: string[] = [], y: number[] = []
  for (const r of rows) {
    const xv = (r as unknown[])[xi]
    const yv = Number((r as unknown[])[yi])
    if (xv !== undefined && xv !== null && !isNaN(yv)) { x.push(String(xv)); y.push(yv) }
  }
  return { x, y }
}
function fmtNum(n: number, fmt?: string) {
  if (fmt === "currency") return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n)
  if (fmt === "percent") return `${n.toFixed(1)}%`
  return new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 }).format(n)
}
function DynIcon({ name, className, strokeWidth }: { name: string; className?: string; strokeWidth?: number }) {
  const Icon = (LucideIcons as Record<string, unknown>)[name] as React.ComponentType<{ className?: string; strokeWidth?: number }> | undefined
  if (!Icon) return null
  return <Icon className={className} strokeWidth={strokeWidth} />
}

// ─── chart options ───────────────────────────────────────────────────────────

function barOpt(w: Widget, data: QueryData | null) {
  const { x, y } = getXY(w, data)
  const c = col(w.config.color)
  const isStatic = !data && !!w.config.staticData
  return {
    animation: !isStatic,
    backgroundColor: "transparent",
    grid: { left: 4, right: 4, top: w.config.showTitle ? 32 : 12, bottom: 4, containLabel: true },
    tooltip: { trigger: "axis", ...TIP },
    title: w.config.showTitle ? { text: w.title, subtext: w.config.subtitle, textStyle: { color: "#f4f4f5", fontSize: 13, fontWeight: "600" }, subtextStyle: { color: "#71717a", fontSize: 11 }, left: 4, top: 4 } : undefined,
    xAxis: { type: "category", data: x, ...AXIS },
    yAxis: { type: "value", ...AXIS },
    series: [{ type: "bar", data: y, itemStyle: { color: c, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 48 }],
  }
}

function lineOpt(w: Widget, data: QueryData | null) {
  const { x, y } = getXY(w, data)
  const c = col(w.config.color)
  const isStatic = !data && !!w.config.staticData
  return {
    animation: !isStatic,
    backgroundColor: "transparent",
    grid: { left: 4, right: 4, top: w.config.showTitle ? 32 : 12, bottom: 4, containLabel: true },
    tooltip: { trigger: "axis", ...TIP },
    title: w.config.showTitle ? { text: w.title, textStyle: { color: "#f4f4f5", fontSize: 13, fontWeight: "600" }, left: 4, top: 4 } : undefined,
    xAxis: { type: "category", data: x, ...AXIS },
    yAxis: { type: "value", ...AXIS },
    series: [{
      type: "line", data: y, smooth: true,
      lineStyle: { color: c, width: 2 },
      itemStyle: { color: c },
      areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: c + "40" }, { offset: 1, color: c + "00" }] } },
      symbol: "circle", symbolSize: 5,
    }],
  }
}

function pieOpt(w: Widget, data: QueryData | null) {
  const c = col(w.config.color)
  const palette = [c, "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#f97316", "#0ea5e9", "#ec4899", "#14b8a6"]
  let pieData = FP
  const pieSrc = data ?? (w.config.staticData ?? null)
  if (pieSrc && w.config.xField && w.config.yField && Array.isArray(pieSrc.columns) && Array.isArray(pieSrc.rows)) {
    const xi = pieSrc.columns.indexOf(w.config.xField)
    const yi = pieSrc.columns.indexOf(w.config.yField)
    if (xi >= 0 && yi >= 0) {
      pieData = pieSrc.rows
        .filter(r => Array.isArray(r))
        .map(r => ({ name: String((r as unknown[])[xi]), value: Number((r as unknown[])[yi]) }))
    }
  }
  const leg = w.config.showLegend !== false
  return {
    backgroundColor: "transparent",
    color: palette,
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)", ...TIP },
    title: w.config.showTitle ? { text: w.title, textStyle: { color: "#f4f4f5", fontSize: 13, fontWeight: "600" }, left: 4, top: 4 } : undefined,
    legend: leg ? { orient: "vertical", right: 8, top: "middle", textStyle: { color: "#a1a1aa", fontSize: 11 } } : undefined,
    series: [{ type: "pie", radius: ["38%", "65%"], center: leg ? ["40%", "50%"] : ["50%", "50%"], data: pieData, label: { show: false }, emphasis: { scale: true, scaleSize: 4 } }],
  }
}

function gaugeOpt(w: Widget, data: QueryData | null) {
  const c = col(w.config.color)
  const cols = data?.columns ?? []
  const vi = w.config.valueField ? cols.indexOf(w.config.valueField) : (cols.length > 0 ? 0 : -1)
  const value = vi >= 0 && data?.rows[0] ? Number(data.rows[0][vi]) : Math.round((w.config.gaugeMax ?? 100) * 0.65)
  const unit = w.config.gaugeUnit ?? ""
  return {
    backgroundColor: "transparent",
    series: [{
      type: "gauge",
      min: w.config.gaugeMin ?? 0,
      max: w.config.gaugeMax ?? 100,
      startAngle: 200, endAngle: -20,
      radius: "88%",
      pointer: { show: true, length: "58%", width: 4, itemStyle: { color: c } },
      progress: { show: true, width: 10, roundCap: true, itemStyle: { color: c } },
      axisLine: { lineStyle: { width: 10, color: [[1, "#27272a"]] } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      anchor: { show: false }, title: { show: false },
      detail: {
        valueAnimation: true, fontSize: 26, fontWeight: "bold",
        color: "#f4f4f5", formatter: `{value}${unit}`, offsetCenter: [0, "25%"],
      },
      data: [{ value }],
    }],
  }
}

function computeBoxStats(vals: number[]): [number, number, number, number, number] {
  const sorted = [...vals].sort((a, b) => a - b)
  const n = sorted.length
  if (n === 0) return [0, 0, 0, 0, 0]
  const q = (p: number) => {
    const idx = p * (n - 1)
    const lo = Math.floor(idx), hi = Math.ceil(idx)
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
  }
  return [sorted[0], q(0.25), q(0.5), q(0.75), sorted[n - 1]]
}

function scatterOpt(w: Widget, data: QueryData | null) {
  const c = col(w.config.color)
  let pts: [number, number][] = []
  if (data && w.config.xField && w.config.yField) {
    const xi = data.columns.indexOf(w.config.xField)
    const yi = data.columns.indexOf(w.config.yField)
    if (xi >= 0 && yi >= 0) pts = data.rows.map(r => [Number((r as unknown[])[xi]), Number((r as unknown[])[yi])])
  }
  if (pts.length === 0) {
    const clusters = [{ cx: 20, cy: 30 }, { cx: 60, cy: 70 }, { cx: 80, cy: 20 }]
    clusters.forEach(({ cx, cy }) => {
      for (let i = 0; i < 18; i++) pts.push([cx + (Math.random() - 0.5) * 18, cy + (Math.random() - 0.5) * 18])
    })
  }
  return {
    backgroundColor: "transparent",
    grid: { left: 4, right: 4, top: 12, bottom: 4, containLabel: true },
    tooltip: { trigger: "item", formatter: (p: { value: [number, number] }) => `(${p.value[0].toFixed(1)}, ${p.value[1].toFixed(1)})`, ...TIP },
    xAxis: { type: "value", scale: true, ...AXIS },
    yAxis: { type: "value", scale: true, ...AXIS },
    series: [{ type: "scatter", data: pts, symbolSize: 9, itemStyle: { color: c, opacity: 0.75 } }],
  }
}

function boxplotOpt(w: Widget, data: QueryData | null) {
  const c = col(w.config.color)
  let categories: string[] = []
  let boxData: [number, number, number, number, number][] = []
  if (data && w.config.xField && w.config.yField) {
    const xi = data.columns.indexOf(w.config.xField)
    const yi = data.columns.indexOf(w.config.yField)
    if (xi >= 0 && yi >= 0) {
      const groups = new Map<string, number[]>()
      data.rows.forEach(r => {
        const cat = String((r as unknown[])[xi])
        const val = Number((r as unknown[])[yi])
        if (!groups.has(cat)) groups.set(cat, [])
        groups.get(cat)!.push(val)
      })
      groups.forEach((vals, cat) => { categories.push(cat); boxData.push(computeBoxStats(vals)) })
    }
  }
  if (boxData.length === 0) {
    categories = ["Grupo A", "Grupo B", "Grupo C", "Grupo D"]
    boxData = [[10, 25, 40, 58, 80], [20, 35, 52, 68, 88], [5, 18, 30, 46, 72], [15, 32, 48, 64, 92]]
  }
  return {
    backgroundColor: "transparent",
    grid: { left: 4, right: 4, top: 12, bottom: 4, containLabel: true },
    tooltip: {
      trigger: "item",
      formatter: (p: { value: number[] }) => p.value ? `Min: ${p.value[0]}<br/>Q1: ${p.value[1]}<br/>Med: ${p.value[2]}<br/>Q3: ${p.value[3]}<br/>Max: ${p.value[4]}` : "",
      ...TIP
    },
    xAxis: { type: "category", data: categories, ...AXIS },
    yAxis: { type: "value", ...AXIS },
    series: [{ type: "boxplot", data: boxData, itemStyle: { color: c + "30", borderColor: c, borderWidth: 2 }, boxWidth: ["30%", "50%"] }],
  }
}

function heatmapOpt(w: Widget, data: QueryData | null) {
  const c = col(w.config.color)
  let xCats: string[] = [], yCats: string[] = []
  let heatData: [number, number, number][] = []
  if (data && w.config.xField && w.config.yField && w.config.heatValueField) {
    const xi = data.columns.indexOf(w.config.xField)
    const yi = data.columns.indexOf(w.config.yField)
    const vi = data.columns.indexOf(w.config.heatValueField)
    if (xi >= 0 && yi >= 0 && vi >= 0) {
      const xSet = new Set<string>(), ySet = new Set<string>()
      data.rows.forEach(r => { xSet.add(String((r as unknown[])[xi])); ySet.add(String((r as unknown[])[yi])) })
      xCats = [...xSet]; yCats = [...ySet]
      data.rows.forEach(r => {
        heatData.push([xCats.indexOf(String((r as unknown[])[xi])), yCats.indexOf(String((r as unknown[])[yi])), Number((r as unknown[])[vi])])
      })
    }
  }
  if (heatData.length === 0) {
    xCats = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"]
    yCats = ["00h","04h","08h","12h","16h","20h"]
    xCats.forEach((_, xi) => yCats.forEach((_, yi) => heatData.push([xi, yi, Math.round(Math.random() * 100)])))
  }
  const maxVal = Math.max(...heatData.map(d => d[2]))
  return {
    backgroundColor: "transparent",
    grid: { left: 4, right: 60, top: 12, bottom: 4, containLabel: true },
    tooltip: { position: "top", formatter: (p: { value: [number, number, number] }) => `${xCats[p.value[0]]}, ${yCats[p.value[1]]}: ${p.value[2]}`, ...TIP },
    xAxis: { type: "category", data: xCats, ...AXIS, splitArea: { show: true } },
    yAxis: { type: "category", data: yCats, ...AXIS, splitArea: { show: true } },
    visualMap: { min: 0, max: maxVal, calculable: true, orient: "vertical", right: 0, top: "center", textStyle: { color: "#71717a", fontSize: 10 }, inRange: { color: ["#27272a", c] } },
    series: [{ type: "heatmap", data: heatData, label: { show: false }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: c } } }],
  }
}

function histogramOpt(w: Widget, data: QueryData | null) {
  const c = col(w.config.color)
  let barData: { name: string; value: number }[] = []
  if (data && w.config.yField) {
    const vi = data.columns.indexOf(w.config.yField)
    if (vi >= 0) {
      const vals = data.rows.map(r => Number((r as unknown[])[vi])).filter(v => !isNaN(v))
      if (vals.length > 0) {
        const bins = w.config.binCount ?? 10
        const min = Math.min(...vals), max = Math.max(...vals)
        const step = (max - min) / bins || 1
        const counts = Array(bins).fill(0)
        vals.forEach(v => { const i = Math.min(Math.floor((v - min) / step), bins - 1); counts[i]++ })
        barData = counts.map((cnt, i) => ({ name: `${(min + i * step).toFixed(1)}–${(min + (i + 1) * step).toFixed(1)}`, value: cnt }))
      }
    }
  }
  if (barData.length === 0) {
    const demo = [2, 5, 11, 19, 28, 23, 15, 8, 4, 2]
    barData = demo.map((v, i) => ({ name: `${i * 10}–${(i + 1) * 10}`, value: v }))
  }
  return {
    backgroundColor: "transparent",
    grid: { left: 4, right: 4, top: 12, bottom: 4, containLabel: true },
    tooltip: { trigger: "axis", ...TIP },
    xAxis: { type: "category", data: barData.map(d => d.name), ...AXIS, axisLabel: { ...AXIS.axisLabel, rotate: 30 } },
    yAxis: { type: "value", ...AXIS },
    series: [{ type: "bar", data: barData.map(d => d.value), barCategoryGap: "2%", itemStyle: { color: c, borderRadius: [2, 2, 0, 0] } }],
  }
}

function funnelOpt(w: Widget, data: QueryData | null) {
  const c = col(w.config.color)
  const palette = [c, "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"]
  let fData: { name: string; value: number }[] = []
  if (data && w.config.xField && w.config.yField) {
    const xi = data.columns.indexOf(w.config.xField)
    const yi = data.columns.indexOf(w.config.yField)
    if (xi >= 0 && yi >= 0) fData = data.rows.map(r => ({ name: String((r as unknown[])[xi]), value: Number((r as unknown[])[yi]) }))
  }
  if (fData.length === 0) fData = [{ name: "Visitas", value: 1000 }, { name: "Leads", value: 600 }, { name: "Prospects", value: 320 }, { name: "Propuestas", value: 150 }, { name: "Clientes", value: 62 }]
  return {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)", ...TIP },
    color: palette,
    series: [{ type: "funnel", left: "10%", width: "80%", min: 0, max: Math.max(...fData.map(d => d.value)), minSize: "10%", maxSize: "100%", sort: "descending", gap: 2, label: { show: true, position: "inside", formatter: "{b}\n{c}", color: "#fff", fontSize: 11 }, data: fData }],
  }
}

function treemapOpt(w: Widget, data: QueryData | null) {
  const c = col(w.config.color)
  let tmData: { name: string; value: number }[] = []
  if (data && w.config.xField && w.config.yField) {
    const xi = data.columns.indexOf(w.config.xField)
    const yi = data.columns.indexOf(w.config.yField)
    if (xi >= 0 && yi >= 0) tmData = data.rows.map(r => ({ name: String((r as unknown[])[xi]), value: Number((r as unknown[])[yi]) }))
  }
  if (tmData.length === 0) tmData = [{ name: "Categoría A", value: 400 }, { name: "Categoría B", value: 280 }, { name: "Categoría C", value: 220 }, { name: "Categoría D", value: 150 }, { name: "Categoría E", value: 100 }, { name: "Categoría F", value: 80 }]
  return {
    backgroundColor: "transparent",
    tooltip: { formatter: "{b}: {c}", ...TIP },
    series: [{ type: "treemap", data: tmData, roam: false, nodeClick: false, breadcrumb: { show: false }, label: { show: true, formatter: "{b}\n{c}", fontSize: 11, color: "#f4f4f5" }, upperLabel: { show: false }, itemStyle: { borderColor: "#09090b", borderWidth: 2, gapWidth: 2 }, levels: [{ itemStyle: { borderColor: "#09090b", borderWidth: 2, gapWidth: 2 }, colorSaturation: [0.4, 0.8] }], colorMappingBy: "value", visibleMin: 300, color: [c, "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e"] }],
  }
}

function radarOpt(w: Widget, data: QueryData | null) {
  const c = col(w.config.color)
  let indicators: { name: string; max: number }[] = []
  let radarValues: number[] = []
  if (data && w.config.xField && w.config.yField) {
    const xi = data.columns.indexOf(w.config.xField)
    const yi = data.columns.indexOf(w.config.yField)
    if (xi >= 0 && yi >= 0) {
      const maxVal = w.config.radarMax ?? Math.max(...data.rows.map(r => Number((r as unknown[])[yi])), 1)
      indicators = data.rows.map(r => ({ name: String((r as unknown[])[xi]), max: maxVal }))
      radarValues = data.rows.map(r => Number((r as unknown[])[yi]))
    }
  }
  if (indicators.length === 0) {
    indicators = ["Ventas","Marketing","Soporte","Producto","Operaciones","RRHH"].map(n => ({ name: n, max: 100 }))
    radarValues = [85, 70, 60, 90, 75, 55]
  }
  return {
    backgroundColor: "transparent",
    tooltip: { ...TIP },
    radar: { indicator: indicators, radius: "65%", center: ["50%", "50%"], axisName: { color: "#71717a", fontSize: 11 }, axisLine: { lineStyle: { color: "#3f3f46" } }, splitLine: { lineStyle: { color: "#27272a" } }, splitArea: { areaStyle: { color: ["#18181b44", "#09090b44"] } } },
    series: [{ type: "radar", data: [{ value: radarValues, areaStyle: { color: c + "30" }, lineStyle: { color: c, width: 2 }, itemStyle: { color: c } }] }],
  }
}

function waterfallOpt(w: Widget, data: QueryData | null) {
  const c = col(w.config.color)
  let categories: string[] = []
  let values: number[] = []
  if (data && w.config.xField && w.config.yField) {
    const xi = data.columns.indexOf(w.config.xField)
    const yi = data.columns.indexOf(w.config.yField)
    if (xi >= 0 && yi >= 0) {
      categories = data.rows.map(r => String((r as unknown[])[xi]))
      values = data.rows.map(r => Number((r as unknown[])[yi]))
    }
  }
  if (values.length === 0) {
    categories = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Total"]
    values     = [120,  45,  -30,   80,  -20,   60,    255]
  }
  let running = 0
  const bases: number[] = [], deltas: number[] = [], colors: string[] = []
  const posColor = c, negColor = "#f43f5e", totalColor = "#71717a"
  values.forEach((v, i) => {
    const isLast = i === values.length - 1
    if (isLast) { bases.push(0); deltas.push(running); colors.push(totalColor) }
    else {
      bases.push(v >= 0 ? running : running + v)
      deltas.push(Math.abs(v))
      colors.push(v >= 0 ? posColor : negColor)
      running += v
    }
  })
  return {
    backgroundColor: "transparent",
    grid: { left: 4, right: 4, top: 12, bottom: 4, containLabel: true },
    tooltip: { trigger: "axis", ...TIP },
    xAxis: { type: "category", data: categories, ...AXIS },
    yAxis: { type: "value", ...AXIS },
    series: [
      { type: "bar", stack: "wf", data: bases, itemStyle: { color: "transparent", borderColor: "transparent" }, silent: true },
      { type: "bar", stack: "wf", data: deltas.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [3, 3, 0, 0] } })) },
    ],
  }
}

// ─── widget renderers ────────────────────────────────────────────────────────

interface Props {
  widget: Widget
  data: QueryData | null
  filterValues?: Map<string, string>
  onFilterChange?: (name: string, value: string) => void
}

export function WidgetPreview({ widget: w, data, filterValues, onFilterChange }: Props) {
  const { type, config: cfg } = w

  if (type === "divider") {
    const lineStyle = { borderTopWidth: 1, borderTopStyle: cfg.dividerStyle ?? "solid", borderTopColor: cfg.color ? ACCENT_COLORS[cfg.color] : "#3f3f46" }
    return (
      <div className="flex h-full items-center gap-3 px-4">
        <div className="flex-1" style={lineStyle as React.CSSProperties} />
        {cfg.dividerLabel && <span className="shrink-0 text-xs font-semibold uppercase tracking-widest text-zinc-500">{cfg.dividerLabel}</span>}
        {cfg.dividerLabel && <div className="flex-1" style={lineStyle as React.CSSProperties} />}
      </div>
    )
  }

  if (type === "text") {
    const hasHtml = cfg.isHtml === true || (typeof cfg.text === "string" && /<[a-z][\s\S]*>/i.test(cfg.text))
    if (hasHtml) {
      return (
        <div
          className={cn(
            "h-full w-full overflow-auto px-3 py-2 text-sm leading-relaxed",
            "[&_p]:mb-1.5",
            "[&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold",
            "[&_h2]:mb-1.5 [&_h2]:text-lg [&_h2]:font-bold",
            "[&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-semibold",
            "[&_h4]:mb-1 [&_h4]:text-sm [&_h4]:font-semibold",
            "[&_ul]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-4",
            "[&_ol]:mb-1.5 [&_ol]:list-decimal [&_ol]:pl-4",
            "[&_li]:mb-0.5",
            "[&_strong]:font-bold",
            "[&_em]:italic",
            "[&_a]:text-indigo-400 [&_a]:underline",
            "[&_hr]:my-2 [&_hr]:border-zinc-700",
            "[&_img]:max-w-full",
          )}
          style={{ color: cfg.textColor || "#f4f4f5" }}
          dangerouslySetInnerHTML={{ __html: cfg.text ?? "" }}
        />
      )
    }
    const sizeMap: Record<string, string> = { xs: "text-xs", sm: "text-sm", base: "text-base", lg: "text-lg", xl: "text-xl", "2xl": "text-2xl", "3xl": "text-3xl", "4xl": "text-4xl" }
    return (
      <div
        className={cn(
          "flex h-full items-start px-3 py-2 leading-snug",
          sizeMap[cfg.textSize ?? "base"],
          cfg.textAlign === "center" ? "justify-center text-center" : cfg.textAlign === "right" ? "justify-end text-right" : "",
          cfg.bold && "font-bold",
          cfg.italic && "italic"
        )}
        style={{ color: cfg.textColor || "#f4f4f5" }}
      >
        <span className="whitespace-pre-wrap break-words w-full">{cfg.text || <span className="text-zinc-700">Doble click para editar</span>}</span>
      </div>
    )
  }

  if (type === "image") {
    if (!cfg.imageUrl) return <div className="flex h-full items-center justify-center text-xs text-zinc-600">Sin URL de imagen</div>
    return <img src={cfg.imageUrl} alt="" className="h-full w-full" style={{ objectFit: cfg.imageFit ?? "cover" }} />
  }

  if (type === "icon") {
    const Icon = (LucideIcons as Record<string, unknown>)[cfg.iconName ?? "Star"] as
      React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }> | undefined
    return (
      <div className="flex h-full items-center justify-center">
        {Icon
          ? <Icon size={cfg.iconSizePx ?? 48} color={cfg.iconColorHex ?? "#6366f1"} strokeWidth={1.5} />
          : <span className="text-xs text-zinc-600">Ícono no encontrado</span>
        }
      </div>
    )
  }

  if (type === "shape") {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ borderRadius: cfg.shapeRadius ?? 12, background: cfg.bgColor }}
      >
        {cfg.shapeLabel && (
          <span className="text-sm font-semibold" style={{ color: cfg.textColor ?? "#71717a" }}>
            {cfg.shapeLabel}
          </span>
        )}
      </div>
    )
  }

  if (type === "metric") {
    const cols = data?.columns ?? []
    const vi = cfg.valueField ? cols.indexOf(cfg.valueField) : 0
    const raw = vi >= 0 && data?.rows[0] != null ? data.rows[0][vi] : null
    const val = raw != null ? fmtNum(Number(raw), cfg.format) : "—"
    const c = col(cfg.color)
    const delta = cfg.deltaValue

    // Build sparkline from data if available
    const sparkVals: number[] = []
    if (data && data.rows.length > 1) {
      const si = cfg.sparkField ? cols.indexOf(cfg.sparkField) : vi
      if (si >= 0) {
        data.rows.slice(-12).forEach(r => {
          const n = Number((r as unknown[])[si])
          if (!isNaN(n)) sparkVals.push(n)
        })
      }
    }
    if (sparkVals.length === 0) {
      sparkVals.push(...[40, 55, 48, 70, 65, 80, 72, 90, 85, 95, 88, 100])
    }

    const minV = Math.min(...sparkVals)
    const maxV = Math.max(...sparkVals)
    const range = maxV - minV || 1
    const H = 40
    const W = 100
    const pts = sparkVals.map((v, i) => {
      const x = (i / (sparkVals.length - 1)) * W
      const y = H - ((v - minV) / range) * H
      return `${x},${y}`
    }).join(" ")

    return (
      <div className="flex h-full flex-col justify-between px-4 py-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-zinc-500">{w.title}</p>
            <p className="mt-0.5 text-3xl font-bold leading-none" style={{ color: c }}>{val}</p>
            {delta != null && (
              <p className={cn("mt-1 text-xs", delta >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}% {cfg.deltaPeriod ?? ""}
              </p>
            )}
          </div>
          <svg width={W} height={H} className="shrink-0 opacity-80">
            <defs>
              <linearGradient id={`spark-${w.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={0.3} />
                <stop offset="100%" stopColor={c} stopOpacity={0} />
              </linearGradient>
            </defs>
            <polygon
              points={`0,${H} ${pts} ${W},${H}`}
              fill={`url(#spark-${w.id})`}
            />
            <polyline points={pts} fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {cfg.metricTarget != null && raw != null && (
          <div className="mt-2">
            <div className="mb-0.5 flex justify-between text-[10px] text-zinc-600">
              <span>Meta</span>
              <span>{Math.min(100, Math.round((Number(raw) / cfg.metricTarget) * 100))}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (Number(raw) / cfg.metricTarget) * 100)}%`, background: c }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  if (type === "progress") {
    const c = col(cfg.color)
    // Get value from data or static config
    let value = cfg.progressValue ?? 0
    const max = cfg.progressMax ?? 100
    if (data && data.rows.length > 0) {
      const cols2 = data.columns
      const vi2 = cfg.valueField ? cols2.indexOf(cfg.valueField) : 0
      if (vi2 >= 0) value = Number((data.rows[0] as unknown[])[vi2]) || value
    }
    const pct = Math.min(100, Math.max(0, (value / max) * 100))
    const displayVal = cfg.progressShowPercent ? `${pct.toFixed(1)}%` : `${value}${cfg.progressUnit ? ` ${cfg.progressUnit}` : ""}`

    return (
      <div className="flex h-full flex-col justify-center gap-1.5 px-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-zinc-500">{w.title}</span>
          <span className="text-sm font-bold" style={{ color: c }}>{displayVal}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: cfg.progressGradient
                ? `linear-gradient(90deg, ${c}99, ${c})`
                : c,
            }}
          />
        </div>
        {cfg.progressLabel && (
          <p className="text-[10px] text-zinc-600">{cfg.progressLabel}</p>
        )}
      </div>
    )
  }

  if (type === "filter") {
    const name = cfg.filterName ?? ""
    const val  = filterValues?.get(name) ?? cfg.filterDefault ?? ""
    const opts = (cfg.filterOptions ?? "").split(",").map(s => s.trim()).filter(Boolean)
    const fire = (v: string) => onFilterChange?.(name, v)
    const inputCls = "rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"

    let control: React.ReactNode

    if (cfg.filterType === "select") {
      control = (
        <select value={val} onChange={e => fire(e.target.value)} className={cn(inputCls, "flex-1")}>
          <option value="">Todos</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    } else if (cfg.filterType === "buttons") {
      control = (
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => fire("")}
            className={cn("rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
              val === "" ? "border-indigo-500 bg-indigo-500/10 text-indigo-300" : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200")}>
            Todos
          </button>
          {opts.map(o => (
            <button key={o} onClick={() => fire(o)}
              className={cn("rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                val === o ? "border-indigo-500 bg-indigo-500/10 text-indigo-300" : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200")}>
              {o}
            </button>
          ))}
        </div>
      )
    } else if (cfg.filterType === "multi") {
      const selected = val ? val.split(",").map(s => s.trim()).filter(Boolean) : []
      control = (
        <div className="flex flex-wrap gap-1.5">
          {opts.map(o => {
            const active = selected.includes(o)
            return (
              <button key={o} onClick={() => {
                const next = active ? selected.filter(v => v !== o) : [...selected, o]
                fire(next.join(","))
              }}
                className={cn("rounded-full border px-3 py-0.5 text-xs font-medium transition-colors",
                  active ? "border-indigo-500 bg-indigo-500/15 text-indigo-300" : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200")}>
                {o}
              </button>
            )
          })}
          {selected.length > 0 && (
            <button onClick={() => fire("")} className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">✕</button>
          )}
        </div>
      )
    } else if (cfg.filterType === "range") {
      const [from = "", to = ""] = val.split("|")
      control = (
        <div className="flex flex-1 items-center gap-2">
          <input type="date" value={from} onChange={e => fire(`${e.target.value}|${to}`)}
            className={cn(inputCls, "flex-1 min-w-0")} />
          <span className="shrink-0 text-xs text-zinc-600">→</span>
          <input type="date" value={to} onChange={e => fire(`${from}|${e.target.value}`)}
            className={cn(inputCls, "flex-1 min-w-0")} />
        </div>
      )
    } else if (cfg.filterType === "number") {
      control = (
        <input type="number"
          value={val} placeholder="0"
          min={cfg.filterMin} max={cfg.filterMax} step={cfg.filterStep ?? 1}
          onChange={e => fire(e.target.value)}
          className={cn(inputCls, "w-32")} />
      )
    } else if (cfg.filterType === "slider") {
      const min = cfg.filterMin ?? 0
      const max = cfg.filterMax ?? 100
      const step = cfg.filterStep ?? 1
      const num = val !== "" ? Number(val) : min
      control = (
        <div className="flex flex-1 items-center gap-3">
          <input type="range" min={min} max={max} step={step} value={num}
            onChange={e => fire(e.target.value)}
            className="flex-1 accent-indigo-500" />
          <span className="w-10 shrink-0 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-center text-xs text-zinc-200">{num}</span>
        </div>
      )
    } else if (cfg.filterType === "date") {
      control = (
        <input type="date" value={val} onChange={e => fire(e.target.value)}
          className={cn(inputCls, "flex-1")} />
      )
    } else {
      control = (
        <input type="text" value={val} placeholder="Filtrar..." onChange={e => fire(e.target.value)}
          className={cn(inputCls, "flex-1")} />
      )
    }

    return (
      <div className="flex h-full flex-wrap items-center gap-2 px-4 py-2">
        {cfg.filterLabel && <label className="shrink-0 text-xs font-medium text-zinc-400">{cfg.filterLabel}</label>}
        {control}
      </div>
    )
  }

  if (type === "kpi") {
    const cols = data?.columns ?? []
    const vi = cfg.valueField ? cols.indexOf(cfg.valueField) : 0
    const raw = vi >= 0 && data?.rows[0] != null ? data.rows[0][vi] : null
    const val = raw != null ? fmtNum(Number(raw), cfg.format) : "—"
    const c = col(cfg.color)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-4">
        <p className="text-[2.5rem] font-bold leading-none" style={{ color: c }}>{val}</p>
        <p className="mt-1 max-w-full truncate text-xs text-zinc-500">{w.title}</p>
      </div>
    )
  }

  if (type === "stat") {
    const cols = data?.columns ?? []
    const vi = cfg.valueField ? cols.indexOf(cfg.valueField) : 0
    const raw = vi >= 0 && data?.rows[0] != null ? data.rows[0][vi] : null
    const val = raw != null ? fmtNum(Number(raw), cfg.format) : "—"
    const c = col(cfg.color)
    const trend = cfg.trend
    return (
      <div className="flex h-full items-center gap-3 px-4">
        {cfg.icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: c + "20", color: c }}>
            <DynIcon name={cfg.icon} className="h-6 w-6" strokeWidth={1.75} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-zinc-500">{w.title}</p>
          <p className="text-2xl font-bold leading-none" style={{ color: c }}>{val}</p>
          {trend != null && (
            <p className={cn("mt-0.5 text-xs", trend >= 0 ? "text-emerald-400" : "text-red-400")}>
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% {cfg.trendPeriod ?? ""}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (type === "table") {
    if (!data) return <div className="flex h-full items-center justify-center text-xs text-zinc-600">Configurá una query para ver datos</div>
    return (
      <div className="h-full overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>{data.columns.map(c => <th key={c} className="sticky top-0 border-b border-zinc-800 bg-zinc-900 px-3 py-1.5 text-left font-medium text-zinc-400">{c}</th>)}</tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 200).map((row, i) => (
              <tr key={i} className="border-b border-zinc-800/40 hover:bg-zinc-800/30">
                {(row as unknown[]).map((cell, j) => (
                  <td key={j} className="px-3 py-1.5 text-zinc-300">{cell == null ? <span className="text-zinc-600">NULL</span> : String(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Charts
  const optMap: Partial<Record<WidgetType, (w: Widget, d: QueryData | null) => object>> = {
    bar: barOpt, line: lineOpt, pie: pieOpt, gauge: gaugeOpt,
    scatter: scatterOpt, boxplot: boxplotOpt, heatmap: heatmapOpt,
    histogram: histogramOpt, funnel: funnelOpt, treemap: treemapOpt,
    radar: radarOpt, waterfall: waterfallOpt,
  }
  const optFn = optMap[type]
  if (!optFn) return <div className="flex h-full items-center justify-center text-xs text-zinc-600">Widget no soportado</div>
  const opt = optFn(w, data)
  return <ReactECharts option={opt} style={{ width: "100%", height: "100%" }} opts={{ renderer: "svg" }} />
}
