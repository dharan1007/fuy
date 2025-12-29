"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SpaceBackground } from "@/components/SpaceBackground";

interface Product {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  stock: number;
  status: string;
  isFeatured: boolean;
}

interface BrandAnalytics {
  totalViews: number;
  totalOrders: number;
  totalRevenue: number;
  activeUsers: number;
  avgRating: number;
}

interface Brand {
  id: string;
  name: string;
  description?: string;
  products: Product[];
  analyticsLog?: BrandAnalytics;
}

export default function BrandDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const brandId = params.id as string;

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      loadBrandData();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, session?.user?.id]);

  const loadBrandData = async () => {
    try {
      const res = await fetch(`/api/shop/brands?id=${brandId}`);
      if (res.ok) {
        const data = await res.json();
        setBrand(data.brand);
        setProducts(data.brand?.products || []);
      }
    } catch (error) {
      console.error("Failed to load brand data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while session is authenticating
  if (status === 'loading') {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-black">
        <SpaceBackground />
        <LoadingSpinner message="Loading your brand dashboard..." />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-black text-white">
        <SpaceBackground />
        Please log in
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-black text-white">
        <SpaceBackground />
        Loading...
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-black text-white">
        <SpaceBackground />
        Brand not found
      </div>
    );
  }

  const analytics = brand.analyticsLog || {
    totalViews: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0,
    avgRating: 0,
  };

  return (
    <div className="min-h-screen bg-black relative py-8 px-4 text-white">
      <SpaceBackground />
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{brand.name}</h1>
          <p className="text-gray-300">{brand.description}</p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 border border-white/20 rounded-lg backdrop-blur-sm p-6">
            <p className="text-gray-300 text-sm font-medium mb-2">Total Views</p>
            <p className="text-3xl font-bold text-white">{analytics.totalViews.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 border border-white/20 rounded-lg backdrop-blur-sm p-6">
            <p className="text-gray-300 text-sm font-medium mb-2">Total Orders</p>
            <p className="text-3xl font-bold text-white">{analytics.totalOrders}</p>
          </div>
          <div className="bg-white/5 border border-white/20 rounded-lg backdrop-blur-sm p-6">
            <p className="text-gray-300 text-sm font-medium mb-2">Revenue</p>
            <p className="text-3xl font-bold text-green-400">${analytics.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white/5 border border-white/20 rounded-lg backdrop-blur-sm p-6">
            <p className="text-gray-300 text-sm font-medium mb-2">Average Rating</p>
            <p className="text-3xl font-bold text-yellow-500">{analytics.avgRating.toFixed(1)} ⭐</p>
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white/5 border border-white/20 rounded-lg backdrop-blur-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Products</h2>
            <Link
              href={`/seller/brand/${brandId}/add-product`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              + Add Product
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Price</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Stock</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="px-4 py-4 text-sm text-white font-medium">{product.name}</td>
                      <td className="px-4 py-4 text-sm text-gray-300">
                        ${(product.discountPrice || product.price).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${product.stock > 0 ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                            }`}
                        >
                          {product.stock} units
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${product.status === "ACTIVE"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-gray-500/20 text-gray-300"
                            }`}
                        >
                          {product.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/seller/brand/${brandId}/product/${product.id}/edit`}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">You haven't added any products yet</p>
              <Link
                href={`/seller/brand/${brandId}/add-product`}
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Add Your First Product
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
