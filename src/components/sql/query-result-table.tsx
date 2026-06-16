"use client"

import { useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { QueryResult } from "@/types/db"

interface Props { result: QueryResult }

export function QueryResultTable({ result }: Props) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: result.rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 15,
  })

  const exportCsv = () => {
    const header = result.columns.join(",")
    const rows = result.rows.map((row) =>
      (row as unknown[]).map((v) => {
        const str = v === null || v === undefined ? "" : String(v)
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
      }).join(",")
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "query_result.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-800 px-3">
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span><span className="font-medium text-zinc-300">{result.rowCount.toLocaleString()}</span> filas</span>
          <span className="text-zinc-700">·</span>
          <span>{result.durationMs}ms</span>
        </div>
        <button onClick={exportCsv} className="text-xs text-zinc-500 transition-colors hover:text-zinc-300">
          Exportar CSV
        </button>
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto">
        <table className="w-full min-w-max border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-zinc-900">
            <tr>
              {result.columns.map((col) => (
                <th key={col} className="border-b border-zinc-800 px-3 py-2 text-left font-medium text-zinc-400">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
            {rowVirtualizer.getVirtualItems().map((vRow) => {
              const row = result.rows[vRow.index] as unknown[]
              return (
                <tr
                  key={vRow.index}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: `${vRow.size}px`, transform: `translateY(${vRow.start}px)` }}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                >
                  {result.columns.map((col, j) => (
                    <td key={col} className="px-3 py-2 font-mono text-zinc-300">
                      {row[j] === null || row[j] === undefined
                        ? <span className="text-zinc-700">NULL</span>
                        : String(row[j])
                      }
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
