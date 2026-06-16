import type { DataSourceConfig, QueryResult } from "@/types/db"

type SimpleResult = Pick<QueryResult, "columns" | "rows">

// ─── Router ──────────────────────────────────────────────────────────────────

export async function executeHttpSource(ds: DataSourceConfig, query: string): Promise<QueryResult> {
  const start = Date.now()
  let result: SimpleResult

  switch (ds.type) {
    case "CLICKHOUSE":    result = await execClickHouse(ds, query);    break
    case "REST_API":      result = await execRestApi(ds, query);       break
    case "GOOGLE_SHEETS": result = await execGoogleSheets(ds, query);  break
    case "AIRTABLE":      result = await execAirtable(ds, query);      break
    case "NOTION":        result = await execNotion(ds, query);        break
    case "JIRA":          result = await execJira(ds, query);          break
    case "HUBSPOT":       result = await execHubspot(ds, query);       break
    default:
      throw new Error(`Tipo HTTP no soportado: ${ds.type}`)
  }

  return { ...result, rowCount: result.rows.length, durationMs: Date.now() - start }
}

export async function testHttpSource(ds: DataSourceConfig): Promise<void> {
  switch (ds.type) {
    case "CLICKHOUSE":
      await execClickHouse(ds, "SELECT 1")
      break
    case "REST_API": {
      const url = ds.apiUrl
      if (!url) throw new Error("URL es requerida")
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (ds.password) headers["Authorization"] = `Bearer ${ds.password}`
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      break
    }
    case "GOOGLE_SHEETS": {
      const meta = parseMeta(ds.metadata)
      const sheetId = meta.spreadsheetId
      if (!sheetId) throw new Error("Spreadsheet ID es requerido")
      const key = ds.password
      if (!key) throw new Error("API Key es requerida")
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${key}&fields=sheets.properties.title`
      const res = await fetch(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
      }
      break
    }
    case "AIRTABLE": {
      const meta = parseMeta(ds.metadata)
      const baseId = meta.baseId
      if (!baseId) throw new Error("Base ID es requerido")
      const key = ds.password
      if (!key) throw new Error("API Token es requerido")
      const res = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: Verificá tu API Token y Base ID`)
      break
    }
    case "NOTION": {
      const meta = parseMeta(ds.metadata)
      const dbId = meta.databaseId
      if (!dbId) throw new Error("Database ID es requerido")
      const key = ds.password
      if (!key) throw new Error("Integration Token es requerido")
      const res = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
        headers: {
          Authorization: `Bearer ${key}`,
          "Notion-Version": "2022-06-28",
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: Verificá tu token y Database ID`)
      break
    }
    case "JIRA": {
      const domain = ds.apiUrl
      const email = ds.username
      const token = ds.password
      if (!domain || !email || !token) throw new Error("Domain, email y API token son requeridos")
      const auth = Buffer.from(`${email}:${token}`).toString("base64")
      const res = await fetch(`https://${domain}/rest/api/3/myself`, {
        headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message ?? `HTTP ${res.status}: Verificá tus credenciales de Jira`)
      }
      break
    }
    case "HUBSPOT": {
      const token = ds.password
      if (!token) throw new Error("Access Token es requerido")
      const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: Verificá tu HubSpot Access Token`)
      break
    }
    default:
      throw new Error(`Tipo no soportado: ${ds.type}`)
  }
}

// ─── ClickHouse (HTTP interface) ─────────────────────────────────────────────

async function execClickHouse(ds: DataSourceConfig, query: string): Promise<SimpleResult> {
  const host = ds.host ?? "localhost"
  const port = ds.port ?? 8123
  const url = new URL(`http://${host}:${port}/`)
  if (ds.database) url.searchParams.set("database", ds.database)

  const body = query.trimEnd().replace(/FORMAT\s+\w+$/i, "") + " FORMAT JSONCompact"
  const headers: Record<string, string> = { "Content-Type": "text/plain" }
  if (ds.username) headers["X-ClickHouse-User"] = ds.username
  if (ds.password) headers["X-ClickHouse-Key"] = ds.password

  const res = await fetch(url.toString(), { method: "POST", headers, body })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  const json = await res.json() as { meta: { name: string }[]; data: unknown[][] }
  return {
    columns: json.meta.map((m) => m.name),
    rows: json.data,
  }
}

