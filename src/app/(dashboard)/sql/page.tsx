"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Play, ChevronDown, Loader2, AlertCircle, Database, Save, CheckCircle2, X } from "lucide-react";

const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
import { SqlEditor } from "@/components/sql/sql-editor";
import { QueryResultTable } from "@/components/sql/query-result-table";
import { SchemaExplorer } from "@/components/sql/schema-explorer";
import { useConnectionsStore } from "@/stores/connections";
import { cn } from "@/lib/utils";
import type { QueryResult, DbSchema } from "@/types/db";

function SqlWorkspaceInner() {
  const searchParams = useSearchParams();
  const { sources, setSources } = useConnectionsStore();

  const [activeSourceId, setActiveSourceId] = useState<string>(
    searchParams.get("source") ?? ""
  );
  const [sql, setSql] = useState("SELECT 1 + 1 AS resultado;");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [schema, setSchema] = useState<DbSchema | null>(null);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false)
  const [saveModal, setSaveModal]   = useState(false)
  const [saveName, setSaveName]     = useState("")
  const [saveDesc, setSaveDesc]     = useState("")
  const [saving, setSavingDs]       = useState(false)
  const [savedOk, setSavedOk]       = useState(false);

  // Cargar fuentes si el store está vacío
  useEffect(() => {
    if (sources.length === 0) {
      fetch("/api/data-sources")
        .then((r) => r.json())
        .then(setSources)
        .catch(console.error);
    }
  }, [sources.length, setSources]);

  // Cargar schema al cambiar fuente
  useEffect(() => {
    if (!activeSourceId) return;
    setSchema(null);
    fetch(`/api/data-sources/${activeSourceId}/schema`)
      .then((r) => r.json())
      .then(setSchema)
      .catch(console.error);
  }, [activeSourceId]);

  const runQuery = useCallback(async () => {
    if (!activeSourceId) {
      setError("Selecciona una fuente de datos primero");
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);

    const res = await fetch("/api/query/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql, dataSourceId: activeSourceId }),
    });

    const json = await res.json();
    setRunning(false);

    if (!res.ok || json.error) {
      setError(json.error ?? "Error desconocido");
    } else {
      setResult(json);
    }
  }, [sql, activeSourceId]);

  const activeSource = sources.find((s) => s.id === activeSourceId)

  async function saveDataset() {
    if (!result || !saveName.trim()) return
    setSavingDs(true)
    const res = await fetch("/api/datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: saveName.trim(),
        description: saveDesc.trim() || undefined,
        columns: result.columns,
        rows: result.rows,
        sourceId: activeSourceId || undefined,
        sourceQuery: sql,
      }),
    })
    setSavingDs(false)
    if (res.ok) { setSaveModal(false); setSaveName(""); setSaveDesc(""); setSavedOk(true); setTimeout(() => setSavedOk(false), 3000) }
  }

  return (
    <div className="flex h-full">
      {/* Schema sidebar */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/50">
        <div className="flex h-10 items-center border-b border-zinc-800 px-3">
          <span className="text-xs font-medium text-zinc-500">Schema</span>
        </div>
        {activeSourceId ? (
          <div className="flex-1 overflow-y-auto">
            <SchemaExplorer
              dataSourceId={activeSourceId}
              sourceType={activeSource?.type}
              onInsert={(q) => { setSql(q); }}
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
            <Database className="h-6 w-6 text-zinc-700" strokeWidth={1.5} />
            <p className="text-xs text-zinc-600">Selecciona una fuente</p>
          </div>
        )}
      </aside>

      {/* Main workspace */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-800 px-3">
          {/* Source picker */}
          <div className="relative">
            <button
              onClick={() => setSourcePickerOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-600"
            >
              <Database className="h-3 w-3 text-zinc-500" />
              <span>{activeSource?.name ?? "Fuente de datos"}</span>
              <ChevronDown className="h-3 w-3 text-zinc-600" />
            </button>
            {sourcePickerOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-48 rounded-xl border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                {sources.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-zinc-500">Sin conexiones</p>
                ) : (
                  sources.map((src) => (
                    <button
                      key={src.id}
                      onClick={() => {
                        setActiveSourceId(src.id);
                        setSourcePickerOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-700",
                        src.id === activeSourceId ? "text-indigo-400" : "text-zinc-300"
                      )}
                    >
                      <Database className="h-3 w-3 text-zinc-500" />
                      {src.name}
                      <span className="ml-auto text-zinc-600">{src.type}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Run button */}
          <button
            onClick={runQuery}
            disabled={running}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-60"
          >
            {running ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" fill="currentColor" />
            )}
            <span>{running ? "Ejecutando..." : "Ejecutar"}</span>
            <kbd className="ml-0.5 rounded border border-white/20 px-1 text-[10px] font-normal opacity-60">
              {isMac ? "⌘↵" : "Ctrl↵"}
            </kbd>
          </button>
        </div>

        {/* Editor + Results split */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* SQL Editor — 40% height */}
          <div className="h-[40%] min-h-32 border-b border-zinc-800">
            <SqlEditor
              value={sql}
              onChange={setSql}
              onRun={runQuery}
              schema={schema}
            />
          </div>

          {/* Results panel — 60% */}
          <div className="flex flex-1 flex-col overflow-hidden bg-zinc-950">
            {/* Results toolbar */}
            {result && (
              <div className="flex h-8 shrink-0 items-center gap-2 border-b border-zinc-800 px-3">
                <span className="text-[11px] text-zinc-600">
                  {result.rows.length} filas · {result.columns.length} cols
                </span>
                <div className="flex-1" />
                {savedOk && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Dataset guardado
                  </span>
                )}
                <button onClick={() => { setSaveName(""); setSaveDesc(""); setSaveModal(true) }}
                  className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200">
                  <Save className="h-3 w-3" />
                  Guardar como dataset
                </button>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 border-b border-red-500/20 bg-red-500/5 px-4 py-3">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                <p className="font-mono text-xs text-red-400">{error}</p>
              </div>
            )}
            {!result && !error && !running && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm text-zinc-600">
                  Escribe un query y presiona{" "}
                  <kbd className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-xs text-zinc-500">
                    {isMac ? "⌘ Enter" : "Ctrl + Enter"}
                  </kbd>
                </p>
              </div>
            )}
            {result && <QueryResultTable result={result} />}
          </div>

          {/* Save dataset modal */}
          {saveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-96 rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-100">Guardar como dataset</h2>
                  <button onClick={() => setSaveModal(false)} className="text-zinc-600 hover:text-zinc-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-400">Nombre <span className="text-red-400">*</span></label>
                    <input value={saveName} onChange={e => setSaveName(e.target.value)}
                      placeholder="Ej: Ventas Q1 2024"
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-400">Descripción</label>
                    <input value={saveDesc} onChange={e => setSaveDesc(e.target.value)}
                      placeholder="Opcional"
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none" />
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-500">
                    {result?.rows.length ?? 0} filas · {result?.columns.length ?? 0} columnas guardadas en caché
                    {activeSourceId && <span className="ml-1 text-zinc-600">· refresco automático disponible</span>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setSaveModal(false)}
                      className="flex-1 rounded-lg border border-zinc-700 py-2 text-xs text-zinc-400 hover:bg-zinc-800">
                      Cancelar
                    </button>
                    <button onClick={saveDataset} disabled={saving || !saveName.trim()}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-500 py-2 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-40">
                      {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                      Guardar dataset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SqlPage() {
  return (
    <Suspense>
      <SqlWorkspaceInner />
    </Suspense>
  );
}
