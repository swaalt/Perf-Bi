"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart2, LineChart, PieChart, Table2, Hash, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const WIDGET_TYPES = [
  { id: "bar",   label: "Barras",    icon: BarChart2,  desc: "Comparar categorías" },
  { id: "line",  label: "Líneas",    icon: LineChart,  desc: "Tendencias en el tiempo" },
  { id: "pie",   label: "Pie",       icon: PieChart,   desc: "Proporciones" },
  { id: "table", label: "Tabla",     icon: Table2,     desc: "Datos en grilla" },
  { id: "kpi",   label: "KPI",       icon: Hash,       desc: "Métrica con tendencia" },
];

export default function NewDashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error("Error al crear el dashboard");
      const data = await res.json();
      router.push(`/dashboards/${data.id}`);
    } catch {
      setError("No se pudo crear el dashboard. Intentá de nuevo.");
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href="/dashboards"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a Dashboards
      </Link>

      <div className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">Nuevo dashboard</h1>
        <p className="text-sm text-zinc-500">
          Ponle un nombre y empieza a agregar widgets
        </p>
      </div>

      <div className="mb-8">
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
          Nombre del dashboard
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Ej: Revenue mensual, Ops overview..."
          autoFocus
          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none transition-colors"
        />
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      <div className="mb-8">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-600">
          Tipos de widgets disponibles
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {WIDGET_TYPES.map(({ id, label, icon: Icon, desc }) => (
            <div
              key={id}
              className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                <Icon className="h-4 w-4 text-indigo-400" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">{label}</p>
                <p className="text-[10px] text-zinc-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={!name.trim() || saving}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors",
          name.trim() && !saving
            ? "bg-indigo-500 text-white hover:bg-indigo-600"
            : "cursor-not-allowed bg-zinc-800 text-zinc-600"
        )}
      >
        <Plus className="h-4 w-4" />
        {saving ? "Creando..." : "Crear dashboard"}
      </button>
    </div>
  );
}
