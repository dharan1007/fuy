import { NextRequest, NextResponse } from 'next/server';

type Challenge = 'BLINK' | 'SMILE' | 'TURN_LEFT' | 'TURN_RIGHT' | 'NOD';

export async function GET(request: NextRequest) {
    // Generate 3 random challenges
    const allChallenges: Challenge[] = ['BLINK', 'SMILE', 'TURN_LEFT', 'TURN_RIGHT', 'NOD'];
    const shuffled = allChallenges.sort(() => Math.random() - 0.5);
    const challenges = shuffled.slice(0, 3);

    return NextResponse.json({ challenges });
}
