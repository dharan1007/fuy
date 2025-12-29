"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import { useCartStore } from "@/lib/cartStore";
import AppHeader from "@/components/AppHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Download, LayoutTemplate, Map, BookOpen, GraduationCap, Play } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  images?: string | string[]; // Can be JSON string from DB or array
  brand?: { name: string; slug: string };
  seller?: { name: string; profile?: { avatarUrl: string } };
  isFeatured: boolean;
  isTrending: boolean;
  type?: "PHYSICAL" | "COURSE" | "EBOOK" | "DIGITAL_ASSET" | "TEMPLATE" | "HOPIN_PLAN";
  digitalFileUrl?: string;
  linkedResourceId?: string;
  description?: string;
}

interface Review {
  id: string;
  user: { name: string };
  rating: number;
  comment: string;
  createdAt: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const productId = params.id as string;
  const addItemToCart = useCartStore((state) => state.addItem);

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("M");
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/shop/products/${productId}`);
        if (!res.ok) throw new Error("Product not found");
        const data = await res.json();
        setProduct(data);
        if (data.reviews) setReviews(data.reviews);
      } catch (err) {
        setError("Failed to load product");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  // Helper to parse images
  const getMedia = (): { url: string; type: 'image' | 'video' }[] => {
    if (!product?.images) return [];
    let parsed: any[] = [];

    if (Array.isArray(product.images)) {
      parsed = product.images;
    } else {
      try {
        parsed = JSON.parse(product.images);
      } catch {
        parsed = [product.images];
      }
    }

    // Normalize to object format
    return parsed.map((item: any) => {
      if (typeof item === 'string') return { url: item, type: 'image' };
      return item; // Already in {url, type} format
    });
  };

  const productMedia = getMedia();
  const mainMedia = productMedia[0] || { url: "/placeholder.jpg", type: "image" };

  if (status === 'loading' || loading) {
    return <LoadingSpinner message="Loading product details..." />;
  }

  if (error || !product) {
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
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "New";
  const currentPrice = product.discountPrice || product.price;

  const handleAddToCart = () => {
    if (!product) return;

    addItemToCart({
      productId: product.id,
      productName: product.name,
      price: product.price,
      discountPrice: product.discountPrice,
      quantity,
      image: mainMedia.url,
      brand: product.brand?.name || product.seller?.name || "FUY Seller",
      size: selectedSize,
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleUseDigitalItem = () => {
    if (product.type === "TEMPLATE") {
      router.push(`/canvas?templateId=${product.linkedResourceId}`);
    } else if (product.type === "HOPIN_PLAN") {
      router.push(`/hopin?planId=${product.linkedResourceId}`);
    } else if (product.type === "COURSE") {
      router.push(`/dashboard/courses`);
    } else if (product.type === "EBOOK") {
      alert("Starting download...");
    }
  };

  const isDigital = product.type && product.type !== "PHYSICAL";

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title={product.name} showBackButton />

      {/* Main Product Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 pt-4 sm:pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-lg overflow-hidden aspect-square relative group">
              {mainMedia.type === 'video' ? (
                <video
                  src={mainMedia.url}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={mainMedia.url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              )}
              {discount > 0 && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  -{discount}%
                </div>
              )}

            </div>

            {/* Thumbnail Images */}
            {productMedia.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {productMedia.map((media, i) => (
                  <div key={i} className="bg-white rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 aspect-square">
                    {media.type === 'video' ? (
                      <video src={media.url} className="w-full h-full object-cover pointer-events-none" />
                    ) : (
                      <img
                        src={media.url}
                        alt={`${product.name} ${i}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col gap-6">
            {/* Brand and Title */}
            <div>
              <Link href={product.brand ? `/shop?brand=${product.brand.slug}` : "#"} className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-2">
                {product.brand?.name || product.seller?.name || "Independent Seller"}
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{product.name}</h1>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-5 h-5 ${star <= Math.round(Number(averageRating)) ? "text-yellow-400" : "text-gray-300"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {averageRating} · {reviews.length} reviews
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

            {/* Size/Quantity Selection (Only for Physical) */}
            {!isDigital && (
              <div className="space-y-4">
                {/* Size */}
                <div>
                  <label className="text-sm font-semibold text-gray-900 mb-3 block">Size</label>
                  <div className="grid grid-cols-4 gap-3">
                    {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-3 py-2 border-2 rounded-lg text-sm font-medium transition-colors ${selectedSize === size
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
            )}

            {/* Actions */}
            <div className="flex gap-4 flex-col sm:flex-row">
              <button
                onClick={handleAddToCart}
                className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all ${addedToCart
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-blue-600 hover:bg-blue-700"
                  }`}
              >
                {addedToCart ? "✓ Added to Cart" : isDigital ? "Buy Now" : "Add to Cart"}
              </button>

              {/* Use/Download Button (Simulated for Demo) */}
              {isDigital && (
                <button
                  onClick={handleUseDigitalItem}
                  className="flex-1 py-3 border-2 border-black bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  {product.type === "TEMPLATE" && <><LayoutTemplate className="w-5 h-5" /> Use Template</>}
                  {product.type === "HOPIN_PLAN" && <><Map className="w-5 h-5" /> Use Plan</>}
                  {product.type === "COURSE" && <><GraduationCap className="w-5 h-5" /> Start Course</>}
                  {product.type === "EBOOK" && <><Download className="w-5 h-5" /> Download</>}
                </button>
              )}

              <button className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                ♡
              </button>
            </div>

            {/* Product Info */}
            <div className="space-y-3 text-sm text-gray-600">
              {isDigital ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-5 h-5 text-green-600" />
                    <span>Instant Digital Delivery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-5 h-5 text-green-600" />
                    <span>Lifetime Access</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <TruckIcon className="w-5 h-5" />
                    <span>Fast & Free Shipping on orders over $50</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5" />
                    <span>30-day money back guarantee</span>
                  </div>
                </>
              )}
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
                  {product.description || `This premium ${product.name.toLowerCase()} is crafted with the finest materials to ensure comfort, durability, and style. Perfect for both casual and formal occasions, it combines elegance with practicality.`}
                </p>
              </div>

              {/* Reviews Section */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
                <div className="space-y-6">
                  {reviews.length > 0 ? reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{review.user.name}</p>
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
                            <span className="text-sm text-gray-600">{new Date(review.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600">{review.comment}</p>
                    </div>
                  )) : (
                    <p className="text-gray-500 italic">No reviews yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Brand Info */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">About {product.brand?.name || product.seller?.name || "Seller"}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {product.brand?.name || product.seller?.name} is committed to providing premium quality products with exceptional customer service.
                </p>
                {product.brand && (
                  <Link
                    href={`/shop?brand=${product.brand.slug}`}
                    className="text-blue-600 text-sm font-semibold hover:text-blue-700"
                  >
                    View all {product.brand.name} products →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function TruckIcon(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ShieldCheckIcon(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
