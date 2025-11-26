'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function InsightsPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);

    useEffect(() => {
        if (params.slug) {
            fetchData(params.slug as string);
        }
    }, [params.slug]);

    const fetchData = async (slug: string) => {
        try {
            const brandRes = await fetch(`/api/shop/brands/${slug}`);
            if (!brandRes.ok) throw new Error('Brand not found');
            const brandData = await brandRes.json();

            const analyticsRes = await fetch(`/api/shop/analytics?brandId=${brandData.id}`);
            if (analyticsRes.ok) {
                const data = await analyticsRes.json();
                setAnalytics(data.brandAnalytics);
            }
        } catch (error) {
            console.error('Failed to fetch insights', error);
        } finally {
            setLoading(false);
        }
    };

    // Mock Data for Charts
    const generateTrendData = () => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days.map(day => ({
            name: day,
            impressions: Math.floor(Math.random() * 1000),
            views: Math.floor(Math.random() * 500),
            clicks: Math.floor(Math.random() * 100),
        }));
    };

    const trendData = generateTrendData();
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
    const deviceData = [
        { name: 'Mobile', value: 400 },
        { name: 'Desktop', value: 300 },
        { name: 'Tablet', value: 300 },
    ];

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">LOADING INSIGHTS...</div>;

    return (
        <div className="min-h-screen bg-black text-white font-mono p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                <button
                    onClick={() => router.push(`/shop/brand/${params.slug}/dashboard`)}
                    className="mb-8 text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-2"
                >
                    ← Back to Dashboard
                </button>

                <header className="mb-12 border-b border-white/20 pb-6">
                    <h1 className="text-4xl font-bold uppercase tracking-tighter mb-2">FUY Insights</h1>
                    <p className="text-gray-500 text-sm">Deep dive into your brand performance.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="border border-white/20 p-6 bg-white/5">
                        <h3 className="text-gray-400 text-xs uppercase mb-6">Traffic Trends</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#666" />
                                    <YAxis stroke="#666" />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                                    <Area type="monotone" dataKey="impressions" stroke="#8884d8" fillOpacity={1} fill="url(#colorImp)" />
                                    <Area type="monotone" dataKey="views" stroke="#82ca9d" fillOpacity={1} fill="#82ca9d" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="border border-white/20 p-6 bg-white/5">
                        <h3 className="text-gray-400 text-xs uppercase mb-6">Device Breakdown</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={deviceData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {deviceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
