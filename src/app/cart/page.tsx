"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore, CartItem } from "@/lib/cartStore";
import AppHeader from "@/components/AppHeader";
import { SpaceBackground } from "@/components/SpaceBackground";
import { Trash2, ShoppingBag, Plus, Minus, ArrowRight, ShieldCheck, Truck, RotateCcw } from "lucide-react";

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

  if (!mounted) return null;

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
      <div className="min-h-screen bg-black text-white relative flex flex-col">
        <SpaceBackground />
        <AppHeader title="Shopping Cart" showBackButton />

        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center max-w-md w-full shadow-2xl">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-white/40" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Your cart is empty
            </h2>
            <p className="text-white/60 mb-8">
              Looks like you haven't added anything to your cart yet.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-white text-black px-8 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col">
      <SpaceBackground />
      <AppHeader title="Shopping Cart" showBackButton />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white/80">{items.length} Items</h2>
              <button
                onClick={clearCart}
                className="text-white/40 hover:text-red-400 text-sm flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Clear Cart
              </button>
            </div>

            {items.map((item, index) => {
              const currentPrice = item.discountPrice || item.price;
              const savings = item.discountPrice ? item.price - item.discountPrice : 0;

              return (
                <div
                  key={`${item.productId}-${item.size}-${index}`}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 flex gap-4 sm:gap-6 group hover:bg-white/10 transition-colors"
                >
                  {/* Product Image */}
                  <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 bg-white/5 rounded-lg overflow-hidden relative">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <Link
                            href={`/shop/product/${item.productId}`}
                            className="text-lg font-bold text-white hover:text-white/80 transition-colors line-clamp-1"
                          >
                            {item.productName}
                          </Link>
                          <p className="text-sm text-white/60">{item.brand}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">${currentPrice.toFixed(2)}</p>
                          {savings > 0 && (
                            <p className="text-xs text-green-400 font-medium">Save ${savings.toFixed(2)}</p>
                          )}
                        </div>
                      </div>

                      {item.size && (
                        <div className="mt-2 inline-flex border border-white/20 rounded px-2 py-0.5 text-xs text-white/80 font-mono">
                          Size: {item.size}
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-3 bg-black/40 rounded-lg p-1 border border-white/10">
                        <button
                          onClick={() => handleQuantityChange(item, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(item)}
                        className="text-white/40 hover:text-red-400 transition-colors p-2"
                        title="Remove item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 sticky top-24 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6 text-sm">
                <div className="flex justify-between text-white/60">
                  <span>Subtotal</span>
                  <span className="font-medium text-white">${subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-white/60">
                  <span>Shipping</span>
                  <span className="font-medium text-white">
                    {shipping === 0 ? (
                      <span className="text-green-400">Free</span>
                    ) : (
                      `$${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-white/60">
                  <span>Tax (10%)</span>
                  <span className="font-medium text-white">${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 mb-6">
                <div className="flex justify-between items-end">
                  <span className="text-white/80 font-medium">Total</span>
                  <span className="text-3xl font-bold text-white">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button className="w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-gray-200 transition-all transform active:scale-95 flex items-center justify-center gap-2 mb-4">
                Proceed to Checkout <ArrowRight className="w-5 h-5" />
              </button>

              <div className="space-y-3 pt-6 border-t border-white/10">
                <div className="flex items-center gap-3 text-xs text-white/50">
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                  <span>Secure SSL Encrypted Checkout</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/50">
                  <Truck className="w-4 h-4 text-blue-400" />
                  <span>Fast Delivery (2-3 days)</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/50">
                  <RotateCcw className="w-4 h-4 text-yellow-400" />
                  <span>30-Day Easy Returns</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
