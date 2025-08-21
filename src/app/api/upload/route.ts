import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs"; // ensure Node fs is available

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();

    const uploadsDir = path.join(process.cwd(), "public", "uploads", userId);
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeName = (file.name || "upload").replace(/[^\w.\-]+/g, "_");
    const filename = `${Date.now()}_${safeName}`;
    const fullPath = path.join(uploadsDir, filename);

    // Use Uint8Array to satisfy TS writeFile overloads in strict setups
    await fs.writeFile(fullPath, new Uint8Array(arrayBuffer));

    const publicUrl = `/uploads/${userId}/${filename}`;
    return NextResponse.json({ url: publicUrl, filename });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Upload error" }, { status: 400 });
  }
}
