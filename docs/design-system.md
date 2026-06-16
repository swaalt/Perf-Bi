# Perf-Bi — Diseño de Producto Completo

## 1. EXPERIENCIA DE USUARIO (UX/UI)

---

### Pantallas Principales y Flujo de Navegación

```
┌─────────────────────────────────────────────────────────────────┐
│  SIDEBAR (w-56, fijo)          ÁREA PRINCIPAL                   │
│  ─────────────────────         ───────────────────────────────  │
│  ⊞  Home                       [Contenido de la ruta activa]    │
│  ▦  Dashboards                                                   │
│  ⌘  SQL Workspace                                               │
│  ⚡  Explorador de Datos                                         │
│  ⬡  Conectores                                                   │
│  ◎  Configuración                                               │
│                                                                 │
│  ─────────────────────                                          │
│  [Avatar] Sebastián ▾                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flujo Completo: De Cero a Dashboard en 4 Pasos

```
PASO 1: CONECTAR                PASO 2: ANALIZAR
────────────────                ────────────────
Usuario llega →                 Sistema detecta automáticamente:
"Conectar datos"                ┌──────────────────────────────┐
    │                           │ ✓ 4 columnas numéricas        │
    ▼                           │ ✓ 1 columna de fecha          │
┌─────────────┐                 │ ✓ 2 columnas categóricas      │
│  Elige:     │                 │                               │
│  • DB       │                 │ "Detecté: ventas, fecha,      │
│  • CSV      │ ──────────────► │  cliente, región, producto"  │
│  • API      │                 │                               │
│  • Sheets   │                 │ ¿Qué quieres analizar?        │
└─────────────┘                 │ [Crecimiento] [Retención]     │
                                │ [Revenue] [Distribución]      │
                                └──────────────────────────────┘

PASO 3: SELECCIONAR             PASO 4: DASHBOARD LISTO
───────────────────             ───────────────────────
Usuario elige "Revenue"         Dashboard generado automáticamente:
    │                           ┌─────────────────────────────────┐
    ▼                           │ [KPI: Revenue Total]             │
Sistema propone:                │ [KPI: Crecimiento MoM]          │
┌──────────────────┐            │ [KPI: Ticket Promedio]           │
│ Voy a crear:     │            │                                 │
│ • 3 KPIs clave   │ ────────►  │ [Línea: Revenue en el tiempo]   │
│ • Gráfico línea  │            │ [Barras: Revenue por región]    │
│ • Top productos  │            │ [Tabla: Top 10 productos]       │
│ • Mapa de calor  │            │                                 │
└──────────────────┘            │ [Editar layout] [Compartir]    │
                                └─────────────────────────────────┘
```

---

### Modos de Diseño

#### Modo Formal (Corporativo)

```
Paleta:
  bg-primary:    #FAFAFA   (casi blanco)
  bg-card:       #FFFFFF
  border:        #E2E8F0
  text-primary:  #0F172A   (slate-900)
  text-muted:    #64748B   (slate-500)
  accent:        #2563EB   (blue-600)
  accent-2:      #7C3AED   (violet-600)

Tipografía: Inter + DM Serif Display para números grandes
Bordes: finos, sutiles. Cards con sombra xs.
Charts: azules, violetas, paleta corporate controlada.
Iconos: líneas delgadas (stroke-width: 1.5), geométricos.
Espaciado: amplio, generoso. Mucho blanco.
```

#### Modo Informal (Moderno / Startup)

```
Paleta:
  bg-primary:    #09090B   (zinc-950)
  bg-card:       #18181B   (zinc-900)
  border:        #27272A   (zinc-800)
  text-primary:  #FAFAFA
  text-muted:    #71717A   (zinc-500)
  accent:        #6366F1   (indigo-500)
  accent-2:      #EC4899   (pink-500)
  glow:          rgba(99,102,241,0.15)

