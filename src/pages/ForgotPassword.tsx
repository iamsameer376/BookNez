import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ForgotPassword = () => {
  const [step, setStep] = useState<'phone' | 'security' | 'reset'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Find user by phone
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, security_question, security_answer')
        .eq('phone', phone)
        .maybeSingle();

      if (profileError || !profileData) {
        throw new Error('No account found with this phone number');
      }

      setUserId(profileData.id);
      setSecurityQuestion(profileData.security_question || '');
      setSecurityAnswer(profileData.security_answer || '');
      
      if (!profileData.security_question) {
        throw new Error('No security question set for this account');
      }

      setStep('security');
      toast({
        title: "Security Question",
        description: "Please answer your security question",
        duration: 1000,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (userAnswer.toLowerCase().trim() !== securityAnswer.toLowerCase().trim()) {
        throw new Error('Incorrect security answer');
      }

      setStep('reset');
      toast({
        title: "Verified",
        description: "Please enter your new password",
        duration: 1000,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Reset password using email link method
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      toast({
        title: "Success",
        description: "Check your email for password reset link",
        duration: 1000,
      });
      
      navigate('/login/user');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Link>

        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-primary">BookNex</h1>
          <h2 className="text-2xl font-semibold">Reset Password</h2>
          <p className="text-muted-foreground">
            {step === 'phone' && 'Enter your phone number'}
            {step === 'security' && 'Answer your security question'}
            {step === 'reset' && 'Enter your new password'}
          </p>
        </div>

        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Verifying..." : "Continue"}
            </Button>
          </form>
        )}

        {step === 'security' && (
          <form onSubmit={handleSecuritySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Security Question</Label>
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                {securityQuestion}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer">Your Answer</Label>
              <Input
                id="answer"
                type="text"
                placeholder="Enter your answer"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Verifying..." : "Verify Answer"}
            </Button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (to send reset link)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;
