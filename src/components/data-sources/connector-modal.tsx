"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Search } from "lucide-react"
import { useConnectionsStore } from "@/stores/connections"

// ─── Catalog definition ───────────────────────────────────────────────────────

interface ConnectorDef {
  type: string
  name: string
  subtitle: string
  abbr: string
  color: string
  bg: string
  category: string
  comingSoon?: boolean
}

const CATALOG_FLAT: ConnectorDef[] = [
  // SQL
  { type: "POSTGRESQL", name: "PostgreSQL",    subtitle: "SQL relacional",         abbr: "PG",  color: "text-sky-400",     bg: "bg-sky-500/15",     category: "SQL" },
  { type: "MYSQL",      name: "MySQL",          subtitle: "SQL relacional",         abbr: "MY",  color: "text-orange-400",  bg: "bg-orange-500/15",  category: "SQL" },
  { type: "MARIADB",    name: "MariaDB",        subtitle: "Fork de MySQL",          abbr: "MA",  color: "text-amber-400",   bg: "bg-amber-500/15",   category: "SQL" },
  { type: "SQLITE",     name: "SQLite",         subtitle: "Archivo local",          abbr: "SQ",  color: "text-blue-400",    bg: "bg-blue-500/15",    category: "SQL" },
  { type: "CLICKHOUSE", name: "ClickHouse",     subtitle: "OLAP columnar",          abbr: "CH",  color: "text-yellow-400",  bg: "bg-yellow-500/15",  category: "SQL" },
  { type: "REDSHIFT",   name: "Redshift",       subtitle: "Data warehouse AWS",     abbr: "RS",  color: "text-rose-400",    bg: "bg-rose-500/15",    category: "SQL" },
  { type: "MSSQL",      name: "SQL Server",     subtitle: "Microsoft SQL Server",   abbr: "MS",  color: "text-red-400",     bg: "bg-red-500/15",     category: "SQL",   comingSoon: true },
  // Cloud
  { type: "BIGQUERY",   name: "BigQuery",       subtitle: "Google Cloud DWH",       abbr: "BQ",  color: "text-green-400",   bg: "bg-green-500/15",   category: "Cloud", comingSoon: true },
  { type: "SNOWFLAKE",  name: "Snowflake",      subtitle: "Cloud data platform",    abbr: "SF",  color: "text-cyan-400",    bg: "bg-cyan-500/15",    category: "Cloud", comingSoon: true },
  // APIs
  { type: "REST_API",      name: "REST API",      subtitle: "Cualquier API HTTP",    abbr: "AP",  color: "text-violet-400",  bg: "bg-violet-500/15",  category: "APIs" },
  { type: "GOOGLE_SHEETS", name: "Google Sheets", subtitle: "Hoja de cálculo",       abbr: "GS",  color: "text-emerald-400", bg: "bg-emerald-500/15", category: "APIs" },
  { type: "AIRTABLE",      name: "Airtable",      subtitle: "Base de datos no-code", abbr: "AT",  color: "text-yellow-400",  bg: "bg-yellow-500/15",  category: "APIs" },
  { type: "NOTION",        name: "Notion",        subtitle: "Workspace + DB",        abbr: "NT",  color: "text-zinc-300",    bg: "bg-zinc-600/25",    category: "APIs" },
  { type: "JIRA",          name: "Jira",          subtitle: "Atlassian — proyectos", abbr: "JR",  color: "text-blue-400",    bg: "bg-blue-500/15",    category: "APIs" },
  { type: "HUBSPOT",       name: "HubSpot",       subtitle: "CRM",                   abbr: "HS",  color: "text-orange-400",  bg: "bg-orange-500/15",  category: "APIs" },
]

const ALL_CONNECTORS: Record<string, ConnectorDef> = {}
CATALOG_FLAT.forEach(c => { ALL_CONNECTORS[c.type] = c })

const CATEGORIES = ["Todos", "SQL", "Cloud", "APIs"] as const
type Category = typeof CATEGORIES[number]

// ─── Form config per type ─────────────────────────────────────────────────────

