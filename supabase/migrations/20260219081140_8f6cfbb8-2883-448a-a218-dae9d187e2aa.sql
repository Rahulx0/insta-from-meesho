
-- Fix conversations policies to use the security definer function
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;

-- Recreate conversations policies using the security definer function
CREATE POLICY "Participants can view conversations"
ON public.conversations
FOR SELECT
USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Participants can update conversations"
ON public.conversations
FOR UPDATE
USING (public.is_conversation_participant(id, auth.uid()));

-- Recreate messages policies using the security definer function
CREATE POLICY "Participants can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_conversation_participant(conversation_id, auth.uid())
);

CREATE POLICY "Participants can view messages"
ON public.messages
FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));
