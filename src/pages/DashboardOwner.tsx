import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Plus, Building2, Calendar, DollarSign, QrCode, Settings, Users, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { SettingsMenu } from '@/components/SettingsMenu';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

const DashboardOwner = () => {
  const { user, userRoles, userName, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    activeVenues: 0,
    graphData: [] as any[],
  });

  useEffect(() => {
    // Check if user has 'owner' role
    if (!loading && (!user || !userRoles.includes('owner'))) {
      navigate('/login/owner');
    }
  }, [user, userRoles, loading, navigate]);

  const fetchStats = useCallback(async () => {
    try {
      // Get owner's venues
      const { data: venues } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_id', user?.id as string);

      const venueIds = venues?.map(v => v.id) || [];
      const activeVenues = venues?.length || 0;

      if (venueIds.length === 0) {
        setStats({ totalBookings: 0, totalRevenue: 0, activeVenues: 0, graphData: [] });
        return;
      }

      // Get bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .in('venue_id', venueIds);

      const totalBookings = bookings?.length || 0;
      const totalRevenue = bookings?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;

      // Prepare graph data (last 7 days)
      const graphData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);

        const dayBookings = bookings?.filter(b => b.booking_date === d.toISOString().split('T')[0]) || [];
        const dayRevenue = dayBookings.reduce((sum, b) => sum + Number(b.amount), 0);

        graphData.push({
          name: d.toLocaleDateString('en-US', { weekday: 'short' }),
          revenue: dayRevenue,
        });
      }

      setStats({
        totalBookings,
        totalRevenue,
        activeVenues,
        graphData,
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user && userRoles.includes('owner')) {
      fetchStats();
    }
  }, [user, userRoles, fetchStats]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/5 via-background to-primary/5 pb-20">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-10 transition-all duration-300">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary"
          >
            BookNex Owner
          </motion.h1>
          <SettingsMenu />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Welcome Section */}
          <motion.div variants={item}>
            <h2 className="text-3xl font-bold mb-1">Welcome back{userName ? `, ${userName}` : ''}!</h2>
            <p className="text-muted-foreground">{user?.email}</p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-l-4 border-l-primary shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <div className="p-2 bg-primary/10 rounded-full">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalBookings}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-secondary shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <div className="p-2 bg-secondary/10 rounded-full">
                  <DollarSign className="h-4 w-4 text-secondary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{stats.totalRevenue.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Venues</CardTitle>
                <div className="p-2 bg-primary/10 rounded-full">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.activeVenues}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={item}>
            <h3 className="text-xl font-semibold mb-4 text-foreground/80">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                <Button
                  onClick={() => navigate('/owner/add-venue')}
                  variant="outline"
                  className="w-full h-32 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <Plus className="h-6 w-6" />
                  </div>
                  <span className="font-medium">Add Venue</span>
                </Button>
              </motion.div>

              <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                <Button
                  onClick={() => navigate('/owner/venues')}
                  variant="outline"
                  className="w-full h-32 flex flex-col items-center justify-center gap-3 bg-card hover:border-primary/30"
                >
                  <div className="p-3 bg-secondary/10 rounded-full text-secondary">
                    <Settings className="h-6 w-6" />
                  </div>
                  <span className="font-medium">Manage</span>
                </Button>
              </motion.div>

              <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                <Button
                  onClick={() => navigate('/owner/bookings')}
                  variant="outline"
                  className="w-full h-32 flex flex-col items-center justify-center gap-3 bg-card hover:border-primary/30"
                >
                  <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <span className="font-medium">Bookings</span>
                </Button>
              </motion.div>

              <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                <Button
                  onClick={() => navigate('/owner/scan')}
                  variant="outline"
                  className="w-full h-32 flex flex-col items-center justify-center gap-3 bg-card hover:border-primary/30"
                >
                  <div className="p-3 bg-purple-500/10 rounded-full text-purple-500">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <span className="font-medium">Scanner</span>
                </Button>
              </motion.div>

              <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                <Button
                  onClick={() => navigate('/owner/reviews')}
                  variant="outline"
                  className="w-full h-32 flex flex-col items-center justify-center gap-3 bg-card hover:border-primary/30"
                >
                  <div className="p-3 bg-yellow-500/10 rounded-full text-yellow-500">
                    <Star className="h-6 w-6 fill-yellow-400 text-yellow-500" />
                  </div>
                  <span className="font-medium">Reviews</span>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};

export default DashboardOwner;
