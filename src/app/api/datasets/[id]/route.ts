import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ds = await prisma.savedDataset.findUnique({ where: { id } })
  if (!ds) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json({
    ...ds,
    columns: JSON.parse(ds.columns) as string[],
    rows:    JSON.parse(ds.rows)    as unknown[][],
  })
}

const patchSchema = z.object({
  name:        z.string().min(1).max(120).optional(),
  description: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = patchSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  const ds = await prisma.savedDataset.update({ where: { id }, data: body.data })
  return NextResponse.json(ds)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.savedDataset.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
