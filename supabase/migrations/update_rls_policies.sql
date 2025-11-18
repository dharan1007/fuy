-- Update RLS Policies with proper ownership checks and type casting
-- This migration safely drops existing policies and recreates them with correct logic

-- Drop all existing policies (if they exist)
-- User table
DROP POLICY IF EXISTS "Users can view all users" ON "public"."User";
DROP POLICY IF EXISTS "Users can insert their own user record" ON "public"."User";
DROP POLICY IF EXISTS "Users can update their own user record" ON "public"."User";

-- Profile table
DROP POLICY IF EXISTS "Anyone can view profiles" ON "public"."Profile";
DROP POLICY IF EXISTS "Users can insert their profile" ON "public"."Profile";
DROP POLICY IF EXISTS "Users can update their profile" ON "public"."Profile";

-- Post table
DROP POLICY IF EXISTS "Anyone can view posts" ON "public"."Post";
DROP POLICY IF EXISTS "Authenticated users can create posts" ON "public"."Post";
DROP POLICY IF EXISTS "Users can update their own posts" ON "public"."Post";
DROP POLICY IF EXISTS "Users can delete their own posts" ON "public"."Post";

-- PostComment table
DROP POLICY IF EXISTS "Anyone can view comments" ON "public"."PostComment";
DROP POLICY IF EXISTS "Authenticated users can create comments" ON "public"."PostComment";
DROP POLICY IF EXISTS "Users can update their own comments" ON "public"."PostComment";
DROP POLICY IF EXISTS "Users can delete their own comments" ON "public"."PostComment";

-- PostLike table
DROP POLICY IF EXISTS "Anyone can view likes" ON "public"."PostLike";
DROP POLICY IF EXISTS "Authenticated users can like posts" ON "public"."PostLike";
DROP POLICY IF EXISTS "Users can remove their own likes" ON "public"."PostLike";

-- PostShare table
DROP POLICY IF EXISTS "Anyone can view shares" ON "public"."PostShare";
DROP POLICY IF EXISTS "Authenticated users can share posts" ON "public"."PostShare";

-- Notification table
DROP POLICY IF EXISTS "Users can view their own notifications" ON "public"."Notification";
DROP POLICY IF EXISTS "Users can update their own notifications" ON "public"."Notification";
DROP POLICY IF EXISTS "Users can delete their own notifications" ON "public"."Notification";

-- JournalEntry table
DROP POLICY IF EXISTS "Users can view their own journal entries" ON "public"."JournalEntry";
DROP POLICY IF EXISTS "Authenticated users can create journal entries" ON "public"."JournalEntry";
DROP POLICY IF EXISTS "Users can update their own journal entries" ON "public"."JournalEntry";
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON "public"."JournalEntry";

-- Task table
DROP POLICY IF EXISTS "Users can view their own tasks" ON "public"."Task";
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON "public"."Task";
DROP POLICY IF EXISTS "Users can update their own tasks" ON "public"."Task";
DROP POLICY IF EXISTS "Users can delete their own tasks" ON "public"."Task";

-- Group table
DROP POLICY IF EXISTS "Anyone can view groups" ON "public"."Group";
DROP POLICY IF EXISTS "Authenticated users can create groups" ON "public"."Group";

-- Conversation table
DROP POLICY IF EXISTS "Authenticated users can view conversations" ON "public"."Conversation";
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON "public"."Conversation";

-- Message table
DROP POLICY IF EXISTS "Authenticated users can view messages" ON "public"."Message";
DROP POLICY IF EXISTS "Authenticated users can create messages" ON "public"."Message";

-- ChatSessionLog table
DROP POLICY IF EXISTS "Authenticated users can view session logs" ON "public"."ChatSessionLog";
DROP POLICY IF EXISTS "Authenticated users can create session logs" ON "public"."ChatSessionLog";

-- ChatAnalytics table
DROP POLICY IF EXISTS "Authenticated users can view analytics" ON "public"."ChatAnalytics";

-- Media table
DROP POLICY IF EXISTS "Authenticated users can view media" ON "public"."Media";
DROP POLICY IF EXISTS "Authenticated users can upload media" ON "public"."Media";

-- Metric table
DROP POLICY IF EXISTS "Authenticated users can view metrics" ON "public"."Metric";
DROP POLICY IF EXISTS "Authenticated users can create metrics" ON "public"."Metric";

