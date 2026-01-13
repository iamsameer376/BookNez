import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, Download } from 'lucide-react';
import { startOfToday, startOfWeek, startOfMonth, startOfYear, endOfDay, format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/DateRangePicker';
import { RevenueChart } from '@/components/RevenueChart';

interface Transaction {
    id: string;
    booking_date: string;
    amount: number;
    venue_name: string;
    status: string;
}

const OwnerRevenue = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [graphData, setGraphData] = useState<any[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [filterType, setFilterType] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('week');
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 7),
        to: new Date()
    });

    // Helper to update range based on quick filters
    const handleFilterChange = (type: 'today' | 'week' | 'month' | 'year') => {
        setFilterType(type);
        const now = new Date();
        let from = now;

        switch (type) {
            case 'today': from = startOfToday(); break;
            case 'week': from = startOfWeek(now, { weekStartsOn: 1 }); break;
            case 'month': from = startOfMonth(now); break;
            case 'year': from = startOfYear(now); break;
        }

        setDateRange({ from, to: endOfDay(now) });
    };

    const fetchRevenue = useCallback(async () => {
        if (!user || !dateRange?.from || !dateRange?.to) return;

        try {
            setIsLoading(true);
            const { data: venues } = await supabase
                .from('venues')
                .select('id, name')
                .eq('owner_id', user.id);

            const venueIds = venues?.map(v => v.id) || [];

            if (venueIds.length === 0) {
                setTransactions([]);
                setGraphData([]);
                setTotalRevenue(0);
                return;
            }

            const fromStr = dateRange.from.toISOString();
            const toStr = dateRange.to.toISOString();

            // Fetch bookings within range
            const { data: bookings } = await supabase
                .from('bookings')
                .select('id, booking_date, amount, venue_id, status')
                .in('venue_id', venueIds)
                .gte('booking_date', fromStr.split('T')[0]) // Simple date comparison
                .lte('booking_date', toStr.split('T')[0])
                .neq('status', 'cancelled') // Exclude cancelled
                .order('booking_date', { ascending: true });

            const txns = (bookings || []).map(b => ({
                id: b.id,
                booking_date: b.booking_date,
                amount: Number(b.amount),
                venue_name: venues?.find(v => v.id === b.venue_id)?.name || 'Unknown',
                status: b.status
            }));

            setTransactions(txns);
            setTotalRevenue(txns.reduce((sum, t) => sum + t.amount, 0));

            // Prepare graph data (agg by date)
            const agg: Record<string, number> = {};
            txns.forEach(t => {
                const date = format(new Date(t.booking_date), 'MMM dd');
                agg[date] = (agg[date] || 0) + t.amount;
            });

            const graph = Object.keys(agg).map(k => ({ name: k, revenue: agg[k] }));
            setGraphData(graph);

        } catch (error) {
            console.error('Error fetching revenue:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user, dateRange]);

    useEffect(() => {
        if (!loading && user) fetchRevenue();
    }, [loading, user, dateRange, fetchRevenue]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-secondary/5 via-background to-primary/5 pb-10">
            <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Button variant="ghost" onClick={() => navigate('/dashboard/owner')}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <h1 className="text-xl font-bold">Revenue Analytics</h1>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" /> Export
                    </Button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 space-y-6">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/40 backdrop-blur-md p-4 rounded-lg border border-white/10 shadow-sm sticky top-[73px] z-10">
                    <div className="nav-filters flex gap-1 bg-background/50 p-1 rounded-lg border border-white/5 backdrop-blur-sm">
                        {['today', 'week', 'month', 'year'].map((t) => (
                            <Button
                                key={t}
                                variant="ghost"
                                onClick={() => handleFilterChange(t as any)}
                                className={`capitalize h-8 px-3 rounded-md transition-all ${filterType === t
                                        ? 'bg-primary text-primary-foreground shadow-md'
                                        : 'hover:bg-primary/10 hover:text-primary text-muted-foreground'
                                    }`}
                                size="sm"
                            >
                                {t}
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap hidden sm:inline-block">Custom Range:</span>
                        <div className="relative z-20">
                            <DatePickerWithRange
                                date={dateRange}
                                setDate={(range) => {
                                    setFilterType('custom');
                                    setDateRange(range);
                                }}
                                className="backdrop-blur-sm bg-background/50"
                            />
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-l-4 border-l-secondary shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue (Selected Period)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">₹{totalRevenue.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-primary shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{transactions.length}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Chart */}
                <div className="bg-card rounded-xl shadow-sm border p-1">
                    <RevenueChart data={graphData} />
                </div>

                {/* Transaction List (Optional but requested "revenue details") */}
                <Card>
                    <CardHeader>
                        <CardTitle>Transaction History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {transactions.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No transactions found for this period.</p>
                            ) : (
                                transactions.map(t => (
                                    <div key={t.id} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium">{t.venue_name}</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(t.booking_date), 'MMM dd, yyyy')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-green-600">+₹{t.amount}</p>
                                            <Badge variant="outline" className="text-[10px] h-5">{t.status}</Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

// Simple Badge component inline or import from UI
const Badge = ({ children, variant, className }: any) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${className || ''} ${variant === 'outline' ? 'bg-transparent' : 'bg-secondary/10 text-secondary-foreground'}`}>
        {children}
    </span>
);

export default OwnerRevenue;