// ─── REST API ────────────────────────────────────────────────────────────────

async function execRestApi(ds: DataSourceConfig, query: string): Promise<SimpleResult> {
  const base = ds.apiUrl ?? ""
  const path = query.trim() || ""
  const url = path.startsWith("http") ? path : `${base}${path}`

  const headers: Record<string, string> = { Accept: "application/json" }
  if (ds.password) headers["Authorization"] = `Bearer ${ds.password}`

  const meta = parseMeta(ds.metadata)
  if (meta.headers && typeof meta.headers === "object") {
    Object.assign(headers, meta.headers)
  }

  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const data = await res.json()

  return jsonToTable(data)
}

// ─── Google Sheets ───────────────────────────────────────────────────────────

async function execGoogleSheets(ds: DataSourceConfig, query: string): Promise<SimpleResult> {
  const meta = parseMeta(ds.metadata)
  const sheetId = meta.spreadsheetId as string
  const key = ds.password
  if (!sheetId) throw new Error("Spreadsheet ID es requerido (configura la fuente de datos)")
  if (!key) throw new Error("API Key es requerida")

  const range = query.trim() || "A:ZZ"
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${key}&valueRenderOption=UNFORMATTED_VALUE`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `HTTP ${res.status}`)
  }
  const data = await res.json() as { values?: unknown[][] }
  const values = data.values ?? []
  if (values.length === 0) return { columns: [], rows: [] }

  const headers = (values[0] as unknown[]).map((h) => String(h))
  const rows = values.slice(1)
  return { columns: headers, rows }
}

// ─── Airtable ─────────────────────────────────────────────────────────────────

async function execAirtable(ds: DataSourceConfig, query: string): Promise<SimpleResult> {
  const meta = parseMeta(ds.metadata)
  const baseId = meta.baseId as string
  const tableName = meta.tableName as string
  const key = ds.password
  if (!baseId || !tableName) throw new Error("Base ID y Tabla son requeridos")
  if (!key) throw new Error("API Token es requerido")

  const allRecords: { fields: Record<string, unknown> }[] = []
  let offset: string | undefined = undefined
  const MAX_ROWS = 100_000_000

  do {
    const params = new URLSearchParams({ pageSize: "100" })
    if (query.trim()) params.set("filterByFormula", query.trim())
    if (offset) params.set("offset", offset)

    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?${params}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } })
    if (!res.ok) throw new Error(`HTTP ${res.status}: Verificá tus credenciales`)

    const data = await res.json() as { records?: { fields: Record<string, unknown> }[]; offset?: string }
    allRecords.push(...(data.records ?? []))
    offset = data.offset
  } while (offset && allRecords.length < MAX_ROWS)

  if (allRecords.length === 0) return { columns: [], rows: [] }

  const columns = Object.keys(allRecords[0].fields)
  const rows = allRecords.map((r) => columns.map((c) => r.fields[c] ?? null))
  return { columns, rows }
}

// ─── Notion ──────────────────────────────────────────────────────────────────

async function execNotion(ds: DataSourceConfig, query: string): Promise<SimpleResult> {
  const meta = parseMeta(ds.metadata)
  const dbId = meta.databaseId as string
  const key = ds.password
  if (!dbId) throw new Error("Database ID es requerido")
  if (!key) throw new Error("Integration Token es requerido")

  let filter: unknown = undefined
  if (query.trim()) {
    try { filter = JSON.parse(query) } catch { /* ignore malformed filter */ }
  }

  const notionHeaders = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  }

  const allResults: Record<string, unknown>[] = []
  let startCursor: string | undefined = undefined
  const MAX_ROWS = 100_000_000

  do {
    const body: Record<string, unknown> = { page_size: 100 }
    if (filter) body.filter = filter
    if (startCursor) body.start_cursor = startCursor

    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: notionHeaders,
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: Verificá tus credenciales`)

    const data = await res.json() as { results?: Record<string, unknown>[]; has_more?: boolean; next_cursor?: string }
    allResults.push(...(data.results ?? []))
    startCursor = data.has_more ? (data.next_cursor ?? undefined) : undefined
  } while (startCursor && allResults.length < MAX_ROWS)

  if (allResults.length === 0) return { columns: [], rows: [] }

  return extractNotionProperties(allResults)
}

