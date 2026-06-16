import { Zap, Database, BarChart2, Code2, ArrowRight } from "lucide-react";
import Link from "next/link";

const quickActions = [
  {
    href: "/connectors",
    icon: Database,
    title: "Conectar datos",
    description: "PostgreSQL, MySQL, SQLite, CSV y más",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    href: "/dashboards/new",
    icon: BarChart2,
    title: "Nuevo dashboard",
    description: "Crea visualizaciones arrastrando componentes",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
  },
  {
    href: "/sql",
    icon: Code2,
    title: "SQL Workspace",
    description: "Editor con autocompletado y resultados en tiempo real",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Zap className="h-5 w-5 text-indigo-400" strokeWidth={2} />
          <h1 className="text-xl font-semibold text-zinc-100">Perf-Bi</h1>
        </div>
        <p className="text-sm text-zinc-500">
          Plataforma de Business Intelligence — sin configuración, sin fricción.
        </p>
      </div>

      {/* Quick actions */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-600">
          Empezar
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {quickActions.map(({ href, icon: Icon, title, description, color, bg }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-800/60"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-4.5 w-4.5 ${color}`} strokeWidth={1.75} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-100">{title}</p>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Empty state dashboards */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-600">
          Dashboards recientes
        </p>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
            <BarChart2 className="h-5 w-5 text-zinc-600" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-zinc-400">Sin dashboards todavía</p>
          <p className="mt-1 text-xs text-zinc-600">
            Conecta una fuente de datos y crea tu primer dashboard
          </p>
          <Link
            href="/connectors"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-600"
          >
            <Database className="h-3.5 w-3.5" />
            Conectar datos
          </Link>
        </div>
      </div>
    </div>
  );
}
