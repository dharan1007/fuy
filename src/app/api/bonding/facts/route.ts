
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json({ facts: [] });
}

export async function POST(request: Request) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 501 });
}

export async function PUT(request: Request) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 501 });
}

export async function DELETE(request: Request) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 501 });
}
