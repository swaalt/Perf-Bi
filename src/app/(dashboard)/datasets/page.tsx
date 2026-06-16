"use client"

import { useEffect, useState } from "react"
import { Database, RefreshCw, Trash2, Loader2, Table2, Clock, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Dataset {
  id: string
  name: string
  description?: string
  rowCount: number
  columns: string[]
  sourceId?: string
  createdAt: string
  updatedAt: string
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading,  setLoading]  = useState(true)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [deleting,   setDeleting]   = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const r = await fetch("/api/datasets")
    if (r.ok) setDatasets(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function refresh(id: string) {
    setRefreshing(id)
    const r = await fetch(`/api/datasets/${id}/refresh`, { method: "POST" })
    if (r.ok) {
      const updated = await r.json()
      setDatasets(prev => prev.map(d => d.id === id ? { ...d, rowCount: updated.rowCount, updatedAt: updated.updatedAt } : d))
    }
    setRefreshing(null)
  }

  async function remove(id: string) {
    setDeleting(id)
    await fetch(`/api/datasets/${id}`, { method: "DELETE" })
    setDatasets(prev => prev.filter(d => d.id !== id))
    setDeleting(null)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">Datasets</h1>
        <p className="text-sm text-zinc-500">Resultados guardados como fuente de datos reutilizable</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
        </div>
      ) : datasets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <Database className="h-8 w-8 text-zinc-700" strokeWidth={1.5} />
          <p className="text-sm text-zinc-500">Sin datasets guardados</p>
          <p className="text-xs text-zinc-600">Ejecutá un query en el SQL Workspace y guardalo como dataset</p>
          <Link href="/sql" className="mt-1 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-600 transition-colors">
            Ir al SQL Workspace
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-w-4xl">
          {datasets.map(ds => (
            <div key={ds.id} className="group flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 transition-colors hover:border-zinc-700">
              {/* Icon */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                <Table2 className="h-4 w-4 text-indigo-400" strokeWidth={1.75} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">{ds.name}</p>
                {ds.description && <p className="truncate text-xs text-zinc-500 mt-0.5">{ds.description}</p>}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[11px] text-zinc-600">{ds.rowCount.toLocaleString()} filas</span>
                  <span className="text-[11px] text-zinc-600">{ds.columns.length} columnas</span>
                  <span className="flex items-center gap-1 text-[11px] text-zinc-700">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(ds.updatedAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Columns preview */}
              <div className="hidden md:flex items-center gap-1 shrink-0">
                {ds.columns.slice(0, 4).map(c => (
                  <span key={c} className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 font-mono">{c}</span>
                ))}
                {ds.columns.length > 4 && (
                  <span className="text-[10px] text-zinc-700">+{ds.columns.length - 4}</span>
                )}
              </div>

              {/* Dataset ID badge for use in widgets */}
              <div className="hidden lg:flex flex-col items-end shrink-0">
                <span className="text-[9px] text-zinc-700 uppercase tracking-wider mb-0.5">ID para widgets</span>
                <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 font-mono">dataset:{ds.id}</code>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {ds.sourceId && (
                  <button onClick={() => refresh(ds.id)} disabled={refreshing === ds.id}
                    title="Refrescar desde fuente original"
                    className={cn(
                      "rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-40",
                      refreshing === ds.id && "text-indigo-400"
                    )}>
                    <RefreshCw className={cn("h-3.5 w-3.5", refreshing === ds.id && "animate-spin")} />
                  </button>
                )}
                <Link href={`/sql?source=dataset:${ds.id}`}
                  title="Abrir en SQL Workspace"
                  className="rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
                <button onClick={() => remove(ds.id)} disabled={deleting === ds.id}
                  title="Eliminar dataset"
                  className="rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-red-400 disabled:opacity-40">
                  {deleting === ds.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usage hint */}
      {datasets.length > 0 && (
        <div className="mt-6 max-w-4xl rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <p className="text-xs text-zinc-500">
            <span className="font-medium text-zinc-400">Usar en un widget:</span>{" "}
            en la configuración del widget, seleccioná el dataset como fuente de datos.
            El widget consultará los datos cacheados sin tocar la base de datos original.
          </p>
        </div>
      )}
    </div>
  )
}
