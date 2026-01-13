import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, Mail, Lock, Phone, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { PasswordInput } from '@/components/ui/password-input';

const SECURITY_QUESTIONS = [
  "What was the name of your first school?",
  "What is your pet's name?",
  "What is your mother's maiden name?",
  "What city were you born in?",
  "What was your first car?",
];

const RegisterOwner = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [registerError, setRegisterError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRegisterError(null);

    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (!securityQuestion || !securityAnswer) {
        throw new Error("Please select a security question and provide an answer");
      }

      if (!phone || phone.length < 10) {
        throw new Error("Please enter a valid phone number");
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user account");

      // CRITICAL CHECK for new Supabase projects
      if (authData.user && !authData.session) {
        throw new Error("Registration Successful but Logged Out.\n\n⚠️ Email Confirmation is ON in your Supabase.\nPlease verify your email OR go to Supabase -> Authentication -> Providers -> Email -> Disable 'Confirm email'.\n\nThen try again.");
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          full_name: fullName,
          phone: phone,
          email: email,
          city: city,
          state: state,
          country: country,
          security_question: securityQuestion,
          security_answer: securityAnswer.toLowerCase().trim(),
          updated_at: new Date().toISOString(),
          role: 'owner', // Explicitly set role to avoid phone collision with 'customer'
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        throw new Error("Failed to create profile (Table might be missing?): " + profileError.message);
      }

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'owner',
        });

      if (roleError) {
        console.error("Role creation error:", roleError);
        throw new Error("Failed to assign owner role: " + roleError.message);
      }

      toast({
        title: "Account created successfully!",
        description: "You can now login with your phone number",
        duration: 1000,
      });

      navigate('/login/owner');
    } catch (error: any) {
      console.error("Registration error:", error);
      const message = error.message || "An error occurred during registration";
      setRegisterError(message); // Show persistent error
      window.scrollTo(0, 0);
      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/10 via-background to-primary/10 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="p-8 space-y-6 border-2 border-primary/10 shadow-xl bg-card/80 backdrop-blur-sm">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-secondary transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>

          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">BookNex</h1>
            <h2 className="text-2xl font-semibold text-foreground">Create Owner Account</h2>
            <p className="text-muted-foreground">Start managing your venue</p>
          </div>

          {registerError && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm font-semibold whitespace-pre-wrap">
              {registerError}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="1234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required className="h-11" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={state} onChange={(e) => setState(e.target.value)} required className="h-11" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} required className="h-11" />
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
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground z-10" />
                <PasswordInput
                  id="confirmPassword"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="securityQuestion">Security Question</Label>
              <div className="relative">
                <HelpCircle className="absolute left-3 top-3 h-5 w-5 text-muted-foreground z-10" />
                <Select value={securityQuestion} onValueChange={setSecurityQuestion} required>
                  <SelectTrigger className="pl-10 h-11">
                    <SelectValue placeholder="Select a question" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECURITY_QUESTIONS.map((q) => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="securityAnswer">Security Answer</Label>
              <Input
                id="securityAnswer"
                placeholder="Your answer"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button type="submit" className="w-full h-12 text-lg bg-gradient-to-r from-secondary to-primary hover:opacity-90" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </motion.div>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login/owner" className="text-secondary hover:underline font-bold">
              Sign in
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default RegisterOwner;
