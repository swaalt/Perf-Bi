"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Plus, Save, Settings, Loader2, Grid3x3, X,
  BarChart2, LineChart, PieChart, Table2, Hash, TrendingUp, Type, Gauge,
  Minus, ImageIcon, Filter, Star, Activity, Square, AlignLeft,
  Download, Upload, FileJson, ChevronDown,
  ScatterChart, BoxSelect, Map as MapIcon, BarChart3, TrendingDown, TreeDeciduous, Radar, Layers,
  Copy, SlidersHorizontal, ChevronUp, Trash2, FolderOpen, CheckCircle2, AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { parseImport, FORMAT_LABELS } from "@/lib/import"
import type { ImportResult, ImportDataSource } from "@/lib/import"
import type { Widget, WidgetType, QueryData, DashboardSettings, PaperSize, PaperOrientation } from "@/components/dashboard/types"
import { defaultWidget, migrateWidget, TYPE_LABEL, TYPE_GROUPS, BG_PRESETS, PAPER_DEFS } from "@/components/dashboard/types"
import { WidgetPreview } from "@/components/dashboard/widget-preview"
import { ConfigPanel } from "@/components/dashboard/config-panel"

interface DashboardVar {
  id: string
  name: string       // used as {{name}} in SQL
  label: string      // display label in filter bar
  type: "text" | "select" | "date" | "number"
  options?: string   // comma-sep for select
  default?: string
}

interface StoredPayload { settings?: DashboardSettings; items?: unknown[]; vars?: DashboardVar[] }
interface DataSource { id: string; name: string; type: string }

const SNAP = 8
const MIN_W = 80
const MIN_H = 40

type ResizeDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"
const RESIZE_DIRS: ResizeDir[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"]
const CURSOR: Record<ResizeDir, string> = {
  nw: "nw-resize", n: "n-resize", ne: "ne-resize", e: "e-resize",
  se: "se-resize", s: "s-resize", sw: "sw-resize", w: "w-resize",
}

const TYPE_ICONS: Record<WidgetType, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  bar: BarChart2, line: LineChart, pie: PieChart, table: Table2, kpi: Hash,
  stat: TrendingUp, text: Type, gauge: Gauge, divider: Minus,
  image: ImageIcon, filter: Filter, icon: Star,
  metric: Activity, shape: Square, progress: AlignLeft,
  scatter: ScatterChart, boxplot: BoxSelect, heatmap: MapIcon,
  histogram: BarChart3, funnel: TrendingDown, treemap: TreeDeciduous,
  radar: Radar, waterfall: Layers,
}

const FLAT = new Set<WidgetType>(["text", "divider", "filter", "image", "icon", "shape"])

