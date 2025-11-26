"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

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

export default function BooksPage() {
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/user/purchases")
            .then((res) => res.json())
            .then((data: Purchase[]) => {
                // Filter for eBooks
                const myBooks = data.flatMap(order =>
                    order.items
                        .filter(item => item.product.type === "EBOOK")
                        .map(item => item.product)
                );
                setBooks(myBooks);
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
                    <h1 className="text-3xl font-bold tracking-tighter">My Books</h1>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-white/50">Loading books...</div>
                ) : books.length === 0 ? (
                    <div className="text-center py-20 border border-white/10 rounded-xl">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 text-white/30" />
                        <p className="text-xl font-bold mb-2">No books yet</p>
                        <Link href="/shop" className="text-sm underline hover:text-white/70">
                            Browse books
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {books.map((book) => {
                            const images = book.images ? JSON.parse(book.images) : [];
                            const image = images[0] || "/placeholder.png";
                            return (
                                <div key={book.id} className="group cursor-pointer">
                                    <div className="aspect-[2/3] bg-white/10 rounded-lg overflow-hidden relative mb-4 shadow-lg shadow-white/5 transition-transform group-hover:-translate-y-2">
                                        <img src={image} alt={book.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Link
                                                href={`/shop/product/${book.id}`} // Ideally /read/${book.id}
                                                className="px-4 py-2 bg-white text-black font-bold rounded-full text-sm"
                                            >
                                                Read Now
                                            </Link>
                                        </div>
                                    </div>
                                    <h3 className="font-bold leading-tight mb-1 group-hover:text-white/80 transition-colors">{book.name}</h3>
                                    <p className="text-xs text-white/50">Author Name</p> {/* Need to fetch author/seller name */}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
