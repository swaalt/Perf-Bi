# Skill: sql-workspace

Especialista en el editor SQL de Perf-Bi: Monaco Editor, ejecución de queries, resultados y optimización.

## Cuándo usar este skill

- Trabajar en el editor SQL (`src/components/sql/`)
- Agregar autocompletado, syntax highlighting, o atajos de teclado
- Implementar ejecución de queries y manejo de resultados
- Construir la tabla de resultados (virtualización, exportación)
- Historial de queries y snippets guardados

## Stack del SQL Workspace

- **Editor:** `@monaco-editor/react` — mismo editor que VS Code
- **Ejecución:** API Route `/api/query/execute`
- **Resultados:** `@tanstack/react-virtual` para virtualizar filas grandes
- **Conexión DB:** `src/lib/db/` con drivers por tipo de DB

## Estructura de Archivos

```
src/components/sql/
├── SqlEditor.tsx          # Monaco Editor wrapper
├── QueryResultTable.tsx   # Tabla virtualizada de resultados
├── QueryBar.tsx           # Barra con botón Run, tiempo, filas
├── SchemaExplorer.tsx     # Árbol de tablas/columnas de la DB
└── SqlWorkspace.tsx       # Layout completo (editor + resultados)
```

## Componente SqlEditor

```tsx
// src/components/sql/SqlEditor.tsx
'use client'

import Editor from '@monaco-editor/react'
import { useRef, useCallback } from 'react'

interface SqlEditorProps {
  value: string
  onChange: (value: string) => void
  onRun: () => void
  schema?: DbSchema
}

export function SqlEditor({ value, onChange, onRun, schema }: SqlEditorProps) {
  const editorRef = useRef(null)

  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor

    // Ctrl+Enter o Cmd+Enter para ejecutar
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onRun)

    // Registrar autocompletado con tablas del schema
    if (schema) {
      monaco.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: () => ({
          suggestions: schema.tables.map(table => ({
            label: table.name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: table.name,
            detail: `${table.rowCount?.toLocaleString()} rows`,
          })),
        }),
      })
    }
  }, [onRun, schema])

  return (
    <Editor
      height="100%"
      language="sql"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      onMount={handleEditorDidMount}
      theme="vs-dark"
      options={{
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Menlo, monospace',
        minimap: { enabled: false },
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        padding: { top: 16 },
      }}
    />
  )
}
```

## API Route de Ejecución

```ts
// src/app/api/query/execute/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  sql: z.string().min(1).max(50000),
  dataSourceId: z.string(),
  limit: z.number().int().min(1).max(10000).default(1000),
})

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const { sql, dataSourceId, limit } = body.data

  // Inyectar LIMIT si no existe para evitar queries destructivas
  const safeSql = injectLimit(sql, limit)

  const client = await getDbClient(dataSourceId)
  const start = Date.now()

  try {
    const result = await client.query(safeSql)
    return NextResponse.json({
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      durationMs: Date.now() - start,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}
```

## Tabla de Resultados Virtualizada

Para resultados grandes (10k+ filas), usar `@tanstack/react-virtual`:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

// Solo renderiza las filas visibles en pantalla
const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 36,
  overscan: 10,
})
```

## Tipos

```ts
interface QueryResult {
  columns: { name: string; type: string }[]
  rows: Record<string, unknown>[]
  rowCount: number
  durationMs: number
}

interface DbSchema {
  tables: {
    name: string
    columns: { name: string; type: string }[]
    rowCount?: number
  }[]
}
```

## Checklist al Trabajar en el SQL Workspace

- [ ] `Ctrl+Enter` siempre ejecuta el query
- [ ] El SQL se sanitiza antes de enviar (nunca ejecutar DDL destructivo sin confirmación)
- [ ] Mostrar: filas retornadas, tiempo de ejecución, estado de conexión
- [ ] Errores de SQL mostrados inline con mensaje claro
- [ ] Exportar resultados a CSV disponible siempre
- [ ] El editor mantiene historial en localStorage
