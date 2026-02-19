
-- Drop the recursive RLS policy on conversation_participants
DROP POLICY IF EXISTS "Participants can view participants" ON public.conversation_participants;

-- Create a security definer function to check conversation membership
-- This avoids the infinite recursion by using a non-RLS-protected internal check
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  );
$$;

-- Recreate the policy using the security definer function (no recursion)
CREATE POLICY "Participants can view participants"
ON public.conversation_participants
FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));
