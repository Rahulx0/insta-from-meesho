import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ExplorePage = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (search.trim()) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [search]);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    setPosts(data || []);
    setLoading(false);
  };

  const searchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${search}%`)
      .limit(10);
    setSearchResults(data || []);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Search bar */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-muted rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="bg-background border rounded-lg shadow-lg mb-4 overflow-hidden">
          {searchResults.map((u) => (
            <Link
              key={u.id}
              to={`/profile/${u.id}`}
              onClick={() => setSearch('')}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                    {u.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-sm">{u.username}</p>
                {u.full_name && <p className="text-xs text-muted-foreground">{u.full_name}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Posts grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {posts.map((post) => (
            <div key={post.id} className="aspect-square overflow-hidden cursor-pointer group">
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
  );
};
