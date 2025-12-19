"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Check, X, ShieldAlert, User as UserIcon, Store as StoreIcon, AlertTriangle, Search, Ban, Trash2, Unlock, FileText, Calendar, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type TabType = "reports" | "users" | "brands" | "posts";

interface ReportedPost {
    id: string;
    reason: string;
    details: string | null;
    status: string;
    createdAt: string;
    reporter: {
        name: string | null;
        email: string;
        profile: { avatarUrl: string | null; displayName?: string | null } | null;
    };
    post: {
        id: string;
        content: string;
        user: {
            name: string | null;
            email: string;
            profile: { avatarUrl: string | null; displayName?: string | null } | null;
        };
        media: { url: string; type: string }[];
    };
}

interface UserData {
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
    lastSeen: string | null;
    profile: {
        avatarUrl: string | null;
        displayName: string | null;
    } | null;
    isBanned: boolean;
    _count: { posts: number, reportsMade: number };
}

interface BrandData {
    id: string;
    name: string;
    status: string; // ACTIVE, SUSPENDED, INACTIVE
    owner: { name: string | null; email: string };
}

interface PostData {
    id: string;
    content: string;
    postType: string;
    feature: string;
    visibility: string;
    createdAt: string;
    moderationStatus: string;
    status: string;
    user: {
        id: string;
        name: string | null;
        email: string;
        profile: { avatarUrl: string | null; displayName?: string | null } | null;
    };
    _count: {
        likes: number;
        comments: number;
        reports: number;
    };
}

