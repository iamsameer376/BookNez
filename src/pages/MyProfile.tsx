import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Mail, Phone, Trash2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MyProfile = () => {
  const { user, signOut, userRoles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login/user');
    }
  }, [user, authLoading, navigate]);

  const fetchProfile = useCallback(async () => {
    try {
      if (!user) return; // Wait for user

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  // Fallback values
  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'N/A';
  const displayEmail = profile?.email || user?.email || 'N/A';
  const displayPhone = profile?.phone || user?.phone || 'N/A';
  const displayLocation = profile?.city ? `${profile.city}, ${profile.state}` : 'Location not set';

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) {
      return;
    }

    try {
      // Delete user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Delete user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user?.id);

      if (roleError) throw roleError;

      toast({
        title: "Account deleted successfully",
        duration: 1000,
      });

      // Sign out and redirect
      await signOut();
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error deleting account",
        description: error.message,
        variant: "destructive",
        duration: 1000,
      });
    }
  };

  if (authLoading || (loadingProfile && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Debug check: ensure we are returning JSX
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="bg-card border-b sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">My Profile</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle className="text-xl text-primary">User Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Name */}
            <div className="flex items-center gap-4 p-4 bg-secondary/10 rounded-xl transition-all hover:bg-secondary/15">
              <div className="p-2 bg-background rounded-full">
                <User className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</p>
                <p className="font-medium text-lg">{displayName}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-4 p-4 bg-secondary/10 rounded-xl transition-all hover:bg-secondary/15">
              <div className="p-2 bg-background rounded-full">
                <Mail className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</p>
                <p className="font-medium text-lg">{displayEmail}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-4 p-4 bg-secondary/10 rounded-xl transition-all hover:bg-secondary/15">
              <div className="p-2 bg-background rounded-full">
                <Phone className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</p>
                <p className="font-medium text-lg">{displayPhone}</p>
              </div>
            </div>

            {/* Roles */}
            {userRoles && userRoles.length > 0 && (
              <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-xl transition-all hover:bg-primary/15">
                <div className="p-2 bg-background rounded-full">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account Roles</p>
                  <div className="flex gap-2 mt-1">
                    {userRoles.map(role => (
                      <span key={role} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground capitalize">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Location (if available) */}
            {profile?.city && (
              <div className="flex items-center gap-4 p-4 bg-secondary/10 rounded-xl transition-all hover:bg-secondary/15">
                <div className="p-2 bg-background rounded-full">
                  <MapPin className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</p>
                  <p className="font-medium text-lg">{displayLocation}</p>
                </div>
              </div>
            )}


            <div className="pt-6 border-t mt-4">
              <Button
                variant="destructive"
                className="w-full h-12 text-lg"
                onClick={handleDeleteAccount}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account Permanently
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MyProfile;