Tipografía: Inter Variable + JetBrains Mono
Bordes: glow sutil en hover (box-shadow: 0 0 0 1px accent)
Charts: paleta vibrante. Gradientes en barras.
Iconos: duotone con acento de color, grosor medio.
Espaciado: denso pero respirado. Grid compacto.
```

---

### Sistema de Diseño (Tokens)

```ts
// design-tokens.ts
export const tokens = {
  // Espaciado (múltiplos de 4px)
  space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px', 12: '48px' },

  // Tipografía
  fontSizes: {
    xs: '11px',   // Labels de ejes
    sm: '13px',   // Texto secundario
    base: '14px', // Texto body
    lg: '16px',   // Subtítulos
    xl: '20px',   // Títulos de card
    '2xl': '28px', // KPIs
    '4xl': '48px', // Hero KPI
  },

  // Radio de bordes
  radius: { sm: '6px', md: '8px', lg: '12px', full: '9999px' },

  // Duración de animaciones
  duration: { fast: '100ms', base: '200ms', slow: '350ms', enter: '400ms' },

  // Easing curves
  easing: {
    default: 'cubic-bezier(0.16, 1, 0.3, 1)',  // spring suave
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
    enter: 'cubic-bezier(0, 0, 0.2, 1)',
  },
}
```

---

### Iconografía — Estilo Visual

Los íconos NO son de librerías genéricas. Son SVG personalizados con estas reglas:

```
Estilo visual:
  - Stroke-based, no filled (excepto estados activos)
  - stroke-width: 1.75px en 20x20 viewport
  - Esquinas levemente redondeadas (stroke-linecap: round)
  - Dos pesos: outline (inactivo) / semi-filled (activo/hover)
  - Algunos íconos tienen un elemento de "acento" en el color principal

Ejemplos de descripción:
  ⊞ Dashboard: cuadrícula de 4 rectángulos, esquinas redondeadas,
    el superior-derecho con fill en accent para indicar "activo"

  ⚡ SQL: relámpago con bordes geométricos, no curvilíneo,
    trazo más grueso que el resto (2px) para dar jerarquía

  ⬡ Conectores: hexágono con 3 nodos conectados por líneas delgadas,
    los nodos son círculos pequeños filled

  ◎ Configuración: engranaje de 8 dientes, sin borde exterior,
    solo los dientes y el círculo interior
```

---

### Componentes Drag-and-Drop

```
┌─────────────────────────────────────────────────────────────────┐
│  WIDGET PICKER (aparece al hacer clic en +)                     │
│                                                                 │
│  Gráficos          KPIs            Tablas          Texto        │
│  ┌────────┐        ┌────────┐      ┌────────┐      ┌────────┐  │
│  │ ╱╲╱╲╱  │        │  $12K  │      │▔▔▔▔▔▔▔ │      │ Text   │  │
│  │ Línea  │        │ KPI    │      │ Tabla  │      │ Block  │  │
│  └────────┘        └────────┘      └────────┘      └────────┘  │
│                                                                 │
│  ┌────────┐        ┌────────┐      ┌────────┐      ┌────────┐  │
│  │ ▊▊ ▊▊  │        │  ◔     │      │ ▓▒░    │      │ </> │   │  │
│  │ Barras │        │ Pie    │      │ Heatmap│      │ Custom │  │
│  └────────┘        └────────┘      └────────┘      └────────┘  │
└─────────────────────────────────────────────────────────────────┘

INTERACCIÓN DE DRAG:
  1. Usuario hace clic y arrastra widget al grid
  2. Grid muestra "sombra de destino" en azul translúcido
  3. Al soltar: animación spring de asentamiento (no lineal)
  4. Resize: handle en esquina inferior-derecha (aparece en hover)
  5. El widget se adapta automáticamente al nuevo tamaño
```

---

### Animaciones y Microinteracciones

```
PRINCIPIO: Las animaciones comunican estado, no decoran.

Entrada de página:      fade + translateY(8px) → 0, 250ms, staggered
Carga de datos:         skeleton pulse con gradiente, no spinner
Chart render:           los datos "crecen" desde el eje (ease-out, 600ms)
KPI update:             número animado (counter animado con requestAnimationFrame)
Toast/notificación:     slide desde abajo-derecha, auto-dismiss 4s
Modal open:             scale(0.97) → scale(1), backdrop blur gradual
Drag:                   cursor cambia, widget levemente elevado (shadow-xl)
Error state:            shake horizontal sutil (3 oscilaciones, 300ms)

NO USAR:
  × Bounces exagerados
  × Rotaciones de 360°
  × Fade largo > 400ms
  × Animaciones en elementos de texto body
```

---

## 2. GENERACIÓN AUTOMÁTICA DE DASHBOARDS

---

### Analizador de Dataset

```
PIPELINE DE ANÁLISIS (se ejecuta al conectar datos)

