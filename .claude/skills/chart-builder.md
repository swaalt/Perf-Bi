# Skill: chart-builder

Especialista en crear y modificar componentes de gráficos con Apache ECharts en Perf-Bi.

## Cuándo usar este skill

- Crear un nuevo tipo de gráfico (barras, líneas, pie, scatter, mapa de calor, etc.)
- Modificar la apariencia o comportamiento de un gráfico existente
- Agregar interactividad (tooltips, zoom, filtros, drill-down)
- Optimizar rendering para datasets grandes

## Stack de Gráficos

- **Librería:** `echarts` + `echarts-for-react`
- **Ubicación:** `src/components/charts/`
- **Tipos de datos:** Siempre tipados con interfaces en `src/types/charts.ts`

## Estructura de un Componente de Gráfico

```tsx
// src/components/charts/BarChart.tsx
'use client'

import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'

interface BarChartProps {
  data: { label: string; value: number }[]
  title?: string
  height?: number
}

export function BarChart({ data, title, height = 300 }: BarChartProps) {
  const option: EChartsOption = useMemo(() => ({
    backgroundColor: 'transparent',
    title: title ? { text: title, textStyle: { color: '#e5e7eb' } } : undefined,
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map(d => d.label),
      axisLabel: { color: '#9ca3af' },
      axisLine: { lineStyle: { color: '#374151' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af' },
      splitLine: { lineStyle: { color: '#1f2937' } },
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.value),
      itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] },
    }],
  }), [data, title])

  return (
    <ReactECharts
      option={option}
      style={{ height }}
      theme="dark"
      opts={{ renderer: 'canvas' }}
    />
  )
}
```

## Paleta de Colores Estándar

```ts
const CHART_COLORS = {
  primary: '#6366f1',    // indigo
  secondary: '#8b5cf6',  // violet
  success: '#10b981',    // emerald
  warning: '#f59e0b',    // amber
  danger: '#ef4444',     // red
  muted: '#6b7280',      // gray
  series: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
}
```

## Patrones de Interactividad

**Tooltip personalizado:**
```ts
tooltip: {
  trigger: 'axis',
  formatter: (params) => `<b>${params[0].name}</b>: ${params[0].value.toLocaleString()}`,
  backgroundColor: '#1f2937',
  borderColor: '#374151',
  textStyle: { color: '#e5e7eb' },
}
```

**Zoom con DataZoom:**
```ts
dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10 }]
```

**Click events:**
```tsx
<ReactECharts
  option={option}
  onEvents={{ click: (params) => onDataPointClick(params.data) }}
/>
```

## Tipos de Gráficos Disponibles

| Tipo | Componente | Cuándo usar |
|------|-----------|-------------|
| Barras | `BarChart` | Comparar categorías |
| Líneas | `LineChart` | Tendencias en el tiempo |
| Pie/Donut | `PieChart` | Proporciones |
| Scatter | `ScatterChart` | Correlaciones |
| Tabla | `DataTable` | Datos crudos paginados |
| KPI Card | `KpiCard` | Métricas únicas con tendencia |
| Heatmap | `HeatmapChart` | Densidad bidimensional |

## Checklist al Crear un Gráfico

- [ ] Props tipadas con interface explícita
- [ ] `useMemo` en el objeto `option` para no recalcular en cada render
- [ ] Colores consistentes con la paleta del proyecto
- [ ] Fondo `transparent` para que tome el color del contenedor
- [ ] `axisLabel` y `splitLine` con colores del tema oscuro
- [ ] Responsive: no hardcodear width, usar `style={{ height }}`
- [ ] Loading state si los datos llegan de forma async
