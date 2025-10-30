"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore, CartItem } from "@/lib/cartStore";

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const subtotal = getTotalPrice();
  const shipping = subtotal > 50 ? 0 : 9.99;
  const tax = subtotal * 0.1;
  const total = subtotal + shipping + tax;

  const handleRemoveItem = (item: CartItem) => {
    removeItem(item.productId, item.size);
  };

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(item);
    } else {
      updateQuantity(item.productId, newQuantity, item.size);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg
              className="w-20 h-20 mx-auto mb-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Your cart is empty
            </h2>
            <p className="text-gray-600 mb-8">
              Start shopping to add items to your cart
            </p>
            <Link
              href="/shop"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shopping Cart</h1>
          <p className="text-gray-600">You have {items.length} item(s) in your cart</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {items.map((item, index) => {
              const currentPrice = item.discountPrice || item.price;
              const savings = item.discountPrice ? item.price - item.discountPrice : 0;

              return (
                <div
                  key={`${item.productId}-${item.size}-${index}`}
                  className="bg-white rounded-lg shadow-md p-6 flex gap-6"
                >
                  {/* Product Image */}
                  <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <Link
                      href={`/shop/product/${item.productId}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-sm text-gray-600 mb-3">{item.brand}</p>

                    {/* Size */}
                    {item.size && (
                      <p className="text-sm text-gray-600 mb-3">Size: {item.size}</p>
                    )}

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-lg font-bold text-gray-900">
                        ${currentPrice.toFixed(2)}
                      </span>
                      {savings > 0 && (
                        <>
                          <span className="text-sm text-gray-500 line-through">
                            ${item.price.toFixed(2)}
                          </span>
                          <span className="text-sm text-green-600 font-semibold">
                            Save ${(savings).toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-gray-300 rounded-lg w-fit">
                        <button
                          onClick={() =>
                            handleQuantityChange(item, item.quantity - 1)
                          }
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                        >
                          −
                        </button>
                        <span className="px-4 py-1 border-l border-r border-gray-300 font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleQuantityChange(item, item.quantity + 1)
                          }
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(item)}
                        className="text-red-600 text-sm font-semibold hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-gray-900">
                      ${(currentPrice * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} × ${currentPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Continue Shopping */}
            <Link
              href="/shop"
              className="text-blue-600 font-semibold hover:text-blue-700 inline-flex items-center gap-2"
            >
              ← Continue Shopping
            </Link>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className="font-semibold">
                    {shipping === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      `$${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>

                {shipping > 0 && (
                  <p className="text-xs text-gray-500">
                    Free shipping on orders over $50
                  </p>
                )}

                <div className="flex justify-between text-gray-600">
                  <span>Tax (10%)</span>
                  <span className="font-semibold">${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors mb-3">
                Proceed to Checkout
              </button>

              {/* Continue Shopping Button */}
              <Link
                href="/shop"
                className="block text-center px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Continue Shopping
              </Link>

              {/* Clear Cart */}
              <button
                onClick={clearCart}
                className="w-full mt-4 text-red-600 text-sm font-semibold hover:text-red-700"
              >
                Clear Cart
              </button>

              {/* Info Section */}
              <div className="mt-8 pt-6 border-t border-gray-200 space-y-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">Secure Checkout</p>
                    <p className="text-gray-600">256-bit SSL encrypted</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">30-Day Returns</p>
                    <p className="text-gray-600">Easy returns process</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">Fast Shipping</p>
                    <p className="text-gray-600">Ships within 2-3 business days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
