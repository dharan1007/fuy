import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createProductSchema = z.object({
    name: z.string().min(3),
    description: z.string().optional(),
    price: z.number().min(0),
    type: z.enum(["PHYSICAL", "COURSE", "EBOOK", "DIGITAL_ASSET", "TEMPLATE", "HOPIN_PLAN"]),
    category: z.string().optional(),
    images: z.string().optional(), // JSON string
    digitalFileUrl: z.string().optional(),
    linkedResourceId: z.string().optional(),
    stock: z.number().int().min(0).default(1),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const validatedData = createProductSchema.parse(body);

        // Generate a slug from the name
        const slug = validatedData.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "") + "-" + Date.now();

        const product = await prisma.product.create({
            data: {
                ...validatedData,
                slug,
                sellerId: user.id,
                status: "ACTIVE",
            },
        });

        return NextResponse.json(product);
    } catch (error) {
        console.error("Error creating user product:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json(
            { error: "Failed to create product" },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const products = await prisma.product.findMany({
            where: {
                OR: [
                    { sellerId: user.id },
                    { brand: { ownerId: user.id } }
                ]
            },
            include: {
                brand: { select: { name: true, slug: true } }
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(products);
    } catch (error) {
        console.error("Error fetching user products:", error);
        return NextResponse.json(
            { error: "Failed to fetch products" },
            { status: 500 }
        );
    }
}