-- HappinessScore table
DROP POLICY IF EXISTS "Authenticated users can view happiness scores" ON "public"."HappinessScore";
DROP POLICY IF EXISTS "Authenticated users can create happiness scores" ON "public"."HappinessScore";

-- ConflictDrill table
DROP POLICY IF EXISTS "Authenticated users can view conflict drills" ON "public"."ConflictDrill";
DROP POLICY IF EXISTS "Authenticated users can create conflict drills" ON "public"."ConflictDrill";

-- BondBlueprint table
DROP POLICY IF EXISTS "Authenticated users can view bond blueprints" ON "public"."BondBlueprint";
DROP POLICY IF EXISTS "Authenticated users can create bond blueprints" ON "public"."BondBlueprint";

-- SerendipityLog table
DROP POLICY IF EXISTS "Authenticated users can view serendipity logs" ON "public"."SerendipityLog";
DROP POLICY IF EXISTS "Authenticated users can create serendipity logs" ON "public"."SerendipityLog";

-- UserValue table
DROP POLICY IF EXISTS "Authenticated users can view values" ON "public"."UserValue";
DROP POLICY IF EXISTS "Authenticated users can manage values" ON "public"."UserValue";
DROP POLICY IF EXISTS "Authenticated users can update values" ON "public"."UserValue";

-- Reminder table
DROP POLICY IF EXISTS "Authenticated users can view reminders" ON "public"."Reminder";
DROP POLICY IF EXISTS "Authenticated users can create reminders" ON "public"."Reminder";
DROP POLICY IF EXISTS "Authenticated users can update reminders" ON "public"."Reminder";

-- Value table (reference)
DROP POLICY IF EXISTS "Anyone can view values" ON "public"."Value";

-- JournalTemplate table (reference)
DROP POLICY IF EXISTS "Anyone can view templates" ON "public"."JournalTemplate";

-- Organization table (reference)
DROP POLICY IF EXISTS "Anyone can view organizations" ON "public"."Organization";

-- Brand table (reference)
DROP POLICY IF EXISTS "Anyone can view brands" ON "public"."Brand";
DROP POLICY IF EXISTS "Allow inserts on Brand" ON "public"."Brand";

-- Product table (reference)
DROP POLICY IF EXISTS "Anyone can view products" ON "public"."Product";

-- Deal table (reference)
DROP POLICY IF EXISTS "Anyone can view deals" ON "public"."Deal";

-- Tag table (reference)
DROP POLICY IF EXISTS "Anyone can view tags" ON "public"."Tag";

-- Order table (commerce)
DROP POLICY IF EXISTS "Users can view their own orders" ON "public"."Order";

-- OrderItem table (commerce)
DROP POLICY IF EXISTS "Anyone can view order items" ON "public"."OrderItem";

-- OrderReturn table (commerce)
DROP POLICY IF EXISTS "Users can view their own returns" ON "public"."OrderReturn";

-- Payment table (commerce)
DROP POLICY IF EXISTS "Users can view their own payments" ON "public"."Payment";

-- Account table (NextAuth)
DROP POLICY IF EXISTS "Authenticated users can view accounts" ON "public"."Account";

-- Session table (NextAuth)
DROP POLICY IF EXISTS "Authenticated users can view sessions" ON "public"."Session";

-- VerificationToken table (NextAuth)
DROP POLICY IF EXISTS "Allow verification tokens" ON "public"."VerificationToken";

