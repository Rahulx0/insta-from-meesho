import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Grid3X3, Settings, MessageCircle } from 'lucide-react';
import { EditProfileModal } from './EditProfileModal';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchPosts();
      fetchFollowData();
    }
  }, [userId, user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
    setLoading(false);
  };

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setPosts(data || []);
  };

  const fetchFollowData = async () => {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact' }).eq('following_id', userId),
      supabase.from('follows').select('*', { count: 'exact' }).eq('follower_id', userId),
    ]);
    setFollowerCount(followers || 0);
    setFollowingCount(following || 0);

    if (user && userId !== user.id) {
      const { data } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();
      setIsFollowing(!!data);
    }
  };

  const toggleFollow = async () => {
    if (!user) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId);
      setIsFollowing(false);
      setFollowerCount((c) => c - 1);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: userId });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return <div className="text-center py-20 text-muted-foreground">User not found</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="flex items-start gap-8 md:gap-16 mb-8">
        {/* Avatar */}
        <div className="story-ring flex-shrink-0">
          <div className="story-ring-inner">
            <div className="w-20 h-20 md:w-36 md:h-36 rounded-full bg-muted overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-muted-foreground">
                  {profile.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <h2 className="text-xl font-light">{profile.username}</h2>
            {isOwnProfile ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  Edit profile
                </Button>
                <Button variant="outline" size="sm" className="px-2">
                  <Settings size={16} />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={isFollowing ? 'outline' : 'default'}
                  onClick={toggleFollow}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/messages')}
                >
                  <MessageCircle size={15} className="mr-1" />
                  Message
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-6 mb-4 text-sm">
            <span><strong>{posts.length}</strong> posts</span>
            <span><strong>{followerCount}</strong> followers</span>
            <span><strong>{followingCount}</strong> following</span>
          </div>

          {profile.full_name && (
            <p className="font-semibold text-sm">{profile.full_name}</p>
          )}
          {profile.bio && (
            <p className="text-sm whitespace-pre-wrap">{profile.bio}</p>
          )}
          {profile.website && (
            <a href={profile.website} className="text-sm font-semibold text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              {profile.website}
            </a>
          )}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="border-t">
        <div className="flex justify-center py-3 text-xs font-semibold gap-1 text-muted-foreground mb-4">
          <Grid3X3 size={12} />
          <span>POSTS</span>
        </div>
        {posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-semibold">No Posts Yet</p>
            <p className="text-sm">Start sharing your moments</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map((post) => (
              <div key={post.id} className="aspect-square overflow-hidden cursor-pointer group relative">
                <img
                  src={post.image_url}
                  alt={post.caption || ''}
                  className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {editOpen && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSaved={() => { fetchProfile(); setEditOpen(false); }}
        />
      )}
    </div>
  );
};
