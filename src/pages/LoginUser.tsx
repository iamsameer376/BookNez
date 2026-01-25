import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { PasswordInput } from '@/components/ui/password-input';
import { usePushSubscription } from '@/hooks/usePushSubscription';

const LoginUser = () => {
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRoles, setActiveRole } = useAuth();
  const { subscribe } = usePushSubscription();

  useEffect(() => {
    // If logged in and has user role, go to dashboard
    if (user && userRoles.includes('user')) {
      navigate('/dashboard/user');
    }
  }, [user, userRoles, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isEmail = phoneOrEmail.includes('@');
      let loginEmail = phoneOrEmail;

      if (!isEmail) {
        // Use RPC function to bypass RLS and find email
        const { data: email, error: rpcError } = await (supabase.rpc as any)('get_email_by_phone', { phone_number: phoneOrEmail });

        if (rpcError || !email) {
          throw new Error('No account found with this phone number. Please register first.');
        }

        loginEmail = email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) throw error;

      // Immediate Ban Check
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_banned')
        .eq('id', data.user.id)
        .single();

      if (profileData?.is_banned) {
        await supabase.auth.signOut();
        throw new Error("You are banned from using this platform due to guideline violations.");
      }

      // Check roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id);

      if (rolesError) throw rolesError;

      const roles = rolesData?.map(r => r.role) || [];

      if (!roles.includes('user')) {
        // If user is Owner but missing 'user' role, add it automatically
        // This satisfies "Use same phone number for both"
        if (roles.includes('owner')) {
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({ user_id: data.user.id, role: 'user' });

          if (insertError) throw insertError;
        } else {
          // No roles at all?
          await supabase.from('user_roles').insert({ user_id: data.user.id, role: 'user' });
        }
      }

      toast({
        title: "Login successful!",
        description: "Welcome back to BookNex",
        duration: 1000,
      });

      setActiveRole('user');

      // Auto-subscribe to push notifications
      await subscribe(data.user.id);

      navigate('/dashboard/user');
    } catch (error) {
      console.error("Login error:", error);
      const message = error instanceof Error ? error.message : "Invalid credentials";
      toast({
        title: "Login failed",
        description: message,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 space-y-6 border-2 border-primary/10 shadow-xl bg-card/80 backdrop-blur-sm">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>

          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">BookNex</h1>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-xs font-bold text-primary tracking-widest uppercase shadow-sm">
                Beta
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-foreground">User Login</h2>
            <p className="text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneOrEmail">Phone Number or Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="phoneOrEmail"
                  type="text"
                  placeholder="Phone number or email"
                  value={phoneOrEmail}
                  onChange={(e) => setPhoneOrEmail(e.target.value)}
                  className="pl-10 h-12 text-lg transition-all focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>

              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground z-10" />
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 text-lg transition-all focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  required
                />
              </div>
            </div>

            <Link to="/forgot-password" className="text-sm text-primary hover:underline block text-right font-medium">
              Forgot Password?
            </Link>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button type="submit" className="w-full h-12 text-lg bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity" size="lg" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </motion.div>


          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/register/user" className="text-primary hover:underline font-bold">
              Sign up
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginUser;
