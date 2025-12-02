import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { kind } = body;

    if (kind === "blueprint") {
      const { data } = body;
      // Store complex data in notes as JSON
      // We use the first blueprint found or create a new one
      // Ideally we should have a way to select which blueprint, but for now we assume one per user or create new.
      // Let's try to update the latest one or create new.

      const existing = await prisma.bondBlueprint.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      let bp;
      const payload = {
        userId,
        personName: data.person || "Unknown",
        goal: data.needs, // Mapping 'needs' to 'goal' for some structure
        notes: JSON.stringify({
          joys: data.joys,
          ruptureSignals: data.ruptureSignals,
          repairScript: data.repairScript,
        }),
      };

      if (existing) {
        bp = await prisma.bondBlueprint.update({
          where: { id: existing.id },
          data: {
            personName: payload.personName,
            goal: payload.goal,
            notes: payload.notes,
          },
        });
      } else {
        bp = await prisma.bondBlueprint.create({ data: payload });
      }
      return NextResponse.json({ success: true, blueprint: bp });

    } else if (kind === "repair") {
      const { note } = body;
      // Attach to latest blueprint if exists
      const bp = await prisma.bondBlueprint.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      const drill = await prisma.conflictDrill.create({
        data: {
          userId,
          blueprintId: bp?.id,
          notes: note,
          resolvedAt: new Date(), // Auto-resolve for now as it's a log
        },
      });
      return NextResponse.json({ success: true, drill });
    }

    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  } catch (error) {
    console.error("Error in bonds API:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();

    const bp = await prisma.bondBlueprint.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { drills: true },
    });

    if (!bp) return NextResponse.json({ blueprint: null });

    // Parse notes back
    let extras = {};
    try {
      extras = JSON.parse(bp.notes || "{}");
    } catch (e) { }

    const data = {
      person: bp.personName,
      needs: bp.goal || "",
      joys: (extras as any).joys || "",
      ruptureSignals: (extras as any).ruptureSignals || "",
      repairScript: (extras as any).repairScript || "",
    };

    return NextResponse.json({ blueprint: data, drills: bp.drills });
  } catch (error) {
    console.error("Error fetching bonds:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
