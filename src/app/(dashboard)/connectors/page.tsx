"use client"

import { useEffect, useState } from "react"
import { Plus, Database, Globe, Trash2, Zap } from "lucide-react"
import { ConnectorModal } from "@/components/data-sources/connector-modal"
import { useConnectionsStore } from "@/stores/connections"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface TypeMeta { label: string; color: string; bg: string; abbr: string; isHttp?: boolean }

const TYPE_META: Record<string, TypeMeta> = {
  POSTGRESQL: { label: "PostgreSQL",     abbr: "PG", color: "text-sky-400",    bg: "bg-sky-500/10"     },
  MYSQL:      { label: "MySQL",          abbr: "MY", color: "text-orange-400", bg: "bg-orange-500/10"  },
  MARIADB:    { label: "MariaDB",        abbr: "MA", color: "text-amber-400",  bg: "bg-amber-500/10"   },
  SQLITE:     { label: "SQLite",         abbr: "SQ", color: "text-blue-400",   bg: "bg-blue-500/10"    },
  CLICKHOUSE: { label: "ClickHouse",     abbr: "CH", color: "text-yellow-400", bg: "bg-yellow-500/10"  },
  REDSHIFT:   { label: "Redshift",       abbr: "RS", color: "text-rose-400",   bg: "bg-rose-500/10"    },
  MSSQL:      { label: "SQL Server",     abbr: "MS", color: "text-red-400",    bg: "bg-red-500/10"     },
  BIGQUERY:   { label: "BigQuery",       abbr: "BQ", color: "text-green-400",  bg: "bg-green-500/10"   },
  SNOWFLAKE:  { label: "Snowflake",      abbr: "SF", color: "text-cyan-400",   bg: "bg-cyan-500/10"    },
  REST_API:      { label: "REST API",       abbr: "AP", color: "text-violet-400",  bg: "bg-violet-500/10",  isHttp: true },
  GOOGLE_SHEETS: { label: "Google Sheets",  abbr: "GS", color: "text-emerald-400", bg: "bg-emerald-500/10", isHttp: true },
  AIRTABLE:      { label: "Airtable",       abbr: "AT", color: "text-yellow-400",  bg: "bg-yellow-500/10",  isHttp: true },
  NOTION:        { label: "Notion",         abbr: "NT", color: "text-zinc-300",    bg: "bg-zinc-600/25",    isHttp: true },
  JIRA:          { label: "Jira",           abbr: "JR", color: "text-blue-400",    bg: "bg-blue-500/10",    isHttp: true },
  HUBSPOT:       { label: "HubSpot",        abbr: "HS", color: "text-orange-400",  bg: "bg-orange-500/10",  isHttp: true },
}

const HTTP_TYPES = new Set(["REST_API","GOOGLE_SHEETS","AIRTABLE","NOTION","JIRA","HUBSPOT"])

export default function ConnectorsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const { sources, setSources, removeSource } = useConnectionsStore()

  useEffect(() => {
    fetch("/api/data-sources")
      .then(r => r.json())
      .then(setSources)
      .catch(console.error)
  }, [setSources])

  const handleDelete = async (id: string) => {
    await fetch(`/api/data-sources/${id}`, { method: "DELETE" })
    removeSource(id)
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Conectores</h1>
          <p className="text-sm text-zinc-500">
            Conectá tus bases de datos, APIs y servicios SaaS
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Nueva conexión
        </button>
      </div>

      {sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 py-20 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
            <Database className="h-5 w-5 text-zinc-600" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-zinc-400">Sin conexiones</p>
          <p className="mt-1 text-xs text-zinc-600">
            Agrega tu primera fuente de datos para comenzar
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-600"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar conexión
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map(src => {
            const meta = TYPE_META[src.type] ?? TYPE_META.POSTGRESQL
            const isHttp = HTTP_TYPES.has(src.type)
            return (
              <div
                key={src.id}
                className="group flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold", meta.bg, meta.color)}>
                      {meta.abbr}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{src.name}</p>
                      <p className="text-xs text-zinc-500">{meta.label}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(src.id)}
                    className="opacity-0 transition-opacity group-hover:opacity-100 rounded-md p-1 text-zinc-600 hover:bg-zinc-800 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-0.5 text-xs text-zinc-600">
                  {src.host && <span>{src.host}{src.port ? `:${src.port}` : ""}{src.database ? ` / ${src.database}` : ""}</span>}
                  {src.filename && <span>{src.filename}</span>}
                  {src.apiUrl && <span className="truncate">{src.apiUrl}</span>}
                  {isHttp && !src.apiUrl && <span className="text-zinc-700">API conectada</span>}
                </div>

                <div className="flex gap-2">
                  {!isHttp ? (
                    <Link
                      href={`/sql?source=${src.id}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-indigo-500 hover:text-indigo-400"
                    >
                      <Zap className="h-3 w-3" /> Abrir en SQL
                    </Link>
                  ) : (
                    <div className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-800 py-1.5 text-xs text-zinc-600">
                      <Globe className="h-3 w-3" /> HTTP API
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConnectorModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
