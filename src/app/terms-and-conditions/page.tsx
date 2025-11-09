'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold text-gray-900">Terms and Conditions</h1>
          <p className="mt-4 text-lg text-gray-600">
            Last updated: November 2024
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">

          {/* Introduction */}
          <section>
            <p className="text-gray-600 mb-4">
              These Terms and Conditions ("Terms") govern your use of the FUY platform (www.fuymedia.org, mobile application, and all related services). By accessing, browsing, or using FUY, you agree to be bound by these Terms. If you do not agree, please do not use our platform.
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Definitions and Interpretation</h2>
            <div className="space-y-4 text-gray-600">
              <div>
                <p><strong>"Platform"</strong> means FUY's website, mobile applications, and all services provided.</p>
              </div>
              <div>
                <p><strong>"User"</strong> means any individual or entity accessing or using the Platform.</p>
              </div>
              <div>
                <p><strong>"Seller"</strong> means any user who creates a store to sell products on the Platform.</p>
              </div>
              <div>
                <p><strong>"Buyer"</strong> means any user who purchases products from Sellers on the Platform.</p>
              </div>
              <div>
                <p><strong>"Content"</strong> means all text, images, videos, and data posted by Users.</p>
              </div>
              <div>
                <p><strong>"Services"</strong> means all features, functionalities, and benefits provided by FUY.</p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. User Eligibility and Accounts</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                <strong>Age Requirement:</strong> You must be at least 18 years old or have parental consent to use FUY.
              </p>
              <p>
                <strong>Account Responsibility:</strong> You are responsible for maintaining the confidentiality of your account credentials and all activities that occur under your account.
              </p>
              <p>
                <strong>Accurate Information:</strong> You agree to provide accurate, current, and complete information during registration and maintain it.
              </p>
              <p>
                <strong>Prohibited Use:</strong> You may not use anyone else's account, create fraudulent accounts, or use bots to create multiple accounts.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Conduct and Prohibited Activities</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                You agree NOT to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Violate any laws, regulations, or rights of others</li>
                <li>Post illegal, harmful, defamatory, or offensive content</li>
                <li>Engage in fraud, phishing, or hacking</li>
                <li>Distribute viruses, malware, or harmful code</li>
                <li>Harass, bully, or discriminate against any user</li>
                <li>Sell counterfeit, stolen, or prohibited items</li>
                <li>Engage in price manipulation or monopolistic practices</li>
                <li>Manipulate reviews or ratings through fake accounts</li>
                <li>Spam or send unsolicited messages</li>
                <li>Copy or scrape content without permission</li>
                <li>Violate intellectual property rights</li>
                <li>Attempt to gain unauthorized access to systems</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Intellectual Property Rights</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                <strong>FUY Content:</strong> All content on the Platform, including logos, designs, text, and graphics are owned by FUY or licensed to us. You may not reproduce, distribute, or modify without permission.
              </p>
              <p>
                <strong>User Content:</strong> When you post content on FUY, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute it.
              </p>
              <p>
                <strong>Seller Products:</strong> Sellers retain ownership of their product content but grant FUY rights to display and promote it on the Platform.
              </p>
              <p>
                <strong>DMCA Compliance:</strong> If you believe your intellectual property has been infringed, contact <a href="mailto:legal@fuymedia.org" className="text-blue-600 hover:text-blue-700">legal@fuymedia.org</a>.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Product Listings and Seller Responsibilities</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                <strong>Accurate Descriptions:</strong> Sellers must provide accurate, complete product descriptions, images, and pricing.
              </p>
              <p>
                <strong>Prohibited Items:</strong> Sellers cannot list items that are illegal, counterfeit, stolen, or hazardous without proper certification.
              </p>
              <p>
                <strong>Price Changes:</strong> Prices can be updated, but past transactions honor the agreed price.
              </p>
              <p>
                <strong>Inventory:</strong> Sellers must maintain accurate stock information and fulfill orders promptly.
              </p>
              <p>
                <strong>Quality Standards:</strong> Products must meet all applicable quality, safety, and legal standards.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Payments and Transactions</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                <strong>Payment Processing:</strong> We use Razorpay for secure payment processing. All transactions are subject to Razorpay's terms.
              </p>
              <p>
                <strong>Payment Methods:</strong> We accept credit/debit cards, UPI, net banking, and digital wallets.
              </p>
              <p>
                <strong>Order Confirmation:</strong> Your order is confirmed only after successful payment and receipt of confirmation email.
              </p>
              <p>
                <strong>Transaction Fees:</strong> Pricing shown includes applicable taxes. Shipping and processing fees are shown before checkout.
              </p>
              <p>
                <strong>Disputed Charges:</strong> Contact our support team within 48 hours of an unauthorized charge.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Warranties and Disclaimers</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                <strong>As-Is Basis:</strong> The Platform is provided on an "as-is" basis without warranties of any kind.
              </p>
              <p>
                <strong>Service Availability:</strong> We do not guarantee uninterrupted or error-free service.
              </p>
              <p>
                <strong>Product Warranties:</strong> FUY is not responsible for product warranties. Warranties between Buyer and Seller apply.
              </p>
              <p>
                <strong>Third-Party Content:</strong> FUY is not responsible for accuracy or legality of third-party content.
              </p>
              <p>
                <strong>No Professional Advice:</strong> Content on FUY is not professional advice. Consult qualified professionals.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitation of Liability</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                To the maximum extent permitted by law, FUY is not liable for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Indirect, incidental, or consequential damages</li>
                <li>Loss of profits, data, or business interruption</li>
                <li>Third-party claims or actions</li>
                <li>Any damages exceeding the amount you paid us</li>
              </ul>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Indemnification</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                You agree to indemnify, defend, and hold harmless FUY from any claims, damages, or expenses arising from:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Your use of the Platform</li>
                <li>Violation of these Terms</li>
                <li>Infringement of intellectual property rights</li>
                <li>Your conduct or content</li>
                <li>Your transactions with other users</li>
              </ul>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Termination of Account</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                <strong>User Termination:</strong> You can delete your account anytime through settings. We will retain certain data as required by law.
              </p>
              <p>
                <strong>FUY Termination:</strong> We may terminate or suspend your account if you violate these Terms or engage in illegal activity.
              </p>
              <p>
                <strong>Effect of Termination:</strong> Upon termination, you lose access to the Platform and your account data.
              </p>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Content Moderation</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                <strong>Right to Moderate:</strong> We reserve the right to remove, flag, or suspend content that violates these Terms or applicable laws.
              </p>
              <p>
                <strong>Prohibited Content:</strong> We do not tolerate illegal content, harassment, hate speech, or misinformation.
              </p>
              <p>
                <strong>Account Suspension:</strong> Repeated violations may result in account suspension or permanent ban.
              </p>
              <p>
                <strong>Appeals:</strong> Users can appeal moderation decisions within 14 days.
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Data Privacy and Security</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                Your use of FUY is also governed by our <Link href="/privacy-policy" className="text-blue-600 hover:text-blue-700">Privacy Policy</Link>.
              </p>
              <p>
                We use industry-standard security measures but cannot guarantee absolute security. You use the Platform at your own risk.
              </p>
            </div>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Third-Party Links and Services</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                The Platform may contain links to third-party websites and services. FUY is not responsible for their content, accuracy, or practices.
              </p>
              <p>
                Your interactions with third parties are at your own risk and subject to their terms.
              </p>
            </div>
          </section>

          {/* Section 14 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Dispute Resolution</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                <strong>Informal Resolution:</strong> We encourage resolving disputes informally first by contacting support.
              </p>
              <p>
                <strong>Mediation:</strong> Disputes may be subject to mediation before legal action.
              </p>
              <p>
                <strong>Jurisdiction:</strong> These Terms are governed by the laws of India. Courts in Bangalore will have exclusive jurisdiction.
              </p>
              <p>
                <strong>Arbitration:</strong> Certain disputes may be subject to binding arbitration.
              </p>
            </div>
          </section>

          {/* Section 15 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Changes to Terms</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                We may update these Terms at any time. Changes take effect 30 days after posting. Continued use means acceptance of new Terms.
              </p>
              <p>
                For material changes, we will notify users via email.
              </p>
            </div>
          </section>

          {/* Section 16 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Severability</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                If any provision of these Terms is found invalid or unenforceable, the remaining provisions continue in effect.
              </p>
            </div>
          </section>

          {/* Section 17 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">17. Entire Agreement</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                These Terms, together with our Privacy Policy and any other posted guidelines, constitute the entire agreement between you and FUY.
              </p>
            </div>
          </section>

          {/* Contact Section */}
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Questions About Our Terms?</h2>
            <p className="text-gray-600 mb-4">
              If you have any questions, concerns, or disputes regarding these Terms, please contact us.
            </p>
            <div className="flex gap-4">
              <Link href="/contact-us" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">
                Contact Us
              </Link>
              <a href="mailto:legal@fuymedia.org" className="border border-blue-600 text-blue-600 px-6 py-2 rounded hover:bg-blue-50 transition">
                Legal Team
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
            <Link href="/shipping-policy" className="text-gray-600 hover:text-gray-900">
              Shipping Policy
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