Paso 1: Detección de tipos
───────────────────────────
Columna → Inferir tipo:
  • Si 90%+ son números → "numeric"
  • Si parsea como ISO date → "datetime"
  • Si cardinalidad < 50 y texto → "categorical"
  • Si cardinalidad = n_rows → "identifier" (ignorar en charts)
  • Si contiene lat/lon → "geo"

Paso 2: Detección de métricas candidatas
──────────────────────────────────────────
Para cada columna numérica:
  ┌─────────────────────────────────────────────────┐
  │ sum(col) → candidato a "total"                  │
  │ avg(col) → candidato a "promedio"               │
  │ Si hay datetime → calcular MoM, WoW, YoY        │
  │ Si hay categorical → calcular breakdown por cat │
  └─────────────────────────────────────────────────┘

Paso 3: Detección de dimensiones
──────────────────────────────────
  • Columna datetime con col numérica → Serie temporal
  • Col categórica con col numérica  → Ranking/Barras
  • 2 cols numéricas correladas      → Scatter
  • Col categórica con fecha         → Heatmap/Multilinea

Paso 4: Template matching
──────────────────────────
Dataset shape → Template:

  Ventas/Revenue:
    tiene: [importe, fecha, cliente?]
    dashboard: revenue_overview_template

  Operaciones/Tickets:
    tiene: [estado, fecha_creacion, asignado?]
    dashboard: operations_template

  Marketing:
    tiene: [canal, conversiones, costo, fecha]
    dashboard: marketing_funnel_template

  Genérico:
    fallback: summary_template (KPIs + chart de barras + tabla)
```

---

### Sistema de Sugerencias Inteligentes

```
CUADRO DE DIÁLOGO POST-ANÁLISIS:

┌──────────────────────────────────────────────────────────────────┐
│  ⚡ Análisis completado                                           │
│                                                                  │
│  Encontré en tu dataset (ventas_2024.csv):                       │
│                                                                  │
│  📊 147,832 registros  |  8 columnas  |  Rango: Ene–Dic 2024    │
│                                                                  │
│  ┌─────────────────┬──────────────────┬───────────────────────┐ │
│  │ Columna         │ Tipo detectado   │ Uso sugerido          │ │
│  ├─────────────────┼──────────────────┼───────────────────────┤ │
│  │ fecha_venta     │ Fecha/Hora       │ Eje X temporal        │ │
│  │ monto           │ Numérico         │ KPI principal         │ │
│  │ region          │ Categoría (7)    │ Filtro / breakdown    │ │
│  │ producto        │ Categoría (234)  │ Top-N ranking         │ │
│  │ cliente_id      │ Identificador    │ Conteo único          │ │
│  └─────────────────┴──────────────────┴───────────────────────┘ │
│                                                                  │
│  ¿Qué quieres analizar?                                          │
│                                                                  │
│  [📈 Crecimiento de ventas]  [👥 Análisis de clientes]           │
│  [🌎 Performance por región] [📦 Ranking de productos]           │
│                                                                  │
│  O describe qué quieres ver: [___________________________] →     │
└──────────────────────────────────────────────────────────────────┘

Al elegir "Crecimiento de ventas":
  Sistema genera en < 2 segundos:
  → KPI: Total Revenue ($2.4M)
  → KPI: Crecimiento MoM (+12.3%)
  → KPI: Mejor mes (Octubre)
  → Gráfico de línea: Revenue diario/semanal (toggle)
  → Gráfico de barras: Revenue por región
  → Tabla: Top 10 productos por revenue
```

---

## 3. MOTOR INTELIGENTE DE CONSULTAS (SQL Copilot)

---

### Arquitectura del Copiloto

```
FLUJO DE UNA CONSULTA EN LENGUAJE NATURAL:

