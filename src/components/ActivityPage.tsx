import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'like' | 'comment';
  created_at: string;
  actor: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  post: {
    id: string;
    image_url: string;
  };
  comment_content?: string;
}

export const ActivityPage = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchActivity();
  }, [user]);

  const fetchActivity = async () => {
    // Fetch likes on user's posts
    const { data: likesData } = await supabase
      .from('likes')
      .select('id, created_at, user_id, post_id, posts(id, image_url)')
      .in(
        'post_id',
        (
          await supabase
            .from('posts')
            .select('id')
            .eq('user_id', user!.id)
        ).data?.map((p) => p.id) || []
      )
      .neq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(30);

    // Fetch comments on user's posts
    const { data: commentsData } = await supabase
      .from('comments')
      .select('id, created_at, user_id, post_id, content, posts(id, image_url)')
      .in(
        'post_id',
        (
          await supabase
            .from('posts')
            .select('id')
            .eq('user_id', user!.id)
        ).data?.map((p) => p.id) || []
      )
      .neq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(30);

    // Get all unique actor user ids
    const actorIds = [
      ...new Set([
        ...(likesData?.map((l) => l.user_id) || []),
        ...(commentsData?.map((c) => c.user_id) || []),
      ]),
    ];

    let profilesMap: Record<string, { id: string; username: string; avatar_url: string | null }> = {};
    if (actorIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', actorIds);
      profilesMap = Object.fromEntries((profilesData || []).map((p) => [p.id, p]));
    }

    const likeActivities: Activity[] = (likesData || [])
      .filter((l) => l.posts && profilesMap[l.user_id])
      .map((l) => ({
        id: `like-${l.id}`,
        type: 'like',
        created_at: l.created_at,
        actor: profilesMap[l.user_id],
        post: l.posts as any,
      }));

    const commentActivities: Activity[] = (commentsData || [])
      .filter((c) => c.posts && profilesMap[c.user_id])
      .map((c) => ({
        id: `comment-${c.id}`,
        type: 'comment',
        created_at: c.created_at,
        actor: profilesMap[c.user_id],
        post: c.posts as any,
        comment_content: c.content,
      }));

    const merged = [...likeActivities, ...commentActivities].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setActivities(merged);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h2 className="font-semibold text-base mb-4">Activity</h2>

      {activities.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Heart size={48} className="mx-auto mb-3 opacity-30" strokeWidth={1} />
          <p className="font-semibold">No activity yet</p>
          <p className="text-sm mt-1">When people like or comment on your posts, you'll see it here.</p>
        </div>
      ) : (
        <div className="space-y-0 divide-y divide-border">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center gap-3 py-3">
              {/* Avatar */}
              <Link to={`/profile/${activity.actor.id}`} className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                  {activity.actor.avatar_url ? (
                    <img
                      src={activity.actor.avatar_url}
                      alt={activity.actor.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                      {activity.actor.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <Link to={`/profile/${activity.actor.id}`} className="font-semibold hover:opacity-70">
                    {activity.actor.username}
                  </Link>{' '}
                  {activity.type === 'like' ? (
                    'liked your photo.'
                  ) : (
                    <>
                      commented: <span className="text-muted-foreground">{activity.comment_content}</span>
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>

              {/* Icon + post thumbnail */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {activity.type === 'like' ? (
                  <Heart size={14} className="fill-red-500 stroke-red-500" />
                ) : (
                  <MessageCircle size={14} className="text-muted-foreground" />
                )}
                <div className="w-10 h-10 bg-muted overflow-hidden">
                  <img
                    src={activity.post.image_url}
                    alt="post"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
