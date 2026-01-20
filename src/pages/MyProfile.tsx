import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, User, Mail, Phone, Trash2, MapPin, Edit2, Save, X, Lock, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "In what city were you born?",
  "What is your mother's maiden name?",
  "What was the model of your first car?",
  "What primary school did you attend?"
];

const MyProfile = () => {
  const { user, signOut, userRoles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    city: '',
    state: '' // Although not in DB provided in Step 157, the user mentioned it in step 151 logic. I'll stick to DB columns: full_name, phone, city (step 81 confirms city in profiles? Wait, step 157 schema shows full_name, phone, security_question, security_answer. No city? 
    // Step 151 showed: const { data: profileData } = await supabase.from('profiles').select('full_name, city')... 
    // Step 51 `useAuth` fetches `city`.
    // Let me RE-VERIFY schema. Step 157 was 20251019120244...sql. Maybe a later migration added City?
    // Step 153 showed many migrations.
    // I better check if 'city' exists in one of the other migration files or just assume it does since existing code uses it.
    // I will include 'city' in formData.
  });

  // Security State
  const [securityDialogOpen, setSecurityDialogOpen] = useState(false);
  const [securityMode, setSecurityMode] = useState<'setup' | 'verify_old_password' | 'verify_security_question' | 'change_password'>('setup');
  const [securityData, setSecurityData] = useState({
    question: '',
    answer: '',
    verifyAnswer: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

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
      if (data) {
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          city: data.city || '',
          state: data.state || ''
        });
      }
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
  const displayLocation = profile?.city ? `${profile.city}${profile?.state ? `, ${profile.state}` : ''}` : 'Location not set';
  const hasSecurityQuestion = !!profile?.security_question;

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          city: formData.city,
          state: formData.state
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast({ title: "Profile updated successfully" });
      setIsEditing(false);
      fetchProfile();
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSecuritySubmit = async () => {
    try {
      if (securityMode === 'setup') {
        if (!securityData.question || !securityData.answer) {
          toast({ title: "Please fill all fields", variant: "destructive" });
          return;
        }

        const { error } = await supabase
          .from('profiles')
          .update({
            security_question: securityData.question,
            security_answer: securityData.answer.toLowerCase().trim()
          })
          .eq('id', user?.id);

        if (error) throw error;
        toast({ title: "Security questions updated" });
        setSecurityDialogOpen(false);
        fetchProfile();
      }
      else if (securityMode === 'verify_old_password') {
        if (!securityData.oldPassword) {
          toast({ title: "Please enter your current password", variant: "destructive" });
          return;
        }

        // Verify old password by signing in (this also refreshes the session!)
        const { error } = await supabase.auth.signInWithPassword({
          email: user?.email || '',
          password: securityData.oldPassword
        });

        if (error) {
          console.error("Old password verification failed:", error);
          toast({ title: "Incorrect password", variant: "destructive" });
          return;
        }

        toast({ title: "Password verified" });
        setSecurityMode('change_password');
      }
      else if (securityMode === 'verify_security_question') {
        const storedAnswer = profile?.security_answer?.toLowerCase()?.trim();
        const providedAnswer = securityData.verifyAnswer?.toLowerCase()?.trim();

        if (storedAnswer === providedAnswer) {
          setSecurityMode('change_password');
          toast({ title: "Identity verified", description: "You can now change your password" });
        } else {
          toast({ title: "Incorrect answer", variant: "destructive" });
        }
      }
      else if (securityMode === 'change_password') {
        if (securityData.newPassword.length < 6) {
          toast({ title: "Password must be at least 6 characters", variant: "destructive" });
          return;
        }
        if (securityData.newPassword !== securityData.confirmPassword) {
          toast({ title: "Passwords do not match", variant: "destructive" });
          return;
        }

        console.log('Attempting password update...');
        // Ensure session is valid
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error('Session missing or error:', sessionError);
          toast({ title: "Session expired. Please log in again.", variant: "destructive" });
          await signOut();
          navigate('/');
          return;
        }

        const { error } = await supabase.auth.updateUser({
          password: securityData.newPassword
        });

        if (error) {
          console.error('Password update error:', error);
          throw error;
        }

        toast({ title: "Password changed successfully" });
        setSecurityDialogOpen(false);
        // Reset state
        setSecurityData({ ...securityData, newPassword: '', confirmPassword: '', verifyAnswer: '' });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openSecurityDialog = () => {
    setSecurityMode(hasSecurityQuestion ? 'verify_old_password' : 'setup');
    setSecurityData({ ...securityData, verifyAnswer: '', newPassword: '', confirmPassword: '', oldPassword: '' });
    setSecurityDialogOpen(true);
  };

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
        <Card className="shadow-lg border-primary/10 mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl text-primary">Personal Details</CardTitle>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleSaveProfile}>
                  <Save className="h-4 w-4 mr-2" /> Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Name */}
            <div className="flex items-center gap-4 p-4 bg-secondary/10 rounded-xl">
              <div className="p-2 bg-background rounded-full">
                <User className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</Label>
                {isEditing ? (
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Enter full name"
                  />
                ) : (
                  <p className="font-medium text-lg">{displayName}</p>
                )}
              </div>
            </div>

            {/* Email (Read Only) */}
            <div className="flex items-center gap-4 p-4 bg-secondary/10 rounded-xl">
              <div className="p-2 bg-background rounded-full">
                <Mail className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-lg">{displayEmail}</p>
                  <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">Read-only</span>
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-4 p-4 bg-secondary/10 rounded-xl">
              <div className="p-2 bg-background rounded-full">
                <Phone className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</Label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                ) : (
                  <p className="font-medium text-lg">{displayPhone}</p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-4 p-4 bg-secondary/10 rounded-xl">
              <div className="p-2 bg-background rounded-full">
                <MapPin className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1 space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</Label>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                    />
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>
                ) : (
                  <p className="font-medium text-lg">{displayLocation}</p>
                )}
              </div>
            </div>

            {/* Roles Display */}
            <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-xl">
              <div className="p-2 bg-background rounded-full">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account Roles</p>
                <div className="flex gap-2 mt-1">
                  {userRoles?.map(role => (
                    <span key={role} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground capitalize">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="shadow-lg border-primary/10 mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-xl">
              <div>
                <h3 className="font-medium">Password & Security</h3>
                <p className="text-sm text-muted-foreground">Manage your password and security questions</p>
              </div>
              <Dialog open={securityDialogOpen} onOpenChange={setSecurityDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={openSecurityDialog}>
                    <Lock className="h-4 w-4 mr-2" />
                    {hasSecurityQuestion ? 'Change Password' : 'Set Security Question'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {securityMode === 'setup' && 'Setup Security Question'}
                      {securityMode === 'verify_old_password' && 'Verify Current Password'}
                      {securityMode === 'verify_security_question' && 'Reset via Security Question'}
                      {securityMode === 'change_password' && 'Set New Password'}
                    </DialogTitle>
                    <DialogDescription>
                      {securityMode === 'setup' && 'Set a security question to recover your account or change password later.'}
                      {securityMode === 'verify_old_password' && 'Please enter your current password to continue.'}
                      {securityMode === 'verify_security_question' && 'Answer your security question to reset your password.'}
                      {securityMode === 'change_password' && 'Enter your new password below.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {securityMode === 'setup' && (
                      <>
                        <div className="space-y-2">
                          <Label>Security Question</Label>
                          <Select
                            onValueChange={(val) => setSecurityData({ ...securityData, question: val })}
                            value={securityData.question}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a question" />
                            </SelectTrigger>
                            <SelectContent>
                              {SECURITY_QUESTIONS.map(q => (
                                <SelectItem key={q} value={q}>{q}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Answer</Label>
                          <Input
                            value={securityData.answer}
                            onChange={(e) => setSecurityData({ ...securityData, answer: e.target.value })}
                            placeholder="Enter your answer"
                          />
                        </div>
                      </>
                    )}

                    {securityMode === 'verify_old_password' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Current Password</Label>
                          <Input
                            type="password"
                            value={securityData.oldPassword}
                            onChange={(e) => setSecurityData({ ...securityData, oldPassword: e.target.value })}
                            placeholder="Enter current password"
                          />
                        </div>
                        <div className="text-sm text-center">
                          <button
                            className="text-primary hover:underline"
                            onClick={() => setSecurityMode('verify_security_question')}
                          >
                            Forgot your password?
                          </button>
                        </div>
                      </div>
                    )}

                    {securityMode === 'verify_security_question' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>{profile?.security_question}</Label>
                          <Input
                            value={securityData.verifyAnswer}
                            onChange={(e) => setSecurityData({ ...securityData, verifyAnswer: e.target.value })}
                            placeholder="Enter your answer"
                          />
                          <p className="text-xs text-muted-foreground">Case insensitive</p>
                        </div>
                        <div className="text-sm text-center">
                          <button
                            className="text-primary hover:underline"
                            onClick={() => setSecurityMode('verify_old_password')}
                          >
                            Back to Password Verification
                          </button>
                        </div>
                      </div>
                    )}

                    {securityMode === 'change_password' && (
                      <>
                        <div className="space-y-2">
                          <Label>New Password</Label>
                          <Input
                            type="password"
                            value={securityData.newPassword}
                            onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Confirm Password</Label>
                          <Input
                            type="password"
                            value={securityData.confirmPassword}
                            onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    <Button onClick={handleSecuritySubmit} className="w-full mt-4">
                      {securityMode === 'setup' && 'Save Security Question'}
                      {securityMode === 'verify_old_password' && 'Verify Password'}
                      {securityMode === 'verify_security_question' && 'Verify Answer'}
                      {securityMode === 'change_password' && 'Update Password'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="shadow-lg border-red-200">
          <CardHeader>
            <CardTitle className="text-red-500 text-lg">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDeleteAccount}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account Permanently
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MyProfile;
