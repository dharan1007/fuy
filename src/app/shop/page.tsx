"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AppHeader from "@/components/AppHeader";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Product {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  images?: string[];
  brand: { name: string; slug: string };
  isFeatured: boolean;
  isTrending: boolean;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

// Dummy data
const DUMMY_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Classic Black Jacket",
    price: 89.99,
    discountPrice: 64.99,
    images: ["https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=500&h=500&fit=crop"],
    brand: { name: "StyleCo", slug: "styleco" },
    isFeatured: true,
    isTrending: false,
  },
  {
    id: "2",
    name: "Olive Green Blazer",
    price: 109.99,
    discountPrice: 79.99,
    images: ["https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=500&h=500&fit=crop"],
    brand: { name: "FashionHub", slug: "fashionhub" },
    isFeatured: true,
    isTrending: false,
  },
  {
    id: "3",
    name: "White Button-Up Shirt",
    price: 49.99,
    discountPrice: 34.99,
    images: ["https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=500&h=500&fit=crop"],
    brand: { name: "ClassicWear", slug: "classicwear" },
    isFeatured: true,
    isTrending: true,
  },
  {
    id: "4",
    name: "Black Leather Pants",
    price: 129.99,
    discountPrice: 99.99,
    images: ["https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=500&h=500&fit=crop"],
    brand: { name: "StyleCo", slug: "styleco" },
    isFeatured: true,
    isTrending: false,
  },
  {
    id: "5",
    name: "Denim Jacket",
    price: 79.99,
    discountPrice: 59.99,
    images: ["https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=500&h=500&fit=crop"],
    brand: { name: "DenimPro", slug: "denimpro" },
    isFeatured: false,
    isTrending: true,
  },
  {
    id: "6",
    name: "Summer Dress",
    price: 69.99,
    discountPrice: 49.99,
    images: ["https://images.unsplash.com/photo-1595777707802-cbb3668cf981?w=500&h=500&fit=crop"],
    brand: { name: "SummerStyle", slug: "summerstyle" },
    isFeatured: false,
    isTrending: true,
  },
  {
    id: "7",
    name: "Striped T-Shirt",
    price: 39.99,
    discountPrice: 29.99,
    images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop"],
    brand: { name: "CasualWear", slug: "casualwear" },
    isFeatured: false,
    isTrending: true,
  },
  {
    id: "8",
    name: "Wool Sweater",
    price: 99.99,
    discountPrice: 74.99,
    images: ["https://images.unsplash.com/photo-1556821552-5c0ead50f8f2?w=500&h=500&fit=crop"],
    brand: { name: "CozyWear", slug: "cozywear" },
    isFeatured: false,
    isTrending: false,
  },
];

const DUMMY_DEALS = [
  {
    id: "1",
    title: "New Year Collection",
    description: "Fresh styles for the new year",
    discountValue: 25,
    brandId: null,
    brand: undefined,
  },
  {
    id: "2",
    title: "Discount Up to 25%",
    description: "Selected items",
    discountValue: 25,
    brandId: null,
    brand: undefined,
  },
  {
    id: "3",
    title: "Best Fashion in 2024",
    description: "Trending now",
    discountValue: 30,
    brandId: null,
    brand: undefined,
  },
  {
    id: "4",
    title: "End Year Sale",
    description: "Limited time offer",
    discountValue: 40,
    brandId: null,
    brand: undefined,
  },
];

const DUMMY_BRANDS: Brand[] = [
  { id: "1", name: "StyleCo", slug: "styleco", logoUrl: "https://via.placeholder.com/100?text=StyleCo" },
  { id: "2", name: "FashionHub", slug: "fashionhub", logoUrl: "https://via.placeholder.com/100?text=FashionHub" },
  { id: "3", name: "ClassicWear", slug: "classicwear", logoUrl: "https://via.placeholder.com/100?text=Classic" },
  { id: "4", name: "DenimPro", slug: "denimpro", logoUrl: "https://via.placeholder.com/100?text=DenimPro" },
  { id: "5", name: "SummerStyle", slug: "summerstyle", logoUrl: "https://via.placeholder.com/100?text=Summer" },
  { id: "6", name: "CasualWear", slug: "casualwear", logoUrl: "https://via.placeholder.com/100?text=Casual" },
];

