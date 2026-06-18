import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1),
  host: z.string().optional(),
  port: z.number().int().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  filename: z.string().optional(),
  apiUrl: z.string().optional(),
  metadata: z.string().optional(),
})

export async function GET() {
  const sources = await prisma.dataSource.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, type: true,
      host: true, port: true, database: true, username: true,
      filename: true, apiUrl: true, metadata: true, createdAt: true,
    },
  })
  return NextResponse.json(sources)
}

export async function POST(req: NextRequest) {
  const body = createSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  const source = await prisma.dataSource.create({ data: { ...body.data, type: body.data.type.toUpperCase() } })
  const { password: _, ...safe } = source
  return NextResponse.json(safe, { status: 201 })
}
