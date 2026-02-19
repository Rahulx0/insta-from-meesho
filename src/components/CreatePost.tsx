import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Image, X } from 'lucide-react';

export const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !user) return;
    setLoading(true);

    try {
      const fileExt = image.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, image, {
          cacheControl: '3600',
          upsert: false,
          contentType: image.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      const { error: postError } = await supabase.from('posts').insert({
        user_id: user.id,
        image_url: publicUrl,
        caption: caption.trim() || null,
      });

      if (postError) throw postError;

      toast({ title: 'Post shared!' });
      navigate('/');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Error uploading', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="border rounded-sm overflow-hidden">
        <div className="border-b px-4 py-3 text-center">
          <h2 className="font-semibold">Create new post</h2>
        </div>

        {!preview ? (
          <div
            className="flex flex-col items-center justify-center h-80 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={48} className="text-muted-foreground mb-4" strokeWidth={1} />
            <p className="text-xl font-light text-foreground mb-2">Drag photos and videos here</p>
            <p className="text-sm text-muted-foreground mb-4">Share your moments</p>
            <Button size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
              Select from computer
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full aspect-square object-cover" />
              <button
                type="button"
                onClick={() => { setImage(null); setPreview(null); }}
                className="absolute top-2 right-2 bg-foreground text-background rounded-full p-1"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <textarea
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className="w-full text-sm outline-none resize-none placeholder:text-muted-foreground border-none bg-transparent"
              />
              <div className="border-t pt-3 mt-2">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Sharing...' : 'Share'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
