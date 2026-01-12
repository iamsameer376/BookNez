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

const LoginOwner = () => {
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRoles } = useAuth();

  useEffect(() => {
    if (user && userRoles.includes('owner')) {
      navigate('/dashboard/owner');
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

      // Check roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id);

      if (rolesError) {
        await supabase.auth.signOut();
        throw new Error('Error checking user role');
      }

      const roles = rolesData?.map(r => r.role) || [];

      if (!roles.includes('owner')) {
        await supabase.auth.signOut();
        throw new Error('Access denied. Owner privileges required.');
      }

      toast({
        title: "Login successful!",
        description: "Welcome back to BookNex",
        duration: 1000,
      });

      navigate('/dashboard/owner');
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
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">BookNex</h1>
            <h2 className="text-2xl font-semibold text-foreground">Owner Login</h2>
            <p className="text-muted-foreground">Sign in to manage your venue</p>
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
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
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
                {loading ? "Sign In" : "Sign In"}
              </Button>
            </motion.div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted-foreground/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground font-medium">Or continue with</span>
              </div>
            </div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-primary/20 text-primary hover:bg-primary/10 font-medium"
                onClick={async () => {
                  setPhoneOrEmail('owner@demo.com');
                  setPassword('demo1234');

                  const demoEmail = 'owner@demo.com';
                  const demoPassword = 'demo1234';

                  setLoading(true);
                  try {
                    const { data, error } = await supabase.auth.signInWithPassword({
                      email: demoEmail,
                      password: demoPassword,
                    });

                    if (error) {
                      if (error.message.includes("Invalid login credentials") || error.message.includes("Email not confirmed")) {
                        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                          email: demoEmail,
                          password: demoPassword,
                          options: { data: { full_name: 'Demo Owner' } }
                        });
                        if (signUpError) throw signUpError;
                        if (!signUpData.user) throw new Error("Failed to auto-create demo user");

                        await supabase.from('profiles').upsert({
                          id: signUpData.user.id,
                          full_name: 'Demo Owner',
                          phone: '9999999999',
                          email: demoEmail,
                          city: 'Demo City', state: 'Demo State', country: 'Demo Country',
                          security_question: 'Demo Question', security_answer: 'demo answer',
                          updated_at: new Date().toISOString()
                        });
                        await supabase.from('user_roles').insert({ user_id: signUpData.user.id, role: 'owner' });

                        const { error: retryError } = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPassword });
                        if (retryError) throw retryError;
                      } else { throw error; }
                    } else {
                      const { data: roleData, error: roleError } = await supabase
                        .from('user_roles')
                        .select('role')
                        .eq('user_id', data.user.id)
                        .maybeSingle();

                      if (roleError || !roleData || roleData.role !== 'owner') {
                        if (!roleData && data.user.email === demoEmail) {
                          await supabase.from('user_roles').insert({ user_id: data.user.id, role: 'owner' });
                        } else {
                          await supabase.auth.signOut();
                          throw new Error('Please use user login or role is missing');
                        }
                      }
                    }

                    toast({
                      title: "Demo Login successful!",
                      description: "Welcome back to BookNex",
                      duration: 1000,
                    });
                    navigate('/dashboard/owner');
                  } catch (error) {
                    console.error("Demo login error:", error);
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
                }}
                disabled={loading}
              >
                Demo Owner Login
              </Button>
            </motion.div>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/register/owner" className="text-primary hover:underline font-bold">
              Sign up
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginOwner;