Usuario escribe: "ventas por país en los últimos 3 meses"
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  CONTEXT BUILDER                                         │
│  ────────────────                                        │
│  Inyectar al prompt:                                     │
│  • Schema de la DB conectada (tablas + columnas + tipos) │
│  • Últimas 5 queries ejecutadas (contexto de sesión)     │
│  • Metadata: rangos de fechas disponibles en los datos   │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  LLM (Claude API - Haiku para velocidad)                 │
│  ─────────────────────────────────────────────────────── │
│  System: "Eres un experto SQL. Genera queries exactas    │
│  para el schema siguiente. NO inventes columnas.         │
│  Retorna JSON: {sql, explanation, chartType}"            │
│                                                          │
│  Output:                                                 │
│  {                                                       │
│    sql: "SELECT region, SUM(monto) as total_ventas       │
│           FROM ventas                                    │
│           WHERE fecha >= CURRENT_DATE - INTERVAL '3 months'│
│           GROUP BY region                               │
│           ORDER BY total_ventas DESC",                   │
│    explanation: "Suma el monto por región filtrando      │
│                  los últimos 90 días",                   │
│    chartType: "bar",                                     │
│    kpiCandidate: false                                   │
│  }                                                       │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  VALIDADOR DE SQL                                        │
│  • Parsear el SQL (no ejecutar aún)                      │
│  • Verificar que las tablas/columnas existen en el schema│
│  • Si hay error → regenerar con feedback al LLM          │
└──────────────────────────────────────────────────────────┘
        │
        ▼
   Mostrar al usuario con opción de editar antes de ejecutar
```

---

### UI del SQL Copilot

```
┌──────────────────────────────────────────────────────────────────┐
│  SQL WORKSPACE                                        [Run ⌘↵]  │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  [Copiloto] [Editor] [Historia] [Snippets]                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Pregunta algo sobre tus datos...                           │ │
│  │ ej: "¿Cuál fue el mejor mes en ventas?" [→ Generar SQL]    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  SQL GENERADO: (editable)                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  1  SELECT                                                  │ │
│  │  2    DATE_TRUNC('month', fecha_venta) AS mes,             │ │
│  │  3    SUM(monto) AS total_ventas                           │ │
│  │  4  FROM ventas                                            │ │
│  │  5  WHERE fecha_venta >= CURRENT_DATE - INTERVAL '3 months'│ │
│  │  6  GROUP BY 1                                             │ │
│  │  7  ORDER BY total_ventas DESC                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  💡 Este query suma el monto agrupado por mes filtrando        │
│     los últimos 3 meses. Ordena de mayor a menor.              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  RESULTADOS   1,847 filas · 0.34s  [CSV] [Gráfico] [+]  │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │  mes           │  total_ventas                           │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │  2024-10-01    │  824,300                                │   │
│  │  2024-11-01    │  791,200                                │   │
│  │  2024-09-01    │  644,100                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. OPTIMIZACIÓN DE PERFORMANCE

---

### Analizador de Queries Lentas

```
DETECCIÓN AUTOMÁTICA:

Al ejecutar una query que tarda > 2 segundos:
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  QUERY ANALYZER                                           │
│  ─────────────────────────────────────────────────────── │
│  Ejecuta: EXPLAIN ANALYZE <query>                        │
│  Parsea el plan de ejecución                              │
│                                                           │
│  Detecta:                                                 │
│  • Seq Scan en tabla grande → falta índice                │
│  • Hash Join costoso → query demasiado amplio             │
│  • Sort costoso → falta índice en ORDER BY                │
│  • Rows estimados ≠ reales → estadísticas desactualizadas │
└───────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  RECOMENDACIONES (en lenguaje simple)                     │
│                                                           │
│  ⚠️ Tu consulta tardó 4.2s                                │
│                                                           │
│  Encontré 2 problemas:                                    │
│                                                           │
│  1. Se está leyendo TODA la tabla ventas (12M filas)      │
│     para encontrar solo las del último trimestre.         │
│     → Crear un índice en la columna fecha_venta           │
│     → Estimado: reducir a 0.3s                            │
│     [Ver SQL del índice] [Crear índice]                   │
│                                                           │
│  2. Los resultados cambian poco (son del mes pasado).     │
│     → Guardar en caché por 1 hora                         │
│     [Activar caché para este query]                       │
└───────────────────────────────────────────────────────────┘

SQL GENERADO AUTOMÁTICAMENTE:
  CREATE INDEX CONCURRENTLY idx_ventas_fecha
  ON ventas (fecha_venta)
  WHERE fecha_venta >= '2024-01-01';
  -- Índice parcial: solo datos recientes, más pequeño y rápido
```

---

### Sistema de Caché por Capas

```
L1: In-memory (proceso Node)
    TTL: 30 segundos
    Para: queries repetidas en la misma sesión
    Tamaño: 50MB por usuario

L2: Redis
    TTL: configurable (default 1 hora)
    Para: queries frecuentes across usuarios
    Invalidación: al detectar cambio en los datos fuente

L3: Materialización en DB
    Para: queries que se usan en dashboards productivos
    Trigger: usuario marca query como "crítica"
    Implementa: tabla _perf_bi_cache con hash del query como PK
```

