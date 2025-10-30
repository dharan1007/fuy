import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/essenz/[essenzId] - Update essenz goal
export async function PATCH(req: Request, { params }: { params: { essenzId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { essenzId } = params;
    const { goal, codename, plan, focusAreas } = await req.json();

    // Verify ownership
    const essenz = await prisma.essenz.findUnique({
      where: { id: essenzId },
    });

    if (!essenz || essenz.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const updated = await prisma.essenz.update({
      where: { id: essenzId },
      data: {
        ...(goal !== undefined && { goal }),
        ...(codename !== undefined && { codename }),
        ...(plan !== undefined && { plan }),
        ...(focusAreas !== undefined && { focusAreas }),
      },
    });

    return NextResponse.json({ goal: updated });
  } catch (error) {
    console.error("[Essenz PATCH]", error);
    return NextResponse.json({ error: "Failed to update essenz goal" }, { status: 500 });
  }
}

// DELETE /api/essenz/[essenzId] - Delete essenz goal
export async function DELETE(req: Request, { params }: { params: { essenzId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { essenzId } = params;

    // Verify ownership
    const essenz = await prisma.essenz.findUnique({
      where: { id: essenzId },
    });

    if (!essenz || essenz.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    await prisma.essenz.delete({
      where: { id: essenzId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Essenz DELETE]", error);
    return NextResponse.json({ error: "Failed to delete essenz goal" }, { status: 500 });
  }
}
