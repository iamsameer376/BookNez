import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Building2, Calendar, IndianRupee, QrCode, Settings, Star, ChevronRight, MapPin } from 'lucide-react';
import { useGeoLocation } from '@/hooks/useGeoLocation';

import { motion } from 'framer-motion';
import { SettingsMenu } from '@/components/SettingsMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { isToday, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

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
  const { user, userRoles, userName, userCity, loading } = useAuth();
  const { location: userGeoLocation, getLocation } = useGeoLocation();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    todaysBookings: 0,
    totalRevenue: 0,
    activeVenues: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    // Check if user has 'owner' role
    if (!loading && (!user || !userRoles.includes('owner'))) {
      navigate('/login/owner');
    }
  }, [user, userRoles, loading, navigate]);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      // Get owner's venues
      const { data: venues } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_id', user?.id as string);

      const venueIds = venues?.map(v => v.id) || [];
      const activeVenues = venues?.length || 0;

      if (venueIds.length === 0) {
        setStats({ todaysBookings: 0, totalRevenue: 0, activeVenues: 0 });
        return;
      }

      // Get bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .in('venue_id', venueIds);

      // 1. Calculate Today's Bookings
      const todaysBookings = bookings?.filter(b => {
        if (!b.booking_date) return false;
        return isToday(parseISO(b.booking_date));
      }).length || 0;

      // 2. Calculate Total Revenue (All Time)
      const totalRevenue = bookings?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;

      setStats({
        todaysBookings,
        totalRevenue,
        activeVenues,
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoadingStats(false);
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
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-tight leading-none">
                BookNex
              </h1>
              <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-[10px] font-bold text-primary tracking-widest uppercase shadow-sm">
                Beta
              </span>
            </div>
            <span className="hidden md:inline text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] ml-0.5">
              Venue Owner
            </span>
          </motion.div>

          <div className="flex items-center gap-1.5 text-sm py-1 px-3 bg-secondary/10 rounded-full border border-secondary/20 hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => getLocation && getLocation()}>
            <MapPin className={`h-3.5 w-3.5 ${userGeoLocation.error ? 'text-destructive' : 'text-primary'}`} />
            <span className="font-medium truncate max-w-[120px] md:max-w-[200px]">
              {!userGeoLocation.loaded
                ? 'Locating...'
                : userGeoLocation.error
                  ? 'Locate Me'
                  : (userGeoLocation.city || userCity || 'Select Location')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <SettingsMenu />
          </div>
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

            {/* Bookings Card - Clickable */}
            <Card
              className="border-l-4 border-l-primary shadow-md hover:shadow-lg transition-all cursor-pointer hover:border-r-2 hover:border-t hover:border-b hover:scale-[1.01]"
              onClick={() => navigate('/owner/bookings')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Today's Bookings
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-full">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingStats ? <Skeleton className="h-8 w-12" /> : stats.todaysBookings}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Scheduled for today
                </p>
              </CardContent>
            </Card>

            {/* Revenue Card - Clickable -> /owner/revenue */}
            <Card
              className="border-l-4 border-l-secondary shadow-md hover:shadow-lg transition-all cursor-pointer hover:border-r-2 hover:border-t hover:border-b hover:scale-[1.01]"
              onClick={() => navigate('/owner/revenue')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Total Revenue
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
                <div className="p-2 bg-secondary/10 rounded-full">
                  <IndianRupee className="h-4 w-4 text-secondary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingStats ? <Skeleton className="h-8 w-24" /> : `₹${stats.totalRevenue.toLocaleString()}`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Lifecycle earnings
                </p>
              </CardContent>
            </Card>

            {/* Active Venues - Clickable */}
            <Card
              className="border-l-4 border-l-primary/50 shadow-md hover:shadow-lg transition-all cursor-pointer hover:border-r-2 hover:border-t hover:border-b hover:scale-[1.01]"
              onClick={() => navigate('/owner/venues')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Active Venues
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-full">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingStats ? <Skeleton className="h-8 w-12" /> : stats.activeVenues}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently listed
                </p>
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