---

## 5. CONECTORES DE DATOS

---

### Catálogo de Conectores

```
CATEGORÍA: Bases de Datos
  ┌─────────────┬─────────────┬─────────────┬─────────────┐
  │ PostgreSQL  │   MySQL     │  SQL Server │   SQLite    │
  │ BigQuery    │  Snowflake  │  Redshift   │ ClickHouse  │
  └─────────────┴─────────────┴─────────────┴─────────────┘

CATEGORÍA: SaaS
  ┌─────────────┬─────────────┬─────────────┬─────────────┐
  │    Jira     │   GitHub    │  HubSpot    │  Salesforce │
  │   Notion    │   Linear    │   Stripe    │   Shopify   │
  └─────────────┴─────────────┴─────────────┴─────────────┘

CATEGORÍA: Archivos
  ┌─────────────┬─────────────┬─────────────┐
  │    CSV      │   Parquet   │Google Sheets│
  └─────────────┴─────────────┴─────────────┘

CATEGORÍA: APIs
  ┌─────────────────────────────────────────┐
  │ REST API genérica (configuración manual)│
  └─────────────────────────────────────────┘
```

---

### Flujo de Conexión: Jira (ejemplo complejo resuelto)

```
ANTES (Power BI): 12 pasos, tokens manuales, errores oscuros
DESPUÉS (Perf-Bi): 3 clics

┌──────────────────────────────────────────────────┐
│  Conectar nueva fuente de datos                  │
│                                                  │
│  [🔷 Jira]  ← Usuario hace clic                 │
└──────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│  Autenticar con Atlassian                        │
│                                                  │
│  [Iniciar sesión con Atlassian] ← Botón OAuth    │
│                                                  │
│  → Redirect a accounts.atlassian.com             │
│  → Usuario ya estaba logueado: aprueba en 1 clic │
│  → Redirect de vuelta a Perf-Bi                  │
└──────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│  ✓ Conectado como sebastian@empresa.com          │
│                                                  │
│  ¿Qué datos quieres importar?                    │
│                                                  │
│  ● Issues (tickets, bugs, tareas)                │
│  ○ Sprints y velocidad del equipo                │
│  ○ Tiempo por issue (time tracking)              │
│  ○ Comentarios y actividad                       │
│                                                  │
│  Proyecto: [Todos ▾] o [PROJ-123 ▾]             │
│                                                  │
│  Preview de datos (últimos 5 registros):         │
│  ┌──────────┬──────────────┬──────────┬────────┐ │
│  │ key      │ summary      │ status   │ points │ │
│  │ PROJ-421 │ Fix login... │ Done     │ 3      │ │
│  │ PROJ-422 │ Dashboard... │ In Prog  │ 5      │ │
│  └──────────┴──────────────┴──────────┴────────┘ │
│                                                  │
│  [Conectar y sincronizar cada hora]              │
└──────────────────────────────────────────────────┘
```

---

### Conector SDK (para APIs personalizadas)

```ts
// Cualquier desarrollador puede crear un conector:

export const miConector: ConnectorDefinition = {
  id: 'mi-api-erp',
  name: 'Mi ERP interno',
  icon: 'building',
  auth: { type: 'api_key', header: 'X-API-Key' },

  tables: [
    {
      name: 'ordenes',
      description: 'Órdenes de compra',
      columns: [
        { name: 'id', type: 'string' },
        { name: 'fecha', type: 'datetime' },
        { name: 'monto', type: 'number' },
        { name: 'estado', type: 'string' },
      ],
      fetch: async ({ auth, params }) => {
        const res = await fetch(`https://mi-erp.com/api/ordenes?from=${params.from}`, {
          headers: { 'X-API-Key': auth.apiKey },
        })
        return res.json()
      },
    },
  ],
}
```

---

## 6. INTERACTIVIDAD AVANZADA (Custom HTML)

---

### Arquitectura del Bloque Personalizado

```
PRINCIPIO DE SEGURIDAD:
  El HTML del usuario corre en un <iframe sandbox> aislado.
  Solo puede comunicarse con el dashboard via postMessage.
  No puede acceder al DOM principal ni a las credenciales.

