
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    // Feature disabled/removed
    return NextResponse.json({ error: 'Feature disabled' }, { status: 501 });
}

export async function DELETE(request: Request) {
    // Feature disabled/removed
    return NextResponse.json({ error: 'Feature disabled' }, { status: 501 });
}
