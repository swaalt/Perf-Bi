import type { Widget, WidgetType, AccentColor } from "@/components/dashboard/types"
import { defaultWidget, migrateWidget } from "@/components/dashboard/types"

export type ImportFormat = "perf-bi" | "superset" | "metabase" | "pbix" | "unknown"

export interface ImportDataSource {
  name: string
  id: string
  isNew: boolean
  needsPassword: boolean
}

export interface ImportResult {
  format: ImportFormat
  widgets: Widget[]
  settings?: { bg?: string }
  title?: string
  warning?: string
  dataSources?: ImportDataSource[]
}

// ── Type mapping ──────────────────────────────────────────────────────────────

function supersetType(vizType: string): WidgetType {
  const m: Record<string, WidgetType> = {
    bar: "bar", dist_bar: "bar", horizontal_bar: "bar", echarts_timeseries_bar: "bar",
    line: "line", area: "line", echarts_timeseries_line: "line", echarts_area: "line",
    pie: "pie", donut: "pie",
    table: "table", data_table: "table",
    big_number: "kpi", big_number_total: "kpi",
    scatter: "scatter", bubble: "scatter",
    histogram: "histogram",
    funnel: "funnel",
    treemap: "treemap",
    heatmap: "heatmap",
    gauge: "gauge",
    waterfall: "waterfall",
    radar: "radar",
    box_plot: "boxplot",
    image: "image",
  }
  return m[vizType] ?? "bar"
}

// Converts Superset meta.background → CSS color string or null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSupersetBg(bg: any): string | null {
  if (!bg || bg === "BACKGROUND_TRANSPARENT") return null
  if (typeof bg === "string") return bg.startsWith("#") || bg.startsWith("rgb") ? bg : null
  if (typeof bg === "object" && bg.r !== undefined) {
    return `rgba(${bg.r},${bg.g ?? 0},${bg.b ?? 0},${bg.a ?? 1})`
  }
  return null
}

function metabaseType(display: string): WidgetType {
  const m: Record<string, WidgetType> = {
    bar: "bar", row: "bar",
    line: "line", area: "line",
    pie: "pie",
    table: "table",
    scalar: "kpi", number: "kpi", smartscalar: "kpi",
    text: "text", heading: "text",
    funnel: "funnel",
    scatter: "scatter",
    waterfall: "waterfall",
    gauge: "gauge",
    progress: "progress",
  }
  return m[display] ?? "bar"
}

function pbixType(visualType: string): WidgetType {
  const m: Record<string, WidgetType> = {
    barChart: "bar", clusteredBarChart: "bar", stackedBarChart: "bar",
    hundredPercentStackedBarChart: "bar", clusteredColumnChart: "bar",
    stackedColumnChart: "bar", hundredPercentStackedColumnChart: "bar",
    lineChart: "line", areaChart: "line", stackedAreaChart: "line",
    lineStackedColumnComboChart: "line", lineClusteredColumnComboChart: "line",
    ribbonChart: "bar",
    pieChart: "pie", donutChart: "pie",
    tableEx: "table", matrix: "table", pivotTable: "table",
    card: "kpi", multiRowCard: "kpi", kpi: "kpi",
    scatterChart: "scatter",
    waterfallChart: "waterfall",
    funnel: "funnel",
    treemap: "treemap",
    radarChart: "radar",
    gaugeChart: "gauge",
    textbox: "text",
    image: "image",
    slicer: "filter",
  }
  return m[visualType] ?? "bar"
}

// ── Widget factory ────────────────────────────────────────────────────────────

let _z = 1
function resetZ() { _z = 1 }

function makeWidget(
  type: WidgetType, x: number, y: number, w: number, h: number, title: string,
): Widget {
  const base = defaultWidget(type, Math.round(x), Math.round(y), _z++)
  return {
    ...base,
    x: Math.round(x),
    y: Math.round(y),
    w: Math.max(80, Math.round(w)),
    h: Math.max(40, Math.round(h)),
    title,
  }
}

// ── HTML text extraction ──────────────────────────────────────────────────────

