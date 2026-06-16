"use client"

import { useEffect, useState, useMemo } from "react"
import {
  ChevronRight, Table2, Columns, Loader2, Zap, ChevronDown, Search,
  Eye, TrendingUp, Trophy, BarChart2, Layers, ShieldCheck, Link2, Calendar,
  Type, GitBranch, Code2, Hash, Shuffle, Clock, Activity, Database,
  CheckCircle2, User, Users, Tag, AlertCircle, Globe, Settings,
  CreditCard, MessageSquare, BarChart, FileText, Filter, ArrowUpDown,
  Merge, Percent, BookOpen, Braces, Gauge, FolderSearch,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { DbSchema, SchemaTable } from "@/types/db"

// ─── Types ────────────────────────────────────────────────────────────────────

type LucideIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>
interface QueryTemplate { label: string; sql: string }
interface QueryCategory { key: string; Icon: LucideIcon; label: string; queries: QueryTemplate[] }

interface Props {
  dataSourceId: string
  sourceType?: string
  onInsert?: (sql: string) => void
}

// ─── SQL library generator ────────────────────────────────────────────────────

function generateQueryLibrary(schema: DbSchema): QueryCategory[] {
  const tables = schema.tables
  if (!tables.length) return []

  const isNum  = (type: string) => /int|float|decimal|numeric|double|real|money|bigint/i.test(type)
  const isCat  = (name: string, type: string) => /varchar|text|char|enum/i.test(type) && !/^id$|_id$/i.test(name)
  const isDate = (name: string) => /date|time|created|updated|timestamp|_at$/i.test(name)
  const isJson = (type: string) => /json|jsonb/i.test(type)
  const t0 = tables[0].name

  const cats: QueryCategory[] = []

  // ── 1. Exploración ──
  const exploracion: QueryTemplate[] = []
  for (const t of tables) {
    const cols = t.columns.map(c => c.name)
    exploracion.push(
      { label: `${t.name} — primeras 100 filas`,   sql: `SELECT *\nFROM ${t.name}\nLIMIT 100;` },
      { label: `${t.name} — contar registros`,      sql: `SELECT COUNT(*) AS total\nFROM ${t.name};` },
      { label: `${t.name} — muestra aleatoria 20`,  sql: `SELECT *\nFROM ${t.name}\nORDER BY RANDOM()\nLIMIT 20;` },
      { label: `${t.name} — últimas 50 filas`,      sql: `SELECT *\nFROM ${t.name}\nORDER BY ${t.columns[0]?.name ?? "1"} DESC\nLIMIT 50;` },
    )
    if (cols.length > 3) {
      exploracion.push({
        label: `${t.name} — primeras 5 columnas`,
        sql: `SELECT ${cols.slice(0, 5).join(", ")}\nFROM ${t.name}\nLIMIT 100;`,
      })
    }
    exploracion.push({
      label: `${t.name} — valores únicos por columna`,
      sql: cols.slice(0, 3).map(c => `SELECT '${c}' AS columna, COUNT(DISTINCT ${c}) AS unicos FROM ${t.name}`).join("\nUNION ALL\n") + ";",
    })
  }
  cats.push({ key: "exploracion", Icon: Eye, label: "Exploración", queries: exploracion })

  // ── 2. Tendencias temporales ──
  const tendencias: QueryTemplate[] = []
  for (const t of tables) {
    const dateCol = t.columns.find(c => isDate(c.name))?.name
    if (!dateCol) continue
    const numCols = t.columns.filter(c => isNum(c.type) && !/^id$|_id$/i.test(c.name)).map(c => c.name)
    const agg = numCols.length ? `,\n  SUM(${numCols[0]}) AS total_${numCols[0]}` : ""
    tendencias.push(
      { label: `${t.name} — por día`,            sql: `SELECT\n  DATE(${dateCol}) AS dia,\n  COUNT(*) AS cantidad${agg}\nFROM ${t.name}\nGROUP BY dia\nORDER BY dia DESC\nLIMIT 60;` },
      { label: `${t.name} — por semana`,          sql: `SELECT\n  DATE_TRUNC('week', ${dateCol}) AS semana,\n  COUNT(*) AS cantidad${agg}\nFROM ${t.name}\nGROUP BY semana\nORDER BY semana DESC\nLIMIT 26;` },
      { label: `${t.name} — por mes`,             sql: `SELECT\n  DATE_TRUNC('month', ${dateCol}) AS mes,\n  COUNT(*) AS cantidad${agg}\nFROM ${t.name}\nGROUP BY mes\nORDER BY mes DESC\nLIMIT 24;` },
      { label: `${t.name} — por año`,             sql: `SELECT\n  EXTRACT(YEAR FROM ${dateCol}) AS anio,\n  COUNT(*) AS cantidad${agg}\nFROM ${t.name}\nGROUP BY anio\nORDER BY anio DESC;` },
      { label: `${t.name} — por hora del día`,    sql: `SELECT\n  EXTRACT(HOUR FROM ${dateCol}) AS hora,\n  COUNT(*) AS cantidad\nFROM ${t.name}\nGROUP BY hora\nORDER BY hora;` },
      { label: `${t.name} — por día de semana`,   sql: `SELECT\n  EXTRACT(DOW FROM ${dateCol}) AS dia_sem,\n  TO_CHAR(${dateCol}, 'Day') AS nombre,\n  COUNT(*) AS cantidad\nFROM ${t.name}\nGROUP BY dia_sem, nombre\nORDER BY dia_sem;` },
      { label: `${t.name} — últimos 7 días`,      sql: `SELECT *\nFROM ${t.name}\nWHERE ${dateCol} >= CURRENT_DATE - INTERVAL '7 days'\nORDER BY ${dateCol} DESC;` },
      { label: `${t.name} — últimos 30 días`,     sql: `SELECT *\nFROM ${t.name}\nWHERE ${dateCol} >= CURRENT_DATE - INTERVAL '30 days'\nORDER BY ${dateCol} DESC;` },
      { label: `${t.name} — comparativa MoM`,     sql: `SELECT\n  DATE_TRUNC('month', ${dateCol}) AS mes,\n  COUNT(*) AS cantidad,\n  LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', ${dateCol})) AS mes_ant,\n  COUNT(*) - LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', ${dateCol})) AS diferencia\nFROM ${t.name}\nGROUP BY mes\nORDER BY mes DESC\nLIMIT 24;` },
      { label: `${t.name} — comparativa YoY`,     sql: `SELECT\n  EXTRACT(YEAR FROM ${dateCol})  AS anio,\n  EXTRACT(MONTH FROM ${dateCol}) AS mes,\n  COUNT(*) AS cantidad,\n  LAG(COUNT(*), 12) OVER (ORDER BY EXTRACT(YEAR FROM ${dateCol})*12 + EXTRACT(MONTH FROM ${dateCol})) AS mismo_mes_ant\nFROM ${t.name}\nGROUP BY anio, mes\nORDER BY anio DESC, mes DESC;` },
    )
  }
  if (tendencias.length) cats.push({ key: "tendencias", Icon: TrendingUp, label: "Tendencias temporales", queries: tendencias })

  // ── 3. Rankings ──
  const rankings: QueryTemplate[] = []
  for (const t of tables) {
    const numCols = t.columns.filter(c => isNum(c.type) && !/^id$|_id$/i.test(c.name)).map(c => c.name)
    const catCols = t.columns.filter(c => isCat(c.name, c.type)).map(c => c.name)
    const dateCol = t.columns.find(c => isDate(c.name))?.name
    for (const num of numCols.slice(0, 2)) {
      rankings.push(
        { label: `${t.name} — top 10 mayor ${num}`,   sql: `SELECT *\nFROM ${t.name}\nORDER BY ${num} DESC\nLIMIT 10;` },
        { label: `${t.name} — top 10 menor ${num}`,   sql: `SELECT *\nFROM ${t.name}\nORDER BY ${num} ASC\nLIMIT 10;` },
        { label: `${t.name} — percentil de ${num}`,   sql: `SELECT\n  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY ${num}) AS p90,\n  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${num}) AS p75,\n  PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY ${num}) AS mediana,\n  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${num}) AS p25\nFROM ${t.name};` },
      )
      if (catCols.length) {
        rankings.push({
          label: `${t.name} — ${catCols[0]} con mayor ${num}`,
          sql: `SELECT\n  ${catCols[0]},\n  SUM(${num}) AS total,\n  AVG(${num}) AS promedio,\n  COUNT(*) AS registros\nFROM ${t.name}\nGROUP BY ${catCols[0]}\nORDER BY total DESC\nLIMIT 10;`,
        })
      }
    }
    if (dateCol && numCols.length) {
      rankings.push({
        label: `${t.name} — mejor registro por mes`,
        sql: `SELECT DISTINCT ON (DATE_TRUNC('month', ${dateCol}))\n  DATE_TRUNC('month', ${dateCol}) AS mes, *\nFROM ${t.name}\nORDER BY mes, ${numCols[0]} DESC;`,
      })
    }
  }
  if (rankings.length) cats.push({ key: "rankings", Icon: Trophy, label: "Rankings y Top N", queries: rankings })

  // ── 4. Estadísticas ──
  const estadisticas: QueryTemplate[] = []
  for (const t of tables) {
    const numCols = t.columns.filter(c => isNum(c.type) && !/^id$|_id$/i.test(c.name)).map(c => c.name)
    if (!numCols.length) continue
    const statsFields = numCols.slice(0, 3).map(n =>
      `  MIN(${n}) AS min_${n}, MAX(${n}) AS max_${n},\n  ROUND(AVG(${n}), 2) AS avg_${n}, SUM(${n}) AS sum_${n}`
    ).join(",\n")
    estadisticas.push(
      { label: `${t.name} — estadísticas generales`, sql: `SELECT\n  COUNT(*) AS total_filas,\n${statsFields}\nFROM ${t.name};` },
    )
    for (const num of numCols.slice(0, 2)) {
      estadisticas.push(
        { label: `${t.name} — distribución de ${num}`, sql: `SELECT\n  MIN(${num})  AS minimo,\n  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${num}) AS p25,\n  PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY ${num}) AS mediana,\n  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${num}) AS p75,\n  MAX(${num})  AS maximo,\n  ROUND(AVG(${num}), 2) AS promedio,\n  ROUND(STDDEV(${num}), 2) AS desv_std,\n  COUNT(*) AS n\nFROM ${t.name};` },
        { label: `${t.name} — histograma de ${num} (10 buckets)`, sql: `SELECT\n  WIDTH_BUCKET(${num}, MIN(${num}) OVER(), MAX(${num}) OVER(), 10) AS bucket,\n  COUNT(*) AS frecuencia\nFROM ${t.name}\nGROUP BY bucket\nORDER BY bucket;` },
      )
    }
  }
  if (estadisticas.length) cats.push({ key: "estadisticas", Icon: BarChart2, label: "Estadísticas", queries: estadisticas })

  // ── 5. Agrupaciones ──
  const agrupaciones: QueryTemplate[] = []
  for (const t of tables) {
    const catCols = t.columns.filter(c => isCat(c.name, c.type)).map(c => c.name)
    const numCols = t.columns.filter(c => isNum(c.type) && !/^id$|_id$/i.test(c.name)).map(c => c.name)
    for (const cat of catCols.slice(0, 3)) {
      const aggPart = numCols.length ? `,\n  SUM(${numCols[0]}) AS total_${numCols[0]},\n  AVG(${numCols[0]}) AS avg_${numCols[0]}` : ""
      agrupaciones.push({
        label: `${t.name} — por ${cat}`,
        sql: `SELECT\n  ${cat},\n  COUNT(*) AS cantidad${aggPart}\nFROM ${t.name}\nGROUP BY ${cat}\nORDER BY cantidad DESC;`,
      })
    }
    if (catCols.length >= 2) {
      agrupaciones.push({
        label: `${t.name} — ${catCols[0]} × ${catCols[1]}`,
        sql: `SELECT\n  ${catCols[0]},\n  ${catCols[1]},\n  COUNT(*) AS cantidad\nFROM ${t.name}\nGROUP BY ${catCols[0]}, ${catCols[1]}\nORDER BY cantidad DESC\nLIMIT 50;`,
      })
    }
    if (catCols.length >= 3) {
      agrupaciones.push({
        label: `${t.name} — 3 dimensiones`,
        sql: `SELECT\n  ${catCols[0]}, ${catCols[1]}, ${catCols[2]},\n  COUNT(*) AS cantidad\nFROM ${t.name}\nGROUP BY ${catCols[0]}, ${catCols[1]}, ${catCols[2]}\nORDER BY cantidad DESC\nLIMIT 50;`,
      })
    }
  }
  if (agrupaciones.length) cats.push({ key: "agrupaciones", Icon: Layers, label: "Agrupaciones", queries: agrupaciones })

  // ── 6. Calidad de datos ──
  const calidad: QueryTemplate[] = []
  for (const t of tables) {
    const cols = t.columns.map(c => c.name)
    const pkCol = t.columns.find(c => /^id$|_id$/i.test(c.name))?.name
    calidad.push(
      { label: `${t.name} — NULLs por columna`,     sql: `SELECT\n${cols.map(c => `  SUM(CASE WHEN ${c} IS NULL THEN 1 ELSE 0 END) AS null_${c}`).join(",\n")}\nFROM ${t.name};` },
      { label: `${t.name} — filas con algún NULL`,   sql: `SELECT *\nFROM ${t.name}\nWHERE ${cols.map(c => `${c} IS NULL`).join("\n   OR ")}\nLIMIT 100;` },
      { label: `${t.name} — duplicados exactos`,     sql: `SELECT ${cols.join(", ")}, COUNT(*) AS veces\nFROM ${t.name}\nGROUP BY ${cols.join(", ")}\nHAVING COUNT(*) > 1\nORDER BY veces DESC\nLIMIT 50;` },
      { label: `${t.name} — completitud de columnas`,sql: `SELECT\n${cols.map(c => `  ROUND(100.0 * COUNT(${c}) / COUNT(*), 1) AS pct_${c}`).join(",\n")}\nFROM ${t.name};` },
    )
    if (pkCol) {
      calidad.push(
        { label: `${t.name} — IDs duplicados`,       sql: `SELECT ${pkCol}, COUNT(*) AS cnt\nFROM ${t.name}\nGROUP BY ${pkCol}\nHAVING COUNT(*) > 1\nORDER BY cnt DESC;` },
        { label: `${t.name} — huecos en secuencia`,  sql: `SELECT s AS id_faltante\nFROM GENERATE_SERIES(\n  (SELECT MIN(${pkCol}) FROM ${t.name}),\n  (SELECT MAX(${pkCol}) FROM ${t.name})\n) s\nWHERE s NOT IN (SELECT ${pkCol} FROM ${t.name});` },
      )
    }
  }
  cats.push({ key: "calidad", Icon: ShieldCheck, label: "Calidad de datos", queries: calidad })

  // ── 7. Window functions ──
  const windowFns: QueryTemplate[] = []
  for (const t of tables) {
    const numCols = t.columns.filter(c => isNum(c.type) && !/^id$|_id$/i.test(c.name)).map(c => c.name)
    const catCols = t.columns.filter(c => isCat(c.name, c.type)).map(c => c.name)
    const dateCol = t.columns.find(c => isDate(c.name))?.name
    if (!numCols.length) continue
    const num = numCols[0]
    const orderBy = dateCol ?? num
    windowFns.push(
      { label: `${t.name} — running total`,              sql: `SELECT\n  *,\n  SUM(${num}) OVER (ORDER BY ${orderBy}) AS running_total\nFROM ${t.name}\nORDER BY ${orderBy};` },
      { label: `${t.name} — RANK por ${num}`,            sql: `SELECT\n  *,\n  RANK()       OVER (ORDER BY ${num} DESC) AS rank,\n  DENSE_RANK() OVER (ORDER BY ${num} DESC) AS dense_rank,\n  ROW_NUMBER() OVER (ORDER BY ${num} DESC) AS fila\nFROM ${t.name};` },
      { label: `${t.name} — porcentaje del total`,       sql: `SELECT\n  *,\n  ROUND(100.0 * ${num} / SUM(${num}) OVER (), 2) AS pct_total\nFROM ${t.name}\nORDER BY pct_total DESC;` },
      { label: `${t.name} — NTILE (cuartiles)`,          sql: `SELECT\n  *,\n  NTILE(4) OVER (ORDER BY ${num}) AS cuartil\nFROM ${t.name};` },
    )
    if (catCols.length) {
      windowFns.push(
        { label: `${t.name} — rank por ${catCols[0]}`,   sql: `SELECT\n  *,\n  RANK() OVER (PARTITION BY ${catCols[0]} ORDER BY ${num} DESC) AS rank_grupo\nFROM ${t.name};` },
        { label: `${t.name} — % dentro de ${catCols[0]}`,sql: `SELECT\n  *,\n  ROUND(100.0 * ${num} / SUM(${num}) OVER (PARTITION BY ${catCols[0]}), 2) AS pct_grupo\nFROM ${t.name};` },
      )
    }
    if (dateCol) {
      windowFns.push(
        { label: `${t.name} — variación vs anterior`,    sql: `SELECT\n  *,\n  ${num} - LAG(${num}) OVER (ORDER BY ${dateCol}) AS variacion,\n  ROUND(100.0 * (${num} - LAG(${num}) OVER (ORDER BY ${dateCol})) / NULLIF(LAG(${num}) OVER (ORDER BY ${dateCol}), 0), 2) AS pct_cambio\nFROM ${t.name}\nORDER BY ${dateCol};` },
        { label: `${t.name} — siguiente valor (LEAD)`,   sql: `SELECT\n  *,\n  LEAD(${num}) OVER (ORDER BY ${dateCol}) AS siguiente\nFROM ${t.name}\nORDER BY ${dateCol};` },
        { label: `${t.name} — promedio móvil 7 filas`,   sql: `SELECT\n  ${dateCol}, ${num},\n  AVG(${num}) OVER (\n    ORDER BY ${dateCol}\n    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\n  ) AS media_movil_7\nFROM ${t.name}\nORDER BY ${dateCol};` },
        { label: `${t.name} — primer/último por grupo`,
          sql: catCols.length
            ? `SELECT DISTINCT\n  ${catCols[0]},\n  FIRST_VALUE(${num}) OVER (PARTITION BY ${catCols[0]} ORDER BY ${dateCol}) AS primer_valor,\n  LAST_VALUE(${num})  OVER (PARTITION BY ${catCols[0]} ORDER BY ${dateCol} ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ultimo_valor\nFROM ${t.name};`
            : `SELECT DISTINCT\n  FIRST_VALUE(${num}) OVER (ORDER BY ${dateCol}) AS primer_valor,\n  LAST_VALUE(${num})  OVER (ORDER BY ${dateCol} ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ultimo_valor\nFROM ${t.name};`,
        },
      )
    }
  }
  if (windowFns.length) cats.push({ key: "window", Icon: Zap, label: "Window functions", queries: windowFns })

  // ── 8. Joins ──
  if (tables.length >= 2) {
    const joins: QueryTemplate[] = []
    for (let i = 0; i < Math.min(tables.length - 1, 4); i++) {
      const a = tables[i], b = tables[i + 1]
      const aCols = new Set(a.columns.map(c => c.name))
      const common = b.columns.filter(c => aCols.has(c.name)).map(c => c.name)
      const joinCol = common[0] ?? `${a.name.replace(/s$/, "")}_id`
      const aS = a.columns.slice(0, 3).map(c => `a.${c.name}`).join(", ")
      const bS = b.columns.filter(c => !a.columns.some(ac => ac.name === c.name)).slice(0, 3).map(c => `b.${c.name}`).join(", ") || "b.*"
      joins.push(
        { label: `${a.name} ⟶ ${b.name} (LEFT JOIN)`,    sql: `SELECT\n  ${aS},\n  ${bS}\nFROM ${a.name} a\nLEFT JOIN ${b.name} b ON a.${joinCol} = b.${joinCol}\nLIMIT 100;` },
        { label: `${a.name} ⟶ ${b.name} (INNER JOIN)`,   sql: `SELECT\n  ${aS},\n  ${bS}\nFROM ${a.name} a\nINNER JOIN ${b.name} b ON a.${joinCol} = b.${joinCol}\nLIMIT 100;` },
        { label: `${a.name} sin ${b.name} (anti-join)`,   sql: `SELECT a.*\nFROM ${a.name} a\nLEFT JOIN ${b.name} b ON a.${joinCol} = b.${joinCol}\nWHERE b.${joinCol} IS NULL;` },
      )
    }
    cats.push({ key: "joins", Icon: Link2, label: "Joins y relaciones", queries: joins })
  }

  // ── 9. Por período ──
  const periodo: QueryTemplate[] = []
  for (const t of tables) {
    const dateCol = t.columns.find(c => isDate(c.name))?.name
    if (!dateCol) continue
    periodo.push(
      { label: `${t.name} — hoy`,                 sql: `SELECT *\nFROM ${t.name}\nWHERE DATE(${dateCol}) = CURRENT_DATE\nORDER BY ${dateCol} DESC;` },
      { label: `${t.name} — ayer`,                sql: `SELECT *\nFROM ${t.name}\nWHERE DATE(${dateCol}) = CURRENT_DATE - 1\nORDER BY ${dateCol} DESC;` },
      { label: `${t.name} — esta semana`,         sql: `SELECT *\nFROM ${t.name}\nWHERE ${dateCol} >= DATE_TRUNC('week', CURRENT_DATE)\nORDER BY ${dateCol} DESC;` },
      { label: `${t.name} — semana pasada`,       sql: `SELECT *\nFROM ${t.name}\nWHERE ${dateCol} >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days'\n  AND ${dateCol} <  DATE_TRUNC('week', CURRENT_DATE)\nORDER BY ${dateCol} DESC;` },
      { label: `${t.name} — este mes`,            sql: `SELECT *\nFROM ${t.name}\nWHERE ${dateCol} >= DATE_TRUNC('month', CURRENT_DATE)\nORDER BY ${dateCol} DESC;` },
      { label: `${t.name} — mes anterior`,        sql: `SELECT *\nFROM ${t.name}\nWHERE ${dateCol} >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')\n  AND ${dateCol} <  DATE_TRUNC('month', CURRENT_DATE)\nORDER BY ${dateCol} DESC;` },
      { label: `${t.name} — este trimestre`,      sql: `SELECT *\nFROM ${t.name}\nWHERE ${dateCol} >= DATE_TRUNC('quarter', CURRENT_DATE)\nORDER BY ${dateCol} DESC;` },
      { label: `${t.name} — este año`,            sql: `SELECT *\nFROM ${t.name}\nWHERE EXTRACT(YEAR FROM ${dateCol}) = EXTRACT(YEAR FROM CURRENT_DATE)\nORDER BY ${dateCol} DESC;` },
      { label: `${t.name} — año anterior`,        sql: `SELECT *\nFROM ${t.name}\nWHERE EXTRACT(YEAR FROM ${dateCol}) = EXTRACT(YEAR FROM CURRENT_DATE) - 1\nORDER BY ${dateCol} DESC;` },
    )
  }
  if (periodo.length) cats.push({ key: "periodo", Icon: Calendar, label: "Por período", queries: periodo })

  // ── 10. Texto y strings ──
  const textCols: { table: string; col: string }[] = []
  for (const t of tables) t.columns.filter(c => isCat(c.name, c.type)).forEach(c => textCols.push({ table: t.name, col: c.name }))
  if (textCols.length) {
    const texto: QueryTemplate[] = []
    for (const { table: tn, col } of textCols.slice(0, 4)) {
      texto.push(
        { label: `${tn}.${col} — buscar con LIKE`,          sql: `SELECT *\nFROM ${tn}\nWHERE ${col} ILIKE '%texto%'\nLIMIT 100;` },
        { label: `${tn}.${col} — longitud de texto`,        sql: `SELECT ${col}, LENGTH(${col}) AS longitud\nFROM ${tn}\nORDER BY longitud DESC\nLIMIT 50;` },
        { label: `${tn}.${col} — limpiar espacios`,         sql: `SELECT TRIM(${col}) AS limpio, COUNT(*) AS cnt\nFROM ${tn}\nGROUP BY limpio\nORDER BY cnt DESC;` },
        { label: `${tn}.${col} — en mayúsculas`,            sql: `SELECT UPPER(${col}) AS mayus, COUNT(*) AS cnt\nFROM ${tn}\nGROUP BY mayus\nORDER BY cnt DESC;` },
        { label: `${tn}.${col} — extraer primeros 20 chars`,sql: `SELECT LEFT(${col}, 20) AS inicio, COUNT(*) AS cnt\nFROM ${tn}\nGROUP BY inicio\nORDER BY cnt DESC;` },
      )
    }
    texto.push(
      { label: "Concatenar columnas",           sql: `SELECT\n  columna1 || ' ' || columna2 AS nombre_completo\nFROM ${t0};` },
      { label: "REPLACE en texto",              sql: `SELECT REPLACE(columna, 'buscar', 'reemplazar') AS modificado\nFROM ${t0};` },
      { label: "REGEXP — extraer patrón",       sql: `SELECT REGEXP_MATCHES(columna, '(\\d+)') AS numeros\nFROM ${t0};` },
      { label: "SPLIT por delimitador",         sql: `SELECT SPLIT_PART(columna, ',', 1) AS parte1\nFROM ${t0};` },
    )
    cats.push({ key: "texto", Icon: Type, label: "Strings y texto", queries: texto })
  }

  // ── 11. CASE WHEN y condicionales ──
  const caseWhen: QueryTemplate[] = []
  for (const t of tables) {
    const numCols = t.columns.filter(c => isNum(c.type) && !/^id$|_id$/i.test(c.name)).map(c => c.name)
    const catCols = t.columns.filter(c => isCat(c.name, c.type)).map(c => c.name)
    if (numCols.length) {
      const num = numCols[0]
      caseWhen.push(
        { label: `${t.name} — clasificar ${num} en rangos`,    sql: `SELECT\n  *,\n  CASE\n    WHEN ${num} >= 1000 THEN 'Alto'\n    WHEN ${num} >= 100  THEN 'Medio'\n    ELSE 'Bajo'\n  END AS categoria\nFROM ${t.name};` },
      )
      if (catCols.length) {
        caseWhen.push({
          label: `${t.name} — pivot ${catCols[0]} vs ${num}`,
          sql: `SELECT\n  dimension,\n  SUM(CASE WHEN ${catCols[0]} = 'A' THEN ${num} ELSE 0 END) AS A,\n  SUM(CASE WHEN ${catCols[0]} = 'B' THEN ${num} ELSE 0 END) AS B,\n  SUM(CASE WHEN ${catCols[0]} = 'C' THEN ${num} ELSE 0 END) AS C\nFROM ${t.name}\nGROUP BY dimension;`,
        })
      }
    }
    caseWhen.push(
      { label: `${t.name} — COALESCE (rellenar NULLs)`,    sql: `SELECT\n  COALESCE(columna, 'Sin dato') AS valor\nFROM ${t.name};` },
      { label: `${t.name} — NULLIF (convertir 0 a NULL)`,  sql: `SELECT\n  columna,\n  NULLIF(columna, 0) AS sin_ceros\nFROM ${t.name};` },
    )
  }
  caseWhen.push(
    { label: "Flag activo/inactivo",          sql: `SELECT\n  *,\n  CASE WHEN estado = 'activo' THEN true ELSE false END AS es_activo\nFROM ${t0};` },
    { label: "Cuartiles con CASE",            sql: `SELECT\n  *,\n  CASE\n    WHEN NTILE(4) OVER (ORDER BY valor) = 1 THEN 'Q1 Bajo'\n    WHEN NTILE(4) OVER (ORDER BY valor) = 2 THEN 'Q2'\n    WHEN NTILE(4) OVER (ORDER BY valor) = 3 THEN 'Q3'\n    ELSE 'Q4 Alto'\n  END AS cuartil\nFROM ${t0};` },
  )
  cats.push({ key: "case", Icon: GitBranch, label: "CASE WHEN y condicionales", queries: caseWhen })

  // ── 12. CTEs y subconsultas ──
  const ctes: QueryTemplate[] = [
    { label: "CTE básica",                    sql: `WITH datos AS (\n  SELECT *\n  FROM ${t0}\n  WHERE condicion = 'valor'\n)\nSELECT *\nFROM datos\nLIMIT 100;` },
    { label: "CTE con agregación",            sql: `WITH resumen AS (\n  SELECT\n    dimension,\n    SUM(valor) AS total\n  FROM ${t0}\n  GROUP BY dimension\n)\nSELECT *\nFROM resumen\nWHERE total > 0\nORDER BY total DESC;` },
    { label: "Múltiples CTEs encadenadas",    sql: `WITH\nbase AS (\n  SELECT * FROM ${t0}\n),\nfiltrado AS (\n  SELECT * FROM base WHERE condicion = 'valor'\n),\nresumen AS (\n  SELECT dimension, COUNT(*) AS cnt FROM filtrado GROUP BY dimension\n)\nSELECT * FROM resumen ORDER BY cnt DESC;` },
    { label: "CTE recursiva (jerarquía)",     sql: `WITH RECURSIVE jerarquia AS (\n  SELECT id, nombre, parent_id, 1 AS nivel\n  FROM ${t0}\n  WHERE parent_id IS NULL\n  UNION ALL\n  SELECT h.id, h.nombre, h.parent_id, j.nivel + 1\n  FROM ${t0} h\n  JOIN jerarquia j ON h.parent_id = j.id\n)\nSELECT * FROM jerarquia\nORDER BY nivel, id;` },
    { label: "Subquery en FROM",              sql: `SELECT *\nFROM (\n  SELECT dimension, COUNT(*) AS cnt\n  FROM ${t0}\n  GROUP BY dimension\n) sub\nWHERE cnt > 5\nORDER BY cnt DESC;` },
    { label: "Subquery correlacionada",       sql: `SELECT *\nFROM ${t0} t\nWHERE valor = (\n  SELECT MAX(valor) FROM ${t0} WHERE dimension = t.dimension\n);` },
    { label: "EXISTS / NOT EXISTS",           sql: `SELECT *\nFROM ${t0} a\nWHERE EXISTS (\n  SELECT 1\n  FROM ${tables.length > 1 ? tables[1].name : t0} b\n  WHERE b.id = a.id\n);` },
  ]
  cats.push({ key: "ctes", Icon: Code2, label: "CTEs y subconsultas", queries: ctes })

  // ── 13. Matemáticas ──
  const mates: QueryTemplate[] = [
    { label: "Redondeo y truncado",           sql: `SELECT\n  valor,\n  ROUND(valor, 2)  AS redondeado,\n  TRUNC(valor, 2)  AS truncado,\n  CEIL(valor)      AS techo,\n  FLOOR(valor)     AS piso,\n  ABS(valor)       AS absoluto\nFROM ${t0};` },
    { label: "Porcentaje del total",          sql: `SELECT\n  columna,\n  valor,\n  ROUND(100.0 * valor / SUM(valor) OVER (), 2) AS pct_total\nFROM ${t0};` },
    { label: "Variación porcentual",          sql: `SELECT\n  periodo, valor,\n  LAG(valor) OVER (ORDER BY periodo) AS anterior,\n  ROUND(\n    (valor - LAG(valor) OVER (ORDER BY periodo)) * 100.0\n    / NULLIF(LAG(valor) OVER (ORDER BY periodo), 0),\n  2) AS variacion_pct\nFROM ${t0};` },
    { label: "Módulo y división entera",      sql: `SELECT valor,\n  valor / 10  AS cociente,\n  valor % 10  AS resto\nFROM ${t0};` },
    { label: "Potencia y raíz cuadrada",      sql: `SELECT valor,\n  POWER(valor, 2) AS cuadrado,\n  SQRT(valor)     AS raiz\nFROM ${t0};` },
    { label: "Acumulado (running sum)",       sql: `SELECT\n  *,\n  SUM(valor) OVER (ORDER BY id ROWS UNBOUNDED PRECEDING) AS acumulado\nFROM ${t0};` },
    { label: "Diferencia con media global",   sql: `SELECT\n  *,\n  valor - AVG(valor) OVER () AS diff_media,\n  ROUND((valor - AVG(valor) OVER ()) / STDDEV(valor) OVER (), 2) AS z_score\nFROM ${t0};` },
  ]
  cats.push({ key: "mates", Icon: Hash, label: "Matemáticas y funciones", queries: mates })

  // ── 14. Funciones de fecha ──
  const fechaFns: QueryTemplate[] = [
    { label: "Fecha y hora actual",           sql: `SELECT\n  CURRENT_DATE      AS hoy,\n  CURRENT_TIME      AS ahora,\n  CURRENT_TIMESTAMP AS timestamp_completo,\n  NOW()             AS now;` },
    { label: "Diferencia entre fechas (AGE)", sql: `SELECT\n  fecha_inicio,\n  fecha_fin,\n  AGE(fecha_fin, fecha_inicio) AS duracion\nFROM ${t0};` },
    { label: "Extraer partes de fecha",       sql: `SELECT\n  fecha,\n  EXTRACT(YEAR  FROM fecha) AS anio,\n  EXTRACT(MONTH FROM fecha) AS mes,\n  EXTRACT(DAY   FROM fecha) AS dia,\n  EXTRACT(DOW   FROM fecha) AS dia_semana, -- 0=dom\n  EXTRACT(WEEK  FROM fecha) AS semana,\n  EXTRACT(HOUR  FROM fecha) AS hora\nFROM ${t0};` },
    { label: "Truncar al período",            sql: `SELECT\n  fecha,\n  DATE_TRUNC('hour',    fecha) AS inicio_hora,\n  DATE_TRUNC('day',     fecha) AS inicio_dia,\n  DATE_TRUNC('week',    fecha) AS inicio_semana,\n  DATE_TRUNC('month',   fecha) AS inicio_mes,\n  DATE_TRUNC('quarter', fecha) AS inicio_trimestre,\n  DATE_TRUNC('year',    fecha) AS inicio_anio\nFROM ${t0};` },
    { label: "Sumar y restar intervalos",     sql: `SELECT\n  fecha,\n  fecha + INTERVAL '1 day'   AS mas_un_dia,\n  fecha - INTERVAL '7 days'  AS menos_semana,\n  fecha + INTERVAL '1 month' AS mas_mes,\n  fecha + INTERVAL '1 year'  AS mas_anio\nFROM ${t0};` },
    { label: "Formatear fecha (TO_CHAR)",     sql: `SELECT\n  TO_CHAR(fecha, 'DD/MM/YYYY')   AS formato_arg,\n  TO_CHAR(fecha, 'YYYY-MM-DD')   AS iso,\n  TO_CHAR(fecha, 'Month YYYY')   AS mes_anio,\n  TO_CHAR(fecha, 'Day, DD Mon')  AS dia_completo,\n  TO_CHAR(fecha, 'HH24:MI:SS')   AS hora\nFROM ${t0};` },
    { label: "Días hábiles (excluir finde)", sql: `SELECT COUNT(*) AS dias_habiles\nFROM GENERATE_SERIES(fecha_inicio, fecha_fin, '1 day') d\nWHERE EXTRACT(DOW FROM d) NOT IN (0, 6) -- 0=dom, 6=sab\n  -- AND d NOT IN (SELECT fecha FROM feriados)\n;` },
    { label: "Rango de fechas completo",      sql: `SELECT d::date AS fecha, COUNT(t.*) AS registros\nFROM GENERATE_SERIES(\n  (SELECT MIN(fecha) FROM ${t0}),\n  (SELECT MAX(fecha) FROM ${t0}),\n  '1 day'\n) d\nLEFT JOIN ${t0} t ON DATE(t.fecha) = d::date\nGROUP BY d\nORDER BY d;` },
  ]
  cats.push({ key: "fecha_fns", Icon: Clock, label: "Funciones de fecha", queries: fechaFns })

  // ── 15. Operaciones de conjunto ──
  const setOps: QueryTemplate[] = [
    { label: "UNION ALL (combinar tablas)",   sql: `SELECT 'tabla_a' AS origen, * FROM ${t0}\nUNION ALL\nSELECT 'tabla_b' AS origen, * FROM ${tables.length > 1 ? tables[1].name : t0};` },
    { label: "UNION (sin duplicados)",        sql: `SELECT columna FROM ${t0}\nUNION\nSELECT columna FROM ${tables.length > 1 ? tables[1].name : t0}\nORDER BY columna;` },
    { label: "INTERSECT (filas comunes)",     sql: `SELECT columna FROM ${t0}\nINTERSECT\nSELECT columna FROM ${tables.length > 1 ? tables[1].name : t0};` },
    { label: "EXCEPT (en A pero no en B)",    sql: `SELECT columna FROM ${t0}\nEXCEPT\nSELECT columna FROM ${tables.length > 1 ? tables[1].name : t0};` },
  ]
  cats.push({ key: "setops", Icon: Merge, label: "Operaciones de conjunto", queries: setOps })

  // ── 16. Muestreo y paginación ──
  const muestreo: QueryTemplate[] = [
    { label: "TABLESAMPLE SYSTEM 10%",        sql: `SELECT *\nFROM ${t0} TABLESAMPLE SYSTEM (10)\nLIMIT 1000;` },
    { label: "Paginación página 1",           sql: `SELECT *\nFROM ${t0}\nORDER BY id\nLIMIT 50 OFFSET 0;` },
    { label: "Paginación página N",           sql: `-- Para página N (base 0):\nSELECT *\nFROM ${t0}\nORDER BY id\nLIMIT 50 OFFSET (N * 50);` },
    { label: "1 de cada N filas (cada 10a)",  sql: `SELECT *\nFROM (\n  SELECT *, ROW_NUMBER() OVER (ORDER BY id) AS fila\n  FROM ${t0}\n) sub\nWHERE fila % 10 = 1;` },
    { label: "Muestra estratificada",         sql: `SELECT *\nFROM (\n  SELECT *, ROW_NUMBER() OVER (PARTITION BY categoria ORDER BY RANDOM()) AS rn\n  FROM ${t0}\n) sub\nWHERE rn <= 10; -- top 10 por categoría` },
  ]
  cats.push({ key: "muestreo", Icon: Shuffle, label: "Muestreo y paginación", queries: muestreo })

  // ── 17. Rendimiento / EXPLAIN ──
  const perf: QueryTemplate[] = []
  for (const t of tables) {
    perf.push(
      { label: `${t.name} — EXPLAIN plan`,       sql: `EXPLAIN\nSELECT * FROM ${t.name}\nWHERE condicion = 'valor';` },
      { label: `${t.name} — EXPLAIN ANALYZE`,    sql: `EXPLAIN ANALYZE\nSELECT * FROM ${t.name}\nWHERE condicion = 'valor';` },
    )
  }
  perf.push(
    { label: "Ver índices de la DB",              sql: `SELECT\n  tablename, indexname, indexdef\nFROM pg_indexes\nWHERE schemaname = 'public'\nORDER BY tablename, indexname;` },
    { label: "Tablas más grandes",                sql: `SELECT\n  relname AS tabla,\n  pg_size_pretty(pg_total_relation_size(oid)) AS tamano\nFROM pg_class\nWHERE relkind = 'r'\nORDER BY pg_total_relation_size(oid) DESC\nLIMIT 20;` },
    { label: "Queries lentas (pg_stat_activity)", sql: `SELECT pid, now() - query_start AS duracion, state, query\nFROM pg_stat_activity\nWHERE state != 'idle'\n  AND now() - query_start > INTERVAL '1 second'\nORDER BY duracion DESC;` },
    { label: "Estadísticas de columna",           sql: `SELECT\n  attname AS columna, n_distinct, correlation\nFROM pg_stats\nWHERE tablename = '${t0}'\nORDER BY attname;` },
  )
  cats.push({ key: "perf", Icon: Gauge, label: "Rendimiento / EXPLAIN", queries: perf })

  // ── 18. JSON (si hay columnas JSON) ──
  const jsonCols: { table: string; col: string }[] = []
  for (const t of tables) t.columns.filter(c => isJson(c.type)).forEach(c => jsonCols.push({ table: t.name, col: c.name }))
  if (jsonCols.length) {
    const jsonFns: QueryTemplate[] = []
    for (const { table: tn, col } of jsonCols.slice(0, 3)) {
      jsonFns.push(
        { label: `${tn}.${col} — extraer campo`,       sql: `SELECT ${col}->>'campo' AS valor\nFROM ${tn};` },
        { label: `${tn}.${col} — expandir a filas`,    sql: `SELECT key, value\nFROM ${tn},\nJSONB_EACH_TEXT(${col});` },
        { label: `${tn}.${col} — filtrar por campo`,   sql: `SELECT *\nFROM ${tn}\nWHERE ${col}->>'campo' = 'valor';` },
        { label: `${tn}.${col} — agregar campo JSON`,  sql: `SELECT ${col}->>'campo', COUNT(*)\nFROM ${tn}\nGROUP BY ${col}->>'campo'\nORDER BY count DESC;` },
      )
    }
    cats.push({ key: "json", Icon: Braces, label: "JSON y JSONB", queries: jsonFns })
  }

  return cats
}

// ─── HTTP library ─────────────────────────────────────────────────────────────

const HTTP_LIBRARY: Record<string, QueryCategory[]> = {
  JIRA: [
    { key: "estado", Icon: CheckCircle2, label: "Por estado", queries: [
      { label: "Issues abiertas",              sql: `status = "Open" ORDER BY created DESC` },
      { label: "En progreso",                  sql: `status = "In Progress" ORDER BY updated DESC` },
      { label: "En revisión",                  sql: `status = "In Review" ORDER BY updated DESC` },
      { label: "Bloqueadas",                   sql: `status = "Blocked" ORDER BY priority ASC` },
      { label: "Sin cerrar (todas)",           sql: `status not in ("Done","Closed") ORDER BY priority ASC` },
      { label: "Recién cerradas",              sql: `status = "Done" ORDER BY updated DESC` },
      { label: "Todas las issues",             sql: `ORDER BY created DESC` },
    ]},
    { key: "asignado", Icon: User, label: "Por asignado", queries: [
      { label: "Mis issues activas",           sql: `assignee = currentUser() AND status != "Done" ORDER BY priority ASC` },
      { label: "Sin asignar",                  sql: `assignee is EMPTY AND status not in ("Done","Closed") ORDER BY created DESC` },
      { label: "Sin asignar y alta prio",      sql: `assignee is EMPTY AND priority in (Critical,High) AND status != "Done"` },
      { label: "Mis issues cerradas",          sql: `assignee = currentUser() AND status = "Done" ORDER BY updated DESC` },
    ]},
    { key: "tipo", Icon: Tag, label: "Por tipo", queries: [
      { label: "Bugs abiertos",                sql: `issuetype = Bug AND status != "Done" ORDER BY priority ASC, created DESC` },
      { label: "Stories pendientes",           sql: `issuetype = Story AND status != "Done" ORDER BY rank ASC` },
      { label: "Epics activos",                sql: `issuetype = Epic AND status != "Done" ORDER BY priority ASC` },
      { label: "Tasks por hacer",              sql: `issuetype = Task AND status = "To Do" ORDER BY priority ASC` },
      { label: "Sub-tasks abiertas",           sql: `issuetype = Sub-task AND status != "Done"` },
      { label: "Mejoras (improvement)",        sql: `issuetype = Improvement AND status != "Done" ORDER BY priority ASC` },
    ]},
    { key: "prioridad", Icon: AlertCircle, label: "Por prioridad", queries: [
      { label: "Críticas sin cerrar",          sql: `priority = Critical AND status != "Done" ORDER BY created ASC` },
      { label: "Alta prioridad",               sql: `priority in (Critical,High) AND status != "Done" ORDER BY created ASC` },
      { label: "Bugs críticos",                sql: `issuetype = Bug AND priority = Critical AND status != "Done"` },
      { label: "Media y baja prioridad",       sql: `priority in (Medium,Low) AND status = "To Do" ORDER BY created ASC` },
    ]},
    { key: "sprint", Icon: Activity, label: "Sprint", queries: [
      { label: "Sprint en curso",              sql: `sprint in openSprints() ORDER BY rank ASC` },
      { label: "Sprint en curso sin asignar",  sql: `sprint in openSprints() AND assignee is EMPTY` },
      { label: "Backlog sin sprint",           sql: `sprint is EMPTY AND status = "To Do" ORDER BY priority ASC` },
      { label: "Sprint anterior",              sql: `sprint in closedSprints() ORDER BY updated DESC` },
      { label: "Sprint anterior — sin cerrar", sql: `sprint in closedSprints() AND status != "Done" ORDER BY priority ASC` },
    ]},
    { key: "fecha_jira", Icon: Calendar, label: "Por fecha", queries: [
      { label: "Creadas hoy",                  sql: `created >= startOfDay() ORDER BY created DESC` },
      { label: "Creadas esta semana",          sql: `created >= startOfWeek() ORDER BY created DESC` },
      { label: "Últimos 7 días",               sql: `created >= -7d ORDER BY created DESC` },
      { label: "Últimos 30 días",              sql: `created >= -30d ORDER BY created DESC` },
      { label: "Actualizadas ayer",            sql: `updated >= -1d AND updated < startOfDay() ORDER BY updated DESC` },
      { label: "Vencen esta semana",           sql: `dueDate >= startOfWeek() AND dueDate <= endOfWeek() AND status != "Done"` },
      { label: "Vencidas sin cerrar",          sql: `dueDate < now() AND status not in ("Done","Closed") ORDER BY dueDate ASC` },
    ]},
  ],

  HUBSPOT: [
    { key: "crm", Icon: Users, label: "Objetos CRM", queries: [
      { label: "Contactos",                    sql: "contacts" },
      { label: "Deals",                        sql: "deals" },
      { label: "Empresas",                     sql: "companies" },
      { label: "Tickets",                      sql: "tickets" },
      { label: "Productos",                    sql: "products" },
    ]},
    { key: "pipeline", Icon: TrendingUp, label: "Pipeline de ventas", queries: [
      { label: "Deals ganados",                sql: "deals?dealstage=closedwon" },
      { label: "Deals perdidos",               sql: "deals?dealstage=closedlost" },
      { label: "En presentación",              sql: "deals?dealstage=presentationscheduled" },
      { label: "En propuesta enviada",         sql: "deals?dealstage=qualifiedtobuy" },
      { label: "En negociación",               sql: "deals?dealstage=decisionmakerboughtin" },
    ]},
    { key: "soporte", Icon: MessageSquare, label: "Soporte", queries: [
      { label: "Tickets abiertos",             sql: "tickets?hs_pipeline_stage=1" },
      { label: "Tickets sin asignar",          sql: "tickets?hubspot_owner_id=" },
      { label: "Tickets alta prioridad",       sql: "tickets?hs_ticket_priority=HIGH" },
    ]},
  ],

  GOOGLE_SHEETS: [
    { key: "rango", Icon: FileText, label: "Rangos de celdas", queries: [
      { label: "Todas las filas",              sql: "A:Z" },
      { label: "Primeras 100",                 sql: "A1:Z100" },
      { label: "Sin encabezado",               sql: "A2:Z" },
      { label: "Primeras 6 columnas",          sql: "A:F" },
      { label: "Primeras 10 columnas",         sql: "A:J" },
      { label: "Bloque compacto",              sql: "B2:H50" },
      { label: "Solo 2 columnas",              sql: "A:B" },
      { label: "Columna única",                sql: "A:A" },
    ]},
  ],

  NOTION: [
    { key: "estado_notion", Icon: CheckCircle2, label: "Por estado", queries: [
      { label: "Todos los registros",          sql: `` },
      { label: "En progreso",                  sql: `{"property":"Status","status":{"equals":"In Progress"}}` },
      { label: "Completados",                  sql: `{"property":"Status","status":{"equals":"Done"}}` },
      { label: "Sin empezar",                  sql: `{"property":"Status","status":{"equals":"Not started"}}` },
      { label: "Cancelados",                   sql: `{"property":"Status","status":{"equals":"Cancelled"}}` },
    ]},
    { key: "fecha_notion", Icon: Calendar, label: "Por fecha", queries: [
      { label: "Creados esta semana",          sql: `{"property":"Created","date":{"this_week":{}}}` },
      { label: "Vencen esta semana",           sql: `{"property":"Due","date":{"next_week":{}}}` },
      { label: "Creados hoy",                  sql: `{"property":"Created","date":{"equals":"today"}}` },
    ]},
  ],

  AIRTABLE: [
    { key: "basico_at", Icon: Database, label: "Consultas básicas", queries: [
      { label: "Todos los registros",          sql: `` },
      { label: "Campos no vacíos",             sql: `NOT({Nombre} = '')` },
      { label: "Activos",                      sql: `{Estado} = "Activo"` },
      { label: "Inactivos",                    sql: `{Estado} = "Inactivo"` },
      { label: "Pendientes",                   sql: `{Estado} = "Pendiente"` },
      { label: "Creados esta semana",          sql: `IS_AFTER(CREATED_TIME(), DATEADD(TODAY(), -7, 'days'))` },
      { label: "Creados este mes",             sql: `IS_SAME(CREATED_TIME(), TODAY(), 'month')` },
      { label: "Por nombre ascendente",        sql: `&sort[0][field]=Nombre&sort[0][direction]=asc` },
      { label: "Por nombre descendente",       sql: `&sort[0][field]=Nombre&sort[0][direction]=desc` },
      { label: "Checkbox marcado",             sql: `{Completado} = 1` },
      { label: "Con fecha asignada",           sql: `NOT({Fecha} = '')` },
    ]},
  ],

  REST_API: [
    { key: "rutas", Icon: Globe, label: "Rutas HTTP", queries: [
      { label: "Raíz",                         sql: "/" },
      { label: "Con límite",                   sql: "/?limit=100" },
      { label: "Paginado p.1",                 sql: "/?page=1&per_page=50" },
      { label: "Paginado p.2",                 sql: "/?page=2&per_page=50" },
      { label: "Por ID",                       sql: "/1" },
      { label: "Buscar",                       sql: "/?search=texto" },
      { label: "Ordenado ASC",                 sql: "/?sort=created_at" },
      { label: "Ordenado DESC",                sql: "/?sort=-created_at" },
      { label: "Filtro por campo",             sql: "/?status=active" },
      { label: "Rango de fechas",              sql: "/?from=2024-01-01&to=2024-12-31" },
      { label: "Múltiples filtros",            sql: "/?status=active&type=user&page=1" },
    ]},
  ],

  CLICKHOUSE: [
    { key: "sistema_ch", Icon: Settings, label: "Sistema", queries: [
      { label: "Tablas con tamaño",            sql: `SELECT name, engine, total_rows,\n  formatReadableSize(total_bytes) AS tamano\nFROM system.tables\nWHERE database = currentDatabase()\nORDER BY total_rows DESC;` },
      { label: "Columnas de una tabla",        sql: `SELECT name, type, comment\nFROM system.columns\nWHERE database = currentDatabase()\n  AND table = '{tabla}'\nORDER BY position;` },
      { label: "Queries recientes",            sql: `SELECT query_start_time, query_duration_ms,\n  read_rows, query\nFROM system.query_log\nWHERE type = 'QueryFinish'\nORDER BY query_start_time DESC\nLIMIT 20;` },
      { label: "Queries más lentas",           sql: `SELECT query, query_duration_ms, read_rows\nFROM system.query_log\nWHERE type = 'QueryFinish'\nORDER BY query_duration_ms DESC\nLIMIT 10;` },
      { label: "Uso de memoria",               sql: `SELECT query, memory_usage\nFROM system.query_log\nWHERE type = 'QueryFinish'\nORDER BY memory_usage DESC\nLIMIT 10;` },
    ]},
    { key: "datos_ch", Icon: BarChart, label: "Análisis", queries: [
      { label: "Muestra de datos",             sql: `SELECT *\nFROM {tabla}\nLIMIT 100;` },
      { label: "Conteo por día",               sql: `SELECT toDate(timestamp) AS dia, COUNT() AS eventos\nFROM {tabla}\nGROUP BY dia\nORDER BY dia DESC\nLIMIT 30;` },
      { label: "Por hora",                     sql: `SELECT toStartOfHour(timestamp) AS hora, COUNT() AS eventos\nFROM {tabla}\nGROUP BY hora\nORDER BY hora DESC\nLIMIT 48;` },
      { label: "Top valores de columna",       sql: `SELECT {columna}, COUNT() AS cnt\nFROM {tabla}\nGROUP BY {columna}\nORDER BY cnt DESC\nLIMIT 20;` },
      { label: "Tendencia diaria",             sql: `SELECT\n  toDate(timestamp) AS dia,\n  COUNT() AS eventos,\n  uniqExact(user_id) AS usuarios\nFROM {tabla}\nGROUP BY dia\nORDER BY dia;` },
    ]},
  ],
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SchemaExplorer({ dataSourceId, sourceType, onInsert }: Props) {
  const [schema,          setSchema]          = useState<DbSchema | null>(null)
  const [loading,         setLoading]         = useState(false)
  const [expandedTables,  setExpandedTables]  = useState<Set<string>>(new Set())
  const [openCats,        setOpenCats]        = useState<Set<string>>(new Set())
  const [suggestionsOpen, setSuggestionsOpen] = useState(true)
  const [search,          setSearch]          = useState("")

  useEffect(() => {
    if (!dataSourceId) return
    setLoading(true); setSchema(null)
    fetch(`/api/data-sources/${dataSourceId}/schema`)
      .then(r => r.json()).then(setSchema).catch(console.error).finally(() => setLoading(false))
  }, [dataSourceId])

  const toggleTable = (n: string) => setExpandedTables(p => { const s = new Set(p); s.has(n) ? s.delete(n) : s.add(n); return s })
  const toggleCat   = (k: string) => setOpenCats(p => { const s = new Set(p); s.has(k) ? s.delete(k) : s.add(k); return s })

  const library = useMemo<QueryCategory[]>(() => {
    if (!schema) return []
    const isHttp = schema.tables.length === 0
    if (isHttp) return sourceType ? (HTTP_LIBRARY[sourceType] ?? []) : []
    return generateQueryLibrary(schema)
  }, [schema, sourceType])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return null
    const out: { cat: QueryCategory; item: QueryTemplate }[] = []
    for (const cat of library)
      for (const item of cat.queries)
        if (item.label.toLowerCase().includes(q) || item.sql.toLowerCase().includes(q))
          out.push({ cat, item })
    return out
  }, [search, library])

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
    </div>
  )
  if (!schema) return null

  const isHttp = schema.tables.length === 0
  const totalQueries = library.reduce((s, c) => s + c.queries.length, 0)

  return (
    <div className="flex flex-col">

      {/* ── Suggested queries ── */}
      {library.length > 0 && onInsert && (
        <div className="border-b border-zinc-800">
          <button onClick={() => setSuggestionsOpen(v => !v)}
            className="flex w-full items-center gap-1.5 px-3 py-2 text-left">
            <Zap className="h-3 w-3 text-indigo-400" strokeWidth={2} />
            <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Sugeridas</span>
            <span className="mr-1 text-[10px] text-zinc-700">{totalQueries}</span>
            <ChevronDown className={cn("h-3 w-3 text-zinc-700 transition-transform", suggestionsOpen && "rotate-180")} />
          </button>

          {suggestionsOpen && (
            <div className="pb-2">
              {/* Search */}
              <div className="relative mx-2 mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="¿Qué querés analizar?"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-7 pr-3 py-1.5 text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none" />
              </div>

              {filtered !== null ? (
                filtered.length === 0 ? (
                  <p className="px-3 py-3 text-center text-[11px] text-zinc-600">Sin resultados para &ldquo;{search}&rdquo;</p>
                ) : (
                  <div className="flex flex-col gap-0.5 px-2">
                    {filtered.map(({ cat, item }) => (
                      <button key={`${cat.key}-${item.label}`}
                        onClick={() => { onInsert(item.sql); setSearch("") }}
                        className="group flex w-full items-start gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-indigo-500/10">
                        <ChevronRight className="mt-0.5 h-2.5 w-2.5 shrink-0 text-zinc-700 group-hover:text-indigo-400" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-[11px] text-zinc-300 group-hover:text-indigo-300">{item.label}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <cat.Icon className="h-2.5 w-2.5 text-zinc-600" strokeWidth={1.75} />
                            <p className="text-[10px] text-zinc-600">{cat.label}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                library.map(cat => {
                  const open = openCats.has(cat.key)
                  return (
                    <div key={cat.key}>
                      <button onClick={() => toggleCat(cat.key)}
                        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left transition-colors hover:bg-zinc-800/50">
                        <ChevronRight className={cn("h-2.5 w-2.5 shrink-0 text-zinc-700 transition-transform", open && "rotate-90")} />
                        <cat.Icon className="h-3 w-3 shrink-0 text-zinc-500" strokeWidth={1.75} />
                        <span className="flex-1 truncate text-[11px] text-zinc-400">{cat.label}</span>
                        <span className="shrink-0 text-[10px] text-zinc-700">{cat.queries.length}</span>
                      </button>
                      {open && (
                        <div className="flex flex-col gap-0.5 pb-1 pl-7 pr-2">
                          {cat.queries.map(q => (
                            <button key={q.label} onClick={() => onInsert(q.sql)}
                              className="group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[11px] text-zinc-400 transition-colors hover:bg-indigo-500/10 hover:text-indigo-300">
                              <ChevronRight className="h-2.5 w-2.5 shrink-0 text-zinc-700 group-hover:text-indigo-400" />
                              <span className="truncate">{q.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Schema explorer ── */}
      {!isHttp && (
        <div className="flex flex-col gap-0.5 p-2">
          <p className="mb-1 px-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
            {schema.tables.length} tablas
          </p>
          {schema.tables.map(table => (
            <TableNode key={table.name} table={table}
              expanded={expandedTables.has(table.name)}
              onToggle={() => toggleTable(table.name)}
              onInsertSelect={onInsert ? () => onInsert(`SELECT *\nFROM ${table.name}\nLIMIT 100;`) : undefined}
            />
          ))}
        </div>
      )}

      {isHttp && library.length === 0 && (
        <p className="px-4 py-6 text-center text-xs text-zinc-600">
          Fuente HTTP — usá el editor para enviar queries
        </p>
      )}
    </div>
  )
}

// ─── TableNode ────────────────────────────────────────────────────────────────

function TableNode({ table, expanded, onToggle, onInsertSelect }: {
  table: SchemaTable; expanded: boolean; onToggle: () => void; onInsertSelect?: () => void
}) {
  return (
    <div>
      <div className="group flex items-center">
        <button onClick={onToggle}
          className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-zinc-800">
          <ChevronRight className={cn("h-3 w-3 shrink-0 text-zinc-600 transition-transform", expanded && "rotate-90")} />
          <Table2 className="h-3 w-3 shrink-0 text-indigo-400" strokeWidth={1.75} />
          <span className="flex-1 truncate font-medium text-zinc-300">{table.name}</span>
          {table.rowCount !== undefined && (
            <span className="text-[10px] text-zinc-600 tabular-nums">{table.rowCount.toLocaleString()}</span>
          )}
        </button>
        {onInsertSelect && (
          <button onClick={onInsertSelect} title="SELECT * FROM esta tabla"
            className="mr-1 hidden rounded px-1 py-0.5 text-[10px] text-zinc-700 transition-colors hover:bg-zinc-800 hover:text-indigo-400 group-hover:block">
            ▶
          </button>
        )}
      </div>
      {expanded && (
        <div className="ml-4 flex flex-col gap-0.5 border-l border-zinc-800 pl-2">
          {table.columns.map(col => (
            <div key={col.name} className="flex items-center gap-1.5 px-1 py-1 text-[11px] text-zinc-500">
              <Columns className="h-2.5 w-2.5 shrink-0 text-zinc-700" strokeWidth={1.5} />
              <span className="flex-1 truncate">{col.name}</span>
              <span className="shrink-0 font-mono text-[10px] text-zinc-700">{col.type.toLowerCase().slice(0, 10)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
