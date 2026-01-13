import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface RevenueChartProps {
    data: {
        name: string
        revenue: number
    }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
    // Calculate max value for better scaling if needed, or let Recharts handle it
    const hasData = data.some(d => d.revenue > 0);

    return (
        <Card className="col-span-4 lg:col-span-3 shadow-md border-primary/10">
            <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>
                    Daily revenue for the past 7 days
                </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                {hasData ? (
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={data}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `₹${value}`}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                            Revenue
                                                        </span>
                                                        <span className="font-bold text-foreground">
                                                            ₹{payload[0].value}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Bar
                                dataKey="revenue"
                                fill="url(#colorRevenue)"
                                radius={[4, 4, 0, 0]}
                                className="stroke-primary"
                                strokeWidth={1}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                        <p>No revenue data available for this period</p>
                        <p className="text-sm">Bookings will appear here once confirmed</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
