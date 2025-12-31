export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const { memberId, action } = await req.json(); // action: ACCEPT | REJECT

        if (!memberId || !["ACCEPT", "REJECT"].includes(action)) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const member = await prisma.planMember.findUnique({
            where: { id: memberId },
            include: { plan: true }
        });

        if (!member) return NextResponse.json({ error: "Request not found" }, { status: 404 });

        // Check ownership
        if (member.plan.creatorId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (action === "REJECT") {
            await prisma.planMember.update({
                where: { id: memberId },
                data: { status: "REJECTED" }
            });
            return NextResponse.json({ success: true, status: "REJECTED" });
        }

        // ACCEPT Logic
        // Generate 7 digit code
        const code = Math.floor(1000000 + Math.random() * 9000000).toString();

        await prisma.planMember.update({
            where: { id: memberId },
            data: {
                status: "ACCEPTED",
                verificationCode: code
            } as any
        });

        // Notify User
        await prisma.notification.create({
            data: {
                userId: member.userId,
                type: "HOPIN_ACCEPTED",
                message: `You're in! Your code for ${member.plan.title} is ${code}`,
                postId: member.plan.id
            }
        });

        // --- Chat Integration ---
        // 1. Find or create conversation
        // Ensure consistent participant ordering for check
        const userA = userId < member.userId ? userId : member.userId;
        const userB = userId < member.userId ? member.userId : userId;

        let conversation = await prisma.conversation.findUnique({
            where: {
                participantA_participantB: {
                    participantA: userA,
                    participantB: userB
                }
            }
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    participantA: userA,
                    participantB: userB
                }
            });
        }

        // 2. Send Message with Code
        // QR Code URL logic would go here. For now we send text.
        // We can use a special type 'system' or just 'text'.
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                senderId: userId, // Sent by creator? Or system? Let's say creator sent it automatically.
                content: `You've been accepted to join "${member.plan.title}"! \n\n🔒 Verification Code: **${code}**\n\nShow this code or the QR code to the host when you arrive.`,
                type: 'text'
            }
        });

        // Update conversation last message
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                lastMessage: `You're in! Code: ${code}`,
                lastMessageAt: new Date()
            }
        });

        return NextResponse.json({ success: true, status: "ACCEPTED" });

    } catch (error) {
        console.error("Manage Plan Error:", error);
        return NextResponse.json({ error: "Failed to manage request" }, { status: 500 });
    }
}