function extractText(html: string): string {
  if (!html) return ""
  if (typeof document !== "undefined") {
    const el = document.createElement("div")
    el.innerHTML = html
    return (el.textContent ?? el.innerText ?? "").trim()
  }
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

// ── CSS background extraction ─────────────────────────────────────────────────

function extractBackground(css: string): string | null {
  if (!css) return null

  // 1. CSS custom properties (any variant)
  const varNames = ["--bg", "--background", "--background-color", "--dashboard-bg", "--canvas-bg", "--body-bg"]
  for (const v of varNames) {
    const m = css.match(new RegExp(`${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;\\n}]+)`))
    if (m) { const c = m[1].trim(); if (isValidColor(c)) return c }
  }

  // 2. background / background-color in common selectors (handles Superset's .background, body, :root, etc.)
  // Use [\s\S] instead of . with /s flag — target is ES2017
  const selectorPatterns = [
    /\.background[^{]*\{[\s\S]*?background(?:-color)?\s*:\s*([^;}\n]+)/,
    /body\s*\{[\s\S]*?background(?:-color)?\s*:\s*([^;}\n]+)/,
    /:root\s*\{[\s\S]*?background(?:-color)?\s*:\s*([^;}\n]+)/,
    /\.dashboard[^{]*\{[\s\S]*?background(?:-color)?\s*:\s*([^;}\n]+)/,
    /\.grid-content[^{]*\{[\s\S]*?background(?:-color)?\s*:\s*([^;}\n]+)/,
    /\.canvas[^{]*\{[\s\S]*?background(?:-color)?\s*:\s*([^;}\n]+)/,
    /html\s*\{[\s\S]*?background(?:-color)?\s*:\s*([^;}\n]+)/,
  ]
  for (const re of selectorPatterns) {
    const m = css.match(re)
    if (m) { const c = m[1].trim(); if (isValidColor(c)) return c }
  }

  return null
}

function isValidColor(c: string): boolean {
  return Boolean(c) &&
    !c.startsWith("var(") &&
    !c.startsWith("inherit") &&
    !["transparent", "initial", "unset", "revert"].includes(c.toLowerCase())
}

// ── Jinja SQL cleanup ─────────────────────────────────────────────────────────

function cleanJinjaSql(sql: string): string {
  if (!sql) return ""
  let r = sql

  // Remove {% else %}...{% endif %} → keep the "if" branch only
  r = r.replace(/\{%-?\s*else\s*-?%\}[\s\S]*?\{%-?\s*endif\s*-?%\}/gi, "")

  // Remove remaining control tags (keep content between them)
  r = r.replace(/\{%-?[^%]*?-?%\}/g, "")

  // Replace time variables with sensible defaults
  r = r.replace(/\{\{\s*from_dttm\s*\}\}/g, "(NOW() - INTERVAL '1 hour')")
  r = r.replace(/\{\{\s*to_dttm\s*\}\}/g, "NOW()")

  // Replace filter_values(...)|where_in → ('*')
  r = r.replace(/\{\{[^}]*filter_values\s*\([^)]*\)\s*\|[^}]*\}\}/g, "('*')")

  // Replace remaining {{ }} expressions
  r = r.replace(/\{\{[^}]+\}\}/g, "NULL")

  // Clean up artifacts: empty parens, leading ANDs, 1=0
  r = r.replace(/AND\s+1\s*=\s*0/gi, "")
  r = r.replace(/WHERE\s+1\s*=\s*0/gi, "WHERE 1=1")
  r = r.replace(/\(\s*\n\s*\)/g, "(1=1)")
  r = r.replace(/WHERE\s+\(\s*\)/gi, "")
  r = r.replace(/AND\s+\(\s*\)/gi, "")
  r = r.replace(/WHERE\s+AND\s+/gi, "WHERE ")
  r = r.replace(/\bAND\s*\n(\s*\n)+\s*(GROUP|ORDER|LIMIT|HAVING)/gi, "\n$2")

  // Collapse 3+ blank lines
  r = r.replace(/\n{3,}/g, "\n\n")

  return r.trim()
}

// ── SQLAlchemy URI parser ─────────────────────────────────────────────────────

function parseUri(uri: string) {
  // e.g. postgresql+psycopg2://user:pass@host:5432/dbname
  const m = uri.match(/^([^+:]+)(?:\+[^:]*)?:\/\/([^:@/]*)(?::([^@]*))?@([^:/]*)(?::(\d+))?\/(.+)?$/)
  if (!m) return { type: "postgresql" as const }
  const [, dialect, username, password, host, portStr, database] = m
  const type = dialect.toLowerCase().startsWith("mysql") ? "mysql" as const
    : dialect.toLowerCase().startsWith("sqlite") ? "sqlite" as const
    : "postgresql" as const
  return {
    type,
    username: username || undefined,
    password: (password && password !== "XXXXXXXXXX") ? password : undefined,
    host: host || undefined,
    port: portStr ? parseInt(portStr) : undefined,
    database: database || undefined,
  }
}

// ── Chart field extraction ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractChartFields(params: any, vizType: string): { xField?: string; yField?: string } {
  if (!params) return {}

  // KPI (single metric, no x axis)
  if (vizType === "big_number_total" || vizType === "big_number") {
    const metric = params.metric ?? params.metrics?.[0]
    const col = metric?.column?.column_name ?? metric?.sqlExpression
    return col ? { yField: col } : {}
  }

  // Table: first groupby or all_columns column
  if (vizType === "table" || vizType === "data_table") {
    const cols: string[] = params.all_columns ?? params.groupby ?? []
    return cols.length >= 2 ? { xField: cols[0], yField: cols[1] }
      : cols.length === 1 ? { xField: cols[0] } : {}
  }

  // All other charts: x_axis + metrics
  const xField: string | undefined = params.x_axis ?? params.groupby?.[0]
  const metricsArr = Array.isArray(params.metrics) ? params.metrics : (params.metric ? [params.metric] : [])
  const yField: string | undefined = metricsArr[0]?.column?.column_name ?? metricsArr[0]?.sqlExpression

  return { xField, yField }
}

