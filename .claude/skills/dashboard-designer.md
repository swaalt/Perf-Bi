# Skill: dashboard-designer

Especialista en el sistema de dashboards de Perf-Bi: layouts drag-and-drop, widgets y responsividad.

## Cuándo usar este skill

- Crear el layout de dashboard con grid drag-and-drop
- Agregar, editar o eliminar tipos de widgets
- Implementar resize de widgets
- Persistir la configuración del dashboard
- Crear vistas de edición vs. presentación

## Stack de Dashboard

- **Grid:** `@dnd-kit/core` + `@dnd-kit/sortable` para drag-and-drop
- **Layout:** CSS Grid nativo con posicionamiento por coordenadas
- **Estado:** Zustand store en `src/stores/dashboard.ts`
- **Persistencia:** localStorage para dev, DB para producción

## Estructura de Archivos

```
src/components/dashboard/
├── DashboardGrid.tsx       # Grid principal con dnd-kit
├── Widget.tsx              # Contenedor genérico de widget
├── WidgetPicker.tsx        # Modal para agregar nuevo widget
├── widgets/
│   ├── ChartWidget.tsx     # Widget con gráfico ECharts
│   ├── SqlWidget.tsx       # Widget con query + resultado
│   ├── KpiWidget.tsx       # Métrica grande con tendencia
│   └── TextWidget.tsx      # Texto/markdown estático
└── DashboardToolbar.tsx    # Controles: editar, guardar, compartir
```

## Modelo de Datos del Dashboard

```ts
interface DashboardLayout {
  id: string
  name: string
  widgets: WidgetConfig[]
  createdAt: string
  updatedAt: string
}

interface WidgetConfig {
  id: string
  type: 'chart' | 'sql' | 'kpi' | 'text'
  position: { x: number; y: number; w: number; h: number }
  config: ChartWidgetConfig | SqlWidgetConfig | KpiWidgetConfig | TextWidgetConfig
}

interface ChartWidgetConfig {
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap'
  dataSourceId: string
  sql: string
  title?: string
  xAxis?: string
  yAxis?: string
}
```

## Zustand Store

```ts
// src/stores/dashboard.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DashboardStore {
  layout: DashboardLayout | null
  isEditing: boolean
  setEditing: (v: boolean) => void
  addWidget: (widget: WidgetConfig) => void
  removeWidget: (id: string) => void
  updateWidget: (id: string, config: Partial<WidgetConfig>) => void
  moveWidget: (id: string, position: WidgetConfig['position']) => void
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      layout: null,
      isEditing: false,
      setEditing: (v) => set({ isEditing: v }),
      addWidget: (widget) =>
        set((s) => ({
          layout: s.layout
            ? { ...s.layout, widgets: [...s.layout.widgets, widget] }
            : null,
        })),
      removeWidget: (id) =>
        set((s) => ({
          layout: s.layout
            ? { ...s.layout, widgets: s.layout.widgets.filter((w) => w.id !== id) }
            : null,
        })),
      updateWidget: (id, config) =>
        set((s) => ({
          layout: s.layout
            ? {
                ...s.layout,
                widgets: s.layout.widgets.map((w) =>
                  w.id === id ? { ...w, ...config } : w
                ),
              }
            : null,
        })),
      moveWidget: (id, position) =>
        set((s) => ({
          layout: s.layout
            ? {
                ...s.layout,
                widgets: s.layout.widgets.map((w) =>
                  w.id === id ? { ...w, position } : w
                ),
              }
            : null,
        })),
    }),
    { name: 'perf-bi-dashboard' }
  )
)
```

## Modo Edición vs. Presentación

- **Presentación** (default): Gráficos interactivos, sin controles de layout
- **Edición**: Drag handles visibles, botón X para eliminar, resize handles

```tsx
// El Widget sabe en qué modo está via el store
const isEditing = useDashboardStore((s) => s.isEditing)

<div className={cn(
  'relative rounded-lg border bg-card',
  isEditing && 'border-dashed border-indigo-500/50 cursor-move'
)}>
  {isEditing && (
    <button onClick={() => removeWidget(id)} className="absolute top-2 right-2 z-10">
      <X className="h-4 w-4" />
    </button>
  )}
  {children}
</div>
```

## Checklist al Diseñar el Dashboard

- [ ] El modo edición está claramente diferenciado visualmente
- [ ] Los widgets tienen un estado vacío/placeholder bonito
- [ ] El layout persiste entre recargas (Zustand persist)
- [ ] Agregar widget abre un picker con preview del tipo
- [ ] Los widgets muestran loading skeleton mientras cargan datos
- [ ] En móvil, el grid se vuelve columna simple (sin drag)
