"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/lib/cartStore";
import AppHeader from "@/components/AppHeader";

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

interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  date: string;
}

// Dummy products from main shop page
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

// Dummy reviews
const DUMMY_REVIEWS: Review[] = [
  {
    id: "1",
    authorName: "Sarah Johnson",
    rating: 5,
    comment: "Excellent quality and great fit! Highly recommended.",
    date: "2025-10-25",
  },
  {
    id: "2",
    authorName: "Mike Chen",
    rating: 4,
    comment: "Good product, shipping was fast. Material is comfortable.",
    date: "2025-10-20",
  },
  {
    id: "3",
    authorName: "Emma Wilson",
    rating: 5,
    comment: "Perfect! Exactly as described. Will definitely order again.",
    date: "2025-10-15",
  },
  {
    id: "4",
    authorName: "James Brown",
    rating: 3,
    comment: "Average quality for the price. Expected better.",
    date: "2025-10-10",
  },
];

export default function ProductDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const productId = params.id as string;
  const addItemToCart = useCartStore((state) => state.addItem);

  const product = DUMMY_PRODUCTS.find((p) => p.id === productId);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("M");
  const [addedToCart, setAddedToCart] = useState(false);

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-8">The product you're looking for doesn't exist.</p>
          <Link
            href="/shop"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const discount = product.discountPrice ? Math.round(((product.price - product.discountPrice) / product.price) * 100) : 0;
  const averageRating = (DUMMY_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / DUMMY_REVIEWS.length).toFixed(1);
  const currentPrice = product.discountPrice || product.price;

  const handleAddToCart = () => {
    if (!product) return;

    addItemToCart({
      productId: product.id,
      productName: product.name,
      price: product.price,
      discountPrice: product.discountPrice,
      quantity,
      image: product.images?.[0],
      brand: product.brand.name,
      size: selectedSize,
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const relatedProducts = DUMMY_PRODUCTS.filter((p) => p.brand.slug === product.brand.slug && p.id !== productId).slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title={product.name} showBackButton />

      {/* Main Product Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 pt-4 sm:pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-lg overflow-hidden aspect-square relative">
              <img
                src={product.images?.[0] || "/placeholder.jpg"}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {discount > 0 && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  -{discount}%
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500">
                  <img
                    src={product.images?.[0] || "/placeholder.jpg"}
                    alt={`${product.name} ${i}`}
                    className="w-full h-full object-cover aspect-square"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col gap-6">
            {/* Brand and Title */}
            <div>
              <Link href={`/shop?brand=${product.brand.slug}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-2">
                {product.brand.name}
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{product.name}</h1>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-5 h-5 ${star <= Math.round(parseFloat(averageRating)) ? "text-yellow-400" : "text-gray-300"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {averageRating} · {DUMMY_REVIEWS.length} reviews
                </span>
              </div>
            </div>

            {/* Pricing */}
            <div className="border-t border-b border-gray-200 py-6">
              <div className="flex items-end gap-3 mb-4">
                <span className="text-4xl font-bold text-gray-900">${currentPrice.toFixed(2)}</span>
                {discount > 0 && <span className="text-xl text-gray-500 line-through">${product.price.toFixed(2)}</span>}
              </div>
              {discount > 0 && <p className="text-sm text-green-600 font-semibold">Save ${(product.price - currentPrice).toFixed(2)}</p>}
            </div>

            {/* Size/Quantity Selection */}
            <div className="space-y-4">
              {/* Size */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-3 block">Size</label>
                <div className="grid grid-cols-4 gap-3">
                  {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-3 py-2 border-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedSize === size
                          ? "bg-blue-50 border-blue-500 text-blue-600"
                          : "border-gray-300 hover:border-blue-500"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-3 block">Quantity</label>
                <div className="flex items-center border border-gray-300 rounded-lg w-fit">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center border-l border-r border-gray-300 py-2 focus:outline-none"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Add to Cart Button */}
            <div className="flex gap-4">
              <button
                onClick={handleAddToCart}
                className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all ${
                  addedToCart
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {addedToCart ? "✓ Added to Cart" : "Add to Cart"}
              </button>
              <button className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                ♡
              </button>
            </div>

            {/* Product Info */}
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Fast & Free Shipping on orders over $50</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>30-day money back guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5-4a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Secure checkout with multiple payment options</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Description & Reviews */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Description */}
            <div className="md:col-span-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Product Details</h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  This premium {product.name.toLowerCase()} is crafted with the finest materials to ensure comfort, durability, and style. Perfect for both casual and formal occasions, it combines elegance with practicality.
                </p>
                <p>
                  Our designers have carefully selected every detail to create a piece that will become a staple in your wardrobe. Whether you're dressing up for a special event or keeping it casual, this item delivers exceptional quality.
                </p>

                <h3 className="text-lg font-semibold text-gray-900 mt-8">Features & Benefits</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Premium quality fabric</li>
                  <li>Comfortable fit suitable for all-day wear</li>
                  <li>Versatile design for multiple occasions</li>
                  <li>Easy care and maintenance</li>
                  <li>Available in multiple sizes</li>
                  <li>Eco-friendly production process</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 mt-8">Care Instructions</h3>
                <p>Machine wash cold with similar colors. Tumble dry low. Do not bleach. Iron on low heat if needed. For best results, follow care label instructions.</p>
              </div>

              {/* Reviews Section */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>

                {/* Review Stats */}
                <div className="flex items-start gap-8 mb-8">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-gray-900">{averageRating}</div>
                    <div className="flex justify-center mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${star <= Math.round(parseFloat(averageRating)) ? "text-yellow-400" : "text-gray-300"}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{DUMMY_REVIEWS.length} reviews</p>
                  </div>

                  {/* Rating Distribution */}
                  <div className="flex-1">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = DUMMY_REVIEWS.filter((r) => r.rating === rating).length;
                      const percentage = (count / DUMMY_REVIEWS.length) * 100;
                      return (
                        <div key={rating} className="flex items-center gap-3 mb-3">
                          <span className="text-sm text-gray-600 w-8">{rating} star</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                          <span className="text-sm text-gray-600">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Individual Reviews */}
                <div className="space-y-6">
                  {DUMMY_REVIEWS.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{review.authorName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-4 h-4 ${star <= review.rating ? "text-yellow-400" : "text-gray-300"}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">{new Date(review.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600">{review.comment}</p>
                    </div>
                  ))}
                </div>

                {/* Write Review Button */}
                {session ? (
                  <button className="mt-8 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                    Write a Review
                  </button>
                ) : (
                  <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-600">
                    <Link href="/join" className="font-semibold hover:underline">
                      Sign in
                    </Link>
                    {" "}to leave a review
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Shipping Info */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Shipping & Returns</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Free shipping over $50
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    30-day returns
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Secure checkout
                  </li>
                </ul>
              </div>

              {/* Brand Info */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">About {product.brand.name}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {product.brand.name} is committed to providing premium quality clothing with exceptional customer service. Discover more styles from this brand.
                </p>
                <Link
                  href={`/shop?brand=${product.brand.slug}`}
                  className="text-blue-600 text-sm font-semibold hover:text-blue-700"
                >
                  View all {product.brand.name} products →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-200 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">More from {product.brand.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relProduct) => (
                <Link
                  key={relProduct.id}
                  href={`/shop/product/${relProduct.id}`}
                  className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow group"
                >
                  <div className="relative overflow-hidden bg-gray-100 aspect-square">
                    <img
                      src={relProduct.images?.[0] || "/placeholder.jpg"}
                      alt={relProduct.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {relProduct.discountPrice && (
                      <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                        Sale
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-500 font-medium mb-1">{relProduct.brand.name}</p>
                    <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">{relProduct.name}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        ${(relProduct.discountPrice || relProduct.price).toFixed(2)}
                      </span>
                      {relProduct.discountPrice && (
                        <span className="text-sm text-gray-500 line-through">${relProduct.price.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
