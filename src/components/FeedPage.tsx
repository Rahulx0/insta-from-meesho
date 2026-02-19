import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from '@/components/PostCard';
import { StoriesBar } from '@/components/StoriesBar';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

export const FeedPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchFeed();
    fetchProfile();
    fetchSuggestions();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data);
  };

  const fetchFeed = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url, full_name)')
      .order('created_at', { ascending: false })
      .limit(20);
    setPosts(data || []);
    setLoading(false);
  };

  const fetchSuggestions = async () => {
    if (!user) return;
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = followingData?.map((f) => f.following_id) || [];
    const excludeIds = [...followingIds, user.id];

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .limit(5);

    setSuggestions(data || []);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex gap-8 max-w-5xl mx-auto px-4 py-6">
      {/* Feed */}
      <div className="flex-1 max-w-[470px]">
        <StoriesBar />
        {posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-semibold mb-1">No posts yet</p>
            <p className="text-sm">Follow people to see their posts here</p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-border">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="hidden lg:block w-72 flex-shrink-0">
        {/* Current user */}
        {profile && (
          <div className="flex items-center gap-3 mb-5">
            <Link to={`/profile/${user?.id}`}>
              <div className="w-11 h-11 rounded-full bg-muted overflow-hidden story-ring">
                <div className="story-ring-inner">
                  <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                        {profile.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
            <div className="flex-1">
              <Link to={`/profile/${user?.id}`} className="font-semibold text-sm">{profile.username}</Link>
              <p className="text-xs text-muted-foreground">{profile.full_name}</p>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <div className="flex justify-between mb-4">
              <p className="text-xs font-semibold text-muted-foreground">Suggested for you</p>
            </div>
            <div className="space-y-3">
              {suggestions.map((s) => (
                <SuggestionRow key={s.id} suggestion={s} onFollowed={fetchSuggestions} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SuggestionRow = ({ suggestion, onFollowed }: { suggestion: any; onFollowed: () => void }) => {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);

  const follow = async () => {
    if (!user) return;
    await supabase.from('follows').insert({ follower_id: user.id, following_id: suggestion.id });
    setFollowing(true);
    onFollowed();
  };

  return (
    <div className="flex items-center gap-3">
      <Link to={`/profile/${suggestion.id}`}>
        <div className="w-9 h-9 rounded-full bg-muted overflow-hidden">
          {suggestion.avatar_url ? (
            <img src={suggestion.avatar_url} alt={suggestion.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
              {suggestion.username?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/profile/${suggestion.id}`} className="font-semibold text-xs truncate block">{suggestion.username}</Link>
        <p className="text-xs text-muted-foreground truncate">Suggested for you</p>
      </div>
      {!following ? (
        <button onClick={follow} className="text-xs font-semibold text-primary hover:opacity-70 flex-shrink-0">
          Follow
        </button>
      ) : (
        <span className="text-xs text-muted-foreground flex-shrink-0">Following</span>
      )}
    </div>
  );
};
