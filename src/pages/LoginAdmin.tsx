import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import PageTransition from '@/components/PageTransition';

const LoginAdmin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();
    const { setActiveRole } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.session) {
                // Check if user has admin role
                const { data: roleData, error: roleError } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', data.session.user.id)
                    .eq('role', 'admin') // Explicitly check for admin role
                    .single();

                if (roleError || !roleData) {
                    // Not an admin
                    await supabase.auth.signOut();
                    toast({
                        title: "Access Denied",
                        description: "You do not have administrative privileges.",
                        variant: "destructive"
                    });
                    return;
                }

                setActiveRole('admin');
                navigate('/dashboard/admin');
                toast({
                    title: "Welcome back, Admin!",
                    description: "Successfully logged in to the admin panel.",
                });
            }
        } catch (error: any) {
            toast({
                title: "Login failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
                <Button
                    variant="ghost"
                    className="absolute top-4 left-4 md:top-8 md:left-8"
                    onClick={() => navigate('/')}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Home
                </Button>
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center space-y-2">
                        <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                            <ShieldCheck className="w-6 h-6 text-destructive" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
                        <p className="text-muted-foreground">Authenticate to access system controls</p>
                    </div>

                    <div className="bg-card border border-border/50 rounded-2xl shadow-xl p-8 space-y-6">
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@booknex.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-11"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-11 text-base font-semibold"
                                disabled={isLoading}
                                variant="destructive"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    'Access Dashboard'
                                )}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
};

export default LoginAdmin;