// ── Shared chart lookup type ──────────────────────────────────────────────────

type ChartInfo = {
  vizType: string
  name: string
  dataSourceId?: string
  query?: string
  xField?: string
  yField?: string
  imageUrl?: string
}

// ── Superset layout walker (recursive: GRID→ROW→COLUMN→ROW→CHART) ────────────

const CHART_COLOR_PALETTE: AccentColor[] = [
  "indigo", "violet", "rose", "emerald", "sky", "amber", "cyan", "orange", "pink", "teal",
]

function supersetLayoutToWidgets(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  position: Record<string, any>,
  chartsMap: Map<string, ChartInfo>,
  canvasW: number,
): Widget[] {
  const widgets: Widget[] = []
  const COL_W = canvasW / 12
  const H_UNIT = 8   // matches Superset's GRID_BASE (8 px per grid unit)
  const PAD = 4
  const GAP = 8
  let chartColorIdx = 0  // sequential accent color per chart widget

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function node(id: string): any { return position[id] }

  /**
   * Render a node at absolute canvas position (x, y).
   * Returns the total height consumed so the caller can advance its cursor.
   * Widths are always in the global 12-column grid (meta.width * COL_W).
   */
  function render(id: string, x: number, y: number): number {
    const n = node(id)
    if (!n) return 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta: any = n.meta ?? {}
    const nodeW = Number(meta.width ?? 12) * COL_W
    const nodeH = Number(meta.height ?? 12) * H_UNIT

    switch (n.type as string) {
      case "CHART": {
        const uuid  = String(meta.uuid ?? "")
        const idStr = String(meta.chartId ?? meta.sliceId ?? "")
        const info  = chartsMap.get(uuid) ?? chartsMap.get(idStr)
        const name  = info?.name ?? String(meta.sliceName ?? "Chart")
        const vizType = info?.vizType ?? "bar"
        const wType = supersetType(vizType)
        const ww = makeWidget(wType, x + PAD, y + PAD, nodeW - PAD * 2, nodeH - PAD * 2, name)
        // Assign sequential accent color to chart widgets
        if (wType !== "image" && wType !== "text") {
          ww.config.color = CHART_COLOR_PALETTE[chartColorIdx++ % CHART_COLOR_PALETTE.length]
        }
        if (info?.dataSourceId) ww.config.dataSourceId = info.dataSourceId
        if (info?.query)        ww.config.query        = info.query
        if (info?.xField)       ww.config.xField       = info.xField
        if (info?.yField)       ww.config.yField       = info.yField
        if (wType === "image" && info?.imageUrl) {
          ww.config.imageUrl = info.imageUrl
          ww.config.imageFit = "contain"
        }
        widgets.push(ww)
        return nodeH + GAP
      }

      case "MARKDOWN": {
        const raw = String(meta.code ?? "").trim()
        // Skip pure spacer divs (e.g. <div></div>, <div><br/></div>)
        if (!raw || /^<div[^>]*>\s*(<br\s*\/?>)?\s*<\/div>$/i.test(raw)) return nodeH + GAP
        const containsHtml = /<[a-z][\s\S]*>/i.test(raw)
        // Estimate height: count block elements to adjust minimum
        const blocks = (raw.match(/<(?:p|li|h[1-6]|br)[^>]*>/gi) ?? []).length + 1
        const estH = Math.max(nodeH, blocks * 22 + 24)
        const ww = makeWidget("text", x + PAD, y + PAD, nodeW - PAD * 2, estH - PAD * 2, "")
        ww.config.text = raw
        ww.config.isHtml = containsHtml
        ww.config.noBorder = true
        widgets.push(ww)
        return estH + GAP
      }

      case "HEADER": {
        const text = String(meta.text ?? meta.code ?? "").trim()
        if (!text) return nodeH + GAP
        const ww = makeWidget("text", x + PAD, y + PAD, nodeW - PAD * 2, Math.max(nodeH - PAD * 2, 48), text)
        ww.config.text = text
        ww.config.textSize = "2xl"
        ww.config.bold = true
        ww.config.noBorder = true
        widgets.push(ww)
        return nodeH + GAP
      }

      case "DIVIDER": {
        const ww = makeWidget("divider", x + PAD, y + PAD, nodeW - PAD * 2, 16, "")
        widgets.push(ww)
        return 24 + GAP
      }

      case "ROW": {
        // Children placed side-by-side; each advances x by its own meta.width
        const rowBg = parseSupersetBg(meta.background)
        let cX = x
        let maxH = 0
        for (const childId of (n.children ?? [])) {
          const child = node(childId)
          const childW = Number(child?.meta?.width ?? 12) * COL_W
          const h = render(childId, cX, y)
          cX += childW
          maxH = Math.max(maxH, h)
        }
        // If row has a background color, insert shape behind all its children
        if (rowBg && maxH > 0) {
          const shape = makeWidget("shape", x, y, Number(meta.width ?? 12) * COL_W, maxH, "")
          shape.config.bgColor = rowBg
          shape.config.noBorder = true
          shape.config.shapeRadius = 0
          shape.z = Math.max(0, _z - 50)
          widgets.splice(widgets.length - /* children just added */ widgets.filter(w => w.z > shape.z).length, 0, shape)
        }
        return maxH
      }

      case "COLUMN": {
        // Children stacked vertically within this column's x position
        const colBg = parseSupersetBg(meta.background)
        const firstChildIdx = widgets.length
        let cY = y
        for (const childId of (n.children ?? [])) {
          cY += render(childId, x, cY)
        }
        const totalH = Math.max(cY - y, GAP)
        // Insert background shape behind children when column has a background color
        if (colBg) {
          const shape = makeWidget("shape", x, y, nodeW, totalH, "")
          shape.config.bgColor = colBg
          shape.config.noBorder = true
          shape.config.shapeRadius = 0
          shape.z = Math.max(1, (widgets[firstChildIdx]?.z ?? _z) - 1)
          widgets.splice(firstChildIdx, 0, shape)
        }
        return totalH
      }

      default:
        return 0
    }
  }

  const rootId = Object.keys(position).find(k => position[k]?.type === "ROOT") ?? "ROOT_ID"
  const root = node(rootId)
  const gridId =
    root?.children?.[0] ??
    Object.keys(position).find(k => position[k]?.type === "GRID") ??
    "GRID_ID"
  const grid = node(gridId)
  if (!grid) return []

  let currentY = 16
  for (const rowId of (grid.children ?? [])) {
    currentY += render(rowId, 0, currentY)
  }

  return widgets
}

