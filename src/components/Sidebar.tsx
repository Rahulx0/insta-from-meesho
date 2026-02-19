import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, PlusSquare, Heart, User, LogOut, Compass, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Search, label: 'Search', href: '/explore' },
  { icon: Compass, label: 'Explore', href: '/explore' },
  { icon: MessageCircle, label: 'Messages', href: '/messages' },
  { icon: PlusSquare, label: 'Create', href: '/create' },
  { icon: Heart, label: 'Activity', href: '/activity' },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 border-r bg-background z-40 px-3 py-6">
        {/* Logo */}
        <div className="px-3 mb-8">
          <h1 className="text-xl font-bold tracking-tighter" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
            Instragram
          </h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {navItems.map(({ icon: Icon, label, href }) => (
            <Link
              key={label}
              to={href}
              className={cn(
                'flex items-center gap-4 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-accent',
                location.pathname === href ? 'font-bold' : 'text-foreground'
              )}
            >
              <Icon size={24} strokeWidth={location.pathname === href ? 2.5 : 1.5} />
              <span>{label}</span>
            </Link>
          ))}
          <Link
            to={`/profile/${user?.id}`}
            className={cn(
              'flex items-center gap-4 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-accent',
              location.pathname.startsWith('/profile') ? 'font-bold' : 'text-foreground'
            )}
          >
            <User size={24} strokeWidth={location.pathname.startsWith('/profile') ? 2.5 : 1.5} />
            <span>Profile</span>
          </Link>
        </nav>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-4 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-accent text-foreground mt-auto"
        >
          <LogOut size={24} strokeWidth={1.5} />
          <span>Log out</span>
        </button>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-40 flex justify-around items-center py-2 safe-area-bottom">
        <Link
          to="/"
          className={cn('flex flex-col items-center p-2', location.pathname === '/' ? 'text-foreground' : 'text-muted-foreground')}
        >
          <Home size={24} strokeWidth={location.pathname === '/' ? 2.5 : 1.5} />
        </Link>
        <Link
          to="/explore"
          className={cn('flex flex-col items-center p-2', location.pathname === '/explore' ? 'text-foreground' : 'text-muted-foreground')}
        >
          <Search size={24} strokeWidth={location.pathname === '/explore' ? 2.5 : 1.5} />
        </Link>
        <Link
          to="/create"
          className={cn('flex flex-col items-center p-2', location.pathname === '/create' ? 'text-foreground' : 'text-muted-foreground')}
        >
          <PlusSquare size={24} strokeWidth={location.pathname === '/create' ? 2.5 : 1.5} />
        </Link>
        <Link
          to="/messages"
          className={cn('flex flex-col items-center p-2', location.pathname === '/messages' ? 'text-foreground' : 'text-muted-foreground')}
        >
          <MessageCircle size={24} strokeWidth={location.pathname === '/messages' ? 2.5 : 1.5} />
        </Link>
        <Link
          to="/activity"
          className={cn('flex flex-col items-center p-2', location.pathname === '/activity' ? 'text-foreground' : 'text-muted-foreground')}
        >
          <Heart size={24} strokeWidth={location.pathname === '/activity' ? 2.5 : 1.5} />
        </Link>
        <Link
          to={`/profile/${user?.id}`}
          className={cn('flex flex-col items-center p-2', location.pathname.startsWith('/profile') ? 'text-foreground' : 'text-muted-foreground')}
        >
          <User size={24} strokeWidth={location.pathname.startsWith('/profile') ? 2.5 : 1.5} />
        </Link>
      </nav>
    </>
  );
};
