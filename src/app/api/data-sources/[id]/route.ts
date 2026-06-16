import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateClient } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  name:     z.string().min(1).max(100).optional(),
  host:     z.string().optional().nullable(),
  port:     z.number().int().optional().nullable(),
  database: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  password: z.string().optional(),   // empty string = don't change
  filename: z.string().optional().nullable(),
  apiUrl:   z.string().optional().nullable(),
  metadata: z.string().optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = patchSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const data = { ...body.data }
  // Never overwrite password with an empty string — caller omits it to keep existing
  if (!data.password) delete data.password

  invalidateClient(id)
  const updated = await prisma.dataSource.update({ where: { id }, data })
  const { password: _, ...safe } = updated
  return NextResponse.json(safe)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.dataSource.delete({ where: { id } });
  invalidateClient(id);
  return new NextResponse(null, { status: 204 });
}
