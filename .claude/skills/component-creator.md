# Skill: component-creator

Especialista en crear componentes UI para Perf-Bi siguiendo el design system oscuro y elegante del proyecto.

## Cuándo usar este skill

- Crear un nuevo componente de interfaz desde cero
- Adaptar componentes de shadcn/ui al tema del proyecto
- Construir layouts de página (sidebar, header, panels)
- Crear estados vacíos, skeletons de carga, y modales
- Implementar animaciones y transiciones

## Design System de Perf-Bi

### Paleta de Colores

```
Fondo principal:    #0a0a0a  (bg-zinc-950)
Fondo de cards:     #111111  (bg-zinc-900/50)
Borde sutil:        #1f1f1f  (border-zinc-800)
Texto principal:    #e5e7eb  (text-gray-200)
Texto secundario:   #6b7280  (text-gray-500)
Acento primario:    #6366f1  (indigo-500)
Acento secundario:  #8b5cf6  (violet-500)
Éxito:              #10b981  (emerald-500)
Error:              #ef4444  (red-500)
Warning:            #f59e0b  (amber-500)
```

### Tipografía

```css
--font-sans: 'Inter Variable', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Espaciado y Bordes

- Bordes redondeados: `rounded-lg` (8px) para cards, `rounded-md` (6px) para botones
- Sombras sutiles: `shadow-lg shadow-black/20`
- Glass morphism: `bg-zinc-900/60 backdrop-blur-sm`

## Anatomía de un Componente

```tsx
// src/components/ui/StatCard.tsx
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  change?: number        // % de cambio respecto al período anterior
  className?: string
}

export function StatCard({ label, value, change, className }: StatCardProps) {
  const isPositive = (change ?? 0) >= 0

  return (
    <div className={cn(
      'rounded-lg border border-zinc-800 bg-zinc-900/50 p-4',
      'transition-colors hover:border-zinc-700',
      className
    )}>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-100">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {change !== undefined && (
        <div className={cn(
          'mt-2 flex items-center gap-1 text-xs',
          isPositive ? 'text-emerald-500' : 'text-red-500'
        )}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{Math.abs(change).toFixed(1)}% vs período anterior</span>
        </div>
      )}
    </div>
  )
}
```

## Layout Principal de la App

```
┌─────────────────────────────────────────────┐
│  Header (h-14): Logo + Nav + User           │
├──────────┬──────────────────────────────────┤
│ Sidebar  │  Main Content Area               │
│ (w-56)   │  (flex-1, overflow-y-auto)       │
│          │                                  │
│ - Dashboards                                │
│ - SQL Editor                               │
│ - Data Sources                             │
│ - Settings                                 │
└──────────┴──────────────────────────────────┘
```

## Skeleton de Carga

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export function ChartSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-5 w-32 bg-zinc-800" />
      <Skeleton className="h-64 w-full bg-zinc-800/50" />
    </div>
  )
}
```

## Estado Vacío

```tsx
import { BarChart2 } from 'lucide-react'

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-full border border-zinc-800 bg-zinc-900 p-4">
        <BarChart2 className="h-8 w-8 text-zinc-600" />
      </div>
      <p className="text-sm text-zinc-500">{message}</p>
      {action}
    </div>
  )
}
```

## Convenciones de Componentes

```
- Usar `cn()` (clsx + tailwind-merge) para clases condicionales
- Siempre aceptar `className?: string` como prop para extensibilidad
- Iconos de Lucide React (tamaño estándar: h-4 w-4)
- Animaciones con `transition-` de Tailwind, no framer-motion (salvo casos complejos)
- Modales con `<Dialog>` de shadcn/ui
- Formularios con React Hook Form + Zod
```

## Checklist al Crear un Componente

- [ ] TypeScript estricto, props con interface explícita
- [ ] Acepta `className` para que el padre pueda extender estilos
- [ ] Tiene estado de loading si hace fetch de datos
- [ ] Tiene estado vacío si puede no tener datos
- [ ] Colores del design system (no inventar nuevos grises)
- [ ] Responsive: funciona en 1280px+ (desktop first, luego tablet)
- [ ] Accesible: `aria-label` en iconos interactivos, `role` donde aplique
