
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';

        // If searching, we filter by tag name. 
        // We want to group by tag and count posts.
        // Prisma does not support easy "group by and count relation" in one go smoothly 
        // without `groupBy` api which returns aggregation but not relation data easily if we want related post info.
        // However, `Slash` model exists.

        /* 
           model Slash {
              id        String   @id @default(cuid())
              tag       String
              postId    String
              post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
              createdAt DateTime @default(now())
    
              @@unique([tag, postId])
              @@index([tag])
           }
        */

        // We can group on Slash.tag
        const groupByArgs: any = {
            by: ['tag'] as const,
            _count: {
                tag: true, // effectively counts rows, i.e., number of posts
            },
            orderBy: {
                _count: {
                    tag: 'desc',
                },
            },
            take: 50,
        };

        if (search) {
            groupByArgs.where = {
                tag: {
                    contains: search.toLowerCase(), // generic contains
                },
            };
        }

        const slashes = await prisma.slash.groupBy(groupByArgs);

        // Format: [{ tag: 'tech', count: 10 }]
        const formatted = slashes.map(s => ({
            tag: s.tag,
            count: (s as any)._count?.tag || 0,
        }));

        return NextResponse.json(formatted);

    } catch (error) {
        console.error('Error fetching slashes:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
