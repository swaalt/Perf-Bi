"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Code2,
  Database,
  Compass,
  Settings,
  Zap,
  Table2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { href: "/",           label: "Inicio",       icon: LayoutDashboard },
  { href: "/dashboards", label: "Dashboards",   icon: Zap },
  { href: "/sql",        label: "SQL Workspace", icon: Code2 },
  { href: "/datasets",   label: "Datasets",     icon: Table2 },
  { href: "/explore",    label: "Explorador",   icon: Compass },
  { href: "/connectors", label: "Conectores",   icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-[#27272a] bg-[#18181b]">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-[#27272a] px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500">
          <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold tracking-tight text-zinc-100">
          Perf-Bi
        </span>
      </div>

      {/* Navegación */}
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-indigo-500/10 text-indigo-400"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"
                )}
                strokeWidth={1.75}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#27272a] p-2">
        <Link
          href="/settings"
          className={cn(
            "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
            pathname.startsWith("/settings")
              ? "bg-indigo-500/10 text-indigo-400"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          )}
        >
          <Settings
            className="h-4 w-4 shrink-0 text-zinc-500 transition-colors group-hover:text-zinc-300"
            strokeWidth={1.75}
          />
          Configuración
        </Link>
      </div>
    </aside>
  );
}
