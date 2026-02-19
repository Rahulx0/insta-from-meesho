import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

interface EditProfileModalProps {
  profile: {
    username: string;
    full_name: string | null;
    bio: string | null;
    website: string | null;
    avatar_url: string | null;
  };
  onClose: () => void;
  onSaved: () => void;
}

export const EditProfileModal = ({ profile, onClose, onSaved }: EditProfileModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState(profile.username);
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `${user.id}/avatar.${ext}`;
        await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = publicUrl;
      }

      const { error } = await supabase.from('profiles').update({
        username,
        full_name: fullName,
        bio,
        website,
        avatar_url: avatarUrl,
      }).eq('id', user.id);

      if (error) throw error;
      toast({ title: 'Profile updated!' });
      onSaved();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <button onClick={onClose}><X size={20} /></button>
          <h2 className="font-semibold">Edit profile</h2>
          <button form="edit-profile-form" type="submit" className="text-blue-500 font-semibold text-sm" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>

        <form id="edit-profile-form" onSubmit={handleSave} className="p-4 space-y-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-muted overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-semibold text-muted-foreground">
                  {username[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <label className="text-sm font-semibold text-blue-500 cursor-pointer">
              Change photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground font-semibold">USERNAME</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-semibold">NAME</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-semibold">BIO</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full border rounded-md px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-ring bg-background"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-semibold">WEBSITE</label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
