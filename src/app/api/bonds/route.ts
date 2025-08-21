// src/app/api/bonds/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// Create a bond blueprint  { personName, goal?, notes? }
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  const { personName, goal, notes } = await req.json();

  if (!personName || typeof personName !== "string") {
    return NextResponse.json({ error: "personName required" }, { status: 400 });
    }

  const bp = await prisma.bondBlueprint.create({
    data: {
      userId,
      personName: personName.trim(),
      goal: goal ? String(goal) : null,
      notes: notes ? String(notes) : null,
    },
  });

  return NextResponse.json(bp);
}

// Add a conflict drill to a blueprint  { blueprintId, notes? }
export async function PUT(req: NextRequest) {
  const userId = await requireUserId();
  const { blueprintId, notes } = await req.json();
  if (!blueprintId) {
    return NextResponse.json({ error: "blueprintId required" }, { status: 400 });
  }

  const drill = await prisma.conflictDrill.create({
    data: {
      userId,
      blueprintId: String(blueprintId),
      notes: notes ? String(notes) : null,
    },
  });

  return NextResponse.json(drill);
}
