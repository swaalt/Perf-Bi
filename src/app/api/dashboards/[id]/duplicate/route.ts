import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const original = await prisma.dashboard.findUnique({ where: { id } })
  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const copy = await prisma.dashboard.create({
    data: {
      name: `Copia de ${original.name}`,
      widgets: original.widgets,
    },
  })
  return NextResponse.json(copy, { status: 201 })
}