// ── Superset JSON (old single-file export) ────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSuperset(json: any, canvasW: number): ImportResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dash: any = json
  if (json.dashboards?.length > 0) dash = json.dashboards[0]

  const title: string = dash.dashboard_title ?? dash.title ?? "Superset Dashboard"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slicesArr: any[] = dash.slices ?? dash.charts ?? []
  const chartsMap = new Map<string, ChartInfo>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slicesArr.forEach((s: any) => {
    const info: ChartInfo = {
      vizType: s.viz_type ?? s.viz_name ?? "bar",
      name: s.slice_name ?? s.name ?? "Chart",
    }
    const id = String(s.id ?? s.slice_id ?? "")
    if (id) chartsMap.set(id, info)
    if (s.uuid) chartsMap.set(String(s.uuid), info)
  })

  let position: Record<string, unknown> | null = null
  if (typeof dash.position_json === "string") {
    try { position = JSON.parse(dash.position_json) } catch { /* ignore */ }
  } else if (dash.position && typeof dash.position === "object") {
    position = dash.position as Record<string, unknown>
  }

  resetZ()

  if (position) {
    const widgets = supersetLayoutToWidgets(position, chartsMap, canvasW)
    if (widgets.length > 0) return { format: "superset", widgets, title }
  }

  if (slicesArr.length > 0) {
    const items = slicesArr.map((s, i) => ({
      type: supersetType(s.viz_type ?? "bar"),
      title: s.slice_name ?? s.name ?? `Chart ${i + 1}`,
    }))
    return {
      format: "superset",
      widgets: gridLayout(items, canvasW),
      title,
      warning: "Posiciones no disponibles — layout automático aplicado",
    }
  }

  return { format: "superset", widgets: [], title, warning: "No se encontraron gráficos" }
}