FLUJO DE DATOS:

  Dashboard (host)              iframe (custom block)
  ─────────────────             ─────────────────────
  queryResult →                 window.addEventListener('message', (e) => {
  postMessage({                   const { type, data } = e.data
    type: 'PERF_BI_DATA',         if (type === 'PERF_BI_DATA') {
    data: rows,                     // Usar data para renderizar
    schema: columns                 renderChart(data)
  })                              }
                                })

  ◄── postMessage({             window.parent.postMessage({
    type: 'FILTER_CHANGE',        type: 'FILTER_CHANGE',
    column: 'region',             column: 'region',
    value: 'Norte'                value: selectedRegion
  })                            })
  (aplica filtro al dashboard)
```

---

### Editor de Bloque Personalizado

```
┌────────────────────────────────────────────────────────────────┐
│  CUSTOM BLOCK EDITOR                              [Vista previa]│
│                                                                │
│  HTML / CSS / JavaScript                                       │
│  ─────────────────────────────────────────────────────────     │
│  1  <!DOCTYPE html>                                           │
│  2  <html>                                                    │
│  3  <head>                                                    │
│  4    <script src="https://d3js.org/d3.v7.min.js"></script>  │
│  5  </head>                                                   │
│  6  <body>                                                    │
│  7    <svg id="viz"></svg>                                    │
│  8    <script>                                               │
│  9      // Perf-Bi inyecta los datos aquí                    │
│ 10      window.addEventListener('message', (e) => {          │
│ 11        if (e.data.type === 'PERF_BI_DATA') {              │
│ 12          drawD3Chart(e.data.data)                         │
│ 13        }                                                  │
│ 14      })                                                   │
│ 15    </script>                                              │
│ 16  </body>                                                  │
│                                                                │
│  Query de datos:                                              │
│  SELECT region, SUM(ventas) FROM ...    [Cambiar query]       │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  PREVIEW                                                 │ │
│  │  [Renderiza el iframe en tiempo real]                    │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. ARQUITECTURA TÉCNICA

---

### Stack Completo

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14)                        │
│  App Router + Server Components + React 18                          │
│  ─────────────────────────────────────────────────────────────────  │
│  UI:         Tailwind CSS + shadcn/ui + Radix Primitives            │
│  Charts:     Apache ECharts (canvas renderer para performance)      │
│  SQL Editor: Monaco Editor (@monaco-editor/react)                   │
│  Drag/Drop:  @dnd-kit/core + sortable                               │
│  State:      Zustand (client) + React Query (server state)          │
│  Forms:      React Hook Form + Zod                                  │
│  Animaciones: Framer Motion (solo donde sea necesario)              │
└──────────────────────────────────────────────────────────────────────┘
                              │ HTTPS / WebSocket
┌──────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Node.js)                           │
│  Next.js API Routes para operaciones simples                        │
│  Fastify server separado para streaming de queries                  │
│  ─────────────────────────────────────────────────────────────────  │
│  Auth:       NextAuth.js (session) + JWT para API                   │
│  ORM:        Prisma → PostgreSQL (metadata de la app)              │
│  Query exec: Drivers nativos (pg, mysql2, better-sqlite3)           │
│  Analytics:  DuckDB (queries en memoria sobre CSV/Parquet)         │
│  AI:         Anthropic SDK (Claude Haiku para NL→SQL)              │
│  Cache:      Redis (ioredis)                                        │
│  Queue:      BullMQ (sync de conectores, exports pesados)          │
└──────────────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────────────┐
│                       INFRAESTRUCTURA                               │
│  Deploy:     Vercel (frontend) + Railway/Render (backend+Redis)     │
│  DB:         Supabase PostgreSQL (metadata) + DB del cliente        │
│  Storage:    Vercel Blob (CSV uploads, exports)                     │
│  CDN:        Vercel Edge Network                                    │
│  Monitoring: Sentry + Vercel Analytics                              │
└──────────────────────────────────────────────────────────────────────┘
```

---

### API Routes Principales

```
/api/auth/[...nextauth]     NextAuth
/api/data-sources/          CRUD de conexiones
/api/data-sources/:id/test  Test de conexión
/api/data-sources/:id/schema  Schema explorer
/api/query/execute          Ejecutar SQL
/api/query/explain          EXPLAIN ANALYZE
/api/query/nl               NL → SQL (LLM)
/api/dashboards/            CRUD de dashboards
/api/dashboards/:id/export  Export PDF/PNG
/api/sync/:connectorId      Trigger sync manual
```

---

### DuckDB — El Motor Analítico

```
¿Por qué DuckDB?
  • Procesa CSV/Parquet en memoria a velocidad columnar
  • Soporta SQL estándar + funciones analíticas avanzadas
  • No requiere servidor separado: se ejecuta en el proceso Node
  • Procesa 1M filas en < 1 segundo en hardware modesto