interface FormField {
  key: string
  label: string
  type?: "text" | "password" | "number" | "textarea"
  placeholder?: string
  defaultValue?: string
  hint?: string
  span?: "half" | "full"
}

type FormSection = { section: string; fields: FormField[] }

const FORM_SCHEMA: Record<string, FormSection[]> = {
  POSTGRESQL: [
    { section: "Conexión", fields: [
      { key: "host",     label: "Host",           placeholder: "localhost", defaultValue: "localhost", span: "half" },
      { key: "port",     label: "Puerto",         type: "number", placeholder: "5432", defaultValue: "5432", span: "half" },
      { key: "database", label: "Base de datos",  placeholder: "mydb" },
    ]},
    { section: "Autenticación", fields: [
      { key: "username", label: "Usuario",    placeholder: "postgres", span: "half" },
      { key: "password", label: "Contraseña", type: "password",        span: "half" },
    ]},
  ],
  MYSQL: [
    { section: "Conexión", fields: [
      { key: "host",     label: "Host",          placeholder: "localhost", defaultValue: "localhost", span: "half" },
      { key: "port",     label: "Puerto",        type: "number", placeholder: "3306", defaultValue: "3306", span: "half" },
      { key: "database", label: "Base de datos", placeholder: "mydb" },
    ]},
    { section: "Autenticación", fields: [
      { key: "username", label: "Usuario",    placeholder: "root",  span: "half" },
      { key: "password", label: "Contraseña", type: "password",     span: "half" },
    ]},
  ],
  MARIADB: [
    { section: "Conexión", fields: [
      { key: "host",     label: "Host",          placeholder: "localhost", defaultValue: "localhost", span: "half" },
      { key: "port",     label: "Puerto",        type: "number", placeholder: "3306", defaultValue: "3306", span: "half" },
      { key: "database", label: "Base de datos", placeholder: "mydb" },
    ]},
    { section: "Autenticación", fields: [
      { key: "username", label: "Usuario",    placeholder: "root", span: "half" },
      { key: "password", label: "Contraseña", type: "password",    span: "half" },
    ]},
  ],
  SQLITE: [
    { section: "Archivo", fields: [
      { key: "filename", label: "Ruta del archivo", placeholder: "C:\\datos\\mi-base.db",
        hint: "Ruta absoluta al archivo .db o .sqlite en el servidor" },
    ]},
  ],
  CLICKHOUSE: [
    { section: "Conexión HTTP", fields: [
      { key: "host",     label: "Host",          placeholder: "localhost", defaultValue: "localhost", span: "half" },
      { key: "port",     label: "Puerto HTTP",   type: "number", placeholder: "8123", defaultValue: "8123", span: "half" },
      { key: "database", label: "Base de datos", placeholder: "default" },
    ]},
    { section: "Autenticación", fields: [
      { key: "username", label: "Usuario",    placeholder: "default", span: "half" },
      { key: "password", label: "Contraseña", type: "password",       span: "half" },
    ]},
  ],
  REDSHIFT: [
    { section: "Conexión", fields: [
      { key: "host",     label: "Host / Endpoint", placeholder: "cluster.region.redshift.amazonaws.com" },
      { key: "port",     label: "Puerto",  type: "number", placeholder: "5439", defaultValue: "5439", span: "half" },
      { key: "database", label: "Base de datos", placeholder: "dev", span: "half" },
    ]},
    { section: "Autenticación", fields: [
      { key: "username", label: "Usuario",    placeholder: "awsuser", span: "half" },
      { key: "password", label: "Contraseña", type: "password",       span: "half" },
    ]},
  ],
  REST_API: [
    { section: "Endpoint", fields: [
      { key: "apiUrl", label: "URL base", placeholder: "https://api.ejemplo.com/v1",
        hint: "URL base. En la query del widget podés agregar el path (ej: /usuarios)" },
    ]},
    { section: "Autenticación", fields: [
      { key: "password", label: "Bearer Token", type: "password",
        placeholder: "Token de autorización (opcional)" },
    ]},
  ],
  GOOGLE_SHEETS: [
    { section: "Hoja de cálculo", fields: [
      { key: "meta_spreadsheetId", label: "Spreadsheet ID",
        placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
        hint: "Encontralo en la URL: docs.google.com/spreadsheets/d/[ESTE_ID]/edit" },
    ]},
    { section: "Autenticación", fields: [
      { key: "password", label: "API Key de Google Cloud", type: "password",
        hint: "Conseguila en console.cloud.google.com → APIs → Credenciales. La hoja debe ser pública." },
    ]},
  ],
  AIRTABLE: [
    { section: "Base de Airtable", fields: [
      { key: "meta_baseId",    label: "Base ID",    placeholder: "appXXXXXXXXXXXXXX",
        hint: "Encontralo en airtable.com/create/tokens → tu base" },
      { key: "meta_tableName", label: "Tabla",      placeholder: "Nombre de la tabla" },
    ]},
    { section: "Autenticación", fields: [
      { key: "password", label: "Personal Access Token", type: "password",
        hint: "Crealo en airtable.com/create/tokens" },
    ]},
  ],
  NOTION: [
    { section: "Base de datos", fields: [
      { key: "meta_databaseId", label: "Database ID",
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        hint: "Encontralo en la URL de la tabla: notion.so/xxx/[DATABASE_ID]" },
    ]},
    { section: "Autenticación", fields: [
      { key: "password", label: "Integration Token", type: "password",
        hint: "Crealo en notion.so/my-integrations y compartí la DB con tu integración" },
    ]},
  ],
  JIRA: [
    { section: "Instancia", fields: [
      { key: "apiUrl", label: "Dominio Atlassian Cloud", placeholder: "tuempresa.atlassian.net",
        hint: "Solo el dominio, sin https://" },
    ]},
    { section: "Autenticación", fields: [
      { key: "username", label: "Email",     placeholder: "usuario@empresa.com" },
      { key: "password", label: "API Token", type: "password",
        hint: "Crealo en id.atlassian.com/manage-profile/security/api-tokens" },
    ]},
  ],
  HUBSPOT: [
    { section: "Autenticación", fields: [
      { key: "password", label: "Private App Token", type: "password",
        hint: "Crealo en app.hubspot.com → Configuración → Integraciones → Apps privadas" },
    ]},
    { section: "Configuración", fields: [
      { key: "meta_objectType", label: "Tipo de objeto CRM", placeholder: "contacts",
        hint: "Opciones: contacts, deals, companies, tickets, products" },
    ]},
  ],
}

