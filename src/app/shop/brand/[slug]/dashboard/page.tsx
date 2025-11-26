'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Analytics {
    totalViews: number;
    totalImpressions: number;
    totalOrders: number; // Redirects
    totalRevenue: number;
}

interface ProductStats {
    id: string;
    name: string;
    views: number;
    impressions: number;
    redirects: number;
}

interface Competitor {
    id: string;
    name: string;
    logoUrl: string | null;
}

export default function BrandDashboard() {
    const params = useParams();
    const router = useRouter();
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [productStats, setProductStats] = useState<ProductStats[]>([]);
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, all

    useEffect(() => {
        if (params.slug) {
            fetchDashboardData(params.slug as string);
        }
    }, [params.slug]);

    const fetchDashboardData = async (slug: string) => {
        try {
            const brandRes = await fetch(`/api/shop/brands/${slug}`);
            if (!brandRes.ok) throw new Error('Brand not found');
            const brandData = await brandRes.json();
            setCompetitors(brandData.competitors || []);

            const analyticsRes = await fetch(`/api/shop/analytics?brandId=${brandData.id}`);
            if (analyticsRes.ok) {
                const data = await analyticsRes.json();
                setAnalytics(data.brandAnalytics);
                setProductStats(data.productAnalytics);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setLoading(false);
        }
    };

    // Mock Data Generation for Charts (using real totals)
    const generateChartData = () => {
        if (!analytics) return [];
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        // Distribute totals somewhat randomly over 7 days
        return days.map(day => ({
            name: day,
            impressions: Math.floor(Math.random() * (analytics.totalImpressions || 0) / 2),
            views: Math.floor(Math.random() * (analytics.totalViews || 0) / 2),
            redirects: Math.floor(Math.random() * (analytics.totalOrders || 0) / 2),
        }));
    };

    const chartData = generateChartData();

    const funnelData = [
        { name: 'Impressions', value: analytics?.totalImpressions || 0, fill: '#8884d8' },
        { name: 'Views', value: analytics?.totalViews || 0, fill: '#82ca9d' },
        { name: 'Redirects', value: analytics?.totalOrders || 0, fill: '#ffc658' },
    ];

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">LOADING DATA...</div>;

    return (
        <div className="min-h-screen bg-black text-white font-mono p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/shop')}
                    className="mb-8 text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-2"
                >
                    ← Back to Shop
                </button>

                <header className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-white/20 pb-6 gap-4">
                    <div>
                        <h1 className="text-4xl font-bold uppercase tracking-tighter mb-2">Dashboard</h1>
                        <p className="text-gray-500 text-sm">Overview & Analytics</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => router.push(`/shop/brand/${params.slug}/dashboard/hype`)}
                            className="px-6 py-3 bg-white text-black font-bold uppercase text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                            Hype Up
                        </button>
                    </div>
                </header>

                {/* Date Filter */}
                <div className="flex justify-end mb-6">
                    <div className="bg-white/5 border border-white/20 rounded-full p-1 flex">
                        {['7d', '30d', 'all'].map(range => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-4 py-1 rounded-full text-xs font-bold uppercase transition-colors ${dateRange === range ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                    <div className="border border-white/20 p-6 bg-white/5">
                        <h3 className="text-gray-400 text-xs uppercase mb-6">Traffic Overview</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#666" />
                                    <YAxis stroke="#666" />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                                    <Area type="monotone" dataKey="impressions" stroke="#8884d8" fillOpacity={1} fill="url(#colorImpressions)" />
                                    <Area type="monotone" dataKey="views" stroke="#82ca9d" fillOpacity={1} fill="url(#colorViews)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="border border-white/20 p-6 bg-white/5">
                        <h3 className="text-gray-400 text-xs uppercase mb-6">Conversion Funnel</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={funnelData} layout="vertical">
                                    <XAxis type="number" stroke="#666" />
                                    <YAxis dataKey="name" type="category" stroke="#666" width={100} />
                                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                                    <Bar dataKey="value" fill="#8884d8" barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Tools & Resources */}
                <h2 className="text-xl font-bold uppercase mb-8">Tools & Resources</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <div
                        onClick={() => router.push(`/shop/brand/${params.slug}/dashboard/inventory`)}
                        className="border border-white/20 p-8 hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                        <h3 className="text-lg font-bold mb-2 group-hover:text-purple-400 transition-colors">Inventory Manager</h3>
                        <p className="text-sm text-gray-500 mb-4">Manage your products, stock, and pricing.</p>
                        <span className="text-xs uppercase border-b border-white/20 pb-1">Manage Products →</span>
                    </div>
                    <div
                        onClick={() => router.push(`/shop/brand/${params.slug}/dashboard/insights`)}
                        className="border border-white/20 p-8 hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                        <h3 className="text-lg font-bold mb-2 group-hover:text-blue-400 transition-colors">FUY Insights</h3>
                        <p className="text-sm text-gray-500 mb-4">Deep dive into your brand's performance.</p>
                        <span className="text-xs uppercase border-b border-white/20 pb-1">View Reports →</span>
                    </div>
                    <div
                        onClick={() => router.push(`/shop/brand/${params.slug}/dashboard/support`)}
                        className="border border-white/20 p-8 hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                        <h3 className="text-lg font-bold mb-2 group-hover:text-green-400 transition-colors">Customer Support</h3>
                        <p className="text-sm text-gray-500 mb-4">Get help with your store setup.</p>
                        <span className="text-xs uppercase border-b border-white/20 pb-1">Contact Us →</span>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <div className="border border-white/20 p-8">
                        <h3 className="text-gray-500 text-xs uppercase mb-4">Total Views</h3>
                        <p className="text-5xl font-bold">{analytics?.totalViews || 0}</p>
                    </div>
                    <div className="border border-white/20 p-8">
                        <h3 className="text-gray-500 text-xs uppercase mb-4">Redirects</h3>
                        <p className="text-5xl font-bold">{analytics?.totalOrders || 0}</p>
                    </div>
                    <div className="border border-white/20 p-8">
                        <h3 className="text-gray-500 text-xs uppercase mb-4">Conversion</h3>
                        <p className="text-5xl font-bold">
                            {analytics?.totalViews ? ((analytics.totalOrders / analytics.totalViews) * 100).toFixed(1) : 0}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