Cuándo se usa:
  • CSV uploads del usuario
  • Queries sobre datos cargados localmente
  • Aggregaciones rápidas para dashboard previews
  • Joins entre múltiples archivos

Cuándo se usa el driver nativo de DB:
  • Cuando el usuario conecta su propia PostgreSQL/MySQL
  • Para datos que viven en el cliente (privacy, latency)
```

---

## 8. DIFERENCIADORES VS POWER BI

---

```
┌─────────────────────────┬──────────────────────────┬──────────────────────────┐
│ Característica          │ Power BI                 │ Perf-Bi                  │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Setup inicial           │ Instalar app Windows,    │ Web app. Crear cuenta,   │
│                         │ licencia, workspace,     │ conectar datos.          │
│                         │ gateway. 1-2 días.       │ < 10 minutos.            │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Primer dashboard        │ DAX, relaciones manuales │ Auto-generado al cargar  │
│                         │ entre tablas, modelo     │ los datos. Editable.     │
│                         │ de datos. Días.          │ < 5 minutos.             │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Consultas               │ DAX (lenguaje propio,    │ SQL estándar + NL.       │
│                         │ difícil de aprender)     │ Copiloto explica todo.   │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Diseño visual           │ Templates genéricos.     │ Dark/light modes.        │
│                         │ Se ve "corporativo" por  │ Paleta adaptable.        │
│                         │ defecto. Difícil de      │ Bello por defecto,       │
│                         │ personalizar.            │ sin esfuerzo.            │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Colaboración            │ Workspaces de pago.      │ Link compartible.        │
│                         │ Permisos complejos.      │ Permisos simples.        │
│                         │ Requiere licencia Pro.   │ Sin licencia extra.      │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Conectar Jira           │ Conector de terceros,    │ OAuth en 1 clic.         │
│                         │ tokens manuales, errores │ Preview inmediato.       │
│                         │ crípticos.               │                          │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Performance             │ Datasets en memoria RAM  │ DuckDB columnar.         │
│                         │ del cliente. Lento       │ Redis cache.             │
│                         │ con > 1M filas.          │ Streaming de resultados. │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Extensibilidad          │ Custom visuals (complejo)│ Bloque HTML/JS libre.    │
│                         │ API con limitaciones.    │ Connector SDK abierto.   │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Plataforma              │ Solo Windows/Web.        │ Cualquier browser.       │
│                         │ Gateway requerido para   │ Cloud-native.            │
│                         │ datos on-premise.        │ Sin gateway.             │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Precio (equipo 5 users) │ $50-100/mes (Pro/Premium)│ Free tier generoso.      │
│                         │ + licencias Enterprise   │ $20-40/mes pro.          │
│                         │ para features avanzados. │ Sin sorpresas.           │
└─────────────────────────┴──────────────────────────┴──────────────────────────┘
```

---

## Roadmap de Construcción

```
FASE 1 — CORE (semanas 1-4)
  ✦ Setup Next.js + Tailwind + shadcn
  ✦ Sidebar + layout principal
  ✦ Conexión a PostgreSQL/MySQL/SQLite
  ✦ SQL Editor (Monaco) básico
  ✦ Gráficos básicos (bar, line, pie) con ECharts
  ✦ Dashboard manual (drag-and-drop)

FASE 2 — INTELIGENCIA (semanas 5-8)
  ✦ Analizador automático de datasets
  ✦ Auto-generación de dashboards
  ✦ Copiloto NL→SQL (Claude API)
  ✦ Query analyzer + recomendaciones

FASE 3 — CONECTORES (semanas 9-12)
  ✦ OAuth: Jira, GitHub, Google Sheets
  ✦ CSV upload + DuckDB
  ✦ Sync automático (BullMQ)
  ✦ Connector SDK público

FASE 4 — AVANZADO (semanas 13-16)
  ✦ Custom HTML blocks
  ✦ Exportación PDF/PNG
  ✦ Compartir dashboards (links públicos)
  ✦ Multi-tenant básico
  ✦ Performance cache (Redis)
```
