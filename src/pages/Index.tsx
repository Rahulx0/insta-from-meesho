import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPage } from '@/components/AuthPage';
import { Sidebar } from '@/components/Sidebar';
import { FeedPage } from '@/components/FeedPage';
import { ExplorePage } from '@/components/ExplorePage';
import { CreatePost } from '@/components/CreatePost';
import { ProfilePage } from '@/components/ProfilePage';
import { ActivityPage } from '@/components/ActivityPage';
import { MessagesPage } from '@/components/MessagesPage';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:ml-64 pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/messages" element={<MessagesPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default Index;
