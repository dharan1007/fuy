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
          <p className="mt-4 text-lg text-gray-600">
            Last updated: November 2024
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Shipping Coverage</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                FUY currently ships products within India. We use reliable courier partners to ensure safe and timely delivery of your orders.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-2">Supported Areas:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>All metro cities (Delhi, Mumbai, Bangalore, Chennai, Kolkata, etc.)</li>
                  <li>Tier 1 and Tier 2 cities</li>
                  <li>Most pin codes across India</li>
                  <li>Some remote areas may have restrictions</li>
                </ul>
              </div>
              <p>
                <strong>International Shipping:</strong> We are working to expand our international shipping capabilities. Please check back soon.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Shipping Timelines</h2>
            <div className="space-y-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Delivery Area</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Processing Time</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Delivery Time</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Metro Cities</td>
                    <td className="border border-gray-300 px-4 py-2">1-2 business days</td>
                    <td className="border border-gray-300 px-4 py-2">2-3 days</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">Tier 1 Cities</td>
                    <td className="border border-gray-300 px-4 py-2">1-2 business days</td>
                    <td className="border border-gray-300 px-4 py-2">3-5 days</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Tier 2 & Other Areas</td>
                    <td className="border border-gray-300 px-4 py-2">1-2 business days</td>
                    <td className="border border-gray-300 px-4 py-2">5-7 days</td>
                  </tr>
                </tbody>
              </table>

              <p className="text-sm text-gray-500 mt-4">
                <strong>Note:</strong> Processing time starts from order confirmation. Weekends and public holidays are not included in delivery timelines. Delivery dates are estimates and may vary based on unforeseen circumstances.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Shipping Charges</h2>
            <div className="space-y-4 text-gray-600">
              <p>Our shipping charges are calculated based on order value and delivery location:</p>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Order Value</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Shipping Charge</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Below ₹500</td>
                    <td className="border border-gray-300 px-4 py-2">₹50 - ₹100 (location-dependent)</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">₹500 - ₹1,999</td>
                    <td className="border border-gray-300 px-4 py-2">₹30 - ₹80 (location-dependent)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">₹2,000 and above</td>
                    <td className="border border-gray-300 px-4 py-2">FREE</td>
                  </tr>
                </tbody>
              </table>

              <p className="text-sm text-gray-500 mt-4">
                Shipping charges are displayed before checkout. You can select your delivery address to see exact charges.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Order Tracking</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                Once your order is dispatched, you will receive:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>A tracking ID via email and SMS</li>
                <li>Real-time tracking updates through our platform</li>
                <li>Courier partner contact details for additional support</li>
                <li>Estimated delivery date</li>
              </ul>
              <p>
                You can track your order in your account under "My Orders" section or through the link provided in your confirmation email.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Delivery Address Requirements</h2>
            <div className="space-y-4 text-gray-600">
              <p>To ensure successful delivery, please provide:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Complete and accurate name</li>
                <li>Valid residential or commercial address</li>
                <li>Landmark or nearby location (helpful for delivery)</li>
                <li>Valid phone number and email address</li>
                <li>Correct PIN code</li>
              </ul>
              <p className="mt-4">
                Incomplete or incorrect addresses may result in delivery delays. If you notice any error, contact us immediately.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Handling & Packaging</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                We take utmost care in packaging your orders:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Products are securely packed to prevent damage</li>
                <li>Fragile items are wrapped with protective materials</li>
                <li>Eco-friendly packaging materials are used where possible</li>
                <li>Items are insured during transit</li>
              </ul>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Lost or Damaged Shipments</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                In case your package is lost or damaged during transit:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Report the issue within 48 hours of delivery date</li>
                <li>Provide photos of the damaged package</li>
                <li>Include tracking ID and order number</li>
                <li>We will investigate and process a replacement or refund</li>
              </ol>
              <p className="mt-4">
                Contact our support team at <a href="mailto:support@fuymedia.org" className="text-blue-600 hover:text-blue-700">support@fuymedia.org</a> with detailed information.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Delivery Attempt Failure</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                If delivery cannot be completed after 2-3 attempts:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Courier will leave a notice at your address</li>
                <li>You will receive an SMS/email notification</li>
                <li>You can reschedule delivery through the tracking page</li>
                <li>We can arrange a redelivery at your preferred time</li>
              </ul>
              <p className="mt-4">
                If you're unavailable repeatedly, your order may be returned and refunded.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Special Instructions</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                During checkout, you can add special delivery instructions such as:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Preferred delivery time</li>
                <li>Building/apartment number</li>
                <li>Gate number or security instructions</li>
                <li>Contact person details</li>
                <li>How to handle if you're not available</li>
              </ul>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Cancellation Before Dispatch</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                You can cancel your order before it's dispatched:
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
              <p>
                We are not responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Delays caused by courier partners beyond our control</li>
                <li>Natural disasters, strikes, or force majeure events</li>
                <li>Damage caused by mishandling at customer's end</li>
                <li>Loss of items after delivery acceptance</li>
              </ul>
            </div>
          </section>

          {/* Contact Section */}
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Need Help with Shipping?</h2>
            <p className="text-gray-600 mb-4">
              Have questions about your shipment? Our support team is here to help.
            </p>
            <div className="flex gap-4">
              <Link href="/contact-us" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">
                Contact Support
              </Link>
              <a href="mailto:support@fuymedia.org" className="border border-blue-600 text-blue-600 px-6 py-2 rounded hover:bg-blue-50 transition">
                Email Us
              </a>
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
