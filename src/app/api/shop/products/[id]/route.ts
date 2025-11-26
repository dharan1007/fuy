import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const productId = params.id;

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                brand: {
                    select: { name: true, slug: true },
                },
                // @ts-ignore
                seller: {
                    select: {
                        name: true,
                        profile: {
                            select: { avatarUrl: true }
                        }
                    },
                },
                reviews: {
                    select: {
                        id: true,
                        rating: true,
                        comment: true,
                        createdAt: true,
                        user: {
                            select: { name: true }
                        }
                    }
                }
            },
        });

        if (!product) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error("Error fetching product:", error);
        return NextResponse.json(
            { error: "Failed to fetch product" },
            { status: 500 }
        );
    }
}
