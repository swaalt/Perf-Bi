# Skill: data-source

Especialista en conexiones a fuentes de datos en Perf-Bi: databases, APIs REST y archivos CSV.

## Cuándo usar este skill

- Agregar soporte para un nuevo tipo de base de datos
- Crear la UI de configuración de conexiones
- Implementar el test de conexión y exploración de schema
- Manejar credenciales de forma segura
- Importar datos desde CSV o API REST

## Stack de Conexiones

- **ORM/Drivers:** Prisma (metadatos), drivers nativos para ejecución de queries
- **Almacenamiento de credenciales:** Variables de entorno + Prisma (encrypted)
- **Tipos soportados:** PostgreSQL, MySQL, SQLite, CSV upload
- **Ubicación:** `src/lib/db/` y `src/components/data-sources/`

## Estructura de Archivos

```
src/lib/db/
├── index.ts              # Factory: getDbClient(dataSourceId)
├── postgres.ts           # Cliente PostgreSQL (pg)
├── mysql.ts              # Cliente MySQL (mysql2)
├── sqlite.ts             # Cliente SQLite (better-sqlite3)
└── csv.ts                # Leer CSV como tabla en memoria

src/components/data-sources/
├── DataSourceList.tsx    # Lista de conexiones configuradas
├── NewDataSourceModal.tsx # Form para agregar nueva conexión
├── ConnectionTest.tsx    # Botón + feedback de test
└── SchemaTree.tsx        # Árbol de tablas y columnas
```

## Modelo de Datos (Prisma)

```prisma
model DataSource {
  id           String   @id @default(cuid())
  name         String
  type         DataSourceType
  host         String?
  port         Int?
  database     String?
  username     String?
  passwordHash String?  // AES-256 encrypted
  filePath     String?  // Para SQLite/CSV
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

enum DataSourceType {
  POSTGRESQL
  MYSQL
  SQLITE
  CSV
}
```

## Factory de Clientes

```ts
// src/lib/db/index.ts
import { prisma } from '@/lib/prisma'
import { PostgresClient } from './postgres'
import { MySqlClient } from './mysql'
import { SqliteClient } from './sqlite'

export interface DbClient {
  query(sql: string): Promise<QueryResult>
  getSchema(): Promise<DbSchema>
  testConnection(): Promise<void>
  close(): Promise<void>
}

const clientCache = new Map<string, DbClient>()

export async function getDbClient(dataSourceId: string): Promise<DbClient> {
  if (clientCache.has(dataSourceId)) return clientCache.get(dataSourceId)!

  const ds = await prisma.dataSource.findUniqueOrThrow({ where: { id: dataSourceId } })

  let client: DbClient
  switch (ds.type) {
    case 'POSTGRESQL': client = new PostgresClient(ds); break
    case 'MYSQL':      client = new MySqlClient(ds); break
    case 'SQLITE':     client = new SqliteClient(ds); break
    default: throw new Error(`Unsupported data source type: ${ds.type}`)
  }

  clientCache.set(dataSourceId, client)
  return client
}
```

## API Routes de Data Sources

```
POST   /api/data-sources          # Crear nueva conexión
GET    /api/data-sources          # Listar todas
GET    /api/data-sources/:id      # Detalle
DELETE /api/data-sources/:id      # Eliminar
POST   /api/data-sources/:id/test # Test de conexión
GET    /api/data-sources/:id/schema # Obtener schema (tablas/columnas)
```

## Seguridad

- **Nunca** devolver contraseñas al cliente
- Las credenciales se encriptan en reposo con AES-256
- Los queries se ejecutan con un usuario DB de solo lectura cuando sea posible
- Validar y sanitizar el SQL antes de ejecutar (bloquear DROP, TRUNCATE, etc.)

```ts
const BLOCKED_STATEMENTS = /^\s*(DROP|TRUNCATE|DELETE|INSERT|UPDATE|CREATE|ALTER|GRANT|REVOKE)/i

export function isSafeQuery(sql: string): boolean {
  const statements = sql.split(';').filter(s => s.trim())
  return statements.every(s => !BLOCKED_STATEMENTS.test(s))
}
```

## UI de Configuración

El form de nueva conexión debe tener:
1. Nombre descriptivo (libre)
2. Tipo de DB (tabs: PostgreSQL / MySQL / SQLite / CSV)
3. Campos específicos del tipo (host, puerto, database, usuario, password)
4. Botón "Test connection" antes de guardar
5. Feedback visual: ✓ Conectado / ✗ Error con mensaje

## Checklist al Trabajar con Data Sources

- [ ] Credenciales siempre encriptadas, nunca en plaintext en DB
- [ ] Test de conexión obligatorio antes de guardar
- [ ] Schema explorer disponible después de conectar
- [ ] Mensajes de error de conexión claros y accionables
- [ ] Soporte para connection string además de campos individuales
- [ ] Timeout de 10s en las conexiones de test
