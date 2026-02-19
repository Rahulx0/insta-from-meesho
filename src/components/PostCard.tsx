import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Bookmark, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: {
    id: string;
    image_url: string;
    caption: string | null;
    created_at: string;
    user_id: string;
    profiles: {
      username: string;
      avatar_url: string | null;
      full_name: string | null;
    };
  };
}

export const PostCard = ({ post }: PostCardProps) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLikes();
    fetchCommentCount();
  }, [post.id, user]);

  const fetchLikes = async () => {
    const { data, count } = await supabase
      .from('likes')
      .select('*', { count: 'exact' })
      .eq('post_id', post.id);
    
    setLikeCount(count || 0);
    if (user && data) {
      setLiked(data.some((l) => l.user_id === user.id));
    }
  };

  const fetchCommentCount = async () => {
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact' })
      .eq('post_id', post.id);
    setCommentCount(count || 0);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    setComments(data || []);
  };

  const toggleLike = async () => {
    if (!user) return;
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
      setLiked(false);
      setLikeCount((c) => c - 1);
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  };

  const handleCommentToggle = () => {
    setShowComments(!showComments);
    if (!showComments) fetchComments();
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setSubmitting(true);
    await supabase.from('comments').insert({
      post_id: post.id,
      user_id: user.id,
      content: newComment.trim(),
    });
    setNewComment('');
    setCommentCount((c) => c + 1);
    fetchComments();
    setSubmitting(false);
  };

  const avatarUrl = post.profiles?.avatar_url;
  const username = post.profiles?.username || 'user';

  return (
    <article className="border-b border-border pb-0 mb-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-0 py-3">
        <Link to={`/profile/${post.user_id}`}>
          <div className="story-ring">
            <div className="story-ring-inner">
              <div className="w-9 h-9 rounded-full bg-muted overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                    {username[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
        <div className="flex-1">
          <Link to={`/profile/${post.user_id}`} className="font-semibold text-sm hover:opacity-70">
            {username}
          </Link>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </span>
      </div>

      {/* Image */}
      <div className="w-full aspect-square bg-muted overflow-hidden">
        <img
          src={post.image_url}
          alt={post.caption || 'Post'}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Actions */}
      <div className="py-3">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={toggleLike} className="transition-transform active:scale-90">
            <Heart
              size={24}
              strokeWidth={1.5}
              className={liked ? 'fill-red-500 stroke-red-500' : 'hover:text-muted-foreground'}
            />
          </button>
          <button onClick={handleCommentToggle}>
            <MessageCircle size={24} strokeWidth={1.5} className="hover:text-muted-foreground" />
          </button>
          <Send size={24} strokeWidth={1.5} className="hover:text-muted-foreground" />
          <Bookmark size={24} strokeWidth={1.5} className="ml-auto hover:text-muted-foreground" />
        </div>

        {/* Likes count */}
        {likeCount > 0 && (
          <p className="text-sm font-semibold mb-1">
            {likeCount} {likeCount === 1 ? 'like' : 'likes'}
          </p>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="text-sm">
            <Link to={`/profile/${post.user_id}`} className="font-semibold hover:opacity-70">
              {username}
            </Link>{' '}
            {post.caption}
          </p>
        )}

        {/* Comments toggle */}
        {commentCount > 0 && !showComments && (
          <button onClick={handleCommentToggle} className="text-sm text-muted-foreground mt-1">
            View all {commentCount} comments
          </button>
        )}

        {/* Comments list */}
        {showComments && (
          <div className="mt-2 space-y-1">
            {comments.map((c) => (
              <p key={c.id} className="text-sm">
                <span className="font-semibold">{c.profiles?.username}</span>{' '}
                {c.content}
              </p>
            ))}
          </div>
        )}

        {/* Add comment */}
        {user && (
          <form onSubmit={submitComment} className="flex items-center gap-2 mt-3 border-t pt-3">
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-muted-foreground"
            />
            {newComment.trim() && (
              <button
                type="submit"
                disabled={submitting}
                className="text-sm font-semibold text-blue-500 hover:text-blue-700"
              >
                Post
              </button>
            )}
          </form>
        )}
      </div>
    </article>
  );
};
