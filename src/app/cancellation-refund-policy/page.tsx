'use client';

import React from 'react';
import Link from 'next/link';

export default function CancellationRefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold text-gray-900">Cancellation & Refund Policy</h1>
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
              At FUY Media, we want you to be completely satisfied with your purchase. This policy outlines the terms for cancellations and refunds. Please read carefully to understand your rights and our procedures.
            </p>
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mt-4">
              <p className="font-semibold text-gray-900 mb-2">Important Distinction:</p>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li><strong>FUY Services & Products:</strong> FUY Media is fully responsible for cancellations and refunds on services and products directly provided by FUY (messaging features, exclusive content, consulting services, etc.)</li>
                <li><strong>Store & Brand Items:</strong> For items and products from third-party stores and brand owners sold through FUY platform, the respective store owner or brand owner is responsible for cancellations and refunds. FUY acts as a facilitator.</li>
                <li><strong>Platform Oversight:</strong> FUY Media reserves the right to block sellers, raise issues, or take action if sellers violate refund/cancellation policies or engage in fraudulent practices.</li>
              </ul>
            </div>
          </section>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Cancellation Policy - FUY Services</h2>

            <p className="text-gray-600 mb-4 italic">
              This section applies to services and products directly provided by FUY Media. For store and brand items, refer to Section 8.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1.1 Cancellation Before Shipment</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <p>
                    <strong>Timeframe:</strong> You can cancel your order within 24 hours of placing it (before it's dispatched).
                  </p>
                  <p>
                    <strong>How to Cancel:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Log into your account and go to "My Orders"</li>
                    <li>Select the order you want to cancel</li>
                    <li>Click "Cancel Order"</li>
                    <li>Confirm the cancellation</li>
                  </ul>
                  <p>
                    <strong>Refund:</strong> Full refund (100%) will be credited to your original payment method within 3-5 business days.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1.2 Cancellation After Shipment</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <p>
                    Once your order is dispatched, you cannot cancel directly. However, you can refuse delivery or initiate a return using our Return & Refund process (see Section 2).
                  </p>
                  <p>
                    <strong>Refusal at Delivery:</strong> You can refuse delivery of the package. It will be returned to the sender at no cost to you.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1.3 Cancellation of Subscriptions</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <p>
                    <strong>Subscription Products:</strong> For recurring products (courses, exclusive content), you can cancel anytime:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Cancel before next billing date - no charge</li>
                    <li>Cancel after billing - refund eligibility depends on product terms</li>
                    <li>Access continues until end of current billing period</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Refund Eligibility - FUY Services</h2>

            <p className="text-gray-600 mb-4 italic">
              This section applies to services and products directly provided by FUY Media. For store and brand items, refer to Section 8.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">2.1 Returnable Products</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <p className="font-semibold">Eligible for return (within 30 days):</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Physical products (templates files, books, merchandise)</li>
                    <li>Unused and unopened products</li>
                    <li>Products with original packaging intact</li>
                    <li>Damaged or defective items (any time)</li>
                    <li>Wrong item delivered (any time)</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">2.2 Non-Returnable Products</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <p className="font-semibold">NOT eligible for return:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Digital downloads or e-books (except defective)</li>
                    <li>Video courses or online content (after access)</li>
                    <li>Exclusive content subscriptions (partially used)</li>
                    <li>Consulting/coaching sessions (after completion)</li>
                    <li>Customized or made-to-order products</li>
                    <li>Personalized services</li>
                    <li>Products used, worn, or damaged by customer</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">2.3 Return Window</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Product Type</th>
                        <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Return Window</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">Physical Products</td>
                        <td className="border border-gray-300 px-4 py-2">30 days from delivery</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2">Damaged Items</td>
                        <td className="border border-gray-300 px-4 py-2">7 days from delivery</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">Wrong Item</td>
                        <td className="border border-gray-300 px-4 py-2">7 days from delivery</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2">Digital Products</td>
                        <td className="border border-gray-300 px-4 py-2">Case-by-case basis</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Return Process - FUY Services</h2>

            <p className="text-gray-600 mb-4 italic">
              This section applies to services and products directly provided by FUY Media. For store and brand items, refer to Section 8.
            </p>

            <div className="space-y-4 text-gray-600">
              <p>
                <strong>Step 1: Initiate Return</strong>
              </p>
              <ul className="list-decimal list-inside space-y-2 ml-2 mb-4">
                <li>Go to "My Orders" in your account</li>
                <li>Find the order you want to return</li>
                <li>Click "Initiate Return"</li>
                <li>Select reason for return</li>
                <li>Provide supporting documents/photos if required</li>
              </ul>

              <p>
                <strong>Step 2: Return Approval</strong>
              </p>
              <ul className="list-decimal list-inside space-y-2 ml-2 mb-4">
                <li>We review your return request within 48 hours</li>
                <li>You'll receive approval/rejection via email</li>
                <li>If approved, you'll get a prepaid return label</li>
                <li>If rejected, reason will be explained</li>
              </ul>

              <p>
                <strong>Step 3: Ship Item Back</strong>
              </p>
              <ul className="list-decimal list-inside space-y-2 ml-2 mb-4">
                <li>Pack the item securely in original packaging if possible</li>
                <li>Use the prepaid shipping label provided</li>
                <li>Drop at the nearest courier center</li>
                <li>Keep tracking number for reference</li>
              </ul>

              <p>
                <strong>Step 4: Inspection & Refund</strong>
              </p>
              <ul className="list-decimal list-inside space-y-2 ml-2">
                <li>We receive and inspect the returned item</li>
                <li>Inspection takes 3-5 business days</li>
                <li>Refund is credited to original payment method</li>
                <li>Processing time: 5-7 business days</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Refund Amount - FUY Services</h2>

            <p className="text-gray-600 mb-4 italic">
              This section applies to services and products directly provided by FUY Media. For store and brand items, refer to Section 8.
            </p>

            <div className="space-y-4 text-gray-600">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-3">Standard Returns (Buyer's Request)</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Shipping charges: Not refunded (non-refundable)</li>
                  <li>Product amount: Full refund if unused</li>
                  <li>Return shipping: Free (prepaid label provided)</li>
                  <li>Net refund: Product price - original shipping fee</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-3">Return Due to Our Error</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Wrong item delivered: Full refund + free return</li>
                  <li>Damaged item: Full refund + free return</li>
                  <li>Missing items: Full refund, no return needed</li>
                  <li>Includes original shipping refund</li>
                </ul>
              </div>

              <p className="text-sm text-gray-500">
                <strong>Note:</strong> Refunds are processed to the original payment method. It may take 5-7 business days to reflect in your account.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Damaged or Defective Products - FUY Services</h2>

            <p className="text-gray-600 mb-4 italic">
              This section applies to services and products directly provided by FUY Media. For store and brand items, refer to Section 8.
            </p>

            <div className="space-y-4 text-gray-600">
              <p>
                If you receive a damaged or defective product:
              </p>
              <ol className="list-decimal list-inside space-y-3 ml-2">
                <li>
                  <strong>Report Immediately:</strong> Contact us within 7 days with photos/video
                </li>
                <li>
                  <strong>Documentation:</strong> Provide photos showing damage/defect
                </li>
                <li>
                  <strong>Approval:</strong> We approve replacement or refund within 24 hours
                </li>
                <li>
                  <strong>Replacement:</strong> New item shipped at no cost; return old item
                </li>
                <li>
                  <strong>Alternative:</strong> Opt for full refund including return shipping
                </li>
              </ol>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Exceptions & Special Cases - FUY Services</h2>

            <p className="text-gray-600 mb-4 italic">
              This section applies to services and products directly provided by FUY Media. For store and brand items, refer to Section 8.
            </p>

            <div className="space-y-4 text-gray-600">
              <div>
                <p className="font-semibold text-gray-900 mb-2">Digital Products:</p>
                <p>
                  Once downloaded or accessed, digital products cannot be returned unless they're defective or inaccessible. Contact support for evaluation.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-2">Courses & Online Learning:</p>
                <p>
                  If you're less than 7 days into a course (haven't accessed more than 30% of content), you can request a full refund.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-2">Subscription Services:</p>
                <p>
                  Cancel anytime. No refund for the current billing period, but access continues until period ends.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-2">Consulting/Coaching Sessions:</p>
                <p>
                  Cancellations must be made 48 hours before scheduled session. Otherwise, payment is forfeited.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Store and Return Shipping - FUY Services</h2>

            <p className="text-gray-600 mb-4 italic">
              This section applies to services and products directly provided by FUY Media. For store and brand items, refer to Section 8.
            </p>

            <div className="space-y-4 text-gray-600">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Scenario</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Return Shipping</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Buyer's Request (Item Good)</td>
                    <td className="border border-gray-300 px-4 py-2">Prepaid label provided (free)</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">Damaged/Defective Item</td>
                    <td className="border border-gray-300 px-4 py-2">Prepaid label provided (free)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Wrong Item Delivered</td>
                    <td className="border border-gray-300 px-4 py-2">Prepaid label provided (free)</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">No Return Label Received</td>
                    <td className="border border-gray-300 px-4 py-2">Contact support for label</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Third-Party Store & Brand Items</h2>

            <div className="space-y-6">
              <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-2">Important Notice:</p>
                <p className="text-gray-600 text-sm mb-3">
                  For products and items sold by third-party stores and brand owners through the FUY platform, the respective store owner or brand owner is responsible for handling cancellations, refunds, returns, and customer service. FUY Media acts as a facilitator and marketplace platform only.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">8.1 Responsibility Structure</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <p>
                    <strong>Store/Brand Owner Responsibilities:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Processing cancellations and refunds</li>
                    <li>Managing returns and exchanges</li>
                    <li>Providing customer support</li>
                    <li>Handling damaged or defective items</li>
                    <li>Shipping and logistics</li>
                    <li>Addressing quality complaints</li>
                  </ul>
                  <p className="mt-4">
                    <strong>FUY Media's Role:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Providing platform to facilitate transactions</li>
                    <li>Helping resolve disputes when necessary</li>
                    <li>Monitoring seller compliance with policies</li>
                    <li>Blocking non-compliant sellers</li>
                    <li>Taking action against fraudulent sellers</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">8.2 How to Handle Returns for Store Items</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>
                      <strong>Contact the Store/Brand Owner:</strong> Go to "My Orders" and click "Contact Seller" to reach out to the store directly
                    </li>
                    <li>
                      <strong>Follow Store's Return Policy:</strong> The store owner will provide their specific cancellation and return procedures
                    </li>
                    <li>
                      <strong>FUY Dispute Resolution:</strong> If the store does not respond or refuses to comply with reasonable return requests, you can raise a dispute with FUY
                    </li>
                    <li>
                      <strong>FUY Investigation:</strong> We will investigate and take action against non-compliant sellers, including blocking their account
                    </li>
                  </ol>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">8.3 Non-Returnable Store Items</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <p>
                    Store owners may mark specific products as non-returnable (clearly stated in product description):
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Clearance or final sale items</li>
                    <li>Perishable items</li>
                    <li>Customized/personalized products</li>
                    <li>Items explicitly marked "Final Sale"</li>
                  </ul>
                  <p className="text-sm text-gray-500 mt-4">
                    However, these items must still be returned if they are damaged or defective upon receipt, as per consumer protection standards.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">8.4 FUY's Right to Block or Take Action</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <p>
                    FUY Media reserves the right to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Block sellers who violate return/refund policies</li>
                    <li>Suspend sellers who receive excessive complaints</li>
                    <li>Investigate fraudulent or non-compliant sellers</li>
                    <li>Force refunds on behalf of sellers who refuse to comply</li>
                    <li>Take legal action against sellers engaged in fraud</li>
                    <li>Remove sellers from the platform permanently</li>
                    <li>Raise issues with authorities if necessary</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">8.5 Dispute Resolution for Store Items</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <p>
                    If you have a dispute with a store regarding a return or refund:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Contact the store directly through the platform</li>
                    <li>If no response within 7 days, raise a dispute with FUY</li>
                    <li>FUY will investigate and contact the seller</li>
                    <li>We will attempt to mediate within 15 days</li>
                    <li>If seller is non-compliant, FUY may force a refund or block the seller</li>
                  </ol>
                </div>
              </div>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Partial Refunds - FUY Services</h2>

            <p className="text-gray-600 mb-4 italic">
              This section applies to services and products directly provided by FUY Media.
            </p>

            <div className="space-y-4 text-gray-600">
              <p>
                In some cases, we may issue a partial refund if:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Item is slightly used but not defective (case-by-case)</li>
                <li>Packaging is damaged but product is fine</li>
                <li>Minor wear from inspection/testing</li>
              </ul>
              <p className="mt-4">
                Partial refund percentages will be clearly communicated during the return review process.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Fraud Prevention & Seller Monitoring</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">10.1 For FUY Services</h3>
                <p className="text-gray-600 mb-3">
                  To prevent fraud and abuse on FUY services, we reserve the right to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2 text-gray-600">
                  <li>Deny returns from accounts with suspicious activity</li>
                  <li>Request additional documentation</li>
                  <li>Investigate patterns of excessive returns</li>
                  <li>Reject returns if terms are violated</li>
                  <li>Block accounts engaged in return fraud</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">10.2 Seller Monitoring & Enforcement</h3>
                <p className="text-gray-600 mb-3">
                  For third-party stores, FUY Media actively monitors seller compliance and takes action against:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2 text-gray-600">
                  <li>Sellers who violate refund policies</li>
                  <li>Sellers who ignore customer return requests</li>
                  <li>Sellers with excessive complaints or disputes</li>
                  <li>Fraudulent sellers or practices</li>
                  <li>Non-compliant sellers will be blocked or suspended</li>
                  <li>Persistent violators will be permanently removed from the platform</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Dispute Resolution</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">11.1 FUY Service Disputes</h3>
                <p className="text-gray-600 mb-3">
                  If you disagree with our return decision on FUY services:
                </p>
                <ol className="list-decimal list-inside space-y-2 ml-2 text-gray-600">
                  <li>Contact our support team with additional evidence</li>
                  <li>We'll escalate to our management team</li>
                  <li>Decision will be made within 10 business days</li>
                  <li>Final decisions are binding</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">11.2 Store Item Disputes</h3>
                <p className="text-gray-600 mb-3">
                  For disputes with third-party sellers regarding returns and refunds:
                </p>
                <ol className="list-decimal list-inside space-y-2 ml-2 text-gray-600">
                  <li>Contact the store directly through "Contact Seller" option</li>
                  <li>If seller doesn't respond within 7 days, raise a dispute with FUY</li>
                  <li>FUY will contact the seller and mediate</li>
                  <li>Mediation will be completed within 15 days</li>
                  <li>If seller is non-compliant, FUY may force a refund or block the seller</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Need Help with Your Return?</h2>
            <p className="text-gray-600 mb-4">
              Have questions about returning your order or dealing with a seller issue? Our support team is ready to help.
            </p>
            <div className="space-y-2 text-gray-600 mb-4">
              <p><strong>Email:</strong> <a href="mailto:dharan.poduvu@gmail.com" className="text-blue-600 hover:text-blue-700">dharan.poduvu@gmail.com</a></p>
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
            <Link href="/shipping-policy" className="text-gray-600 hover:text-gray-900">
              Shipping Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