function extractNotionProperties(results: Record<string, unknown>[]): SimpleResult {
  const firstProps = (results[0]?.properties ?? {}) as Record<string, { type: string; [k: string]: unknown }>
  const columns = Object.keys(firstProps)
  const rows = results.map((r) => {
    const props = (r.properties ?? {}) as Record<string, Record<string, unknown>>
    return columns.map((col) => {
      const prop = props[col] ?? {}
      return extractNotionValue(prop)
    })
  })
  return { columns, rows }
}

function extractNotionValue(prop: Record<string, unknown>): unknown {
  const type = prop.type as string
  switch (type) {
    case "title":       return ((prop.title as { plain_text: string }[])?.[0]?.plain_text) ?? null
    case "rich_text":   return ((prop.rich_text as { plain_text: string }[])?.[0]?.plain_text) ?? null
    case "number":      return prop.number ?? null
    case "select":      return (prop.select as { name: string } | null)?.name ?? null
    case "multi_select":return ((prop.multi_select as { name: string }[]) ?? []).map(s => s.name).join(", ")
    case "status":      return (prop.status as { name: string } | null)?.name ?? null
    case "checkbox":    return prop.checkbox ?? null
    case "date":        return (prop.date as { start: string } | null)?.start ?? null
    case "url":         return prop.url ?? null
    case "email":       return prop.email ?? null
    case "phone_number":return prop.phone_number ?? null
    case "people":      return ((prop.people as { name: string }[]) ?? []).map(p => p.name).join(", ")
    case "formula":     return (prop.formula as { string?: string; number?: number; boolean?: boolean } | null)?.string ?? null
    default:            return JSON.stringify(prop[type]) ?? null
  }
}

// ─── Jira ────────────────────────────────────────────────────────────────────

