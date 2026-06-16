"use client"

import { useState, useEffect } from "react"
import { X, Play, Loader2, ChevronDown, ChevronRight, Trash2, Copy, ArrowUp, ArrowDown, Search } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { cn } from "@/lib/utils"
import type { Widget, AccentColor, QueryData } from "./types"
import { ACCENT_COLORS, TYPE_LABEL, ICON_LIBRARY } from "./types"

interface DataSource { id: string; name: string; type: string }
interface SavedDatasetMeta { id: string; name: string; rowCount: number; columns: string[] }

interface Props {
  widget: Widget
  widgets: Widget[]
  data: QueryData | null
  dataSources: DataSource[]
  filterValues: Map<string, string>
  onUpdate: (w: Widget) => void
  onClose: () => void
  onQueryRun: (wid: string, cols: string[], rows: unknown[][]) => void
  onDelete: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  onSendToBack: () => void
}

function applyFilters(sql: string, fv: Map<string, string>) {
  let out = sql
  fv.forEach((v, k) => { out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v) })
  return out
}

export function ConfigPanel({
  widget, widgets, dataSources, data, filterValues,
  onUpdate, onClose, onQueryRun,
  onDelete, onDuplicate, onBringToFront, onSendToBack,
}: Props) {
  const [running, setRunning] = useState(false)
  const [qErr, setQErr] = useState("")
  const [iconSearch, setIconSearch] = useState("")
  const [savedDatasets, setSavedDatasets] = useState<SavedDatasetMeta[]>([])

  useEffect(() => {
    fetch("/api/datasets").then(r => r.ok ? r.json() : []).then(setSavedDatasets).catch(() => {})
  }, [])

  function refreshDatasets() {
    fetch("/api/datasets").then(r => r.ok ? r.json() : []).then(setSavedDatasets).catch(() => {})
  }

  function set(p: Partial<Widget>) { onUpdate({ ...widget, ...p }) }
  function cfg(p: Partial<Widget["config"]>) { onUpdate({ ...widget, config: { ...widget.config, ...p } }) }

  async function runQuery() {
    if (!widget.config.dataSourceId || !widget.config.query) return
    setRunning(true); setQErr("")
    try {
      const sql = applyFilters(widget.config.query, filterValues)
      const res = await fetch("/api/query/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSourceId: widget.config.dataSourceId, sql }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? "Error")
      onQueryRun(widget.id, d.columns, d.rows)
    } catch (e) {
      setQErr(e instanceof Error ? e.message : "Error")
    } finally {
      setRunning(false)
    }
  }

  async function selectDataSource(id: string) {
    const isDataset = id.startsWith("dataset:")
    const query = isDataset ? "SELECT * FROM dataset" : widget.config.query
    onUpdate({ ...widget, config: { ...widget.config, dataSourceId: id || undefined, query } })
    if (!isDataset || !id) return
    // Auto-load all rows immediately — no SQL required from user
    setRunning(true); setQErr("")
    try {
      const res = await fetch("/api/query/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSourceId: id, sql: "SELECT * FROM dataset" }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? "Error")
      onQueryRun(widget.id, d.columns, d.rows)
    } catch (e) {
      setQErr(e instanceof Error ? e.message : "Error")
    } finally {
      setRunning(false)
    }
  }

  const hasData = ["bar","line","pie","table","kpi","stat","gauge","metric","progress",
    "scatter","boxplot","heatmap","histogram","funnel","treemap","radar","waterfall"].includes(widget.type)
  const hasFields = ["bar","line","pie","scatter","boxplot","heatmap","histogram","funnel","treemap","radar","waterfall"].includes(widget.type)
  const isChart = ["bar","line","pie","gauge","scatter","boxplot","heatmap","histogram","funnel","treemap","radar","waterfall"].includes(widget.type)
  const isValueWidget = ["kpi","stat","metric"].includes(widget.type)

  const linkableWidgets = widgets.filter(w =>
    w.id !== widget.id &&
    !["filter","divider","text","image","icon","shape"].includes(w.type)
  )

  const filteredIcons = iconSearch
    ? (ICON_LIBRARY as readonly string[]).filter(n => n.toLowerCase().includes(iconSearch.toLowerCase()))
    : (ICON_LIBRARY as readonly string[])

  return (
    <div className="flex h-full w-72 shrink-0 flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950">

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
        <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
          {TYPE_LABEL[widget.type]}
        </span>
        <button onClick={onClose} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-zinc-800 px-4 py-2.5">
        <button onClick={onDuplicate} title="Duplicar"
          className="flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors">
          <Copy className="h-3 w-3" /> Duplicar
        </button>
        <button onClick={onBringToFront} title="Traer al frente"
          className="flex items-center justify-center rounded-md bg-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors">
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button onClick={onSendToBack} title="Enviar al fondo"
          className="flex items-center justify-center rounded-md bg-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors">
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} title="Eliminar"
          className="ml-auto flex items-center gap-1 rounded-md bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors">
          <Trash2 className="h-3 w-3" /> Eliminar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── Apariencia ── */}
        <Sec label="Apariencia">
          <Fld label="Título">
            <input value={widget.title} onChange={e => set({ title: e.target.value })} className="input" />
          </Fld>
          <div className="grid grid-cols-2 gap-2">
            <Fld label="X (px)">
              <input type="number" value={Math.round(widget.x)} onChange={e => set({ x: Number(e.target.value) })} className="input text-xs" />
            </Fld>
            <Fld label="Y (px)">
              <input type="number" value={Math.round(widget.y)} onChange={e => set({ y: Number(e.target.value) })} className="input text-xs" />
            </Fld>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Fld label="Ancho (px)">
              <input type="number" min={80} value={Math.round(widget.w)} onChange={e => set({ w: Math.max(80, Number(e.target.value)) })} className="input text-xs" />
            </Fld>
            <Fld label="Alto (px)">
              <input type="number" min={40} value={Math.round(widget.h)} onChange={e => set({ h: Math.max(40, Number(e.target.value)) })} className="input text-xs" />
            </Fld>
          </div>
        </Sec>

        {/* ── Icon widget ── */}
        {widget.type === "icon" && (
          <Sec label="Ícono">
            <Fld label="Tamaño (px)">
              <input type="number" min={16} max={256} value={widget.config.iconSizePx ?? 48}
                onChange={e => cfg({ iconSizePx: Number(e.target.value) })} className="input text-xs" />
            </Fld>
            <Fld label="Color">
              <div className="flex gap-2 items-center">
                <input type="color" value={widget.config.iconColorHex ?? "#6366f1"}
                  onChange={e => cfg({ iconColorHex: e.target.value })}
                  className="h-8 w-12 cursor-pointer rounded border border-zinc-700 bg-zinc-800 p-0.5" />
                <input value={widget.config.iconColorHex ?? "#6366f1"}
                  onChange={e => cfg({ iconColorHex: e.target.value })} className="input flex-1 text-xs" />
              </div>
            </Fld>
            <IconPicker
              selected={widget.config.iconName}
              search={iconSearch}
              onSearch={setIconSearch}
              filtered={filteredIcons}
              onSelect={name => cfg({ iconName: name })}
              gridMax="max-h-48"
            />
          </Sec>
        )}

        {/* ── Text ── */}
        {widget.type === "text" && (
          <Sec label="Contenido">
            <Fld label="Texto">
              <textarea value={widget.config.text ?? ""} onChange={e => cfg({ text: e.target.value })}
                rows={4} className="input resize-none text-sm" />
            </Fld>
            <div className="grid grid-cols-2 gap-2">
              <Fld label="Tamaño">
                <select value={widget.config.textSize ?? "base"}
                  onChange={e => cfg({ textSize: e.target.value as Widget["config"]["textSize"] })} className="input text-xs">
                  {["xs","sm","base","lg","xl","2xl","3xl","4xl"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Fld>
              <Fld label="Alineación">
                <select value={widget.config.textAlign ?? "left"}
                  onChange={e => cfg({ textAlign: e.target.value as "left"|"center"|"right" })} className="input text-xs">
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                </select>
              </Fld>
            </div>
            <div className="flex gap-3">
              <Tog value={!!widget.config.bold} onChange={v => cfg({ bold: v })} label="Negrita" />
              <Tog value={!!widget.config.italic} onChange={v => cfg({ italic: v })} label="Cursiva" />
            </div>
            <Fld label="Color de texto">
              <div className="flex gap-2 items-center">
                <input type="color" value={widget.config.textColor ?? "#f4f4f5"}
                  onChange={e => cfg({ textColor: e.target.value })}
                  className="h-8 w-12 cursor-pointer rounded border border-zinc-700 bg-zinc-800 p-0.5" />
                <input value={widget.config.textColor ?? "#f4f4f5"}
                  onChange={e => cfg({ textColor: e.target.value })} className="input flex-1 text-xs" />
              </div>
            </Fld>
          </Sec>
        )}

        {/* ── Image ── */}
        {widget.type === "image" && (
          <Sec label="Imagen">
            <Fld label="URL">
              <input value={widget.config.imageUrl ?? ""} onChange={e => cfg({ imageUrl: e.target.value })}
                placeholder="https://..." className="input text-xs" />
            </Fld>
            <Fld label="Ajuste">
              <select value={widget.config.imageFit ?? "cover"}
                onChange={e => cfg({ imageFit: e.target.value as "contain"|"cover"|"fill" })} className="input text-xs">
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
              </select>
            </Fld>
          </Sec>
        )}

        {/* ── Divider ── */}
        {widget.type === "divider" && (
          <Sec label="Divisor">
            <Fld label="Etiqueta">
              <input value={widget.config.dividerLabel ?? ""} onChange={e => cfg({ dividerLabel: e.target.value || undefined })}
                placeholder="Opcional..." className="input text-xs" />
            </Fld>
            <Fld label="Estilo">
              <div className="grid grid-cols-3 gap-1">
                {(["solid","dashed","dotted"] as const).map(s => (
                  <button key={s} onClick={() => cfg({ dividerStyle: s })}
                    className={cn("rounded-lg border py-1.5 text-xs capitalize transition-colors",
                      (widget.config.dividerStyle ?? "solid") === s
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                        : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600"
                    )}>{s}</button>
                ))}
              </div>
            </Fld>
          </Sec>
        )}

        {/* ── Filter ── */}
        {widget.type === "filter" && (
          <Sec label="Filtro">
            <Fld label="Nombre interno (usar como {{nombre}} en queries)">
              <input value={widget.config.filterName ?? ""} onChange={e => cfg({ filterName: e.target.value })}
                className="input text-xs font-mono" />
            </Fld>
            <Fld label="Etiqueta visible">
              <input value={widget.config.filterLabel ?? ""} onChange={e => cfg({ filterLabel: e.target.value })}
                className="input text-xs" />
            </Fld>

            <Fld label="Tipo de control">
              <div className="grid grid-cols-2 gap-1">
                {([
                  ["text",    "Texto libre"],
                  ["select",  "Desplegable"],
                  ["buttons", "Botonera"],
                  ["multi",   "Multi-selección"],
                  ["date",    "Fecha"],
                  ["range",   "Rango de fechas"],
                  ["number",  "Número"],
                  ["slider",  "Slider"],
                ] as [string, string][]).map(([t, label]) => (
                  <button key={t} onClick={() => cfg({ filterType: t as typeof widget.config.filterType })}
                    className={cn("rounded-lg border py-1.5 text-xs transition-colors",
                      (widget.config.filterType ?? "text") === t
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                        : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600"
                    )}>{label}</button>
                ))}
              </div>
            </Fld>

            {/* Options for select / buttons / multi */}
            {(["select","buttons","multi"] as const).includes(widget.config.filterType as "select"|"buttons"|"multi") && (
              <Fld label="Opciones (separadas por coma)">
                <input value={widget.config.filterOptions ?? ""} onChange={e => cfg({ filterOptions: e.target.value })}
                  placeholder="Opción A, Opción B, Opción C" className="input text-xs" />
              </Fld>
            )}

            {/* Min / Max / Step for number and slider */}
            {(["number","slider"] as const).includes(widget.config.filterType as "number"|"slider") && (
              <div className="grid grid-cols-3 gap-2">
                <Fld label="Mín">
                  <input type="number" value={widget.config.filterMin ?? ""} onChange={e => cfg({ filterMin: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="0" className="input text-xs" />
                </Fld>
                <Fld label="Máx">
                  <input type="number" value={widget.config.filterMax ?? ""} onChange={e => cfg({ filterMax: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="100" className="input text-xs" />
                </Fld>
                <Fld label="Paso">
                  <input type="number" value={widget.config.filterStep ?? ""} onChange={e => cfg({ filterStep: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="1" className="input text-xs" />
                </Fld>
              </div>
            )}

            <Fld label="Valor por defecto">
              <input value={widget.config.filterDefault ?? ""} onChange={e => cfg({ filterDefault: e.target.value })}
                className="input text-xs" />
            </Fld>

            {linkableWidgets.length > 0 && (
              <Fld label="Widgets que se actualizan al filtrar">
                <div className="space-y-1.5 rounded-lg bg-zinc-900 p-2">
                  {linkableWidgets.map(lw => {
                    const linked = widget.config.linkedWidgetIds?.includes(lw.id) ?? false
                    return (
                      <label key={lw.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-zinc-800">
                        <input
                          type="checkbox"
                          checked={linked}
                          onChange={e => {
                            const ids = widget.config.linkedWidgetIds ?? []
                            cfg({ linkedWidgetIds: e.target.checked ? [...ids, lw.id] : ids.filter(i => i !== lw.id) })
                          }}
                          className="accent-indigo-500"
                        />
                        <span className="flex-1 truncate text-xs text-zinc-300">{lw.title}</span>
                        <span className="shrink-0 text-[10px] text-zinc-600">{TYPE_LABEL[lw.type]}</span>
                      </label>
                    )
                  })}
                </div>
              </Fld>
            )}
          </Sec>
        )}

        {/* ── Datos ── */}
        {hasData && (
          <Sec label="Datos">
            <Fld label="Fuente de datos">
              <select value={widget.config.dataSourceId ?? ""} onChange={e => selectDataSource(e.target.value)} onFocus={refreshDatasets} className="input">
                <option value="">Sin fuente</option>
                {dataSources.length > 0 && (
                  <optgroup label="── Conexiones">
                    {dataSources.map(ds => <option key={ds.id} value={ds.id}>{ds.name} ({ds.type})</option>)}
                  </optgroup>
                )}
                {savedDatasets.length > 0 && (
                  <optgroup label="── Datasets guardados">
                    {savedDatasets.map(ds => (
                      <option key={`dataset:${ds.id}`} value={`dataset:${ds.id}`}>
                        {ds.name} ({ds.rowCount} filas)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </Fld>

            {/* Dataset: show info banner + optional filter SQL */}
            {widget.config.dataSourceId?.startsWith("dataset:") ? (() => {
              const dsId = widget.config.dataSourceId.slice(8)
              const dsMeta = savedDatasets.find(d => d.id === dsId)
              return (
                <div className="flex flex-col gap-2">
                  {dsMeta && (
                    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2">
                      <p className="text-[11px] font-medium text-indigo-400">{dsMeta.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{dsMeta.rowCount.toLocaleString()} filas · {dsMeta.columns.length} columnas</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {dsMeta.columns.slice(0, 6).map(c => (
                          <span key={c} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-mono text-zinc-400">{c}</span>
                        ))}
                        {dsMeta.columns.length > 6 && <span className="text-[9px] text-zinc-600">+{dsMeta.columns.length - 6}</span>}
                      </div>
                    </div>
                  )}
                  <Fld label="SQL opcional (filtrar / agregar)">
                    <textarea value={widget.config.query ?? "SELECT * FROM dataset"}
                      onChange={e => cfg({ query: e.target.value })} rows={3}
                      placeholder={"SELECT * FROM dataset\nWHERE col = 'valor'"}
                      className="input resize-none font-mono text-xs" />
                    <button onClick={runQuery} disabled={running}
                      className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-500 py-1.5 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                      {running ? "Cargando..." : "Recargar datos"}
                    </button>
                  </Fld>
                  {qErr && <p className="text-[11px] text-red-400">{qErr}</p>}
                </div>
              )
            })() : (
              <Fld label="Query SQL">
                <textarea value={widget.config.query ?? ""} onChange={e => cfg({ query: e.target.value })} rows={5}
                  placeholder={"SELECT col_x, SUM(col_y)\nFROM tabla\nGROUP BY 1\n-- Usar {{nombre}} para filtros"}
                  className="input resize-none font-mono text-xs" />
                <button onClick={runQuery} disabled={!widget.config.dataSourceId || !widget.config.query || running}
                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-500 py-1.5 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  {running ? "Ejecutando..." : "Ejecutar query"}
                </button>
                {qErr && <p className="mt-1.5 text-[11px] text-red-400">{qErr}</p>}
              </Fld>
            )}
            {/* ── Field mapping — per chart type ── */}
            {data && data.columns.length > 0 && (hasFields || ["kpi","stat","gauge"].includes(widget.type)) && (() => {
              const cols = data.columns

              // Classify columns by inspecting first 20 rows
              const isNum = (col: string) => {
                const ci = cols.indexOf(col)
                const sample = data.rows.slice(0, 20).map(r => r[ci])
                const nonNull = sample.filter(v => v !== null && v !== undefined && v !== "")
                if (nonNull.length === 0) return false
                return nonNull.filter(v => !isNaN(Number(v))).length / nonNull.length >= 0.7
              }
              const numCols = cols.filter(isNum)
              const catCols = cols.filter(c => !isNum(c))

              // Select with optgroups: preferred type first, "Otras" second
              const Sel = ({
                label, value, onChange, prefer, placeholder,
              }: {
                label: string; value?: string; onChange: (v: string) => void
                prefer: "num" | "cat" | "any"; placeholder?: string
              }) => {
                const main = prefer === "num" ? numCols : prefer === "cat" ? catCols : cols
                const other = prefer === "num" ? catCols : prefer === "cat" ? numCols : []
                return (
                  <Fld label={label}>
                    <select value={value ?? ""} onChange={e => onChange(e.target.value || "")} className="input text-xs">
                      <option value="">{placeholder ?? "— elegir columna —"}</option>
                      {main.length > 0 && main.map(c => <option key={c} value={c}>{c}</option>)}
                      {other.length > 0 && (
                        <optgroup label="── Otras">
                          {other.map(c => <option key={c} value={c}>{c}</option>)}
                        </optgroup>
                      )}
                    </select>
                  </Fld>
                )
              }

              return (
                <div className="flex flex-col gap-2">
                  {["bar","line","scatter","boxplot","funnel","treemap","waterfall"].includes(widget.type) && (
                    <>
                      <Sel label="Eje X / Categoría" value={widget.config.xField} onChange={v => cfg({ xField: v || undefined })} prefer="cat" />
                      <Sel label="Eje Y / Valor"     value={widget.config.yField} onChange={v => cfg({ yField: v || undefined })} prefer="num" />
                    </>
                  )}
                  {widget.type === "pie" && (
                    <>
                      <Sel label="Nombre (categoría)" value={widget.config.xField} onChange={v => cfg({ xField: v || undefined })} prefer="cat" />
                      <Sel label="Valor (número)"     value={widget.config.yField} onChange={v => cfg({ yField: v || undefined })} prefer="num" />
                    </>
                  )}
                  {widget.type === "heatmap" && (
                    <>
                      <Sel label="Eje X"             value={widget.config.xField}       onChange={v => cfg({ xField: v || undefined })}       prefer="cat" />
                      <Sel label="Eje Y"             value={widget.config.yField}       onChange={v => cfg({ yField: v || undefined })}       prefer="cat" />
                      <Sel label="Valor (intensidad)" value={widget.config.heatValueField} onChange={v => cfg({ heatValueField: v || undefined })} prefer="num" />
                    </>
                  )}
                  {widget.type === "histogram" && (
                    <Sel label="Columna numérica" value={widget.config.yField} onChange={v => cfg({ yField: v || undefined })} prefer="num" />
                  )}
                  {widget.type === "radar" && (
                    <>
                      <Sel label="Columna de categorías" value={widget.config.xField} onChange={v => cfg({ xField: v || undefined })} prefer="cat" />
                      <Fld label="Columnas de valores (coma)">
                        <input value={widget.config.radarFields ?? ""} onChange={e => cfg({ radarFields: e.target.value || undefined })}
                          placeholder="col1, col2, col3" className="input text-xs font-mono" />
                      </Fld>
                    </>
                  )}
                  {widget.type === "scatter" && (
                    <Sel label="Tamaño de burbuja (opcional)" value={widget.config.sizeField} onChange={v => cfg({ sizeField: v || undefined })} prefer="num" placeholder="— sin tamaño —" />
                  )}
                  {["kpi","stat","gauge"].includes(widget.type) && (
                    <Sel label="Campo de valor" value={widget.config.valueField} onChange={v => cfg({ valueField: v || undefined })} prefer="num" />
                  )}
                </div>
              )
            })()}

            {/* No data yet */}
            {(!data || data.columns.length === 0) && hasFields && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                <p className="text-[11px] text-zinc-500">Ejecutá el query primero para ver las columnas disponibles.</p>
              </div>
            )}

          </Sec>
        )}

        {/* ── Stat card ── */}
        {widget.type === "stat" && (
          <Sec label="Stat card">
            <Fld label="Ícono">
              <IconPicker
                selected={widget.config.icon}
                search={iconSearch}
                onSearch={setIconSearch}
                filtered={filteredIcons}
                onSelect={name => cfg({ icon: name })}
                gridMax="max-h-32"
              />
            </Fld>
            <div className="grid grid-cols-2 gap-2">
              <Fld label="Tendencia (%)">
                <input type="number" step={0.1} value={widget.config.trend ?? ""}
                  onChange={e => cfg({ trend: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="12.5" className="input text-xs" />
              </Fld>
              <Fld label="Período">
                <input value={widget.config.trendPeriod ?? ""}
                  onChange={e => cfg({ trendPeriod: e.target.value || undefined })}
                  placeholder="vs mes ant." className="input text-xs" />
              </Fld>
            </div>
          </Sec>
        )}

        {/* ── Gauge ── */}
        {widget.type === "gauge" && (
          <Sec label="Gauge">
            <div className="grid grid-cols-3 gap-2">
              <Fld label="Mín"><input type="number" value={widget.config.gaugeMin ?? 0} onChange={e => cfg({ gaugeMin: Number(e.target.value) })} className="input text-xs" /></Fld>
              <Fld label="Máx"><input type="number" value={widget.config.gaugeMax ?? 100} onChange={e => cfg({ gaugeMax: Number(e.target.value) })} className="input text-xs" /></Fld>
              <Fld label="Unidad"><input value={widget.config.gaugeUnit ?? ""} onChange={e => cfg({ gaugeUnit: e.target.value || undefined })} placeholder="%" className="input text-xs" /></Fld>
            </div>
          </Sec>
        )}

        {/* ── Analyst charts ── */}
        {["scatter","boxplot","heatmap","histogram","funnel","treemap","radar","waterfall"].includes(widget.type) && (
          <Sec label="Campos de datos">
            {["scatter","boxplot","heatmap","histogram","waterfall","funnel","treemap","radar"].includes(widget.type) && (
              <Fld label={widget.type === "scatter" ? "Eje X (numérico)" : widget.type === "boxplot" ? "Agrupación (categoría)" : widget.type === "heatmap" ? "Eje X (categoría)" : widget.type === "histogram" ? "Columna numérica" : "Categoría / Etapa"}>
                <input value={widget.config.xField ?? ""} onChange={e => cfg({ xField: e.target.value || undefined })}
                  placeholder="nombre de columna" className="input text-xs" />
              </Fld>
            )}
            {["scatter","boxplot","heatmap","funnel","treemap","radar","waterfall"].includes(widget.type) && (
              <Fld label={widget.type === "scatter" ? "Eje Y (numérico)" : widget.type === "boxplot" ? "Valores (numérico)" : widget.type === "heatmap" ? "Eje Y (categoría)" : "Valores (numérico)"}>
                <input value={widget.config.yField ?? ""} onChange={e => cfg({ yField: e.target.value || undefined })}
                  placeholder="nombre de columna" className="input text-xs" />
              </Fld>
            )}
            {widget.type === "histogram" && (
              <Fld label="Columna numérica">
                <input value={widget.config.yField ?? ""} onChange={e => cfg({ yField: e.target.value || undefined })}
                  placeholder="nombre de columna" className="input text-xs" />
              </Fld>
            )}
            {widget.type === "heatmap" && (
              <Fld label="Valor (intensidad de color)">
                <input value={widget.config.heatValueField ?? ""} onChange={e => cfg({ heatValueField: e.target.value || undefined })}
                  placeholder="nombre de columna" className="input text-xs" />
              </Fld>
            )}
            {widget.type === "histogram" && (
              <Fld label="Cantidad de bins">
                <input type="number" min={2} max={100} value={widget.config.binCount ?? 10}
                  onChange={e => cfg({ binCount: Number(e.target.value) })} className="input text-xs" />
              </Fld>
            )}
            {widget.type === "scatter" && (
              <Fld label="Tamaño de burbuja (opcional)">
                <input value={widget.config.sizeField ?? ""} onChange={e => cfg({ sizeField: e.target.value || undefined })}
                  placeholder="columna numérica" className="input text-xs" />
              </Fld>
            )}
            {widget.type === "radar" && (
              <Fld label="Valor máximo de ejes">
                <input type="number" value={widget.config.radarMax ?? ""} onChange={e => cfg({ radarMax: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="auto" className="input text-xs" />
              </Fld>
            )}
          </Sec>
        )}

        {/* ── Metric ── */}
        {widget.type === "metric" && (
          <Sec label="Métrica">
            <Fld label="Campo de valor">
              <input value={widget.config.valueField ?? ""} onChange={e => cfg({ valueField: e.target.value || undefined })}
                placeholder="nombre de columna" className="input text-xs" />
            </Fld>
            <Fld label="Campo para sparkline">
              <input value={widget.config.sparkField ?? ""} onChange={e => cfg({ sparkField: e.target.value || undefined })}
                placeholder="columna numérica (misma query)" className="input text-xs" />
            </Fld>
            <div className="grid grid-cols-2 gap-2">
              <Fld label="Delta (%)">
                <input type="number" step={0.1} value={widget.config.deltaValue ?? ""}
                  onChange={e => cfg({ deltaValue: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="12.5" className="input text-xs" />
              </Fld>
              <Fld label="Período">
                <input value={widget.config.deltaPeriod ?? ""}
                  onChange={e => cfg({ deltaPeriod: e.target.value || undefined })}
                  placeholder="vs mes ant." className="input text-xs" />
              </Fld>
            </div>
            <Fld label="Meta (número objetivo)">
              <input type="number" value={widget.config.metricTarget ?? ""}
                onChange={e => cfg({ metricTarget: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="100000" className="input text-xs" />
            </Fld>
          </Sec>
        )}

        {/* ── Shape ── */}
        {widget.type === "shape" && (
          <Sec label="Forma">
            <Fld label="Etiqueta (opcional)">
              <input value={widget.config.shapeLabel ?? ""} onChange={e => cfg({ shapeLabel: e.target.value || undefined })}
                placeholder="Nombre de sección..." className="input text-xs" />
            </Fld>
            <Fld label="Radio de bordes (px)">
              <input type="number" min={0} max={100} value={widget.config.shapeRadius ?? 12}
                onChange={e => cfg({ shapeRadius: Number(e.target.value) })} className="input text-xs" />
            </Fld>
            <Fld label="Color de texto etiqueta">
              <div className="flex gap-2 items-center">
                <input type="color" value={widget.config.textColor ?? "#71717a"}
                  onChange={e => cfg({ textColor: e.target.value })}
                  className="h-8 w-12 cursor-pointer rounded border border-zinc-700 bg-zinc-800 p-0.5" />
                <input value={widget.config.textColor ?? ""}
                  onChange={e => cfg({ textColor: e.target.value || undefined })} className="input flex-1 text-xs" />
              </div>
            </Fld>
          </Sec>
        )}

        {/* ── Progress ── */}
        {widget.type === "progress" && (
          <Sec label="Barra de progreso">
            <div className="grid grid-cols-2 gap-2">
              <Fld label="Valor (estático)">
                <input type="number" value={widget.config.progressValue ?? 65}
                  onChange={e => cfg({ progressValue: Number(e.target.value) })} className="input text-xs" />
              </Fld>
              <Fld label="Máximo">
                <input type="number" value={widget.config.progressMax ?? 100}
                  onChange={e => cfg({ progressMax: Number(e.target.value) })} className="input text-xs" />
              </Fld>
            </div>
            <Fld label="Campo de valor (de query)">
              <input value={widget.config.valueField ?? ""} onChange={e => cfg({ valueField: e.target.value || undefined })}
                placeholder="columna numérica" className="input text-xs" />
            </Fld>
            <Fld label="Unidad">
              <input value={widget.config.progressUnit ?? ""} onChange={e => cfg({ progressUnit: e.target.value || undefined })}
                placeholder="ventas, usuarios, %" className="input text-xs" />
            </Fld>
            <Fld label="Texto explicativo">
              <input value={widget.config.progressLabel ?? ""} onChange={e => cfg({ progressLabel: e.target.value || undefined })}
                placeholder="de 10,000 objetivo" className="input text-xs" />
            </Fld>
            <div className="flex gap-3">
              <Tog value={!!widget.config.progressShowPercent} onChange={v => cfg({ progressShowPercent: v })} label="Mostrar %" />
              <Tog value={!!widget.config.progressGradient} onChange={v => cfg({ progressGradient: v })} label="Gradiente" />
            </div>
          </Sec>
        )}

        {/* ── Formato ── */}
        {isValueWidget && (
          <Sec label="Formato de número">
            <div className="grid grid-cols-3 gap-1">
              {(["number","currency","percent"] as const).map(f => (
                <button key={f} onClick={() => cfg({ format: f })}
                  className={cn("rounded-lg border py-1.5 text-[10px] transition-colors",
                    (widget.config.format ?? "number") === f
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                      : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600"
                  )}>{f === "number" ? "Número" : f === "currency" ? "Moneda" : "Porcentaje"}</button>
              ))}
            </div>
          </Sec>
        )}

        {/* ── Estilo ── */}
        {!["divider","filter"].includes(widget.type) && (
          <Sec label="Estilo">
            {(isChart || isValueWidget || widget.type === "progress") && (
              <Fld label="Color de acento">
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(ACCENT_COLORS) as [AccentColor, string][]).map(([key, hex]) => (
                    <button key={key} onClick={() => cfg({ color: key })} title={key}
                      style={{ backgroundColor: hex }}
                      className={cn("h-7 w-7 rounded-full transition-transform",
                        (widget.config.color ?? "indigo") === key
                          ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-zinc-950"
                          : "hover:scale-110"
                      )} />
                  ))}
                </div>
              </Fld>
            )}

            {widget.type === "pie" && (
              <Tog value={widget.config.showLegend !== false} onChange={v => cfg({ showLegend: v })} label="Mostrar leyenda" />
            )}

            {isChart && (
              <div className="space-y-2">
                <Tog value={!!widget.config.showTitle} onChange={v => cfg({ showTitle: v })} label="Mostrar título en gráfico" />
                {widget.config.showTitle && (
                  <input value={widget.config.subtitle ?? ""} onChange={e => cfg({ subtitle: e.target.value || undefined })}
                    placeholder="Subtítulo opcional" className="input text-xs" />
                )}
              </div>
            )}

            <Fld label="Fondo del widget">
              <div className="flex gap-2 items-center">
                <input type="color"
                  value={widget.config.bgColor?.startsWith("#") ? widget.config.bgColor : "#18181b"}
                  onChange={e => cfg({ bgColor: e.target.value })}
                  className="h-8 w-12 cursor-pointer rounded border border-zinc-700 bg-zinc-800 p-0.5" />
                <input value={widget.config.bgColor ?? ""} onChange={e => cfg({ bgColor: e.target.value || undefined })}
                  placeholder="transparent / #hex" className="input flex-1 text-xs" />
              </div>
            </Fld>

            <Tog value={!!widget.config.noBorder} onChange={v => cfg({ noBorder: v })} label="Sin borde" />
            {!widget.config.noBorder && (
              <Fld label="Color de borde">
                <div className="flex gap-2 items-center">
                  <input type="color" value={widget.config.borderColor ?? "#27272a"}
                    onChange={e => cfg({ borderColor: e.target.value })}
                    className="h-8 w-12 cursor-pointer rounded border border-zinc-700 bg-zinc-800 p-0.5" />
                  <input value={widget.config.borderColor ?? ""}
                    onChange={e => cfg({ borderColor: e.target.value || undefined })} className="input flex-1 text-xs" />
                </div>
              </Fld>
            )}

            <Fld label={`Opacidad — ${widget.config.opacity ?? 100}%`}>
              <input type="range" min={10} max={100} step={5}
                value={widget.config.opacity ?? 100}
                onChange={e => cfg({ opacity: Number(e.target.value) })}
                className="w-full accent-indigo-500" />
            </Fld>
          </Sec>
        )}

      </div>
    </div>
  )
}

// ─── Shared icon picker ───────────────────────────────────────────────────────

function IconPicker({
  selected, search, onSearch, filtered, onSelect, gridMax,
}: {
  selected?: string; search: string; onSearch: (s: string) => void
  filtered: readonly string[]; onSelect: (name: string) => void; gridMax: string
}) {
  return (
    <>
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input value={search} onChange={e => onSearch(e.target.value)}
          placeholder="Buscar ícono..." className="input pl-8 text-xs" />
      </div>
      <div className={cn("grid grid-cols-8 gap-1 overflow-y-auto", gridMax)}>
        {filtered.map(name => {
          const Icon = (LucideIcons as Record<string, unknown>)[name] as
            React.ComponentType<{ className?: string; strokeWidth?: number }> | undefined
          if (!Icon) return null
          return (
            <button key={name} onClick={() => onSelect(name)} title={name}
              className={cn(
                "flex items-center justify-center rounded-lg p-1.5 transition-colors",
                selected === name
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
              )}>
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          )
        })}
      </div>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Sec({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-zinc-800">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</p>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-zinc-600" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />}
      </button>
      {open && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </div>
  )
}
function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div>{label && <label className="mb-1.5 block text-xs text-zinc-400">{label}</label>}{children}</div>
}
function Tog({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!value)} className="flex items-center gap-2">
      <div className={cn("relative h-5 w-9 rounded-full transition-colors", value ? "bg-indigo-500" : "bg-zinc-700")}>
        <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", value ? "translate-x-4" : "translate-x-0.5")} />
      </div>
      <span className="text-xs text-zinc-400">{label}</span>
    </button>
  )
}
