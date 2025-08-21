export const runtime = "nodejs";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();
  page.drawText("Your Fuy Export", {
    x: 50,
    y: height - 80,
    size: 24,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText(`Generated: ${new Date().toLocaleString()}`, {
    x: 50,
    y: height - 120,
    size: 12,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  // bytes is a Uint8Array (ArrayBufferLike). Copy into a *real* ArrayBuffer.
  const bytes = await pdf.save(); // Uint8Array
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);

  // Return the ArrayBuffer (valid BodyInit in Node runtime)
  return new Response(ab, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="fuy-export.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
