import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Building2, User } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-12">

        {/* Logo / Header Area */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex p-4 bg-background rounded-full shadow-xl mb-4">
            <Sparkles className="w-12 h-12 text-primary animate-pulse" />
          </div>
          <h1 className="text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            BookNex
          </h1>
          <p className="text-xl text-muted-foreground font-light">
            Your Premium Venue Experience
          </p>
        </motion.div>

        {/* Action Cards */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Link to="/login/owner">
              <div className="group relative overflow-hidden bg-card hover:bg-card/50 border-2 border-primary/20 hover:border-primary transition-all duration-300 rounded-2xl p-6 shadow-lg hover:shadow-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                      <Building2 className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Venue Owner</h3>
                      <p className="text-sm text-muted-foreground">Manage your spaces</p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-primary opacity-50 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Link to="/login/user">
              <div className="group relative overflow-hidden bg-card hover:bg-card/50 border-2 border-secondary/20 hover:border-secondary transition-all duration-300 rounded-2xl p-6 shadow-lg hover:shadow-secondary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-secondary/10 rounded-xl group-hover:scale-110 transition-transform">
                      <User className="w-8 h-8 text-secondary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">User Login</h3>
                      <p className="text-sm text-muted-foreground">Book your next event</p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-secondary opacity-50 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground">
            New here? <span className="font-semibold text-foreground">Create an account to get started.</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