// ── Superset ZIP (v1 export: full metadata) ───────────────────────────────────

async function parseSupersetZip(file: File, canvasW: number): Promise<ImportResult> {
  const [{ unzipSync, strFromU8 }, { load: yamlLoad }] = await Promise.all([
    import("fflate"),
    import("js-yaml"),
  ])

  const arrayBuffer = await file.arrayBuffer()
  const uint8 = new Uint8Array(arrayBuffer)

  let unzipped: ReturnType<typeof unzipSync>
  try {
    unzipped = unzipSync(uint8)
  } catch {
    return { format: "superset", widgets: [], warning: "No se pudo descomprimir el ZIP" }
  }

  const keys = Object.keys(unzipped)

  // Detect outer folder prefix (Superset wraps in dashboard_export_XXXX/)
  const metaKey = keys.find(k => k === "metadata.yaml" || k.endsWith("/metadata.yaml"))
  const hasDashFolder = keys.some(k => /\/dashboards\/|^dashboards\//.test(k))

  if (!metaKey || !hasDashFolder) {
    return {
      format: "unknown",
      widgets: [],
      warning: "ZIP no reconocido como exportación de Superset (falta metadata.yaml o carpeta dashboards/)",
    }
  }

  const prefix = metaKey === "metadata.yaml" ? "" : metaKey.slice(0, metaKey.length - "metadata.yaml".length)
  const dashKeys = keys.filter(k => k.startsWith(`${prefix}dashboards/`) && k.endsWith(".yaml"))
  const chartKeys = keys.filter(k => k.startsWith(`${prefix}charts/`) && k.endsWith(".yaml"))
  const datasetKeys = keys.filter(k => /\/datasets\/|^datasets\//.test(k) && k.endsWith(".yaml"))
  const dbKeys = keys.filter(k => k.startsWith(`${prefix}databases/`) && k.endsWith(".yaml"))

  // ── Parse databases → create/find Perf-Bi connectors ─────────────────────
  const dbIdMap = new Map<string, string>() // superset db_uuid → perf-bi source id
  const importedDs: ImportDataSource[] = []

  // Load existing data sources
  let existingSources: { id: string; name: string }[] = []
  try {
    const res = await fetch("/api/data-sources")
    if (res.ok) existingSources = await res.json()
  } catch { /* ignore */ }

  for (const dbKey of dbKeys) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db: any = yamlLoad(strFromU8(unzipped[dbKey]))
      if (!db?.database_name || !db?.uuid) continue

      const existing = existingSources.find(
        s => s.name.toLowerCase() === db.database_name.toLowerCase()
      )

      if (existing) {
        dbIdMap.set(String(db.uuid), existing.id)
        importedDs.push({ name: db.database_name, id: existing.id, isNew: false, needsPassword: false })
      } else {
        const parsed = parseUri(db.sqlalchemy_uri ?? "")
        const payload = {
          name: db.database_name,
          type: parsed.type,
          host: parsed.host,
          port: parsed.port,
          database: parsed.database,
          username: parsed.username,
          password: parsed.password ?? "",
        }
        try {
          const res = await fetch("/api/data-sources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          if (res.ok) {
            const created = await res.json()
            dbIdMap.set(String(db.uuid), created.id)
            importedDs.push({
              name: db.database_name,
              id: created.id,
              isNew: true,
              needsPassword: !parsed.password,
            })
          }
        } catch { /* ignore connector creation failure */ }
      }
    } catch { /* skip malformed db YAML */ }
  }

  // ── Parse datasets → uuid → {sql, databaseUuid} ───────────────────────────
  type DatasetInfo = { sql: string; databaseUuid: string }
  const datasetMap = new Map<string, DatasetInfo>()

  for (const dsKey of datasetKeys) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ds: any = yamlLoad(strFromU8(unzipped[dsKey]))
      if (!ds?.uuid) continue

      const rawSql: string = ds.sql
        ?? (ds.table_name ? `SELECT * FROM ${ds.schema ? `${ds.schema}.` : ""}${ds.table_name}` : "")
      const cleanedSql = cleanJinjaSql(rawSql)

      datasetMap.set(String(ds.uuid), {
        sql: cleanedSql,
        databaseUuid: String(ds.database_uuid ?? ""),
      })
    } catch { /* skip malformed */ }
  }

  // ── Parse charts → build full ChartInfo ──────────────────────────────────
  const chartsMap = new Map<string, ChartInfo>()

  for (const chartKey of chartKeys) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chart: any = yamlLoad(strFromU8(unzipped[chartKey]))
      if (!chart?.uuid) continue

      const vizType: string = chart.viz_type ?? "bar"
      const dataset = datasetMap.get(String(chart.dataset_uuid ?? ""))
      const dataSourceId = dataset ? dbIdMap.get(dataset.databaseUuid) : undefined

      const { xField, yField } = extractChartFields(chart.params, vizType)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p: any = chart.params ?? {}
      const imageUrl: string | undefined = vizType === "image"
        ? (p.url ?? p.image_url ?? p.imageUrl ?? undefined)
        : undefined

      chartsMap.set(String(chart.uuid), {
        vizType,
        name: chart.slice_name ?? chart.name ?? "Chart",
        dataSourceId,
        query: dataset?.sql,
        xField,
        yField,
        imageUrl,
      })
    } catch { /* skip malformed */ }
  }

  // ── Parse dashboard YAML ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dash: any
  try {
    dash = yamlLoad(strFromU8(unzipped[dashKeys[0]]))
  } catch {
    return { format: "superset", widgets: [], warning: "No se pudo parsear el YAML del dashboard" }
  }

  const title: string =
    dash?.dashboard_title ??
    dashKeys[0].replace(`${prefix}dashboards/`, "").replace(/\.yaml$/i, "").replace(/_/g, " ") ??
    "Superset Dashboard"

  // Extract canvas background from CSS
  const css: string = dash?.css ?? ""
  const canvasBg = extractBackground(css)

  const position = dash?.position
  if (!position || typeof position !== "object") {
    return { format: "superset", widgets: [], title, warning: "Dashboard sin posiciones en el YAML" }
  }

  resetZ()
  const widgets = supersetLayoutToWidgets(
    position as Record<string, unknown>,
    chartsMap,
    canvasW,
  )

  if (widgets.length === 0) {
    return { format: "superset", widgets: [], title, warning: "No se encontraron gráficos en el layout" }
  }

  return {
    format: "superset",
    widgets,
    title,
    settings: canvasBg ? { bg: canvasBg } : undefined,
    dataSources: importedDs.length > 0 ? importedDs : undefined,
  }
}

