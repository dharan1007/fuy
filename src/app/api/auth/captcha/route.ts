import { NextResponse } from "next/server";
import CryptoJS from "crypto-js";

export const dynamic = 'force-dynamic';

const SECRET = process.env.SUPABASE_SERVICE_ROLE || "fallback-secret-key-change-this-in-prod";

function generateRandomString(length: number) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 1, 0 to avoid confusion
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateSVG(text: string) {
    const width = 200;
    const height = 80;

    // Background patterns
    let lines = "";
    for (let i = 0; i < 8; i++) {
        lines += `<line x1="${Math.random() * width}" y1="${Math.random() * height}" x2="${Math.random() * width}" y2="${Math.random() * height}" stroke="rgba(255,255,255,0.3)" stroke-width="${1 + Math.random() * 2}" />`;
    }

    // Dots
    let dots = "";
    for (let i = 0; i < 30; i++) {
        dots += `<circle cx="${Math.random() * width}" cy="${Math.random() * height}" r="${Math.random() * 2}" fill="rgba(255,255,255,0.4)" />`;
    }

    // Distorted text
    const charSVG = text.split("").map((char, i) => {
        const x = 20 + i * 30 + (Math.random() * 10 - 5);
        const y = 50 + (Math.random() * 10 - 5);
        const rotate = Math.random() * 30 - 15;
        return `<text x="${x}" y="${y}" font-family="monospace" font-size="34" font-weight="bold" fill="white" transform="rotate(${rotate}, ${x}, ${y})">${char}</text>`;
    }).join("");

    return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="background-color: #111;">
      ${lines}
      ${dots}
      ${charSVG}
    </svg>
  `;
}

export async function GET() {
    try {
        const code = generateRandomString(5);
        const svg = generateSVG(code);
        const timestamp = Date.now();

        // Create verify token: Encrypted(code|timestamp)
        const payload = `${code}|${timestamp}`;
        const token = CryptoJS.AES.encrypt(payload, SECRET).toString();

        // Data URI for frontend
        const image = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

        return NextResponse.json({ image, token });
    } catch (error) {
        console.error("CAPTCHA generation failed:", error);
        return NextResponse.json({ error: "Failed to generate ID" }, { status: 500 });
    }
}
