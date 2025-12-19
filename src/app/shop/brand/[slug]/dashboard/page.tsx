'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { SpaceBackground } from '@/components/SpaceBackground';
import Link from 'next/link';
import { Package, TrendingUp, Users, DollarSign, Activity, ArrowUpRight, Box } from 'lucide-react';

interface Analytics {
    totalViews: number;
    totalImpressions: number;
    totalOrders: number; // Redirects
    totalRevenue: number;
}

interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    images: string | null;
}

interface BrandData {
    id: string;
    products: Product[];
    competitors: any[];
}

export default function BrandDashboard() {
    const params = useParams();
    const router = useRouter();
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [brandData, setBrandData] = useState<BrandData | null>(null);
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
            const bData = await brandRes.json();
            setBrandData(bData);

            const analyticsRes = await fetch(`/api/shop/analytics?brandId=${bData.id}`);
            if (analyticsRes.ok) {
                const data = await analyticsRes.json();
                setAnalytics(data.brandAnalytics);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setLoading(false);
        }
    };

    // Mock Data using real totals
    const chartData = analytics ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
        name: day,
        impressions: Math.floor(Math.random() * (analytics.totalImpressions || 100) / 7 + 10),
        views: Math.floor(Math.random() * (analytics.totalViews || 50) / 7 + 5),
        redirects: Math.floor(Math.random() * (analytics.totalOrders || 20) / 7 + 1),
    })) : [];

    const productPerformance = brandData?.products.slice(0, 5).map(p => ({
        name: p.name,
        sales: Math.floor(Math.random() * 50) + 10,
        views: Math.floor(Math.random() * 500) + 50
    })) || [];

    if (loading) return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono relative">
            <SpaceBackground />
            <div className="z-10 animate-pulse">WARPING TO COMMAND...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden relative">
            <SpaceBackground />

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <button
                            onClick={() => router.push('/shop')}
                            className="mb-4 text-xs font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                            ← Return to Sector
                        </button>
                        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                            Command Station
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">Brand Logistics & Intel</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => router.push(`/shop/brand/${params.slug}/dashboard/inventory`)}
                            className="px-6 py-3 border border-white/20 hover:bg-white/10 text-white font-bold uppercase text-xs rounded-lg backdrop-blur-sm transition-all"
                        >
                            Inventory
                        </button>
                        <button
                            onClick={() => router.push(`/shop/brand/${params.slug}/dashboard/hype`)}
                            className="px-6 py-3 bg-white text-black font-black uppercase text-xs rounded-lg hover:bg-gray-200 transition-colors shadow-lg shadow-white/10"
                        >
                            Boost Signal
                        </button>
                    </div>
                </header>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <KPICard title="Total Traffic" value={analytics?.totalImpressions || 0} icon={<Activity size={18} />} color="blue" />
                    <KPICard title="Product Views" value={analytics?.totalViews || 0} icon={<Users size={18} />} color="purple" />
                    <KPICard title="Redirects" value={analytics?.totalOrders || 0} icon={<ArrowUpRight size={18} />} color="green" />
                    <KPICard title="Conversion" value={`${analytics?.totalViews ? ((analytics.totalOrders / analytics.totalViews) * 100).toFixed(1) : 0}%`} icon={<TrendingUp size={18} />} color="orange" />
                </div>

                {/* Main Analytics + Inventory Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">

                    {/* Charts Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Traffic Overview Chart */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-300">Traffic Analysis</h3>
                                <div className="flex gap-2">
                                    {['7D', '30D', 'ALL'].map(range => (
                                        <button
                                            key={range}
                                            onClick={() => setDateRange(range.toLowerCase())}
                                            className={`px-3 py-1 rounded text-[10px] font-bold ${dateRange === range.toLowerCase() ? 'bg-white text-black' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                                        >
                                            {range}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorView" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff' }}
                                            itemStyle={{ fontSize: '12px' }}
                                        />
                                        <Area type="monotone" dataKey="impressions" stroke="#60a5fa" strokeWidth={2} fillOpacity={1} fill="url(#colorImp)" />
                                        <Area type="monotone" dataKey="views" stroke="#c084fc" strokeWidth={2} fillOpacity={1} fill="url(#colorView)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Product Performance Bar Chart */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Product Performance Bar Chart */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-300 mb-6">Top Performers</h3>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={productPerformance} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                            <XAxis type="number" stroke="#666" fontSize={10} hide />
                                            <YAxis dataKey="name" type="category" stroke="#999" fontSize={10} width={80} tickLine={false} axisLine={false} />
                                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#000', borderColor: '#333' }} />
                                            <Bar dataKey="views" fill="#e879f9" radius={[0, 4, 4, 0]} barSize={10} />
                                            <Bar dataKey="sales" fill="#4ade80" radius={[0, 4, 4, 0]} barSize={10} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Conversion Funnel */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-300 mb-6">Conversion Funnel</h3>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[
                                            { name: 'Impressions', value: analytics?.totalImpressions || 0, fill: '#60a5fa' },
                                            { name: 'Views', value: analytics?.totalViews || 0, fill: '#c084fc' },
                                            { name: 'Purchases', value: analytics?.totalOrders || 0, fill: '#4ade80' },
                                        ]} layout="vertical" margin={{ left: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                            <XAxis type="number" stroke="#666" fontSize={10} hide />
                                            <YAxis dataKey="name" type="category" stroke="#999" fontSize={10} width={70} tickLine={false} axisLine={false} />
                                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#000', borderColor: '#333' }} />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Inventory Snapshot Column */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-300">Inventory Status</h3>
                            <button onClick={() => router.push(`/shop/brand/${params.slug}/dashboard/inventory`)} className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase transition-colors">Manage All</button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[600px] scrollbar-thin scrollbar-thumb-white/20">
                            {brandData?.products && brandData.products.length > 0 ? (
                                brandData.products.slice(0, 10).map((product) => (
                                    <div key={product.id} className="flex items-center gap-3 p-3 bg-black/40 rounded-lg border border-white/5 hover:border-white/20 transition-colors group">
                                        <div className="h-10 w-10 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                                            {product.images ? (
                                                <img src={JSON.parse(product.images)[0]} alt={product.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex items-center justify-center w-full h-full text-xs text-gray-500"><Box size={14} /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-bold text-gray-200 truncate group-hover:text-white">{product.name}</h4>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-[10px] text-gray-500 uppercase">{product.category}</span>
                                                <span className="text-xs font-mono text-green-400">${product.price}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-gray-500 text-xs">No products in manifest.</div>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/10">
                            <button
                                onClick={() => router.push(`/shop/brand/${params.slug}/dashboard/inventory`)}
                                className="w-full py-3 border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/40 hover:bg-white/5 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2"
                            >
                                <Package size={14} />
                                Add New Cargo
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tools & Resources */}
                <h2 className="text-xl font-bold uppercase mb-8 ml-1">Tools & Resources</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <div
                        onClick={() => router.push(`/shop/brand/${params.slug}/dashboard/inventory`)}
                        className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/[0.07] hover:border-white/30 transition-all cursor-pointer group"
                    >
                        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg w-fit mb-4 group-hover:bg-purple-500/20 transition-colors">
                            <Package size={24} />
                        </div>
                        <h3 className="text-lg font-bold mb-2 text-white group-hover:text-purple-400 transition-colors">Inventory Manager</h3>
                        <p className="text-sm text-gray-400 mb-4">Manage your products, stock, and pricing efficiently.</p>
                        <span className="text-xs font-bold uppercase text-gray-500 group-hover:text-white transition-colors flex items-center gap-2">Manage Products <ArrowUpRight size={12} /></span>
                    </div>
                    <div
                        onClick={() => router.push(`/shop/brand/${params.slug}/dashboard/insights`)}
                        className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/[0.07] hover:border-white/30 transition-all cursor-pointer group"
                    >
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg w-fit mb-4 group-hover:bg-blue-500/20 transition-colors">
                            <Activity size={24} />
                        </div>
                        <h3 className="text-lg font-bold mb-2 text-white group-hover:text-blue-400 transition-colors">FUY Insights</h3>
                        <p className="text-sm text-gray-400 mb-4">Deep dive into your brand's performance and analytics.</p>
                        <span className="text-xs font-bold uppercase text-gray-500 group-hover:text-white transition-colors flex items-center gap-2">View Reports <ArrowUpRight size={12} /></span>
                    </div>
                    <div
                        onClick={() => router.push(`/shop/brand/${params.slug}/dashboard/support`)}
                        className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/[0.07] hover:border-white/30 transition-all cursor-pointer group"
                    >
                        <div className="p-3 bg-green-500/10 text-green-400 rounded-lg w-fit mb-4 group-hover:bg-green-500/20 transition-colors">
                            <Users size={24} />
                        </div>
                        <h3 className="text-lg font-bold mb-2 text-white group-hover:text-green-400 transition-colors">Customer Support</h3>
                        <p className="text-sm text-gray-400 mb-4">Get help with your store setup and manage tickets.</p>
                        <span className="text-xs font-bold uppercase text-gray-500 group-hover:text-white transition-colors flex items-center gap-2">Contact Us <ArrowUpRight size={12} /></span>
                    </div>
                </div>

            </div>
        </div>
    );
}

function KPICard({ title, value, icon, color }: { title: string, value: string | number, icon: any, color: string }) {
    const colorMap: Record<string, string> = {
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        green: 'text-green-400 bg-green-500/10 border-green-500/20',
        orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:bg-white/[0.07] transition-all group">
            <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">{title}</span>
                <div className={`p-2 rounded-lg decoration-clone ${colorMap[color] || 'text-white'}`}>
                    {icon}
                </div>
            </div>
            <div className="text-3xl font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
                {value}
            </div>
        </div>
    );
}