// ── Metabase parser ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMetabase(json: any, canvasW: number): ImportResult {
  const title: string = json.name ?? "Metabase Dashboard"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cards: any[] = json.ordered_cards ?? json.dashcards ?? []

  if (cards.length === 0) {
    return { format: "metabase", widgets: [], title, warning: "No se encontraron tarjetas" }
  }

  const COL_W = canvasW / 18
  const ROW_H = 80

  resetZ()
  const widgets: Widget[] = []

  for (const oc of cards) {
    const card = oc.card ?? oc
    const x = (oc.col ?? oc.column ?? 0) * COL_W + 4
    const y = (oc.row ?? 0) * ROW_H + 4
    const w = Math.max(80, (oc.size_x ?? oc.sizeX ?? oc.col_span ?? 4) * COL_W - 8)
    const h = Math.max(40, (oc.size_y ?? oc.sizeY ?? oc.row_span ?? 4) * ROW_H - 8)
    const display: string = card.display ?? card.visualization_type ?? "bar"
    const name: string = card.name ?? `Card ${widgets.length + 1}`

    if (display === "text" || display === "heading") {
      const text = (card.visualization_settings?.text ?? card.text ?? "") as string
      const ww = makeWidget("text", x, y, w, h, name)
      ww.config.text = text
      widgets.push(ww)
    } else {
      widgets.push(makeWidget(metabaseType(display), x, y, w, h, name))
    }
  }

  return { format: "metabase", widgets, title }
}