-- Collaborative tables
DROP POLICY IF EXISTS "Allow all on GroupMember" ON "public"."GroupMember";
DROP POLICY IF EXISTS "Allow inserts on GroupMember" ON "public"."GroupMember";
DROP POLICY IF EXISTS "Allow all on TaskAssignee" ON "public"."TaskAssignee";
DROP POLICY IF EXISTS "Allow inserts on TaskAssignee" ON "public"."TaskAssignee";
DROP POLICY IF EXISTS "Allow all on TaskComment" ON "public"."TaskComment";
DROP POLICY IF EXISTS "Users can create task comments" ON "public"."TaskComment";
DROP POLICY IF EXISTS "Allow all on TaskChecklistItem" ON "public"."TaskChecklistItem";
DROP POLICY IF EXISTS "Allow inserts on TaskChecklistItem" ON "public"."TaskChecklistItem";
DROP POLICY IF EXISTS "Allow all on TaskTag" ON "public"."TaskTag";
DROP POLICY IF EXISTS "Allow inserts on TaskTag" ON "public"."TaskTag";
DROP POLICY IF EXISTS "Allow all on TaskVolunteer" ON "public"."TaskVolunteer";
DROP POLICY IF EXISTS "Allow inserts on TaskVolunteer" ON "public"."TaskVolunteer";
DROP POLICY IF EXISTS "Allow all on OrgMember" ON "public"."OrgMember";
DROP POLICY IF EXISTS "Allow all on FeatureSession" ON "public"."FeatureSession";
DROP POLICY IF EXISTS "Allow all on FeatureSessionParticipant" ON "public"."FeatureSessionParticipant";
DROP POLICY IF EXISTS "Allow all on ProductReview" ON "public"."ProductReview";
DROP POLICY IF EXISTS "Allow inserts on ProductReview" ON "public"."ProductReview";
DROP POLICY IF EXISTS "Allow all on BrandReview" ON "public"."BrandReview";
DROP POLICY IF EXISTS "Allow inserts on BrandReview" ON "public"."BrandReview";
DROP POLICY IF EXISTS "Allow all on ProductAnalytics" ON "public"."ProductAnalytics";
DROP POLICY IF EXISTS "Allow all on BrandAnalytics" ON "public"."BrandAnalytics";
DROP POLICY IF EXISTS "Allow inserts on WebhookLog" ON "public"."WebhookLog";
DROP POLICY IF EXISTS "Allow all on WaypointPhoto" ON "public"."WaypointPhoto";
DROP POLICY IF EXISTS "Allow all on PlaceReview" ON "public"."PlaceReview";
DROP POLICY IF EXISTS "Allow all on PlacePhoto" ON "public"."PlacePhoto";
DROP POLICY IF EXISTS "Allow all on PlacePhotoShare" ON "public"."PlacePhotoShare";
DROP POLICY IF EXISTS "Allow all on PhotoShare" ON "public"."PhotoShare";
DROP POLICY IF EXISTS "Allow all on RouteWaypoint" ON "public"."RouteWaypoint";
DROP POLICY IF EXISTS "Allow all on Friendship" ON "public"."Friendship";
DROP POLICY IF EXISTS "Allow inserts on Friendship" ON "public"."Friendship";
DROP POLICY IF EXISTS "Allow all on Invite" ON "public"."Invite";
DROP POLICY IF EXISTS "Allow inserts on Invite" ON "public"."Invite";
DROP POLICY IF EXISTS "Allow all on PasskeyCredential" ON "public"."PasskeyCredential";
DROP POLICY IF EXISTS "Allow inserts on PasskeyCredential" ON "public"."PasskeyCredential";

-- Now recreate all policies with proper definitions

-- User table
CREATE POLICY "Users can view all users" ON "public"."User" FOR SELECT USING (true);
CREATE POLICY "Users can insert their own user record" ON "public"."User" FOR INSERT WITH CHECK (auth.uid()::text = id);
CREATE POLICY "Users can update their own user record" ON "public"."User" FOR UPDATE USING (auth.uid()::text = id);

-- Profile table
CREATE POLICY "Anyone can view profiles" ON "public"."Profile" FOR SELECT USING (true);
CREATE POLICY "Users can insert their profile" ON "public"."Profile" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update their profile" ON "public"."Profile" FOR UPDATE USING (auth.uid()::text = "userId");

-- Post table
CREATE POLICY "Anyone can view posts" ON "public"."Post" FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON "public"."Post" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update their own posts" ON "public"."Post" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete their own posts" ON "public"."Post" FOR DELETE USING (auth.uid()::text = "userId");

-- PostComment table
CREATE POLICY "Anyone can view comments" ON "public"."PostComment" FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON "public"."PostComment" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update their own comments" ON "public"."PostComment" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete their own comments" ON "public"."PostComment" FOR DELETE USING (auth.uid()::text = "userId");

-- PostLike table
CREATE POLICY "Anyone can view likes" ON "public"."PostLike" FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like posts" ON "public"."PostLike" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can remove their own likes" ON "public"."PostLike" FOR DELETE USING (auth.uid()::text = "userId");

-- PostShare table
CREATE POLICY "Anyone can view shares" ON "public"."PostShare" FOR SELECT USING (true);
CREATE POLICY "Authenticated users can share posts" ON "public"."PostShare" FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- Notification table
CREATE POLICY "Users can view their own notifications" ON "public"."Notification" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can update their own notifications" ON "public"."Notification" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete their own notifications" ON "public"."Notification" FOR DELETE USING (auth.uid()::text = "userId");