export default function ModerationPage() {
    const [activeTab, setActiveTab] = useState<TabType>("reports");
    const [search, setSearch] = useState("");

    // Data States
    const [reports, setReports] = useState<ReportedPost[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [brands, setBrands] = useState<BrandData[]>([]);
    const [posts, setPosts] = useState<PostData[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError("");
        try {
            const query = new URLSearchParams({ type: activeTab, search });
            const res = await fetch(`/api/admin/moderation?${query.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch data");

            const data = await res.json();

            if (activeTab === "reports") setReports(data.reports || []);
            else if (activeTab === "users") setUsers(data.users || []);
            else if (activeTab === "brands") setBrands(data.brands || []);
            else if (activeTab === "posts") setPosts(data.posts || []);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => fetchData(), 500); // Debounce search
        return () => clearTimeout(timeout);
    }, [activeTab, search]);

    const handleAction = async (
        targetId: string,
        action: string,
        reportId?: string
    ) => {
        // For bans, we might want a reason prompt. For now simplified to default.
        const reason = action.includes("BAN") ? prompt("Enter reason for this action:") : undefined;
        if (action.includes("BAN") && !reason) return; // Cancel if no reason

        if (action.includes("DELETE") && !confirm("Are you sure? This action is irreversible.")) return;

        setProcessingId(targetId || reportId || "action");
        try {
            const res = await fetch("/api/admin/moderation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reportId,
                    targetId,
                    action,
                    reason
                }),
            });

            if (!res.ok) throw new Error("Action failed");

            // Refresh data
            fetchData();
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <header className="max-w-6xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </Link>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <ShieldAlert className="text-red-500" />
                            Admin Console
                        </h1>
                    </div>

                    {/* Search */}
                    {(activeTab === "users" || activeTab === "brands" || activeTab === "posts") && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab}...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-zinc-900 border border-zinc-700 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white/50 w-full md:w-64"
                            />
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-zinc-800">
                    <button
                        onClick={() => setActiveTab("reports")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === "reports" ? "border-red-500 text-red-500" : "border-transparent text-zinc-400 hover:text-white"}`}
                    >
                        <AlertTriangle className="w-4 h-4" /> Reports
                    </button>
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === "users" ? "border-blue-500 text-blue-500" : "border-transparent text-zinc-400 hover:text-white"}`}
                    >
                        <UserIcon className="w-4 h-4" /> Users
                    </button>
                    <button
                        onClick={() => setActiveTab("brands")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === "brands" ? "border-green-500 text-green-500" : "border-transparent text-zinc-400 hover:text-white"}`}
                    >
                        <StoreIcon className="w-4 h-4" /> Stores
                    </button>
                    <button
                        onClick={() => setActiveTab("posts")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === "posts" ? "border-purple-500 text-purple-500" : "border-transparent text-zinc-400 hover:text-white"}`}
                    >
                        <FileText className="w-4 h-4" /> Posts
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto">
                {loading && (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin w-8 h-8 text-zinc-500" />
                    </div>
                )}

                {!loading && error && (
                    <div className="p-4 bg-red-900/20 text-red-400 rounded-lg border border-red-900/50">
                        Error: {error}
                    </div>
                )}

                {/* REPORTS TAB */}
                {!loading && activeTab === "reports" && (
                    reports.length === 0 ? (
                        <div className="text-center py-20 border border-zinc-800 rounded-xl bg-zinc-900/50">
                            <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                            <h2 className="text-xl font-semibold mb-2">All Clean!</h2>
                            <p className="text-zinc-500">No pending reports.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {reports.map((report) => (
                                <div key={report.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg flex flex-col md:flex-row">
                                    {/* Same Report UI as before */}
                                    <div className="md:w-1/3 bg-black/50 p-4 border-b md:border-b-0 md:border-r border-zinc-800">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                                                <img src={report.post.user.profile?.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=User"} className="object-cover w-full h-full" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{report.post.user.profile?.displayName || report.post.user.name || "Unknown"}</div>
                                                <div className="text-xs text-zinc-500">Post Owner</div>
                                            </div>
                                        </div>
                                        <div className="text-sm mb-4 min-h-[60px]">{report.post.content}</div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">{report.reason}</span>
                                                <span className="text-xs text-zinc-500">Rep by: {report.reporter.name}</span>
                                            </div>
                                            {report.details && <p className="text-sm italic text-zinc-400 mb-4">"{report.details}"</p>}
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => handleAction("", "DELETE_POST", report.id)} disabled={!!processingId} className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded text-sm disabled:opacity-50">Remove Post</button>
                                            <button onClick={() => handleAction("", "DISMISS_REPORT", report.id)} disabled={!!processingId} className="flex-1 bg-zinc-700 hover:bg-zinc-600 py-2 rounded text-sm disabled:opacity-50">Dismiss</button>
                                            <button onClick={() => handleAction("", "KEEP_POST", report.id)} disabled={!!processingId} className="text-zinc-400 hover:text-white px-4 text-sm disabled:opacity-50">Keep</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* USERS TAB */}
                {!loading && activeTab === "users" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-zinc-400 text-xs uppercase border-b border-zinc-800">
                                    <th className="p-4">User</th>
                                    <th className="p-4">Joined / Seen</th>
                                    <th className="p-4">Stats</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden">
                                                    <img src={user.profile?.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=" + user.email} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm text-white">{user.name || user.profile?.displayName || "Unknown User"}</div>
                                                    <div className="text-xs text-zinc-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-zinc-400">
                                            <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(user.createdAt).toLocaleDateString()}</div>
                                            {user.lastSeen && <div className="flex items-center gap-1 text-xs mt-1"><Eye className="w-3 h-3" /> {formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}</div>}
                                        </td>
                                        <td className="p-4 text-sm text-zinc-400">
                                            <div>{user._count?.posts || 0} Posts</div>
                                            <div>{user._count?.reportsMade || 0} Reports</div>
                                        </td>
                                        <td className="p-4">
                                            {user.isBanned ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-500 text-xs font-bold border border-red-500/30">
                                                    <Ban className="w-3 h-3" /> Banned
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-bold border border-green-500/30">
                                                    <Check className="w-3 h-3" /> Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            {user.isBanned ? (
                                                <button
                                                    onClick={() => handleAction(user.id, "UNBAN_USER")}
                                                    disabled={!!processingId}
                                                    className="inline-flex items-center justify-center p-2 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                                                    title="Unban User"
                                                >
                                                    <Unlock className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleAction(user.id, "BAN_USER")}
                                                    disabled={!!processingId}
                                                    className="inline-flex items-center justify-center p-2 rounded bg-zinc-800 hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-colors"
                                                    title="Ban User"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleAction(user.id, "DELETE_USER")}
                                                disabled={!!processingId}
                                                className="inline-flex items-center justify-center p-2 rounded bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-colors border border-red-500/20"
                                                title="Delete User Permanently"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && <tr className="text-center text-zinc-500 p-8"><td colSpan={4} className="py-8">No users found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* BRANDS TAB */}
                {!loading && activeTab === "brands" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-zinc-400 text-xs uppercase border-b border-zinc-800">
                                    <th className="p-4">Store Brand</th>
                                    <th className="p-4">Owner</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {brands.map((brand) => (
                                    <tr key={brand.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-white">{brand.name}</div>
                                            <div className="text-xs text-zinc-500 font-mono">{brand.id}</div>
                                        </td>
                                        <td className="p-4 text-sm text-zinc-400">
                                            <div>{brand.owner?.name || "Unknown"}</div>
                                            <div className="text-xs">{brand.owner?.email}</div>
                                        </td>
                                        <td className="p-4">
                                            {brand.status === "SUSPENDED" ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-500 text-xs font-bold border border-red-500/30">
                                                    <Ban className="w-3 h-3" /> Suspended
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-bold border border-green-500/30">
                                                    <Check className="w-3 h-3" /> Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            {brand.status === "SUSPENDED" ? (
                                                <button
                                                    onClick={() => handleAction(brand.id, "UNBAN_STORE")}
                                                    disabled={!!processingId}
                                                    className="inline-flex items-center justify-center p-2 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                                                    title="Restore Store"
                                                >
                                                    <Unlock className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleAction(brand.id, "BAN_STORE")}
                                                    disabled={!!processingId}
                                                    className="inline-flex items-center justify-center p-2 rounded bg-zinc-800 hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-colors"
                                                    title="Suspend Store"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleAction(brand.id, "DELETE_STORE")}
                                                disabled={!!processingId}
                                                className="inline-flex items-center justify-center p-2 rounded bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-colors border border-red-500/20"
                                                title="Delete Store Permanently"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {brands.length === 0 && <tr className="text-center text-zinc-500 p-8"><td colSpan={4} className="py-8">No stores found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* POSTS TAB */}
                {!loading && activeTab === "posts" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-zinc-400 text-xs uppercase border-b border-zinc-800">
                                    <th className="p-4">Content</th>
                                    <th className="p-4">Type / Feature</th>
                                    <th className="p-4">Author</th>
                                    <th className="p-4">Stats</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {posts.map((post) => (
                                    <tr key={post.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 max-w-xs">
                                            <div className="line-clamp-2 text-white font-medium">{post.content || "(Media Post)"}</div>
                                            <div className="text-xs text-zinc-500 mt-1 flex gap-2">
                                                <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                                                <span className="bg-zinc-800 px-1 rounded">{post.visibility}</span>
                                                {post.moderationStatus !== "CLEAN" && <span className="text-red-400 font-bold">{post.moderationStatus}</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm">
                                            <div className="text-white bg-zinc-800 px-2 py-1 rounded inline-block text-xs font-mono">{post.postType}</div>
                                            <div className="text-zinc-500 text-xs mt-1">{post.feature}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden">
                                                    <img src={post.user.profile?.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=" + post.user.email} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="text-sm">
                                                    <div className="text-white">{post.user.profile?.displayName || post.user.name}</div>
                                                    <div className="text-xs text-zinc-500">{post.user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-zinc-400">
                                            <div title="Likes">❤️ {post._count.likes}</div>
                                            <div title="Comments">💬 {post._count.comments}</div>
                                            {post._count.reports > 0 && <div className="text-red-400 font-bold">⚠️ {post._count.reports} Reports</div>}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleAction(post.id, "DELETE_POST")}
                                                disabled={!!processingId}
                                                className="inline-flex items-center justify-center p-2 rounded bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-colors border border-red-500/20"
                                                title="Delete Post"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {posts.length === 0 && <tr className="text-center text-zinc-500 p-8"><td colSpan={5} className="py-8">No posts found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}