// ── PBIX parser ───────────────────────────────────────────────────────────────

async function parsePbix(file: File, canvasW: number): Promise<ImportResult> {
  const { unzipSync } = await import("fflate")

  const arrayBuffer = await file.arrayBuffer()
  const uint8 = new Uint8Array(arrayBuffer)

  let unzipped: ReturnType<typeof unzipSync>
  try {
    unzipped = unzipSync(uint8)
  } catch {
    return { format: "pbix", widgets: [], warning: "No se pudo leer el archivo PBIX (ZIP inválido)" }
  }

  const layoutEntry = unzipped["Report/Layout"]
  if (!layoutEntry) {
    return { format: "pbix", widgets: [], warning: "Archivo PBIX sin Report/Layout — formato no reconocido" }
  }

  let layout: unknown
  try {
    const decoded = new TextDecoder("utf-16le").decode(layoutEntry)
    layout = JSON.parse(decoded)
  } catch {
    return { format: "pbix", widgets: [], warning: "No se pudo parsear el layout del PBIX" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layoutObj = layout as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections: any[] = layoutObj.sections ?? []
  if (sections.length === 0) {
    return { format: "pbix", widgets: [], warning: "No se encontraron páginas en el PBIX" }
  }

  const section = sections[0]
  const title: string = section.displayName ?? file.name.replace(/\.pbix$/i, "")
  const srcW: number = section.width ?? 1280
  const scale = canvasW / srcW

  resetZ()
  const widgets: Widget[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const containers: any[] = section.visualContainers ?? []

  for (const vc of containers) {
    if (vc.z != null && Number(vc.z) < 0) continue

    const x = Math.round((vc.x ?? 0) * scale) + 4
    const y = Math.round((vc.y ?? 0) * scale) + 4
    const w = Math.max(80, Math.round((vc.width ?? 200) * scale) - 8)
    const h = Math.max(40, Math.round((vc.height ?? 150) * scale) - 8)

    let visualType = "card"
    let cardTitle = `Visual ${widgets.length + 1}`

    if (typeof vc.config === "string") {
      try {
        const cfg = JSON.parse(vc.config)
        const sv = cfg.singleVisual ?? cfg.singleVisualGroup?.singleVisual
        if (sv?.visualType) visualType = sv.visualType
        const titleProp = sv?.vcObjects?.title?.[0]?.properties?.text?.expr?.Literal?.Value
        if (typeof titleProp === "string") cardTitle = titleProp.replace(/^'|'$/g, "")
      } catch { /* ignore */ }
    }

    widgets.push(makeWidget(pbixType(visualType), x, y, w, h, cardTitle))
  }

  return { format: "pbix", widgets, title }
}

// ── Native Perf-Bi parser ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePerfBi(json: any): ImportResult {
  const items = Array.isArray(json) ? json : (json.items ?? [])
  const widgets = items.map((w: unknown) => migrateWidget(w as Record<string, unknown>))
  return { format: "perf-bi", widgets, settings: json.settings, title: json.title }
}

// ── Auto-grid fallback ────────────────────────────────────────────────────────

function gridLayout(items: { type: WidgetType; title: string }[], canvasW: number): Widget[] {
  const COLS = 2
  const PAD = 16
  const GAP = 12
  const cellW = (canvasW - PAD * 2 - GAP * (COLS - 1)) / COLS
  const cellH = 220

  resetZ()
  return items.map((item, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    return makeWidget(item.type, PAD + col * (cellW + GAP), PAD + row * (cellH + GAP), cellW, cellH, item.title)
  })
}

// ── Format detection ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectFormat(json: any): ImportFormat {
  if (!json || typeof json !== "object") return "unknown"
  if (json.items && Array.isArray(json.items)) return "perf-bi"
  if (Array.isArray(json) && json[0]?.type && json[0]?.x !== undefined && json[0]?.w !== undefined) return "perf-bi"
  if (json.dashboards && Array.isArray(json.dashboards)) return "superset"
  if (json.position_json !== undefined || json.slices !== undefined) return "superset"
  if (json.position && typeof json.position === "object" && json.dashboard_title !== undefined) return "superset"
  if (json.ordered_cards !== undefined || json.dashcards !== undefined) return "metabase"
  return "unknown"
}

// ── Labels ────────────────────────────────────────────────────────────────────

export const FORMAT_LABELS: Record<ImportFormat, string> = {
  "perf-bi": "Perf-Bi",
  superset: "Apache Superset",
  metabase: "Metabase",
  pbix: "Power BI (.pbix)",
  unknown: "Desconocido",
}

// ── Main entry ────────────────────────────────────────────────────────────────

export async function parseImport(file: File, canvasW: number): Promise<ImportResult> {
  const ext = file.name.toLowerCase()

  if (ext.endsWith(".pbix")) return parsePbix(file, canvasW)
  if (ext.endsWith(".zip")) return parseSupersetZip(file, canvasW)

  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    return { format: "unknown", widgets: [], warning: "El archivo no es JSON válido" }
  }

  const format = detectFormat(json)
  switch (format) {
    case "perf-bi":  return parsePerfBi(json)
    case "superset": return parseSuperset(json, canvasW)
    case "metabase": return parseMetabase(json, canvasW)
    default:
      return {
        format: "unknown",
        widgets: [],
        warning: "Formato no reconocido. Soportados: Perf-Bi JSON, Superset ZIP/JSON, Metabase JSON, PBIX",
      }
  }
}