-- JournalEntry table
CREATE POLICY "Users can view their own journal entries" ON "public"."JournalEntry" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Authenticated users can create journal entries" ON "public"."JournalEntry" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update their own journal entries" ON "public"."JournalEntry" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete their own journal entries" ON "public"."JournalEntry" FOR DELETE USING (auth.uid()::text = "userId");

-- Task table
CREATE POLICY "Users can view their own tasks" ON "public"."Task" FOR SELECT USING (auth.uid()::text = "createdById");
CREATE POLICY "Authenticated users can create tasks" ON "public"."Task" FOR INSERT WITH CHECK (auth.uid()::text = "createdById");
CREATE POLICY "Users can update their own tasks" ON "public"."Task" FOR UPDATE USING (auth.uid()::text = "createdById");
CREATE POLICY "Users can delete their own tasks" ON "public"."Task" FOR DELETE USING (auth.uid()::text = "createdById");

-- Group table
CREATE POLICY "Anyone can view groups" ON "public"."Group" FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create groups" ON "public"."Group" FOR INSERT WITH CHECK (auth.uid()::text = "ownerId");

-- Conversation table
CREATE POLICY "Authenticated users can view conversations" ON "public"."Conversation" FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create conversations" ON "public"."Conversation" FOR INSERT WITH CHECK (auth.uid()::text = "participantA" OR auth.uid()::text = "participantB");

-- Message table
CREATE POLICY "Authenticated users can view messages" ON "public"."Message" FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create messages" ON "public"."Message" FOR INSERT WITH CHECK (auth.uid()::text = "senderId");

-- ChatSessionLog table
CREATE POLICY "Authenticated users can view session logs" ON "public"."ChatSessionLog" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Authenticated users can create session logs" ON "public"."ChatSessionLog" FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- ChatAnalytics table
CREATE POLICY "Authenticated users can view analytics" ON "public"."ChatAnalytics" FOR SELECT USING (auth.uid()::text = "userId");

-- Media table
CREATE POLICY "Authenticated users can view media" ON "public"."Media" FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can upload media" ON "public"."Media" FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- Metric table
CREATE POLICY "Authenticated users can view metrics" ON "public"."Metric" FOR SELECT USING (auth.uid()::text = "userId" OR "userId" IS NULL);
CREATE POLICY "Authenticated users can create metrics" ON "public"."Metric" FOR INSERT WITH CHECK (auth.uid()::text = "userId" OR "userId" IS NULL);

-- HappinessScore table
CREATE POLICY "Authenticated users can view happiness scores" ON "public"."HappinessScore" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Authenticated users can create happiness scores" ON "public"."HappinessScore" FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- ConflictDrill table
CREATE POLICY "Authenticated users can view conflict drills" ON "public"."ConflictDrill" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Authenticated users can create conflict drills" ON "public"."ConflictDrill" FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- BondBlueprint table
CREATE POLICY "Authenticated users can view bond blueprints" ON "public"."BondBlueprint" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Authenticated users can create bond blueprints" ON "public"."BondBlueprint" FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- SerendipityLog table
CREATE POLICY "Authenticated users can view serendipity logs" ON "public"."SerendipityLog" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Authenticated users can create serendipity logs" ON "public"."SerendipityLog" FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- UserValue table
CREATE POLICY "Authenticated users can view values" ON "public"."UserValue" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Authenticated users can manage values" ON "public"."UserValue" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Authenticated users can update values" ON "public"."UserValue" FOR UPDATE USING (auth.uid()::text = "userId");

-- Reminder table
CREATE POLICY "Authenticated users can view reminders" ON "public"."Reminder" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Authenticated users can create reminders" ON "public"."Reminder" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Authenticated users can update reminders" ON "public"."Reminder" FOR UPDATE USING (auth.uid()::text = "userId");

-- Public/shared reference tables
CREATE POLICY "Anyone can view values" ON "public"."Value" FOR SELECT USING (true);
CREATE POLICY "Anyone can view templates" ON "public"."JournalTemplate" FOR SELECT USING (true);
CREATE POLICY "Anyone can view organizations" ON "public"."Organization" FOR SELECT USING (true);
CREATE POLICY "Anyone can view brands" ON "public"."Brand" FOR SELECT USING (true);
CREATE POLICY "Allow inserts on Brand" ON "public"."Brand" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view products" ON "public"."Product" FOR SELECT USING (true);
CREATE POLICY "Anyone can view deals" ON "public"."Deal" FOR SELECT USING (true);
CREATE POLICY "Anyone can view tags" ON "public"."Tag" FOR SELECT USING (true);

