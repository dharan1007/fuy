-- Enable RLS and add policies for tables identified in Security Lint Report

-- 1. ConversationState
ALTER TABLE "ConversationState" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own conversation states" ON "ConversationState"
    USING (auth.uid()::text = "userId");

-- 2. AIChatSession
ALTER TABLE "AIChatSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own AI sessions" ON "AIChatSession"
    USING (auth.uid()::text = "userId");

-- 3. AIChatMessage
ALTER TABLE "AIChatMessage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage messages in their sessions" ON "AIChatMessage"
    USING ("sessionId" IN (SELECT id FROM "AIChatSession" WHERE "userId" = auth.uid()::text));

-- 4. UserInsight
ALTER TABLE "UserInsight" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their insights" ON "UserInsight"
    USING (auth.uid()::text = "userId");

-- 5. ProductView
ALTER TABLE "ProductView" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own product views" ON "ProductView" FOR SELECT
    USING (auth.uid()::text = "userId");
CREATE POLICY "Anyone can insert product views" ON "ProductView" FOR INSERT WITH CHECK (true);

-- 6. BreathingReaction
ALTER TABLE "BreathingReaction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their breathing reactions" ON "BreathingReaction"
    USING (auth.uid()::text = "userId");

-- 7. GymPartner
ALTER TABLE "GymPartner" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their gym partners" ON "GymPartner"
    USING (auth.uid()::text = "userId" OR auth.uid()::text = "partnerId");

-- 8. WorkoutPlan
ALTER TABLE "WorkoutPlan" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their workout plans" ON "WorkoutPlan"
    USING (auth.uid()::text = "userId");

-- 9. CollaborationInvite
ALTER TABLE "CollaborationInvite" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their invites" ON "CollaborationInvite"
    USING (auth.uid()::text = "fromUserId" OR auth.uid()::text = "toUserId");

-- 10. CollaborationUpdate
ALTER TABLE "CollaborationUpdate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view session updates" ON "CollaborationUpdate" FOR SELECT
    USING ("userId" = auth.uid()::text); 
CREATE POLICY "Users can insert updates" ON "CollaborationUpdate" FOR INSERT
    WITH CHECK ("userId" = auth.uid()::text);

-- 11. Plan (Hopin)
ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators can manage plans" ON "Plan"
    USING (auth.uid()::text = "creatorId");
CREATE POLICY "Members can view plans" ON "Plan" FOR SELECT
    USING ("id" IN (SELECT "planId" FROM "PlanMember" WHERE "userId" = auth.uid()::text));

-- 12. PlanMember
ALTER TABLE "PlanMember" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view memberships" ON "PlanMember"
    USING (auth.uid()::text = "userId");

-- 13. ProfileCard
ALTER TABLE "ProfileCard" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profile cards are public" ON "ProfileCard" FOR SELECT USING (true);
CREATE POLICY "Users can manage their own card" ON "ProfileCard" FOR ALL USING (auth.uid()::text = "userId");

-- Address security_definer_view on usage_stats if possible
-- (Requires DROP VIEW and RECREATE usually, ignoring for now as specific SQL might vary)
