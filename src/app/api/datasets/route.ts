import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  name:        z.string().min(1).max(120),
  description: z.string().optional(),
  columns:     z.array(z.string()),
  rows:        z.array(z.array(z.unknown())),
  sourceId:    z.string().optional(),
  sourceQuery: z.string().optional(),
})

export async function GET() {
  const datasets = await prisma.savedDataset.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, name: true, description: true,
      rowCount: true, sourceId: true, createdAt: true, updatedAt: true,
      columns: true,
    },
  })
  // parse columns JSON for preview
  return NextResponse.json(datasets.map(d => ({
    ...d,
    columns: JSON.parse(d.columns) as string[],
  })))
}

export async function POST(req: NextRequest) {
  let raw: unknown
  try {
    raw = await req.json()
  } catch (e) {
    return NextResponse.json({ error: `JSON parse failed: ${String(e)}` }, { status: 400 })
  }

  const body = createSchema.safeParse(raw)
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const { name, description, columns, rows, sourceId, sourceQuery } = body.data

  // Sanitize rows: replace undefined with null so JSON.stringify is safe
  const safeRows = rows.map(row => row.map(v => v === undefined ? null : v))

  try {
    const ds = await prisma.savedDataset.create({
      data: {
        name, description,
        columns: JSON.stringify(columns),
        rows:    JSON.stringify(safeRows),
        rowCount: rows.length,
        sourceId, sourceQuery,
      },
    })
    return NextResponse.json({ ...ds, columns, rows: [] }, { status: 201 })
  } catch (e) {
    console.error("[datasets POST]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
