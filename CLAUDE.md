# Perf-Bi

Plataforma BI moderna que reemplaza Power BI. Más dinámica, bonita y fácil de usar.

## Filosofía Central

**Sin IA por defecto. Con IA si el usuario la quiere.**

- Análisis de datos: algorítmico y estadístico (sin LLM)
- Query building: constructor visual (tipo Metabase) + SQL editor completo
- Dashboards automáticos: rule-based por shape del dataset
- Performance tips: parseo de EXPLAIN ANALYZE con reglas fijas
- **Opcional**: el usuario configura su API key (Claude o Gemini) y desbloquea NL→SQL + sugerencias inteligentes

Sin API key la herramienta es completa y potente. Con API key es excepcional.

## Stack Tecnológico

**Frontend:**
- Next.js 15 (App Router) + TypeScript strict
- Tailwind CSS v4 + shadcn/ui
- Apache ECharts + echarts-for-react (gráficos)
- Monaco Editor (SQL editor con schema-aware autocomplete)
- @dnd-kit (drag-and-drop dashboards)
- Zustand (estado global client-side)
- @tanstack/react-query (server state + cache)
- @tanstack/react-virtual (virtualización de tablas grandes)
- Framer Motion (animaciones donde sea necesario)

**Backend:**
- Next.js API Routes
- Prisma ORM → PostgreSQL (metadata de la app)
- DuckDB (queries analíticos en memoria sobre CSV/Parquet)
- Drivers nativos: pg, mysql2, better-sqlite3

**IA (opcional):**
- @anthropic-ai/sdk (Claude Haiku — NL→SQL si hay API key)
- @google/generative-ai (Gemini — alternativa)
- El usuario configura su propia key en Settings → nunca hardcodeada

## Estructura del Proyecto

```
src/
├── app/
│   ├── (dashboard)/            # Rutas con sidebar
│   │   ├── layout.tsx          # Layout con sidebar fijo
│   │   ├── page.tsx            # Home / overview
│   │   ├── dashboards/         # Listado y builder
│   │   ├── sql/                # SQL Workspace
│   │   ├── explore/            # Data explorer
│   │   ├── connectors/         # Fuentes de datos
│   │   └── settings/           # Config + API keys opcionales
│   ├── api/
│   │   ├── data-sources/       # CRUD conexiones
│   │   ├── query/              # Ejecutar SQL, EXPLAIN, schema
│   │   ├── dashboards/         # CRUD dashboards
│   │   └── ai/                 # NL→SQL (solo si hay API key)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── charts/                 # Wrappers de ECharts
│   ├── sql/                    # Monaco + resultados
│   ├── dashboard/              # Grid, widgets, picker
│   ├── query-builder/          # Constructor visual de queries
│   ├── data-sources/           # Conectores y schema
│   └── ui/                     # shadcn + custom base components
├── lib/
│   ├── db/                     # Clientes por tipo de DB
│   ├── analyze/                # Análisis algorítmico de datasets
│   ├── query-builder/          # Generación de SQL desde UI
│   └── utils/                  # cn(), formatters, etc.
└── stores/                     # Zustand stores
```

## Principios de Código

- Componentes Server por defecto, `'use client'` solo si es necesario
- Props con interfaces TypeScript explícitas, nunca `any`
- `cn()` (clsx + tailwind-merge) para clases condicionales
- Sin comentarios obvios; solo cuando el WHY es no-obvio
- Validación con Zod en todos los inputs de API

## Design System

Dos modos: **Formal** (blanco, azul corporativo) e **Informal** (dark, indigo/violet).
Default: modo Informal (dark).

```
bg:       zinc-950  (#09090B)
card:     zinc-900  (#18181B)
border:   zinc-800  (#27272A)
text:     gray-100  (#F4F4F5)
muted:    zinc-500  (#71717A)
accent:   indigo-500 (#6366F1)
accent-2: violet-500 (#8B5CF6)
```

Tipografía: Inter Variable (UI) + JetBrains Mono (código/SQL)

## Comandos

```bash
pnpm dev          # Dev server (localhost:3000)
pnpm build        # Build producción
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
```

## Skills Disponibles

| Skill | Cuándo invocarla |
|-------|-----------------|
| `/chart-builder` | Crear/modificar gráficos ECharts |
| `/sql-workspace` | Editor SQL, Monaco, resultados |
| `/dashboard-designer` | Layout drag-and-drop, widgets |
| `/data-source` | Conexiones a DBs y APIs |
| `/component-creator` | Componentes UI con el design system |