async function execJira(ds: DataSourceConfig, query: string): Promise<SimpleResult> {
  const domain = ds.apiUrl
  const email = ds.username
  const token = ds.password
  if (!domain || !email || !token) throw new Error("Dominio, email y API Token son requeridos")

  const jql = query.trim() || "order by created DESC"
  const auth = Buffer.from(`${email}:${token}`).toString("base64")
  const jiraHeaders = { Authorization: `Basic ${auth}`, Accept: "application/json", "Content-Type": "application/json" }
  const PAGE_SIZE = 100
  const MAX_ROWS = 100_000_000
  const FIELDS = ["summary", "status", "assignee", "priority", "issuetype", "created", "updated", "project"]

  const allIssues: Record<string, unknown>[] = []

  // Probe new /search/jql POST endpoint (Cloud) — it uses nextPageToken, not startAt
  const probe = await fetch(`https://${domain}/rest/api/3/search/jql`, {
    method: "POST",
    headers: jiraHeaders,
    body: JSON.stringify({ jql, maxResults: PAGE_SIZE, fields: FIELDS }),
  })

  if (probe.status === 404 || probe.status === 405) {
    // Legacy /search GET endpoint — uses startAt offset pagination
    let startAt = 0
    let total = Infinity
    while (allIssues.length < total && allIssues.length < MAX_ROWS) {
      const res = await fetch(
        `https://${domain}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${PAGE_SIZE}&startAt=${startAt}&fields=${FIELDS.join(",")}`,
        { headers: jiraHeaders }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { errorMessages?: string[]; message?: string }
        throw new Error(body.errorMessages?.[0] ?? body.message ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as { issues?: Record<string, unknown>[]; total?: number }
      const issues = data.issues ?? []
      allIssues.push(...issues)
      if (total === Infinity) total = data.total ?? 0
      startAt += PAGE_SIZE
      if (issues.length < PAGE_SIZE) break
    }
  } else {
    // New Cloud endpoint — uses nextPageToken cursor pagination
    if (!probe.ok) {
      const body = await probe.json().catch(() => ({})) as { errorMessages?: string[]; message?: string }
      throw new Error(body.errorMessages?.[0] ?? body.message ?? `HTTP ${probe.status}`)
    }
    const first = await probe.json() as { issues?: Record<string, unknown>[]; values?: Record<string, unknown>[]; nextPageToken?: string }
    allIssues.push(...(first.issues ?? first.values ?? []))

    let nextToken = first.nextPageToken
    while (nextToken && allIssues.length < MAX_ROWS) {
      const res = await fetch(`https://${domain}/rest/api/3/search/jql`, {
        method: "POST",
        headers: jiraHeaders,
        body: JSON.stringify({ jql, maxResults: PAGE_SIZE, fields: FIELDS, nextPageToken: nextToken }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { errorMessages?: string[]; message?: string }
        throw new Error(body.errorMessages?.[0] ?? body.message ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as { issues?: Record<string, unknown>[]; values?: Record<string, unknown>[]; nextPageToken?: string }
      allIssues.push(...(data.issues ?? data.values ?? []))
      nextToken = data.nextPageToken
    }
  }

  if (allIssues.length === 0) return { columns: [], rows: [] }

  const columns = ["key", "resumen", "estado", "asignado", "prioridad", "tipo", "proyecto", "creado", "actualizado"]
  const rows = allIssues.map((issue) => {
    const f = (issue.fields ?? {}) as Record<string, Record<string, unknown>>
    return [
      issue.key,
      f.summary,
      (f.status as { name: string } | null)?.name ?? null,
      (f.assignee as { displayName: string } | null)?.displayName ?? null,
      (f.priority as { name: string } | null)?.name ?? null,
      (f.issuetype as { name: string } | null)?.name ?? null,
      (f.project as { name: string } | null)?.name ?? null,
      f.created,
      f.updated,
    ]
  })
  return { columns, rows }
}

// ─── HubSpot ─────────────────────────────────────────────────────────────────

async function execHubspot(ds: DataSourceConfig, query: string): Promise<SimpleResult> {
  const token = ds.password
  if (!token) throw new Error("Access Token es requerido")

  const meta = parseMeta(ds.metadata)
  const objectType = (meta.objectType as string) || query.trim() || "contacts"
  const properties = (meta.properties as string) || ""
  const hsHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
  const MAX_ROWS = 100_000_000

  const allResults: { id: string; properties: Record<string, unknown> }[] = []
  let after: string | undefined = undefined

  do {
    let url = `https://api.hubapi.com/crm/v3/objects/${objectType}?limit=100`
    if (properties) url += `&properties=${properties}`
    if (after) url += `&after=${after}`

    const res = await fetch(url, { headers: hsHeaders })
    if (!res.ok) throw new Error(`HTTP ${res.status}: Verificá tu HubSpot Access Token`)

    const data = await res.json() as {
      results?: { id: string; properties: Record<string, unknown> }[]
      paging?: { next?: { after?: string } }
    }
    allResults.push(...(data.results ?? []))
    after = data.paging?.next?.after
  } while (after && allResults.length < MAX_ROWS)

  if (allResults.length === 0) return { columns: [], rows: [] }

  const columns = ["id", ...Object.keys(allResults[0].properties)]
  const rows = allResults.map((r) => [r.id, ...Object.values(r.properties)])
  return { columns, rows }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseMeta(raw?: string | null): Record<string, unknown> {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

function jsonToTable(data: unknown): SimpleResult {
  const arr = Array.isArray(data) ? data : (data as Record<string, unknown>)?.data ?? (data as Record<string, unknown>)?.results ?? (data as Record<string, unknown>)?.items ?? [data]
  const items = Array.isArray(arr) ? arr : [arr]
  if (items.length === 0) return { columns: [], rows: [] }
  const flat = items.map((item) => flattenObj(item))
  const columns = Object.keys(flat[0])
  return { columns, rows: flat.map((item) => columns.map((c) => item[c] ?? null)) }
}

function flattenObj(obj: unknown, prefix = ""): Record<string, unknown> {
  if (typeof obj !== "object" || obj === null) return { value: obj }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      Object.assign(out, flattenObj(v, key))
    } else {
      out[key] = Array.isArray(v) ? JSON.stringify(v) : v
    }
  }
  return out
}
