import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    return NextResponse.json({
        blocked: [],
        blockedBy: [],
        ghosted: [],
        hidden: []
    });
}

// Handle Unblock/Unghost/Unhide actions
export async function POST(req: Request) {
    return NextResponse.json({ success: true });
}
