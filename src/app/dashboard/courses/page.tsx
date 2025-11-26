"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";

interface Purchase {
    id: string;
    items: {
        id: string;
        product: {
            id: string;
            name: string;
            images: string;
            type: string;
            description: string;
        };
    }[];
}

export default function CoursesPage() {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/user/purchases")
            .then((res) => res.json())
            .then((data: Purchase[]) => {
                // Filter for courses
                const myCourses = data.flatMap(order =>
                    order.items
                        .filter(item => item.product.type === "COURSE")
                        .map(item => item.product)
                );
                setCourses(myCourses);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 font-mono">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center mb-8">
                    <Link href="/dashboard" className="mr-4 p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tighter">My Courses</h1>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-white/50">Loading courses...</div>
                ) : courses.length === 0 ? (
                    <div className="text-center py-20 border border-white/10 rounded-xl">
                        <GraduationCap className="w-12 h-12 mx-auto mb-4 text-white/30" />
                        <p className="text-xl font-bold mb-2">No courses yet</p>
                        <Link href="/shop" className="text-sm underline hover:text-white/70">
                            Browse courses
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => {
                            const images = course.images ? JSON.parse(course.images) : [];
                            const image = images[0] || "/placeholder.png";
                            return (
                                <div key={course.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/30 transition-all group">
                                    <div className="aspect-video bg-white/10 relative">
                                        <img src={image} alt={course.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Link
                                                href={`/shop/product/${course.id}`} // Ideally /learn/${course.id}
                                                className="px-6 py-2 bg-white text-black font-bold rounded-full transform scale-90 group-hover:scale-100 transition-transform"
                                            >
                                                Continue Learning
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-xl font-bold mb-2">{course.name}</h3>
                                        <p className="text-sm text-white/50 line-clamp-2">{course.description}</p>
                                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                            <span className="text-xs uppercase tracking-wider text-white/40">Progress</span>
                                            <span className="text-xs font-bold">0%</span>
                                        </div>
                                        {/* Mock Progress Bar */}
                                        <div className="w-full h-1 bg-white/10 mt-2 rounded-full overflow-hidden">
                                            <div className="w-0 h-full bg-white" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
