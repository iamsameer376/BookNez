import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRoles: string[];
  activeRole: 'user' | 'owner' | 'admin' | null;
  setActiveRole: (role: 'user' | 'owner' | 'admin') => void;
  userName: string | null;
  userCity: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: 'user' | 'owner' | 'admin') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [activeRole, setActiveRoleState] = useState<'user' | 'owner' | 'admin' | null>(() => {
    return localStorage.getItem('activeRole') as 'user' | 'owner' | 'admin' | null;
  });
  const [userName, setUserName] = useState<string | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchUserRoles(session.user.id);
          }, 0);
        } else {
          setUserRoles([]);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserRoles(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;

      const roles = data?.map(r => r.role) || [];
      setUserRoles(roles);

      // Fetch user name, city, and ban status from profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, city, is_banned')
        .eq('id', userId)
        .maybeSingle();

      if (profileData?.is_banned) {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setUserRoles([]);
        setUserName(null);
        setActiveRoleState(null);
        localStorage.removeItem('activeRole');

        toast({
          title: "Account Banned",
          description: "You have been banned for violating our guidelines. Please contact support.",
          variant: "destructive",
          duration: 5000,
        });
        return; // Stop execution
      }

      setUserName(profileData?.full_name || null);
      setUserCity(profileData?.city || null);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setUserRoles([]);
      setUserName(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserRoles([]);
      setUserName(null);
      setActiveRoleState(null);
      localStorage.removeItem('activeRole');
      toast({
        title: "Signed out successfully",
        duration: 1000,
      });
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const setActiveRole = (role: 'user' | 'owner' | 'admin') => {
    setActiveRoleState(role);
    localStorage.setItem('activeRole', role);
  };

  const hasRole = (role: 'user' | 'owner' | 'admin') => {
    return userRoles.includes(role);
  };

  return (
    <AuthContext.Provider value={{ user, session, userRoles, activeRole, setActiveRole, userName, userCity, loading, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
