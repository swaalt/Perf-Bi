import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDbClient } from "@/lib/db"
import { HTTP_SOURCE_TYPES } from "@/types/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const ds = await prisma.dataSource.findUnique({ where: { id } })
  if (!ds) return NextResponse.json({ tables: [] }, { status: 404 })

  if (HTTP_SOURCE_TYPES.has(ds.type)) {
    return NextResponse.json({ tables: [] })
  }

  try {
    const client = await getDbClient(id)
    const schema = await client.getSchema()
    return NextResponse.json(schema)
  } catch (err) {
    return NextResponse.json({ error: String(err), tables: [] }, { status: 500 })
  }
}
