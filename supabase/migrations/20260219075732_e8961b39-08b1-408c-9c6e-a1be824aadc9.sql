
-- Create stories table
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Story views tracking
CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- Stories: everyone can see non-expired stories
CREATE POLICY "Active stories are viewable by everyone"
  ON public.stories FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Authenticated users can create stories"
  ON public.stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON public.stories FOR DELETE
  USING (auth.uid() = user_id);

-- Story views
CREATE POLICY "Participants can view story views"
  ON public.story_views FOR SELECT
  USING (auth.uid() = viewer_id OR EXISTS (
    SELECT 1 FROM public.stories WHERE id = story_views.story_id AND user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can record views"
  ON public.story_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- Add stories storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for stories bucket
CREATE POLICY "Stories are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stories');

CREATE POLICY "Users can upload their own stories"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own stories"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);
