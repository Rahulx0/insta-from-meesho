
-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation participants
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations: viewable by participants
CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
  );

-- Conversation participants RLS
CREATE POLICY "Participants can view participants"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can join conversations"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Messages RLS
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Trigger to update conversation updated_at when message is sent
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();