// ─── Component ────────────────────────────────────────────────────────────────

import type { DataSource } from "@/stores/connections"

interface Props {
  open: boolean
  onClose: () => void
  /** If provided, opens in edit mode pre-filling the form with existing data */
  editSource?: DataSource
}
type TestState = "idle" | "testing" | "ok" | "error"

function sourceToFormData(src: DataSource): Record<string, string> {
  const fd: Record<string, string> = { name: src.name }
  if (src.host)     fd.host     = src.host
  if (src.port)     fd.port     = String(src.port)
  if (src.database) fd.database = src.database
  if (src.username) fd.username = src.username
  if (src.filename) fd.filename = src.filename
  if (src.apiUrl)   fd.apiUrl   = src.apiUrl
  if (src.metadata) {
    try {
      const m = JSON.parse(src.metadata) as Record<string, unknown>
      Object.entries(m).forEach(([k, v]) => { fd[`meta_${k}`] = String(v) })
    } catch { /* ignore */ }
  }
  return fd
}

export function ConnectorModal({ open, onClose, editSource }: Props) {
  const isEdit = Boolean(editSource)

  const [selectedType, setSelectedType] = useState<string | null>(editSource?.type?.toUpperCase() ?? null)
  const [formData, setFormData]         = useState<Record<string, string>>(
    editSource ? sourceToFormData(editSource) : {}
  )
  const [testState, setTestState]       = useState<TestState>("idle")
  const [testError, setTestError]       = useState("")
  const [saving, setSaving]             = useState(false)
  const [search, setSearch]             = useState("")
  const [activeCategory, setActiveCategory] = useState<Category>("Todos")
  const addSource    = useConnectionsStore((s) => s.addSource)
  const updateSource = useConnectionsStore((s) => s.updateSource)

  // Sync when editSource changes (modal reused for different items)
  useEffect(() => {
    if (editSource) {
      setSelectedType(editSource.type.toUpperCase())
      setFormData(sourceToFormData(editSource))
    } else {
      setSelectedType(null)
      setFormData({})
    }
    setTestState("idle")
    setTestError("")
  }, [editSource, open])

  const normalizedType = selectedType?.toUpperCase() ?? ""
  const connector = normalizedType ? ALL_CONNECTORS[normalizedType] : null
  const schema    = normalizedType ? (FORM_SCHEMA[normalizedType] ?? []) : []

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return CATALOG_FLAT.filter(c => {
      const matchCat = activeCategory === "Todos" || c.category === activeCategory
      const matchQ   = !q || c.name.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [search, activeCategory])

  function reset() {
    setSelectedType(null)
    setFormData({})
    setTestState("idle")
    setTestError("")
    setSearch("")
    setActiveCategory("Todos")
  }

  function selectConnector(type: string) {
    if (ALL_CONNECTORS[type]?.comingSoon) return
    const defaults: Record<string, string> = {}
    ;(FORM_SCHEMA[type] ?? []).forEach(sec =>
      sec.fields.forEach(f => { if (f.defaultValue) defaults[f.key] = f.defaultValue })
    )
    setFormData(defaults)
    setTestState("idle")
    setTestError("")
    setSelectedType(type)
  }

  function buildPayload(forType?: string) {
    const meta: Record<string, string> = {}
    const base: Record<string, string | number | undefined> = {
      name: formData.name ?? "",
      type: (forType ?? selectedType ?? "").toUpperCase(),
    }
    for (const [k, v] of Object.entries(formData)) {
      if (k === "name") continue
      if (k.startsWith("meta_")) {
        meta[k.slice(5)] = v
      } else if (k === "port") {
        base.port = v ? parseInt(v, 10) : undefined
      } else {
        base[k] = v || undefined
      }
    }
    if (Object.keys(meta).length > 0) base.metadata = JSON.stringify(meta)
    return base
  }

  async function testConnection() {
    if (!formData.name) { setTestError("Ingresá un nombre primero"); setTestState("error"); return }
    setTestState("testing"); setTestError("")
    const createRes = await fetch("/api/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    })
    if (!createRes.ok) { setTestState("error"); setTestError("Error al probar"); return }
    const created = await createRes.json()
    const testRes  = await fetch(`/api/data-sources/${created.id}/test`, { method: "POST" })
    const testJson = await testRes.json()
    await fetch(`/api/data-sources/${created.id}`, { method: "DELETE" })
    if (testJson.ok) {
      setTestState("ok")
    } else {
      setTestState("error")
      setTestError(testJson.error ?? "No se pudo conectar")
    }
  }

  async function saveConnection() {
    if (!formData.name) { setTestError("Ingresá un nombre"); setTestState("error"); return }
    setSaving(true)
    try {
      if (isEdit && editSource) {
        const res = await fetch(`/api/data-sources/${editSource.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        })
        if (res.ok) {
          updateSource(await res.json())
          onClose()
        } else {
          setTestError("Error al guardar")
        }
      } else {
        const res = await fetch("/api/data-sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        })
        if (res.ok) {
          addSource(await res.json())
          reset(); onClose()
        } else {
          setTestError("Error al guardar")
        }
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { if (!isEdit) reset(); onClose() } }}>
      <DialogContent className={cn(
        "border-zinc-800 bg-zinc-900 text-zinc-100 transition-all duration-200 overflow-hidden",
        selectedType ? "max-w-md" : "max-w-2xl"
      )}>
        <DialogHeader className="pb-0">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            {selectedType && !isEdit && (
              <button onClick={reset} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors -ml-1">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {isEdit
              ? `Editar ${connector?.name ?? "conexión"}`
              : selectedType ? `Configurar ${connector?.name}` : "Nueva conexión"
            }
          </DialogTitle>
        </DialogHeader>

        {/* ── Catalog ── */}
        {!selectedType && (
          <div className="flex flex-col gap-4 pt-1">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar conector..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
              />
            </div>

            {/* Category tabs */}
            <div className="flex gap-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    activeCategory === cat
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-600">Sin resultados para &ldquo;{search}&rdquo;</p>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 max-h-[380px] overflow-y-auto pr-0.5 pb-1">
                {filtered.map(item => (
                  <button
                    key={item.type}
                    onClick={() => selectConnector(item.type)}
                    disabled={item.comingSoon}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                      item.comingSoon
                        ? "cursor-not-allowed border-zinc-800/50 opacity-40"
                        : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 cursor-pointer"
                    )}
                  >
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                      item.bg, item.color
                    )}>
                      {item.abbr}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 leading-tight">{item.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{item.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.comingSoon && (
                        <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                          Próximamente
                        </span>
                      )}
                      {!item.comingSoon && (
                        <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-600 group-hover:border-zinc-600 group-hover:text-zinc-500 transition-colors">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Config form ── */}
        {selectedType && (
          <div className="flex flex-col gap-4 pt-1">
            {/* Connector badge */}
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold", connector?.bg ?? "bg-zinc-800", connector?.color ?? "text-zinc-400")}>
                {connector?.abbr ?? selectedType.slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100 leading-tight">{connector?.name ?? selectedType}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{connector?.subtitle ?? "Tipo de conexión"}</p>
              </div>
            </div>

            {/* Connection name */}
            <FormField label="Nombre de la conexión" required>
              <input
                value={formData.name ?? ""}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="Mi conexión"
                className={inputCls}
              />
            </FormField>

            {/* Dynamic sections */}
            {schema.length > 0 && (
              <div className="flex flex-col gap-4 max-h-[340px] overflow-y-auto pr-0.5">
                {schema.map(sec => (
                  <div key={sec.section}>
                    <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{sec.section}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {sec.fields.map(f => (
                        <FormField
                          key={f.key}
                          label={f.label}
                          hint={f.hint}
                          className={f.span === "half" ? "" : "col-span-2"}
                        >
                          {f.type === "textarea" ? (
                            <textarea
                              value={formData[f.key] ?? ""}
                              onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              rows={3}
                              className={cn(inputCls, "resize-none font-mono text-xs")}
                            />
                          ) : (
                            <input
                              type={f.type ?? "text"}
                              value={formData[f.key] ?? ""}
                              onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              className={inputCls}
                            />
                          )}
                        </FormField>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Test state */}
            {testState !== "idle" && (
              <div className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs",
                testState === "ok"      && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                testState === "error"   && "bg-red-500/10 text-red-400 border border-red-500/20",
                testState === "testing" && "bg-zinc-800 text-zinc-400"
              )}>
                {testState === "testing" && <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />}
                {testState === "ok"      && <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                {testState === "error"   && <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                <span className="leading-tight">
                  {testState === "testing" && "Probando conexión..."}
                  {testState === "ok"      && "¡Conexión exitosa! Fuente guardada."}
                  {testState === "error"   && (testError || "No se pudo conectar")}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between gap-2 border-t border-zinc-800 pt-3">
              <button
                onClick={testConnection}
                disabled={testState === "testing" || testState === "ok"}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-40"
              >
                {testState === "testing" && <Loader2 className="h-3 w-3 animate-spin" />}
                Probar conexión
              </button>
              <button
                onClick={saveConnection}
                disabled={saving || testState === "testing"}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-40"
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                Guardar sin probar
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FormField({ label, children, hint, className, required }: {
  label: string; children: React.ReactNode; hint?: string; className?: string; required?: boolean
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-xs font-medium text-zinc-400">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] leading-tight text-zinc-600">{hint}</p>}
    </div>
  )
}

const inputCls = "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none transition-colors"
