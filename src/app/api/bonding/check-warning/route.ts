
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    // Feature disabled/removed
    return NextResponse.json({ warnings: [] });
}
