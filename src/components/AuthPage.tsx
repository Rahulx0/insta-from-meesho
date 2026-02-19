import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username, full_name: fullName },
          },
        });
        if (error) throw error;
        toast({
          title: 'Check your email!',
          description: 'We sent you a confirmation link.',
        });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tighter mb-1" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
            Instragram
          </h1>
          <p className="text-muted-foreground text-sm">Share your world</p>
        </div>

        {/* Form Card */}
        <div className="border rounded-sm p-8 mb-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <>
                <div>
                  <Input
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="bg-secondary border-border text-sm"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    required={!isLogin}
                    className="bg-secondary border-border text-sm"
                  />
                </div>
              </>
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-secondary border-border text-sm"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-secondary border-border text-sm"
            />
            <Button
              type="submit"
              className="w-full font-semibold text-sm"
              disabled={loading}
            >
              {loading ? 'Please wait...' : isLogin ? 'Log in' : 'Sign up'}
            </Button>
          </form>

          {isLogin && (
            <div className="mt-4 text-center">
              <span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Forgot password?
              </span>
            </div>
          )}
        </div>

        {/* Switch mode */}
        <div className="border rounded-sm p-4 text-center text-sm">
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => setIsLogin(false)}
                className="font-semibold text-primary hover:opacity-70"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Have an account?{' '}
              <button
                onClick={() => setIsLogin(true)}
                className="font-semibold text-primary hover:opacity-70"
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
