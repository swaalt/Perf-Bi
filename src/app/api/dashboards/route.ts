import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const dashboards = await prisma.dashboard.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json(dashboards);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const dashboard = await prisma.dashboard.create({
    data: { name, widgets: "[]" },
  });
  return NextResponse.json(dashboard, { status: 201 });
}
