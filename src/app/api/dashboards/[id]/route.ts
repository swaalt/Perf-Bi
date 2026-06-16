import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dashboard = await prisma.dashboard.findUnique({ where: { id } });
  if (!dashboard) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dashboard);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, string> = {};
  if (typeof body.name    === "string") data.name    = body.name.trim();
  if (typeof body.widgets === "string") data.widgets = body.widgets;

  const dashboard = await prisma.dashboard.update({ where: { id }, data });
  return NextResponse.json(dashboard);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.dashboard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
