import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User, Briefcase } from 'lucide-react';

const RoleSelection = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/logo.png" alt="BookNex Logo" className="h-12 w-auto object-contain" />
            <h1 className="text-4xl font-bold text-primary">BookNex</h1>
          </div>
          <p className="text-muted-foreground">Choose how you want to continue</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-8 space-y-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">User</h2>
              <p className="text-muted-foreground">Book services and manage your reservations</p>
            </div>
            <div className="space-y-3">
              <Link to="/login/user" className="block">
                <Button className="w-full" size="lg">Login as User</Button>
              </Link>
              <Link to="/register/user" className="block">
                <Button variant="outline" className="w-full" size="lg">Sign Up as User</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-8 space-y-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-secondary/10 flex items-center justify-center">
                <Briefcase className="h-10 w-10 text-secondary" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Owner</h2>
              <p className="text-muted-foreground">Manage your venue and bookings</p>
            </div>
            <div className="space-y-3">
              <Link to="/login/owner" className="block">
                <Button className="w-full bg-secondary hover:bg-secondary/90" size="lg">Login as Owner</Button>
              </Link>
              <Link to="/register/owner" className="block">
                <Button variant="outline" className="w-full" size="lg">Sign Up as Owner</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
