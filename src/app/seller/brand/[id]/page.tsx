"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

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
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const brandId = params.id as string;

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (session?.user?.id) {
      loadBrandData();
    }
  }, [session?.user?.id]);

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

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center">Please log in</div>;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!brand) {
    return <div className="min-h-screen flex items-center justify-center">Brand not found</div>;
  }

  const analytics = brand.analyticsLog || {
    totalViews: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0,
    avgRating: 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{brand.name}</h1>
          <p className="text-gray-600">{brand.description}</p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Total Views</p>
            <p className="text-3xl font-bold text-gray-900">{analytics.totalViews.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Total Orders</p>
            <p className="text-3xl font-bold text-gray-900">{analytics.totalOrders}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Revenue</p>
            <p className="text-3xl font-bold text-green-600">${analytics.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Average Rating</p>
            <p className="text-3xl font-bold text-yellow-600">{analytics.avgRating.toFixed(1)} ⭐</p>
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Products</h2>
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
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Price</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Stock</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-900 font-medium">{product.name}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        ${(product.discountPrice || product.price).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            product.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {product.stock} units
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            product.status === "ACTIVE"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {product.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/seller/brand/${brandId}/product/${product.id}/edit`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
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
              <p className="text-gray-600 mb-4">You haven't added any products yet</p>
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