export default function ShopPage() {
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState("");

  // Show loading spinner while session is authenticating
  if (status === 'loading') {
    return <LoadingSpinner message="Loading the shop..." />;
  }

  const newArrivals = DUMMY_PRODUCTS.slice(0, 4);
  const trendingProducts = DUMMY_PRODUCTS.filter((p) => p.isTrending);

  const renderProductCard = (product: Product) => (
    <Link key={product.id} href={`/shop/product/${product.id}`}>
      <div className="bg-white dark:bg-neutral-800 rounded-lg overflow-hidden shadow-md dark:shadow-lg hover:shadow-xl dark:hover:shadow-xl transition-all duration-300 cursor-pointer h-full border border-gray-200 dark:border-neutral-700">
        {/* Product Image */}
        <div className="relative w-full aspect-square bg-gray-200 dark:bg-neutral-700 overflow-hidden">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-neutral-700">
              No Image
            </div>
          )}
          {product.discountPrice && (
            <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">
              {Math.round(((product.price - product.discountPrice) / product.price) * 100)}% OFF
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">{product.brand?.name}</p>
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 mb-3">{product.name}</h3>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              ${(product.discountPrice || product.price).toFixed(2)}
            </span>
            {product.discountPrice && (
              <span className="text-xs text-gray-500 dark:text-gray-400 line-through">${product.price.toFixed(2)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900">
      <AppHeader title="Shop" />

      {/* Main Hero Section */}
      <div className="relative w-full bg-black dark:bg-neutral-950 text-white overflow-hidden pt-4 sm:pt-6">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-16 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
          <div className="flex-1 w-full md:w-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">YOUR STYLE IS HERE!</h1>
            <p className="text-base sm:text-lg text-gray-300 dark:text-gray-400 mb-6 sm:mb-8">Discover the latest fashion trends and exclusive collections</p>
            <div className="flex gap-4">
              <button className="px-6 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-600 transition">
                New Year Collection
              </button>
              <button className="px-6 py-2 border-2 border-white text-white font-bold rounded hover:bg-white hover:text-black transition">
                View Collection
              </button>
            </div>
            <div className="mt-4 sm:mt-8 flex flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold">New Year Collection</span>
              </div>
              <span className="text-gray-400 dark:text-gray-500">×</span>
              <div className="flex items-center gap-2">
                <span className="font-bold">Discount Up to 25%</span>
              </div>
              <span className="hidden sm:inline text-gray-400 dark:text-gray-500">×</span>
              <div className="hidden sm:flex items-center gap-2">
                <span className="font-bold">Best Fashion in 2024</span>
              </div>
              <span className="hidden sm:inline text-gray-400 dark:text-gray-500">×</span>
              <div className="hidden sm:flex items-center gap-2">
                <span className="font-bold">End Year Sale</span>
              </div>
            </div>
          </div>
          <div className="flex-1 relative w-full h-64 sm:h-80 md:h-96">
            <img
              src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop"
              alt="Fashion Hero"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Side Banners Section */}
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* End Year Big Sale Banner */}
        <div className="col-span-1 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-neutral-800 dark:to-neutral-700 rounded-lg overflow-hidden">
          <div className="relative h-64 sm:h-80 md:h-96 bg-gray-300 dark:bg-neutral-700 flex items-end justify-between p-4 sm:p-6">
            <img
              src="https://images.unsplash.com/photo-1495386794519-c21d9a3a8d6d?w=300&h=400&fit=crop"
              alt="Model"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="relative z-10">
              <h3 className="text-lg sm:text-2xl font-bold text-white mb-2">END YEAR BIG SALE 🎉</h3>
              <p className="text-white text-xs sm:text-sm mb-4">The Modern Classic</p>
              <button className="px-4 sm:px-6 py-2 bg-yellow-500 text-black font-bold rounded text-sm hover:bg-yellow-600">
                Shop Now
              </button>
            </div>
          </div>
        </div>

        {/* Stay up to date banner */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-gray-900 dark:bg-neutral-800 text-white rounded-lg p-4 sm:p-6 flex flex-col justify-between border border-gray-800 dark:border-neutral-700">
            <div>
              <h3 className="text-lg sm:text-2xl font-bold mb-2">STAY UP TO DATE BY JOINING OUR NEWSLETTER</h3>
              <p className="text-xs sm:text-sm text-gray-300 dark:text-gray-400">Get the latest collection & exclusive vouchers</p>
            </div>
            <button className="px-4 sm:px-6 py-2 border border-white text-white font-bold rounded text-sm w-fit hover:bg-white hover:text-black transition mt-4">
              Join Now
            </button>
          </div>

          {/* Featured Collection Banner */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-700 dark:to-purple-800 rounded-lg p-4 sm:p-6 text-white flex flex-col justify-between">
            <div>
              <p className="text-xs sm:text-sm font-semibold mb-2">NEW COLLECTION</p>
              <h3 className="text-lg sm:text-2xl font-bold">SUMMER VIBES</h3>
            </div>
            <button className="px-4 sm:px-6 py-2 bg-white dark:bg-gray-200 text-blue-600 dark:text-blue-700 font-bold rounded text-sm w-fit hover:bg-gray-100 dark:hover:bg-gray-300 transition mt-4">
              Explore
            </button>
          </div>
        </div>
      </div>

      {/* Hot Deals Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white">🔥 Hot Deals from Brands</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DUMMY_DEALS.map((deal) => (
            <div key={deal.id} className="bg-gradient-to-br from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-800 text-white rounded-lg p-6 text-center">
              <p className="text-sm font-medium mb-2">{deal.title}</p>
              <div className="text-4xl font-bold mb-4">{deal.discountValue}% OFF</div>
              <p className="text-sm text-blue-100 dark:text-blue-200 mb-4">{deal.description}</p>
              <button className="w-full bg-yellow-400 dark:bg-yellow-500 text-gray-900 dark:text-black py-2 rounded font-bold hover:bg-yellow-500 dark:hover:bg-yellow-600 transition">
                Shop Now
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* New Arrivals Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 border-t border-gray-200 dark:border-neutral-700">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📦 NEW ARRIVALS</h2>
          <Link href="/shop/new" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold text-sm">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {newArrivals.map(renderProductCard)}
        </div>
      </div>

      {/* Trending Products Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 border-t border-gray-200 dark:border-neutral-700">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">⭐ TRENDING</h2>
          <Link href="/shop/trending" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold text-sm">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingProducts.map(renderProductCard)}
        </div>
      </div>

      {/* Brands Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 border-t border-gray-200 dark:border-neutral-700">
        <h2 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white">🏢 FEATURED BRANDS</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {DUMMY_BRANDS.map((brand) => (
            <Link key={brand.id} href={`/shop/brand/${brand.slug}`}>
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 text-center hover:shadow-lg dark:hover:shadow-xl transition-shadow cursor-pointer border border-gray-200 dark:border-neutral-700">
                <div className="w-full h-20 bg-gray-100 dark:bg-neutral-700 rounded flex items-center justify-center mb-3">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{brand.name}</span>
                </div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{brand.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Seller CTA Section */}
      <div className="bg-blue-600 dark:bg-blue-700 text-white py-16 mt-12">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold mb-4">Start Selling Today</h2>
          <p className="text-lg mb-8 text-blue-100 dark:text-blue-200">Join thousands of sellers and reach millions of customers</p>
          {session ? (
            <Link
              href="/seller/create-brand"
              className="inline-block bg-yellow-400 dark:bg-yellow-500 text-gray-900 dark:text-black px-8 py-3 rounded-lg font-bold hover:bg-yellow-500 dark:hover:bg-yellow-600 transition-colors"
            >
              Create Your Brand Now →
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-block bg-yellow-400 dark:bg-yellow-500 text-gray-900 dark:text-black px-8 py-3 rounded-lg font-bold hover:bg-yellow-500 dark:hover:bg-yellow-600 transition-colors"
            >
              Sign in to Start Selling →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
