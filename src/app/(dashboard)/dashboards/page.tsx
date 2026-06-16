"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, BarChart2, Trash2, LayoutDashboard, Copy } from "lucide-react";
import { useRouter } from "next/navigation";

interface Dashboard {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = async () => {
    try {
      const res = await fetch("/api/dashboards");
      if (res.ok) setDashboards(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/dashboards/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const copy = await res.json();
      router.push(`/dashboards/${copy.id}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
    setDashboards((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Dashboards</h1>
          <p className="text-sm text-zinc-500">Gestiona y crea tus dashboards</p>
        </div>
        <Link
          href="/dashboards/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Nuevo dashboard
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
        </div>
      ) : dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 py-20 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
            <BarChart2 className="h-5 w-5 text-zinc-600" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-zinc-400">Sin dashboards</p>
          <p className="mt-1 text-xs text-zinc-600">Crea tu primer dashboard para empezar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((d) => (
            <div
              key={d.id}
              className="group relative flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                    <LayoutDashboard className="h-4 w-4 text-indigo-400" strokeWidth={1.75} />
                  </div>
                  <Link
                    href={`/dashboards/${d.id}`}
                    className="text-sm font-medium text-zinc-100 hover:text-indigo-400 transition-colors"
                  >
                    {d.name}
                  </Link>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDuplicate(d.id)} title="Duplicar"
                    className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(d.id, d.name)} title="Eliminar"
                    className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-zinc-600">
                {new Date(d.updatedAt).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
