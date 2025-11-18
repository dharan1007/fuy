'use client';

import React from 'react';
import Link from 'next/link';

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold text-gray-900">Shipping Policy</h1>
          <p className="mt-2 text-lg text-gray-600">FUY Media</p>
          <p className="mt-4 text-lg text-gray-600">
            Last updated: November 15, 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">

          {/* Introduction */}
          <section>
            <p className="text-gray-600 mb-4">
              This Shipping Policy outlines how FUY Media handles shipping for services and products directly provided by FUY. Please note the important distinction below regarding third-party items.
            </p>
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mt-4">
              <p className="font-semibold text-gray-900 mb-2">Important Distinction:</p>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li><strong>FUY Services & Digital Products:</strong> Messaging features, exclusive content, and other digital services provided by FUY are instantly unlocked upon purchase. No shipping required. FUY is fully responsible for delivery of these services.</li>
                <li><strong>FUY Physical Products:</strong> For physical products directly sold by FUY, this shipping policy applies. FUY is responsible for timely and safe delivery.</li>
                <li><strong>Third-Party Store & Brand Items:</strong> For items sold by third-party stores and brand owners through the FUY platform, the respective store owner or brand owner is responsible for shipping, handling, and delivery. FUY is not responsible for delays or issues with third-party seller shipments.</li>
                <li><strong>Seller Responsibility:</strong> Each third-party seller sets their own shipping timelines, charges, and handling procedures. Please contact the seller directly for shipping-related inquiries on their products.</li>
              </ul>
            </div>
          </section>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. FUY Services - Instant Delivery</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                FUY Media's primary services (real-time messaging, exclusive content, consulting services, etc.) are instantly unlocked upon purchase. No physical shipping is required.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Digital services are accessible immediately after payment confirmation</li>
                <li>Account activation is instantaneous</li>
                <li>All features are enabled upon successful payment</li>
                <li>No waiting period for service activation</li>
              </ul>
              <p className="mt-4">
                <strong>Support:</strong> If you experience any issues accessing FUY services, contact us immediately at <a href="mailto:fuymedia@gmail.com" className="text-blue-600 hover:text-blue-700">fuymedia@gmail.com</a>
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. FUY Physical Products - Shipping Coverage</h2>
            <div className="space-y-4 text-gray-600">
              <p className="italic text-sm mb-4">
                This section applies only to physical products directly sold by FUY Media. For third-party seller items, refer to Section 5.
              </p>
              <p>
                FUY ships physical products within India through reliable courier partners.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-2">Coverage Information:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>FUY ships to most locations across India</li>
                  <li>Specific coverage and timelines will be confirmed at checkout</li>
                  <li>Some remote areas may have shipping restrictions</li>
                  <li>Actual delivery timeline depends on your location</li>
                </ul>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                <strong>Note:</strong> International shipping is not currently available. We are exploring options to expand shipping capabilities in the future.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Shipping Timelines - FUY Physical Products</h2>
            <div className="space-y-4 text-gray-600">
              <p className="italic text-sm mb-4">
                This section applies only to physical products directly sold by FUY Media. For third-party seller items, refer to Section 5.
              </p>
              <p>
                Shipping timelines for FUY physical products vary based on your location and the specific product. Exact delivery timelines will be provided at checkout before you confirm your order.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Estimated delivery date will be displayed during checkout</li>
                <li>Processing begins after payment confirmation</li>
                <li>Timelines may vary based on courier availability and location</li>
                <li>You will receive tracking information once your order is dispatched</li>
              </ul>
              <p className="mt-4 text-sm text-gray-500">
                <strong>Note:</strong> Weekend and public holiday schedules may affect delivery timelines. Unforeseen circumstances (weather, strikes, etc.) may impact actual delivery dates.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Shipping Charges - FUY Physical Products</h2>
            <div className="space-y-4 text-gray-600">
              <p className="italic text-sm mb-4">
                This section applies only to physical products directly sold by FUY Media. For third-party seller items, refer to Section 5.
              </p>
              <p>
                Shipping charges for FUY physical products are calculated based on the destination location and product specifications.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Shipping charges are displayed at checkout before order confirmation</li>
                <li>Charges vary based on your delivery location</li>
                <li>You can review exact charges before finalizing your order</li>
                <li>Free shipping may apply to certain orders (displayed at checkout)</li>
              </ul>
              <p className="mt-4 text-sm text-gray-500">
                <strong>Note:</strong> Final shipping charges will be calculated and shown during the checkout process based on your delivery address.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Order Tracking - FUY Physical Products</h2>
            <div className="space-y-4 text-gray-600">
              <p className="italic text-sm mb-4">
                This section applies only to physical products directly sold by FUY Media. For third-party seller items, refer to Section 8.
              </p>
              <p>
                Once your FUY order is dispatched, you will receive:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>A tracking ID via email and SMS</li>
                <li>Tracking updates through your account</li>
                <li>Courier partner contact details</li>
                <li>Estimated delivery date</li>
              </ul>
              <p>
                Track your order in your account under "My Orders" section or through the link in your confirmation email.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Delivery Address Requirements - FUY Physical Products</h2>
            <div className="space-y-4 text-gray-600">
              <p className="italic text-sm mb-4">
                This section applies only to physical products directly sold by FUY Media.
              </p>
              <p>To ensure successful delivery, please provide:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Complete and accurate name</li>
                <li>Valid residential or commercial address</li>
                <li>Landmark or nearby location</li>
                <li>Valid phone number and email address</li>
                <li>Correct PIN code</li>
              </ul>
              <p className="mt-4">
                Incomplete or incorrect addresses may result in delivery delays. Contact us immediately if you find any errors.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Handling & Packaging - FUY Physical Products</h2>
            <div className="space-y-4 text-gray-600">
              <p className="italic text-sm mb-4">
                This section applies only to physical products directly sold by FUY Media.
              </p>
              <p>
                We take care in packaging FUY orders:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Products are securely packed to prevent damage</li>
                <li>Fragile items are protected with appropriate materials</li>
                <li>Eco-friendly packaging is used where possible</li>
                <li>Items are properly handled during transit</li>
              </ul>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Third-Party Store & Brand Items - Shipping</h2>
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-2">Important Notice:</p>
                <p className="text-gray-600 text-sm mb-3">
                  For items sold by third-party stores and brand owners through the FUY platform, the respective store owner or brand owner is responsible for shipping, handling, and delivery. FUY Media is not responsible for third-party seller shipping operations.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">8.1 Seller Responsibility</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <p>
                    Each third-party seller is responsible for:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Setting and communicating shipping timelines</li>
                    <li>Calculating and charging shipping fees</li>
                    <li>Packaging and handling their products</li>
                    <li>Arranging courier services</li>
                    <li>Providing tracking information</li>
                    <li>Handling shipping-related customer service</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">8.2 How to Get Shipping Information</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <p>
                    For third-party items:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Check the product page for seller's shipping policy</li>
                    <li>Shipping timelines and charges are usually displayed at checkout</li>
                    <li>Contact the seller directly using "Contact Seller" option in your order</li>
                    <li>The seller will provide tracking and delivery updates</li>
                  </ol>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">8.3 Dispute Resolution</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <p>
                    If you experience shipping issues with a third-party seller:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Contact the seller directly first</li>
                    <li>If seller is unresponsive, raise a dispute with FUY</li>
                    <li>FUY will investigate and attempt to mediate</li>
                    <li>FUY may take action against sellers violating shipping standards</li>
                  </ol>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">8.4 FUY's Role</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>FUY acts as a marketplace facilitator, not the shipper</li>
                    <li>FUY monitors seller compliance with stated policies</li>
                    <li>FUY can block or remove sellers who violate shipping standards</li>
                    <li>FUY may assist in dispute resolution when necessary</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Lost or Damaged Shipments - FUY Products</h2>
            <div className="space-y-4 text-gray-600">
              <p className="italic text-sm mb-4">
                This section applies only to FUY Media's physical products. For third-party items, contact the seller directly.
              </p>
              <p>
                If your FUY package is lost or damaged during transit:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Report the issue within 48 hours of delivery date</li>
                <li>Provide photos of the damaged package</li>
                <li>Include tracking ID and order number</li>
                <li>We will investigate and process a replacement or refund</li>
              </ol>
              <p className="mt-4">
                Contact support at <a href="mailto:fuymedia@gmail.com" className="text-blue-600 hover:text-blue-700">fuymedia@gmail.com</a> with detailed information.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Cancellation Before Dispatch - FUY Products</h2>
            <div className="space-y-4 text-gray-600">
              <p className="italic text-sm mb-4">
                This section applies only to FUY Media's physical products. For third-party items, refer to Cancellation & Refund Policy.
              </p>
              <p>
                You can cancel your FUY order before it's dispatched:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Log into your account and cancel from "My Orders"</li>
                <li>Contact support for assistance</li>
                <li>Refund will be processed to your original payment method</li>
                <li>Processing time: 5-7 business days</li>
              </ul>
              <p className="mt-4">
                Once dispatched, refer to our Cancellation & Refund Policy for options.
              </p>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Liability & Limitations</h2>
            <div className="space-y-4 text-gray-600">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">11.1 FUY Shipping</h3>
                <p className="mb-3">
                  FUY is not responsible for:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Delays caused by courier partners beyond our control</li>
                  <li>Natural disasters, strikes, or force majeure events</li>
                  <li>Damage caused by mishandling at customer's end</li>
                  <li>Loss of items after delivery acceptance</li>
                </ul>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">11.2 Third-Party Shipping</h3>
                <p className="mb-3">
                  FUY is not responsible for:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Shipping operations or timelines of third-party sellers</li>
                  <li>Shipping quality or practices of third-party sellers</li>
                  <li>Communication from sellers regarding shipments</li>
                  <li>Any losses or damages in third-party shipments (except fraud/policy violation cases)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Need Help with Shipping?</h2>
            <p className="text-gray-600 mb-4">
              Have questions about your shipment or need assistance? Our support team is here to help.
            </p>
            <div className="space-y-2 text-gray-600 mb-4">
              <p><strong>Email:</strong> <a href="mailto:fuymedia@gmail.com" className="text-blue-600 hover:text-blue-700">fuymedia@gmail.com</a></p>
            </div>
            <div className="flex gap-4">
              <Link href="/contact-us" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">
                Contact Support
              </Link>
            </div>
          </section>

        </div>
      </div>

      {/* Footer Links */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap gap-6 justify-center text-sm">
            <Link href="/contact-us" className="text-gray-600 hover:text-gray-900">
              Contact Us
            </Link>
            <Link href="/privacy-policy" className="text-gray-600 hover:text-gray-900">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="text-gray-600 hover:text-gray-900">
              Terms & Conditions
            </Link>
            <Link href="/cancellation-refund-policy" className="text-gray-600 hover:text-gray-900">
              Cancellation & Refunds
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
