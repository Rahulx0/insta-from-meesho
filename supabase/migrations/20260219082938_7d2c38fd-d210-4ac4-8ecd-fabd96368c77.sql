
-- Create a security definer function to create a conversation with participants atomically
-- This bypasses the RLS chicken-and-egg problem (can't SELECT conv until participant, can't add participant until conv)
CREATE OR REPLACE FUNCTION public.create_conversation_with_participants(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id uuid;
  v_existing_conv_id uuid;
BEGIN
  -- Check if conversation already exists between the two users
  SELECT cp1.conversation_id INTO v_existing_conv_id
  FROM conversation_participants cp1
  INNER JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = auth.uid()
    AND cp2.user_id = other_user_id
  LIMIT 1;

  IF v_existing_conv_id IS NOT NULL THEN
    RETURN v_existing_conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations DEFAULT VALUES RETURNING id INTO v_conv_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES
    (v_conv_id, auth.uid()),
    (v_conv_id, other_user_id);

  RETURN v_conv_id;
END;
$$;