-- Commerce tables
CREATE POLICY "Users can view their own orders" ON "public"."Order" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Anyone can view order items" ON "public"."OrderItem" FOR SELECT USING (true);
CREATE POLICY "Users can view their own returns" ON "public"."OrderReturn" FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view their own payments" ON "public"."Payment" FOR SELECT USING (auth.uid()::text = "userId");

-- NextAuth tables
CREATE POLICY "Authenticated users can view accounts" ON "public"."Account" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Authenticated users can view sessions" ON "public"."Session" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Allow verification tokens" ON "public"."VerificationToken" FOR SELECT USING (true);

-- Allow open access on collaborative/reference tables
CREATE POLICY "Allow all on GroupMember" ON "public"."GroupMember" FOR SELECT USING (true);
CREATE POLICY "Allow inserts on GroupMember" ON "public"."GroupMember" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all on TaskAssignee" ON "public"."TaskAssignee" FOR SELECT USING (true);
CREATE POLICY "Allow inserts on TaskAssignee" ON "public"."TaskAssignee" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all on TaskComment" ON "public"."TaskComment" FOR SELECT USING (true);
CREATE POLICY "Users can create task comments" ON "public"."TaskComment" FOR INSERT WITH CHECK (auth.uid()::text = "authorId");
CREATE POLICY "Allow all on TaskChecklistItem" ON "public"."TaskChecklistItem" FOR SELECT USING (true);
CREATE POLICY "Allow inserts on TaskChecklistItem" ON "public"."TaskChecklistItem" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all on TaskTag" ON "public"."TaskTag" FOR SELECT USING (true);
CREATE POLICY "Allow inserts on TaskTag" ON "public"."TaskTag" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all on TaskVolunteer" ON "public"."TaskVolunteer" FOR SELECT USING (true);
CREATE POLICY "Allow inserts on TaskVolunteer" ON "public"."TaskVolunteer" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all on OrgMember" ON "public"."OrgMember" FOR SELECT USING (true);
CREATE POLICY "Allow all on FeatureSession" ON "public"."FeatureSession" FOR SELECT USING (true);
CREATE POLICY "Allow all on FeatureSessionParticipant" ON "public"."FeatureSessionParticipant" FOR SELECT USING (true);
CREATE POLICY "Allow all on ProductReview" ON "public"."ProductReview" FOR SELECT USING (true);
CREATE POLICY "Allow inserts on ProductReview" ON "public"."ProductReview" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all on BrandReview" ON "public"."BrandReview" FOR SELECT USING (true);
CREATE POLICY "Allow inserts on BrandReview" ON "public"."BrandReview" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all on ProductAnalytics" ON "public"."ProductAnalytics" FOR SELECT USING (true);
CREATE POLICY "Allow all on BrandAnalytics" ON "public"."BrandAnalytics" FOR SELECT USING (true);
CREATE POLICY "Allow inserts on WebhookLog" ON "public"."WebhookLog" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all on WaypointPhoto" ON "public"."WaypointPhoto" FOR SELECT USING (true);
CREATE POLICY "Allow all on PlaceReview" ON "public"."PlaceReview" FOR SELECT USING (true);
CREATE POLICY "Allow all on PlacePhoto" ON "public"."PlacePhoto" FOR SELECT USING (true);
CREATE POLICY "Allow all on PlacePhotoShare" ON "public"."PlacePhotoShare" FOR SELECT USING (true);
CREATE POLICY "Allow all on PhotoShare" ON "public"."PhotoShare" FOR SELECT USING (true);
CREATE POLICY "Allow all on RouteWaypoint" ON "public"."RouteWaypoint" FOR SELECT USING (true);
CREATE POLICY "Allow all on Friendship" ON "public"."Friendship" FOR SELECT USING (true);
CREATE POLICY "Allow inserts on Friendship" ON "public"."Friendship" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all on Invite" ON "public"."Invite" FOR SELECT USING (true);
CREATE POLICY "Allow inserts on Invite" ON "public"."Invite" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all on PasskeyCredential" ON "public"."PasskeyCredential" FOR SELECT USING (true);
CREATE POLICY "Allow inserts on PasskeyCredential" ON "public"."PasskeyCredential" FOR INSERT WITH CHECK (true);