function applyFilters(sql: string, fv: Map<string, string>) {
  let out = sql
  fv.forEach((v, k) => { out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v) })
  return out
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [dashName, setDashName] = useState("")
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [settings, setSettings] = useState<DashboardSettings>({
    bg: "#09090b", snapGrid: true, paperSize: "a4", paperOrientation: "landscape",
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [queryData, setQueryData] = useState<Map<string, QueryData>>(new Map())
  const [filterValues, setFilterValues] = useState<Map<string, string>>(new Map())
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showCanvasSettings, setShowCanvasSettings] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importModal, setImportModal] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importMode, setImportMode] = useState<"add" | "replace">("replace")
  const [dashVars, setDashVars] = useState<DashboardVar[]>([])
  const [dashVarValues, setDashVarValues] = useState<Map<string, string>>(new Map())
  const [showVarsPanel, setShowVarsPanel] = useState(false)
  const [filterBarOpen, setFilterBarOpen] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fileImportRef = useRef<HTMLInputElement>(null)
  const [viewportW, setViewportW] = useState(0)

  const mark = useCallback(() => setDirty(true), [])

  // Refs so pointer handlers always see latest state
  const snapRef = useRef(settings.snapGrid)
  useEffect(() => { snapRef.current = settings.snapGrid }, [settings.snapGrid])

  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizeRef = useRef<{
    id: string; dir: ResizeDir
    startX: number; startY: number
    origX: number; origY: number; origW: number; origH: number
  } | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch(`/api/dashboards/${id}`).then(r => r.json()),
      fetch("/api/data-sources").then(r => r.ok ? r.json() : []),
    ])
      .then(([dash, sources]: [{ name: string; widgets: string }, DataSource[]]) => {
        setDashName(dash.name ?? "")
        try {
          const payload: StoredPayload = JSON.parse(dash.widgets)
          if (Array.isArray(payload)) {
            setWidgets(payload.map(w => migrateWidget(w as Record<string, unknown>)))
          } else {
            setWidgets((payload.items ?? []).map(w => migrateWidget(w as Record<string, unknown>)))
            if (payload.settings) setSettings(s => ({ ...s, ...payload.settings }))
            if (payload.vars) {
              setDashVars(payload.vars)
              const initVals = new Map<string, string>()
              payload.vars.forEach(v => { if (v.default) initVals.set(v.name, v.default) })
              setDashVarValues(initVals)
            }
          }
        } catch { setWidgets([]) }
        setDataSources(Array.isArray(sources) ? sources : [])
      })
      .catch(() => router.push("/dashboards"))
      .finally(() => setLoading(false))
  }, [id, router])

  // ── Measure viewport width ─────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollAreaRef.current
    if (!el) return
    const update = () => setViewportW(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Pointer drag + resize ─────────────────────────────────────────────────
  useEffect(() => {
    function snap(v: number) { return snapRef.current ? Math.round(v / SNAP) * SNAP : v }

    function onPointerMove(e: PointerEvent) {
      if (dragRef.current) {
        const r = dragRef.current
        const dx = e.clientX - r.startX
        const dy = e.clientY - r.startY
        setWidgets(prev => prev.map(w =>
          w.id === r.id
            ? { ...w, x: snap(Math.max(0, r.origX + dx)), y: snap(Math.max(0, r.origY + dy)) }
            : w
        ))
        return
      }

      if (resizeRef.current) {
        const r = resizeRef.current
        const dx = e.clientX - r.startX
        const dy = e.clientY - r.startY

        let nx = r.origX, ny = r.origY, nw = r.origW, nh = r.origH

        if (r.dir.includes("e")) nw = Math.max(MIN_W, r.origW + dx)
        if (r.dir.includes("w")) { nw = Math.max(MIN_W, r.origW - dx); nx = r.origX + r.origW - nw }
        if (r.dir.includes("s")) nh = Math.max(MIN_H, r.origH + dy)
        if (r.dir.includes("n")) { nh = Math.max(MIN_H, r.origH - dy); ny = r.origY + r.origH - nh }

        setWidgets(prev => prev.map(w =>
          w.id === r.id ? { ...w, x: snap(nx), y: snap(ny), w: snap(nw), h: snap(nh) } : w
        ))
      }
    }

    function onPointerUp() {
      if (dragRef.current || resizeRef.current) {
        dragRef.current = null
        resizeRef.current = null
        setDirty(true)
      }
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault()
        // trigger save via button click to reuse current closures
        document.getElementById("save-btn")?.click()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault()
        setSelectedId(sid => { if (sid) { setTimeout(() => duplicateWidget(sid), 0) } return sid })
        return
      }

      if (!selectedId) return

      if (e.key === "Escape") { setSelectedId(null); return }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        deleteWidget(selectedId)
        return
      }

      const step = e.shiftKey ? 1 : SNAP
      if (e.key === "ArrowLeft")  { e.preventDefault(); nudge(selectedId, -step, 0) }
      if (e.key === "ArrowRight") { e.preventDefault(); nudge(selectedId,  step, 0) }
      if (e.key === "ArrowUp")    { e.preventDefault(); nudge(selectedId, 0, -step) }
      if (e.key === "ArrowDown")  { e.preventDefault(); nudge(selectedId, 0,  step) }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // ── Widget actions ────────────────────────────────────────────────────────
  function nudge(wid: string, dx: number, dy: number) {
    setWidgets(prev => prev.map(w => w.id === wid ? { ...w, x: Math.max(0, w.x + dx), y: Math.max(0, w.y + dy) } : w))
    mark()
  }

  function startDrag(e: React.PointerEvent, w: Widget) {
    dragRef.current = { id: w.id, startX: e.clientX, startY: e.clientY, origX: w.x, origY: w.y }
  }

  function startResize(e: React.PointerEvent, w: Widget, dir: ResizeDir) {
    e.stopPropagation(); e.preventDefault()
    resizeRef.current = { id: w.id, dir, startX: e.clientX, startY: e.clientY, origX: w.x, origY: w.y, origW: w.w, origH: w.h }
  }

  const runWidgetQuery = useCallback(async (w: Widget, fv: Map<string, string>) => {
    if (!w.config.dataSourceId || !w.config.query) return
    try {
      const res = await fetch("/api/query/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSourceId: w.config.dataSourceId, sql: applyFilters(w.config.query, fv) }),
      })
      const d = await res.json()
      if (res.ok) setQueryData(prev => new Map(prev).set(w.id, { columns: d.columns, rows: d.rows }))
    } catch { /* silent */ }
  }, [])

  function onFilterChange(name: string, value: string) {
    const newFv = new Map(filterValues).set(name, value)
    setFilterValues(newFv)
    const merged = new Map(newFv)
    dashVarValues.forEach((v, k) => merged.set(k, v))
    const fw = widgets.find(w => w.type === "filter" && w.config.filterName === name)
    fw?.config.linkedWidgetIds?.forEach(wid => {
      const linked = widgets.find(w => w.id === wid)
      if (linked) runWidgetQuery(linked, merged)
    })
  }

  function addWidget(type: WidgetType) {
    const maxZ = widgets.length > 0 ? Math.max(...widgets.map(w => w.z)) : 0
    const w = defaultWidget(type, 80 + Math.random() * 80, 80 + Math.random() * 80, maxZ + 1)
    setWidgets(prev => [...prev, w])
    setSelectedId(w.id)
    setShowPicker(false)
    mark()
  }

  function updateWidget(updated: Widget) {
    setWidgets(prev => prev.map(w => w.id === updated.id ? updated : w))
    mark()
  }

  function deleteWidget(wid: string) {
    setWidgets(prev => prev.filter(w => w.id !== wid))
    if (selectedId === wid) setSelectedId(null)
    mark()
  }

  function duplicateWidget(wid: string) {
    const orig = widgets.find(w => w.id === wid)
    if (!orig) return
    const maxZ = Math.max(...widgets.map(w => w.z), 0)
    const dupe: Widget = { ...orig, id: Math.random().toString(36).slice(2, 11), x: orig.x + 24, y: orig.y + 24, z: maxZ + 1 }
    setWidgets(prev => [...prev, dupe])
    setSelectedId(dupe.id)
    mark()
  }

  function bringToFront(wid: string) {
    const maxZ = Math.max(...widgets.map(w => w.z), 0)
    setWidgets(prev => prev.map(w => w.id === wid ? { ...w, z: maxZ + 1 } : w))
    mark()
  }

  function sendToBack(wid: string) {
    const minZ = Math.min(...widgets.map(w => w.z), 0)
    setWidgets(prev => prev.map(w => w.id === wid ? { ...w, z: minZ - 1 } : w))
    mark()
  }

  function onQueryRun(wid: string, columns: string[], rows: unknown[][]) {
    setQueryData(prev => new Map(prev).set(wid, { columns, rows }))
  }

  // ── Export PDF ────────────────────────────────────────────────────────────
  async function exportPDF() {
    if (!canvasRef.current || exporting) return
    setExporting(true)
    setSelectedId(null)
    // Give React time to deselect + ECharts to fully paint
    await new Promise(r => setTimeout(r, 300))
    try {
      const { jsPDF } = await import("jspdf")
      const { toPng } = await import("html-to-image")
      const el = canvasRef.current
      const scrollEl = el.parentElement!

      const paperSize = settings.paperSize ?? "canvas"
      const orient = settings.paperOrientation ?? "landscape"
      // Canvas mode: full canvas = one page, width = canvasW mm
      const pWmm = paperSize === "canvas" ? cW : (orient === "landscape" ? PAPER_DEFS[paperSize].wL : PAPER_DEFS[paperSize].hL)
      const scale = pWmm / cW
      void scrollEl

      const { lines: breakLines, startY, endY } = pageBreaks

      // Capture full canvas once (browser handles oklab/oklch via foreignObject)
      const fullDataUrl = await toPng(el, {
        width: cW,
        height: cH,
        pixelRatio: 1,
        skipFonts: true,
        filter: (node) => !node.classList?.contains("no-export"),
        style: { overflow: "visible" },
      })
      const img = new Image()
      img.src = fullDataUrl
      await new Promise<void>(r => { img.onload = () => r() })

      // Build slices from precomputed smart page breaks
      const sliceEdges = [startY, ...breakLines, endY]
      let doc: InstanceType<typeof jsPDF> | null = null
      for (let i = 0; i < sliceEdges.length - 1; i++) {
        const sliceStartY = sliceEdges[i]
        const sliceEndY   = sliceEdges[i + 1]
        const sliceH = sliceEndY - sliceStartY
        if (sliceH <= 0) continue

        // Each page has fixed width = pWmm; height proportional to slice
        const slicePHmm = sliceH * scale
        if (!doc) {
          doc = new jsPDF({ orientation: orient, unit: "mm", format: [pWmm, slicePHmm] })
        } else {
          doc.addPage([pWmm, slicePHmm], orient)
        }

        const pageCanvas = document.createElement("canvas")
        pageCanvas.width  = cW
        pageCanvas.height = sliceH
        const ctx = pageCanvas.getContext("2d")!
        ctx.fillStyle = settings.bg ?? "#09090b"
        ctx.fillRect(0, 0, cW, sliceH)
        ctx.drawImage(img, 0, sliceStartY, cW, sliceH, 0, 0, cW, sliceH)
        doc.addImage(pageCanvas.toDataURL("image/png"), "PNG", 0, 0, pWmm, slicePHmm)
      }

      doc?.save(`${dashName || "dashboard"}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  // ── Export JSON ────────────────────────────────────────────────────────────
  function exportJSON() {
    const payload = { settings, items: widgets, vars: dashVars }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `${dashName || "dashboard"}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import file picker ────────────────────────────────────────────────────
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setImportLoading(true)
    setImportResult(null)
    setImportModal(true)
    try {
      const result = await parseImport(file, cW)
      setImportResult(result)
    } finally {
      setImportLoading(false)
    }
  }

  function applyImport() {
    if (!importResult) return
    const incoming = importResult.widgets
    if (importMode === "replace") {
      setWidgets(incoming)
      if (importResult.settings) setSettings(s => ({ ...s, ...importResult.settings }))
    } else {
      const maxZ = widgets.length > 0 ? Math.max(...widgets.map(w => w.z)) : 0
      setWidgets(prev => [...prev, ...incoming.map((w, i) => ({ ...w, z: maxZ + i + 1 }))])
    }
    mark()
    setImportModal(false)
    setImportResult(null)
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const payload: StoredPayload = { settings, items: widgets, vars: dashVars }
      await fetch(`/api/dashboards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: dashName, widgets: JSON.stringify(payload) }),
      })
      setDirty(false)
    } finally { setSaving(false) }
  }

  async function handleDuplicate() {
    const res = await fetch(`/api/dashboards/${id}/duplicate`, { method: "POST" })
    if (res.ok) {
      const copy = await res.json()
      router.push(`/dashboards/${copy.id}`)
    }
  }

  // Combined filter values: widget filters + dashboard vars
  function allFilterValues() {
    const merged = new Map(filterValues)
    dashVarValues.forEach((v, k) => merged.set(k, v))
    return merged
  }

  function onDashVarChange(name: string, value: string) {
    const newVals = new Map(dashVarValues).set(name, value)
    setDashVarValues(newVals)
    // Re-run all widgets that reference this var in their query
    const merged = new Map(filterValues)
    newVals.forEach((v, k) => merged.set(k, v))
    widgets.forEach(w => {
      if (w.config.query?.includes(`{{${name}}}`)) runWidgetQuery(w, merged)
    })
  }

  const selected = widgets.find(w => w.id === selectedId) ?? null

  // Canvas width fills viewport; paper determines aspect ratio and page height
  const cW = viewportW > 0 ? Math.max(400, viewportW - 32) : 1200
  const paper = PAPER_DEFS[settings.paperSize && settings.paperSize !== "canvas" ? settings.paperSize : "a4"]
  const orient = settings.paperOrientation ?? "landscape"
  const pWmm = orient === "landscape" ? paper.wL : paper.hL
  const pHmm = orient === "landscape" ? paper.hL : paper.wL
  const pageHeightPx = Math.round(cW * pHmm / pWmm)

  // Canvas grows vertically to hold all widgets (minimum 1 page)
  const numPages = useMemo(() => {
    if (!widgets.length) return 1
    const maxY = Math.max(...widgets.map(w => w.y + w.h))
    return Math.max(1, Math.ceil(maxY / pageHeightPx))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgets, pageHeightPx])
  const cH = pageHeightPx * numPages

  // Page break positions (grid = visual, smart = PDF export)
  const pageBreaks = useMemo(() => {
    // Grid lines at every pageHeightPx boundary
    const gridLines: number[] = []
    for (let n = 1; n < numPages; n++) gridLines.push(n * pageHeightPx)

    // Smart breaks: shift to avoid slicing widgets
    const PAD = 48
    const startY = widgets.length ? Math.max(0, Math.min(...widgets.map(w => w.y)) - PAD) : 0
    const endY   = cH

    const smartLines: number[] = []
    let y = startY
    while (y < endY) {
      const ideal = y + pageHeightPx
      if (ideal >= endY) break
      const split = widgets.filter(w => w.y < ideal && w.y + w.h > ideal)
      let cut = ideal
      if (split.length > 0) {
        const top = Math.min(...split.map(w => w.y)) - PAD
        if (top > y + pageHeightPx * 0.2) cut = top
      }
      smartLines.push(cut)
      y = cut
    }
    return { gridLines, lines: smartLines, pageHeightPx, startY, endY }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgets, pageHeightPx, numPages, cH])

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-zinc-600" /></div>
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ─── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-5 py-3 z-20">
        <Link href="/dashboards" className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboards
        </Link>
        <span className="text-zinc-700">/</span>
        <input
          value={dashName}
          onChange={e => { setDashName(e.target.value); mark() }}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
          placeholder="Nombre del dashboard"
        />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {dirty && <span className="text-[11px] text-zinc-600">Sin guardar</span>}

          {/* Snap toggle */}
          <button
            onClick={() => setSettings(s => ({ ...s, snapGrid: !s.snapGrid }))}
            title={settings.snapGrid ? "Snap activado" : "Snap desactivado"}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              settings.snapGrid
                ? "bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/20"
                : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
            )}>
            <Grid3x3 className="h-3.5 w-3.5" />
            Snap
          </button>

          {/* Canvas settings */}
          <div className="relative">
            <button onClick={() => setShowCanvasSettings(p => !p)}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors">
              <Settings className="h-3.5 w-3.5" />
              Canvas
            </button>
            {showCanvasSettings && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowCanvasSettings(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-semibold text-zinc-300">Ajustes del canvas</p>
                    <button onClick={() => setShowCanvasSettings(false)} className="text-zinc-600 hover:text-zinc-300"><X className="h-4 w-4" /></button>
                  </div>

                  <p className="mb-2 text-xs text-zinc-400">Fondo</p>
                  <div className="mb-2 grid grid-cols-5 gap-1.5">
                    {BG_PRESETS.map(p => (
                      <button key={p.label} onClick={() => { setSettings(s => ({ ...s, bg: p.value })); mark() }} title={p.label}
                        className={cn("h-9 w-full rounded-lg border transition-all",
                          settings.bg === p.value ? "border-indigo-500 ring-1 ring-indigo-500/50" : "border-zinc-700 hover:border-zinc-500"
                        )}
                        style={{ background: p.value }} />
                    ))}
                  </div>
                  <div className="mb-4 flex items-center gap-2">
                    <input type="color"
                      value={(settings.bg ?? "#09090b").startsWith("#") ? (settings.bg ?? "#09090b") : "#09090b"}
                      onChange={e => { setSettings(s => ({ ...s, bg: e.target.value })); mark() }}
                      className="h-8 w-12 cursor-pointer rounded border border-zinc-700 bg-zinc-800 p-0.5" />
                    <input value={settings.bg ?? ""} onChange={e => { setSettings(s => ({ ...s, bg: e.target.value })); mark() }}
                      placeholder="CSS color / gradient" className="input flex-1 text-xs" />
                  </div>

                  <p className="mb-2 text-xs text-zinc-400">Tamaño del canvas</p>
                  {(!settings.paperSize || settings.paperSize === "canvas") ? (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div>
                        <label className="mb-1 block text-[10px] text-zinc-500">Alto base (px)</label>
                        <input type="number" min={600} max={6000} step={100} value={settings.canvasH ?? 2200}
                          onChange={e => { setSettings(s => ({ ...s, canvasH: Number(e.target.value) })); mark() }}
                          className="input text-xs" />
                      </div>
                    </div>
                  ) : (
                    <p className="mb-4 text-[11px] text-zinc-500">
                      El tamaño del canvas se calcula automáticamente según el papel seleccionado.
                    </p>
                  )}

                  <p className="mb-2 text-xs text-zinc-400">Papel PDF</p>
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-zinc-500">Tamaño</label>
                      <select value={settings.paperSize ?? "canvas"}
                        onChange={e => { setSettings(s => ({ ...s, paperSize: e.target.value as PaperSize })); mark() }}
                        className="input text-xs w-full">
                        <option value="canvas">Canvas completo</option>
                        {(Object.entries(PAPER_DEFS) as [Exclude<PaperSize,"canvas">, { label: string }][]).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-zinc-500">Orientación</label>
                      <select value={settings.paperOrientation ?? "landscape"}
                        onChange={e => { setSettings(s => ({ ...s, paperOrientation: e.target.value as PaperOrientation })); mark() }}
                        className="input text-xs w-full">
                        <option value="landscape">Horizontal</option>
                        <option value="portrait">Vertical</option>
                      </select>
                    </div>
                  </div>
                  {(settings.paperSize && settings.paperSize !== "canvas") ? (
                    <p className="text-[10px] text-zinc-600">
                      Corte cada ~{pageBreaks.pageHeightPx}px · {pageBreaks.gridLines.length + 1} página{pageBreaks.gridLines.length > 0 ? "s" : ""}
                    </p>
                  ) : (
                    <p className="text-[10px] text-zinc-600">Sin cortes — el canvas completo es una sola página</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Hidden file input for import */}
          <input ref={fileImportRef} type="file" accept=".json,.pbix,.zip" className="hidden" onChange={handleImportFile} />

          {/* Export / Import dropdown */}
          <div className="relative">
            <button onClick={() => setShowExportMenu(p => !p)}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors">
              <Download className="h-3.5 w-3.5" />
              Exportar
              <ChevronDown className="h-3 w-3 text-zinc-500" />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full z-20 mt-1.5 w-44 rounded-xl border border-zinc-800 bg-zinc-900 py-1.5 shadow-2xl">
                  <button onClick={() => { exportPDF(); setShowExportMenu(false) }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors">
                    {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" /> : <Download className="h-3.5 w-3.5 text-zinc-500" />}
                    Exportar PDF
                  </button>
                  <button onClick={() => { exportJSON(); setShowExportMenu(false) }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors">
                    <FileJson className="h-3.5 w-3.5 text-zinc-500" />
                    Exportar JSON
                  </button>
                  <div className="my-1 border-t border-zinc-800" />
                  <button onClick={() => { setShowExportMenu(false); fileImportRef.current?.click() }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors">
                    <Upload className="h-3.5 w-3.5 text-zinc-500" />
                    Importar dashboard...
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Duplicate dashboard */}
          <button onClick={handleDuplicate} title="Duplicar dashboard"
            className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors">
            <Copy className="h-3.5 w-3.5" />
            Duplicar
          </button>

          {/* Dashboard vars panel */}
          <div className="relative">
            <button onClick={() => setShowVarsPanel(p => !p)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                dashVars.length > 0
                  ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              )}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Variables {dashVars.length > 0 && <span className="ml-0.5 rounded-full bg-emerald-500/20 px-1.5 text-[10px]">{dashVars.length}</span>}
            </button>
            {showVarsPanel && <VarsPanel vars={dashVars} onChange={v => { setDashVars(v); mark() }} onClose={() => setShowVarsPanel(false)} />}
          </div>

          {/* Import */}
          <button onClick={() => fileImportRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors">
            <FolderOpen className="h-3.5 w-3.5" />
            Importar
          </button>

          {/* Save */}
          <button id="save-btn" onClick={handleSave} disabled={saving || !dirty}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              dirty ? "bg-indigo-500 text-white hover:bg-indigo-600" : "cursor-not-allowed bg-zinc-800 text-zinc-600"
            )}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar
          </button>

          {/* Widget picker */}
          <div className="relative">
            <button onClick={() => setShowPicker(p => !p)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600 transition-colors">
              <Plus className="h-3.5 w-3.5" />
              Widget
            </button>
            {showPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-2xl max-h-[calc(100vh-80px)] overflow-y-auto">
                  {TYPE_GROUPS.map(g => (
                    <div key={g.label} className="mb-3 last:mb-0">
                      <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-600">{g.label}</p>
                      <div className="grid grid-cols-2 gap-0.5">
                        {g.types.map(t => {
                          const Icon = TYPE_ICONS[t]
                          return (
                            <button key={t} onClick={() => addWidget(t)}
                              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
                              <Icon className="h-3.5 w-3.5 shrink-0 text-indigo-400" strokeWidth={1.75} />
                              <span className="truncate">{TYPE_LABEL[t]}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Dashboard filter bar ────────────────────────────────────────── */}
      {dashVars.length > 0 && (
        <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2 px-5 py-2">
            <button onClick={() => setFilterBarOpen(p => !p)}
              className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
              {filterBarOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Filtros
            </button>
            {filterBarOpen && (
              <div className="flex flex-wrap items-center gap-3">
                {dashVars.map(v => {
                  const val = dashVarValues.get(v.name) ?? v.default ?? ""
                  return (
                    <div key={v.id} className="flex items-center gap-1.5">
                      <label className="text-[11px] text-zinc-500 shrink-0">{v.label || v.name}</label>
                      {v.type === "select" ? (
                        <select value={val} onChange={e => onDashVarChange(v.name, e.target.value)}
                          className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none">
                          <option value="">Todos</option>
                          {(v.options ?? "").split(",").map(o => o.trim()).filter(Boolean).map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : v.type === "date" ? (
                        <input type="date" value={val} onChange={e => onDashVarChange(v.name, e.target.value)}
                          className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none" />
                      ) : v.type === "number" ? (
                        <input type="number" value={val} onChange={e => onDashVarChange(v.name, e.target.value)}
                          className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none" />
                      ) : (
                        <input type="text" value={val} onChange={e => onDashVarChange(v.name, e.target.value)}
                          placeholder={`{{${v.name}}}`}
                          className="w-32 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Canvas scroll area */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-x-hidden overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setSelectedId(null) }}
        >
          {/* Canvas */}
          <div
            ref={canvasRef}
            className="relative select-none"
            style={{ width: cW, height: cH }}
            onClick={e => { if (e.target === e.currentTarget) setSelectedId(null) }}
          >
            {/* Background */}
            <div className="absolute inset-0" style={{ background: settings.bg ?? "#09090b" }} />
            {/* Dot grid — only on default dark bg */}
            {(settings.bg ?? "#09090b") === "#09090b" && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: "radial-gradient(circle, rgba(63,63,70,0.45) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />
            )}

            {/* Page break guides — no-export so they don't appear in PDF */}
            {pageBreaks.gridLines.map((y, i) => (
              <div
                key={y}
                className="no-export pointer-events-none absolute left-0 right-0 flex items-center"
                style={{ top: y - 12 }}
              >
                <div className="flex-1 border-t border-dashed border-zinc-500/70" />
                <span className="mx-3 shrink-0 select-none whitespace-nowrap rounded border border-zinc-600/60 bg-zinc-900/90 px-3 py-1 text-[11px] font-medium text-zinc-400">
                  Corte · Página {i + 2}
                </span>
                <div className="flex-1 border-t border-dashed border-zinc-500/70" />
              </div>
            ))}

            {/* Empty state */}
            {widgets.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <p className="text-sm text-zinc-600">El dashboard está vacío</p>
                <button onClick={() => setShowPicker(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 transition-colors">
                  <Plus className="h-4 w-4" /> Agregar widget
                </button>
              </div>
            )}

            {/* Widgets */}
            {[...widgets].sort((a, b) => a.z - b.z).map(w => (
              <CanvasWidget
                key={w.id}
                widget={w}
                data={queryData.get(w.id) ?? null}
                filterValues={allFilterValues()}
                selected={selectedId === w.id}
                onSelect={() => setSelectedId(prev => prev === w.id ? prev : w.id)}
                onStartDrag={(e) => startDrag(e, w)}
                onStartResize={(e, dir) => startResize(e, w, dir)}
                onFilterChange={onFilterChange}
              />
            ))}
          </div>
        </div>

        {/* Config panel */}
        {selected && (
          <ConfigPanel
            widget={selected}
            widgets={widgets}
            dataSources={dataSources}
            data={queryData.get(selected.id) ?? null}
            filterValues={allFilterValues()}
            onUpdate={updateWidget}
            onClose={() => setSelectedId(null)}
            onQueryRun={onQueryRun}
            onDelete={() => deleteWidget(selected.id)}
            onDuplicate={() => duplicateWidget(selected.id)}
            onBringToFront={() => bringToFront(selected.id)}
            onSendToBack={() => sendToBack(selected.id)}
          />
        )}
      </div>

      {/* ─── Import modal ────────────────────────────────────────────────── */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-zinc-100">Importar dashboard</h2>
              </div>
              <button onClick={() => { setImportModal(false); setImportResult(null) }}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Loading */}
            {importLoading && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                <p className="text-xs text-zinc-500">Analizando archivo...</p>
              </div>
            )}

            {/* Result */}
            {!importLoading && importResult && (
              <>
                {/* Format badge */}
                <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
                  <div className="flex flex-col gap-0.5 flex-1">
                    <p className="text-[11px] text-zinc-500">Formato detectado</p>
                    <p className="text-sm font-medium text-zinc-100">{FORMAT_LABELS[importResult.format]}</p>
                    {importResult.title && (
                      <p className="text-[11px] text-zinc-500 truncate">{importResult.title}</p>
                    )}
                    {importResult.settings?.bg && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full border border-zinc-600 shrink-0"
                          style={{ background: importResult.settings.bg }} />
                        <p className="text-[10px] text-zinc-500 font-mono truncate">{importResult.settings.bg}</p>
                      </div>
                    )}
                  </div>
                  {importResult.widgets.length > 0
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    : <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  }
                </div>

                {/* Widget count */}
                {importResult.widgets.length > 0 && (
                  <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-4 py-2.5">
                    <p className="text-sm font-semibold text-indigo-300">
                      {importResult.widgets.length} widget{importResult.widgets.length !== 1 ? "s" : ""} encontrado{importResult.widgets.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}

                {/* Data sources */}
                {importResult.dataSources && importResult.dataSources.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Conectores de datos</p>
                    {importResult.dataSources.map((ds: ImportDataSource) => (
                      <div key={ds.id} className={cn(
                        "flex items-center gap-2.5 rounded-lg border px-3 py-2",
                        ds.isNew ? "border-emerald-500/30 bg-emerald-500/8" : "border-zinc-700 bg-zinc-900"
                      )}>
                        <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", ds.isNew ? "bg-emerald-400" : "bg-zinc-500")} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-200 truncate">{ds.name}</p>
                          <p className="text-[10px] text-zinc-500">{ds.isNew ? "Creado" : "Existente"}</p>
                        </div>
                        {ds.needsPassword && (
                          <Link href="/connectors" onClick={() => setImportModal(false)}
                            className="shrink-0 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400 hover:bg-amber-500/30 transition-colors">
                            Completar contraseña →
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Warning */}
                {importResult.warning && (
                  <p className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-400">
                    {importResult.warning}
                  </p>
                )}

                {/* Mode */}
                {importResult.widgets.length > 0 && (
                  <div className="flex gap-2">
                    {(["replace", "add"] as const).map(m => (
                      <button key={m} onClick={() => setImportMode(m)}
                        className={cn("flex-1 rounded-lg border py-2 text-xs font-medium transition-colors",
                          importMode === m
                            ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                            : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600"
                        )}>
                        {m === "replace" ? "Reemplazar canvas" : "Agregar al canvas"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => fileImportRef.current?.click()}
                    className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors">
                    Elegir otro archivo
                  </button>
                  {importResult.widgets.length > 0 && (
                    <button onClick={applyImport}
                      className="flex-1 rounded-xl bg-indigo-500 py-2.5 text-xs font-semibold text-white hover:bg-indigo-600 transition-colors">
                      Importar
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Empty state — just opened with no result yet */}
            {!importLoading && !importResult && (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-xs text-zinc-500">Seleccioná un archivo para continuar</p>
                <button onClick={() => fileImportRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 transition-colors">
                  <Upload className="h-4 w-4" />
                  Elegir archivo
                </button>
                <p className="text-[11px] text-zinc-600">JSON · ZIP (Superset) · PBIX (Power BI)</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Canvas Widget ────────────────────────────────────────────────────────────

interface CanvasWidgetProps {
  widget: Widget
  data: QueryData | null
  filterValues: Map<string, string>
  selected: boolean
  onSelect: () => void
  onStartDrag: (e: React.PointerEvent) => void
  onStartResize: (e: React.PointerEvent, dir: ResizeDir) => void
  onFilterChange: (name: string, value: string) => void
}

function CanvasWidget({ widget: w, data, filterValues, selected, onSelect, onStartDrag, onStartResize, onFilterChange }: CanvasWidgetProps) {
  const isFlat = FLAT.has(w.type)
  const opacity = w.config.opacity != null ? w.config.opacity / 100 : 1
  const borderColor = (w.config.noBorder || (isFlat && !w.config.borderColor))
    ? "transparent"
    : selected ? "rgba(99,102,241,0.55)" : (w.config.borderColor ?? "#27272a")
  const leftBorderColor = w.config.leftBorderColor

  return (
    <div
      className="group absolute"
      style={{ left: w.x, top: w.y, width: w.w, height: w.h, zIndex: w.z, opacity }}
    >
      {/* Card */}
      <div
        className={cn(
          "flex h-full w-full flex-col transition-shadow duration-150",
          // HTML-mode text clips to bounds; plain text can overflow for intentional visual design
          (w.type === "text" && !w.config.isHtml) ? "overflow-visible" : "overflow-hidden",
          selected && "shadow-xl shadow-indigo-500/15",
        )}
        style={{
          borderRadius: w.type === "shape" ? (w.config.shapeRadius ?? 12) : 12,
          background: w.config.bgColor ?? (isFlat ? "transparent" : "#18181b"),
          borderTop: `1px solid ${borderColor}`,
          borderRight: `1px solid ${borderColor}`,
          borderBottom: `1px solid ${borderColor}`,
          borderLeft: leftBorderColor ? `3px solid ${leftBorderColor}` : `1px solid ${borderColor}`,
        }}
        onPointerDown={e => {
          const tag = (e.target as HTMLElement).tagName
          if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return
          onSelect()
          onStartDrag(e)
        }}
        onClick={e => { e.stopPropagation(); onSelect() }}
      >
        {/* Title bar for data/chart widgets */}
        {!isFlat && (
          <div className={cn("flex shrink-0 items-center border-b px-3 py-1.5 cursor-grab active:cursor-grabbing",
            w.config.bgColor === "#ffffff" || w.config.borderColor === "#d8d0e8"
              ? "border-[#eae6f1]"
              : "border-zinc-800/60"
          )}>
            <span className={cn("flex-1 truncate text-[11px] font-bold uppercase tracking-[.6px]",
              w.config.bgColor === "#ffffff" || w.config.borderColor === "#d8d0e8"
                ? "text-[#5c3d82]"
                : "text-indigo-400"
            )}>{w.title}</span>
          </div>
        )}

        {/* Content */}
        <div className={cn((w.type === "text" && !w.config.isHtml) ? "overflow-visible" : "overflow-hidden", isFlat ? "h-full" : "flex-1")}>
          <WidgetPreview widget={w} data={data} filterValues={filterValues} onFilterChange={onFilterChange} />
        </div>
      </div>

      {/* Selection / hover ring */}
      <div className={cn(
        "pointer-events-none absolute inset-0 rounded-xl ring-inset transition-all duration-100",
        selected
          ? "ring-2 ring-indigo-500/50"
          : "ring-0 group-hover:ring-1 group-hover:ring-zinc-500/30",
      )} />

      {/* Resize handles — shown when selected or hovered */}
      {RESIZE_DIRS.map(dir => (
        <div
          key={dir}
          className={cn(
            "absolute z-10 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 bg-indigo-500 transition-opacity duration-100",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-60",
          )}
          style={{ cursor: CURSOR[dir], ...handleStyle(dir) }}
          onPointerDown={e => { e.stopPropagation(); e.preventDefault(); onStartResize(e, dir) }}
        />
      ))}
    </div>
  )
}

// ─── VarsPanel ───────────────────────────────────────────────────────────────

function VarsPanel({ vars, onChange, onClose }: {
  vars: DashboardVar[]
  onChange: (v: DashboardVar[]) => void
  onClose: () => void
}) {
  const [editing, setEditing] = useState<DashboardVar | null>(null)

  function addVar() {
    const id = Math.random().toString(36).slice(2)
    setEditing({ id, name: "", label: "", type: "text", default: "" })
  }

  function saveVar(v: DashboardVar) {
    if (!v.name.trim()) return
    const exists = vars.find(x => x.id === v.id)
    onChange(exists ? vars.map(x => x.id === v.id ? v : x) : [...vars, v])
    setEditing(null)
  }

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-zinc-200">Variables del dashboard</p>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-3 text-[11px] text-zinc-500">
          Usá <code className="rounded bg-zinc-800 px-1 text-zinc-400">{`{{nombre}}`}</code> en cualquier query SQL. Los valores se reemplazan en tiempo real.
        </p>

        <div className="flex flex-col gap-1.5 mb-3">
          {vars.map(v => (
            <div key={v.id} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-200 truncate">{v.label || v.name}</p>
                <p className="text-[10px] text-zinc-600 font-mono">{`{{${v.name}}}`} · {v.type}</p>
              </div>
              <button onClick={() => setEditing(v)} className="text-zinc-600 hover:text-zinc-300 shrink-0">
                <Settings className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onChange(vars.filter(x => x.id !== v.id))} className="text-zinc-700 hover:text-red-400 shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {vars.length === 0 && <p className="text-[11px] text-zinc-600 text-center py-2">Sin variables</p>}
        </div>

        {editing ? (
          <div className="flex flex-col gap-2 border-t border-zinc-800 pt-3">
            <p className="text-[11px] font-semibold text-zinc-400">
              {vars.find(x => x.id === editing.id) ? "Editar" : "Nueva"} variable
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500">Nombre (en SQL)</label>
                <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value.replace(/\s/g, "_") })}
                  placeholder="fecha" className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500">Etiqueta</label>
                <input value={editing.label} onChange={e => setEditing({ ...editing, label: e.target.value })}
                  placeholder="Fecha" className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500">Tipo</label>
              <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value as DashboardVar["type"] })}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none">
                <option value="text">Texto libre</option>
                <option value="select">Desplegable</option>
                <option value="date">Fecha</option>
                <option value="number">Número</option>
              </select>
            </div>
            {editing.type === "select" && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500">Opciones (separadas por coma)</label>
                <input value={editing.options ?? ""} onChange={e => setEditing({ ...editing, options: e.target.value })}
                  placeholder="Opción A, Opción B" className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none" />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500">Valor por defecto</label>
              <input value={editing.default ?? ""} onChange={e => setEditing({ ...editing, default: e.target.value })}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="flex-1 rounded-lg border border-zinc-700 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800">Cancelar</button>
              <button onClick={() => saveVar(editing)} disabled={!editing.name.trim()}
                className="flex-1 rounded-lg bg-indigo-500 py-1.5 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-40">Guardar</button>
            </div>
          </div>
        ) : (
          <button onClick={addVar}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-700 py-2 text-xs text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Agregar variable
          </button>
        )}
      </div>
    </>
  )
}

function handleStyle(dir: ResizeDir): React.CSSProperties {
  const O = -5 // -half(10px handle)
  switch (dir) {
    case "nw": return { top: O, left: O }
    case "n":  return { top: O, left: "50%", transform: "translateX(-50%)" }
    case "ne": return { top: O, right: O }
    case "e":  return { top: "50%", right: O, transform: "translateY(-50%)" }
    case "se": return { bottom: O, right: O }
    case "s":  return { bottom: O, left: "50%", transform: "translateX(-50%)" }
    case "sw": return { bottom: O, left: O }
    case "w":  return { top: "50%", left: O, transform: "translateY(-50%)" }
  }
}
