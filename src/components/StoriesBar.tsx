import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Story {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  user_id: string;
}

interface StoryGroup {
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  stories: Story[];
  hasUnviewed: boolean;
}

export const StoriesBar = () => {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) fetchStories();
  }, [user]);

  useEffect(() => {
    if (!viewingGroup) {
      if (progressInterval.current) clearInterval(progressInterval.current);
      return;
    }
    setProgress(0);
    progressInterval.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + 2;
      });
    }, 100);
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [viewingGroup?.user.id, storyIndex]);

  const fetchStories = async () => {
    if (!user) return;

    // Get following list + self
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = followingData?.map((f) => f.following_id) || [];
    const allIds = [...followingIds, user.id];

    const { data: stories } = await supabase
      .from('stories')
      .select('*, profiles(id, username, avatar_url)')
      .in('user_id', allIds)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (!stories) return;

    // Get viewed story ids
    const { data: viewedData } = await supabase
      .from('story_views')
      .select('story_id')
      .eq('viewer_id', user.id);
    const viewedIds = new Set(viewedData?.map((v) => v.story_id) || []);

    // Group by user
    const groupMap: Record<string, StoryGroup> = {};
    stories.forEach((s: any) => {
      const uid = s.user_id;
      if (!groupMap[uid]) {
        groupMap[uid] = { user: s.profiles, stories: [], hasUnviewed: false };
      }
      groupMap[uid].stories.push(s);
      if (!viewedIds.has(s.id)) groupMap[uid].hasUnviewed = true;
    });

    // Self first, then by hasUnviewed
    const groups = Object.values(groupMap).sort((a, b) => {
      if (a.user.id === user.id) return -1;
      if (b.user.id === user.id) return 1;
      return Number(b.hasUnviewed) - Number(a.hasUnviewed);
    });

    setStoryGroups(groups);
  };

  const openGroup = (group: StoryGroup) => {
    setViewingGroup(group);
    setStoryIndex(0);
  };

  const goNext = () => {
    if (!viewingGroup) return;
    if (storyIndex < viewingGroup.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else {
      // Move to next group
      const idx = storyGroups.findIndex((g) => g.user.id === viewingGroup.user.id);
      if (idx < storyGroups.length - 1) {
        setViewingGroup(storyGroups[idx + 1]);
        setStoryIndex(0);
      } else {
        setViewingGroup(null);
      }
    }
  };

  const goPrev = () => {
    if (!viewingGroup) return;
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else {
      const idx = storyGroups.findIndex((g) => g.user.id === viewingGroup.user.id);
      if (idx > 0) {
        setViewingGroup(storyGroups[idx - 1]);
        setStoryIndex(0);
      }
    }
  };

  const recordView = async (storyId: string) => {
    if (!user) return;
    await supabase.from('story_views').upsert({ story_id: storyId, viewer_id: user.id }, { onConflict: 'story_id,viewer_id' });
  };

  useEffect(() => {
    if (viewingGroup) {
      const story = viewingGroup.stories[storyIndex];
      if (story) recordView(story.id);
    }
  }, [viewingGroup?.user.id, storyIndex]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('stories').getPublicUrl(filePath);

      await supabase.from('stories').insert({
        user_id: user.id,
        image_url: publicUrl,
      });

      setShowCreate(false);
      await fetchStories();
    } catch (err: any) {
      console.error('Story upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const Avatar = ({ url, name, size = 14 }: { url: string | null; name: string; size?: number }) => (
    <div className={`w-${size} h-${size} rounded-full bg-muted overflow-hidden`}>
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
          {name[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );

  const currentStory = viewingGroup?.stories[storyIndex];

  return (
    <>
      {/* Stories scroll bar */}
      <div className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-border">
        {/* Add story button */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="relative w-14 h-14 rounded-full bg-muted border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
            <Plus size={20} className="text-muted-foreground" />
          </div>
          <span className="text-[10px] text-muted-foreground w-14 text-center truncate">
            {uploading ? 'Adding...' : 'Add story'}
          </span>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

        {/* Story groups */}
        {storyGroups.map((group) => (
          <div
            key={group.user.id}
            className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
            onClick={() => openGroup(group)}
          >
            <div className={`p-[2px] rounded-full ${group.hasUnviewed ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600' : 'bg-muted'}`}>
              <div className="p-[2px] bg-background rounded-full">
                <Avatar url={group.user.avatar_url} name={group.user.username} size={14} />
              </div>
            </div>
            <span className="text-[10px] text-foreground w-14 text-center truncate">
              {group.user.id === user?.id ? 'Your story' : group.user.username}
            </span>
          </div>
        ))}
      </div>

      {/* Full-screen story viewer */}
      {viewingGroup && currentStory && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={goNext}>
          {/* Progress bars */}
          <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
            {viewingGroup.stories.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-none"
                  style={{ width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%' }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-8 left-4 right-4 flex items-center gap-3 z-10">
            <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
              {viewingGroup.user.avatar_url ? (
                <img src={viewingGroup.user.avatar_url} alt={viewingGroup.user.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-foreground">
                  {viewingGroup.user.username[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-white font-semibold text-sm">{viewingGroup.user.username}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setViewingGroup(null); }}
              className="ml-auto text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Story image */}
          <img
            src={currentStory.image_url}
            alt="story"
            className="max-h-full max-w-full object-contain"
          />

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-8 left-4 right-4 text-center">
              <p className="text-white text-sm bg-black/40 rounded-lg px-3 py-2 inline-block">{currentStory.caption}</p>
            </div>
          )}

          {/* Prev / Next tap areas */}
          <button
            className="absolute left-0 top-0 h-full w-1/3 flex items-center justify-start pl-3 z-10"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
          >
            <ChevronLeft className="text-white opacity-70" size={28} />
          </button>
          <button
            className="absolute right-0 top-0 h-full w-1/3 flex items-center justify-end pr-3 z-10"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
          >
            <ChevronRight className="text-white opacity-70" size={28} />
          </button>
        </div>
      )}
    </>
  );
};
