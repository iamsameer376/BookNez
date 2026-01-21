import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    TrendingUp,
    Users,
    Calendar,
    Activity,
    IndianRupee,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

export const AnalyticsOverview = () => {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    venues (category)
                `)
                .order('created_at', { ascending: true }); // Ascending for time-series aggregation

            if (error) throw error;
            setBookings(data || []);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Statistics Calculations ---
    const stats = useMemo(() => {
        const totalRevenue = bookings.reduce((sum, b) =>
            b.status !== 'cancelled' ? sum + Number(b.amount || 0) : sum, 0
        );
        const totalBookings = bookings.length;
        const activeBookings = bookings.filter(b => b.status === 'confirmed').length;
        const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

        // Calculate growth (mock comparison with first half vs second half of dataset for demo)
        // In real app, compare this month vs last month
        const midPoint = Math.floor(bookings.length / 2);
        const recentRevenue = bookings.slice(midPoint).reduce((sum, b) => b.status !== 'cancelled' ? sum + Number(b.amount || 0) : sum, 0);
        const oldRevenue = bookings.slice(0, midPoint).reduce((sum, b) => b.status !== 'cancelled' ? sum + Number(b.amount || 0) : sum, 0);
        const revenueGrowth = oldRevenue === 0 ? 100 : ((recentRevenue - oldRevenue) / oldRevenue) * 100;

        return {
            revenue: totalRevenue,
            total_bookings: totalBookings,
            active_rate: totalBookings ? Math.round((activeBookings / totalBookings) * 100) : 0,
            cancellation_rate: totalBookings ? Math.round((cancelledBookings / totalBookings) * 100) : 0,
            revenue_growth: revenueGrowth.toFixed(1)
        };
    }, [bookings]);

    // --- Chart Data Preparation ---
    const revenueData = useMemo(() => {
        const days = 30;
        const data = [];
        for (let i = days; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const dayStr = format(date, 'MMM dd');

            const dayRevenue = bookings
                .filter(b => isSameDay(new Date(b.booking_date), date) && b.status !== 'cancelled')
                .reduce((sum, b) => sum + Number(b.amount || 0), 0);

            data.push({ name: dayStr, value: dayRevenue });
        }
        return data;
    }, [bookings]);

    const categoryData = useMemo(() => {
        const counts: Record<string, number> = {};
        bookings.forEach(b => {
            let cat = b.venues?.category || 'Uncategorized';

            // Normalize categories
            if (cat.toLowerCase() === 'sports_turf' || cat.toLowerCase() === 'turf') {
                cat = 'Turf';
            } else {
                // Capitalize others
                cat = cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ');
            }

            counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [bookings]);

    if (loading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted/50 rounded-xl" />)}
        <div className="md:col-span-3 h-80 bg-muted/50 rounded-xl" />
    </div>;

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                            <IndianRupee className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">₹{stats.revenue.toLocaleString()}</h2>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <span className={Number(stats.revenue_growth) >= 0 ? "text-green-500" : "text-red-500"}>
                                        {Number(stats.revenue_growth) >= 0 ? "+" : ""}{stats.revenue_growth}%
                                    </span>
                                    from previous period
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                            <Calendar className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">{stats.total_bookings}</h2>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Lifetime bookings
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                            <Activity className="h-4 w-4 text-orange-500" />
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">{stats.active_rate}%</h2>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Successful check-ins
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-muted-foreground">Cancellation Rate</p>
                            <TrendingUp className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">{stats.cancellation_rate}%</h2>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Cancelled bookings
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Revenue Trend (30 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `₹${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#f97316"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Category Pie Chart */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Popular Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap gap-2 justify-center mt-4">
                                {categoryData.map((entry, index) => (
                                    <div key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                        <span>{entry.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
