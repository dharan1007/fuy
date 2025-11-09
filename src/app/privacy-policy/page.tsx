'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
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
              FUY ("we," "us," "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile applications, and services (collectively, the "Platform").
            </p>
            <p className="text-gray-600">
              Please read this Privacy Policy carefully. By accessing or using FUY, you acknowledge that you have read, understood, and agree to be bound by all the provisions of this Privacy Policy.
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1.1 Information You Provide Directly</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <p>
                    <strong>Account Registration:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Name, email address, phone number</li>
                    <li>Password and authentication credentials</li>
                    <li>Date of birth</li>
                    <li>Address and location information</li>
                    <li>Profile picture and bio</li>
                  </ul>

                  <p className="mt-4">
                    <strong>Payment Information:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Credit/debit card details (processed via Razorpay)</li>
                    <li>UPI ID and digital wallet information</li>
                    <li>Billing and shipping addresses</li>
                    <li>Bank account details (for sellers)</li>
                  </ul>

                  <p className="mt-4">
                    <strong>Content You Create:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Posts, comments, and messages</li>
                    <li>Photos, videos, and media uploads</li>
                    <li>Journal entries and personal notes</li>
                    <li>Product listings and descriptions (sellers)</li>
                    <li>Reviews and ratings</li>
                  </ul>

                  <p className="mt-4">
                    <strong>Communication:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Messages and conversations</li>
                    <li>Customer support inquiries</li>
                    <li>Feedback and suggestions</li>
                    <li>Email and chat communications</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1.2 Information Collected Automatically</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <p>
                    <strong>Device Information:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Device type, operating system, and version</li>
                    <li>Device identifiers and unique advertising IDs</li>
                    <li>Browser type and version</li>
                    <li>Mobile network information</li>
                  </ul>

                  <p className="mt-4">
                    <strong>Usage Information:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Pages visited and features used</li>
                    <li>Time spent on Platform</li>
                    <li>Clicks, searches, and interactions</li>
                    <li>Products viewed and purchased</li>
                    <li>Links clicked and content downloaded</li>
                  </ul>

                  <p className="mt-4">
                    <strong>Location Information:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>IP address and geolocation data</li>
                    <li>GPS data (if location permissions granted)</li>
                    <li>Device location history</li>
                  </ul>

                  <p className="mt-4">
                    <strong>Cookies and Tracking:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Session cookies for authentication</li>
                    <li>Persistent cookies for preferences</li>
                    <li>Analytics tracking pixels</li>
                    <li>Third-party tracking tools</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1.3 Information from Third Parties</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Social media platforms (if linked)</li>
                    <li>Payment processors (Razorpay)</li>
                    <li>Shipping and delivery partners</li>
                    <li>Analytics providers</li>
                    <li>Business partners and advertisers</li>
                    <li>Other users (references, reviews, messages)</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>

            <div className="space-y-3 text-gray-600">
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Account Management:</strong> Create, manage, and update your account</li>
                <li><strong>Transactions:</strong> Process payments, orders, and refunds</li>
                <li><strong>Service Delivery:</strong> Provide Platform features and functionality</li>
                <li><strong>Communication:</strong> Send emails, SMS, and notifications</li>
                <li><strong>Personalization:</strong> Customize content and recommendations</li>
                <li><strong>Analytics:</strong> Understand usage patterns and improve Platform</li>
                <li><strong>Security:</strong> Detect fraud and maintain safety</li>
                <li><strong>Marketing:</strong> Send promotional emails and offers (with consent)</li>
                <li><strong>Legal Compliance:</strong> Meet regulatory and legal obligations</li>
                <li><strong>Customer Support:</strong> Respond to inquiries and issues</li>
                <li><strong>Research:</strong> Conduct surveys and user research</li>
                <li><strong>Dispute Resolution:</strong> Handle complaints and disputes</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Share Your Information</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3.1 Public Information</h3>
                <p className="text-gray-600">
                  Your profile name, profile picture, and public posts are visible to other users and potentially search engines.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3.2 Service Providers</h3>
                <p className="text-gray-600">
                  We share information with trusted third parties who help us operate the Platform:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                  <li>Payment processors (Razorpay)</li>
                  <li>Shipping and logistics partners</li>
                  <li>Email and SMS service providers</li>
                  <li>Cloud hosting providers (Supabase)</li>
                  <li>Analytics and monitoring services</li>
                  <li>Customer support platforms</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3.3 Business Transfers</h3>
                <p className="text-gray-600">
                  If FUY is acquired, merges with another company, or undergoes restructuring, your information may be transferred as part of that transaction.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3.4 Legal Requirements</h3>
                <p className="text-gray-600">
                  We may disclose your information if required by law, court order, or government request.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3.5 Consent</h3>
                <p className="text-gray-600">
                  We may share your information with other parties when you give explicit consent.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>

            <div className="space-y-4 text-gray-600">
              <p>
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>SSL/TLS encryption for data in transit</li>
                <li>AES-256 encryption for data at rest</li>
                <li>Secure password hashing (bcrypt)</li>
                <li>Regular security audits and penetration testing</li>
                <li>Access controls and authentication</li>
                <li>Firewalls and intrusion detection systems</li>
              </ul>
              <p className="mt-4">
                <strong>Note:</strong> While we implement strong security measures, no system is 100% secure. We cannot guarantee absolute security of your information.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Your Rights and Choices</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5.1 Access and Correction</h3>
                <p className="text-gray-600">
                  You can access, review, and update your personal information anytime through your account settings.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5.2 Data Deletion</h3>
                <p className="text-gray-600">
                  You can request deletion of your account and personal data. We will delete your information within 30 days, except where retention is legally required.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5.3 Marketing Communications</h3>
                <p className="text-gray-600">
                  You can opt out of promotional emails by clicking "Unsubscribe" in any email or changing your notification preferences.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5.4 Cookie Preferences</h3>
                <p className="text-gray-600">
                  You can manage cookies through your browser settings. Some features may not work if cookies are disabled.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5.5 Data Portability</h3>
                <p className="text-gray-600">
                  You can request a copy of your data in a portable format. Contact support@fuymedia.org for this request.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5.6 Do Not Track</h3>
                <p className="text-gray-600">
                  We do not currently respond to "Do Not Track" signals. However, you can manage tracking through browser settings.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Children's Privacy</h2>

            <div className="space-y-4 text-gray-600">
              <p>
                FUY is not intended for children under 13. We do not knowingly collect information from children under 13. If we become aware that a child under 13 has provided us with information, we will delete it immediately.
              </p>
              <p>
                For children 13-18, parental consent is required to use the Platform.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>

            <div className="space-y-4 text-gray-600">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Data Type</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Retention Period</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Account Information</td>
                    <td className="border border-gray-300 px-4 py-2">Until account deletion</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">Transaction Records</td>
                    <td className="border border-gray-300 px-4 py-2">7 years (for tax/legal)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">User Content (Posts, etc.)</td>
                    <td className="border border-gray-300 px-4 py-2">Until deletion by user</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">Analytics Data</td>
                    <td className="border border-gray-300 px-4 py-2">12 months</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Cookies</td>
                    <td className="border border-gray-300 px-4 py-2">1-2 years</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. International Data Transfer</h2>

            <div className="space-y-4 text-gray-600">
              <p>
                Your information may be transferred to, stored in, and processed in countries other than your country of residence. These countries may have data protection laws that differ from your home country.
              </p>
              <p>
                By using FUY, you consent to the transfer of your information to countries outside your country of residence, which may not have the same data protection laws.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Third-Party Links</h2>

            <div className="space-y-4 text-gray-600">
              <p>
                FUY may contain links to third-party websites and services. We are not responsible for their privacy practices. Please review their privacy policies before providing personal information.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Us</h2>

            <div className="space-y-4 text-gray-600">
              <p>
                If you have questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-3">Privacy Officer</p>
                <p>Email: <a href="mailto:privacy@fuymedia.org" className="text-blue-600 hover:text-blue-700">privacy@fuymedia.org</a></p>
                <p>Address: FUY Media Pvt. Ltd., Bangalore, Karnataka, India</p>
              </div>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Policy Updates</h2>

            <div className="space-y-4 text-gray-600">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant changes via email or prominent notice on the Platform. Your continued use of FUY after changes means you accept the updated Privacy Policy.
              </p>
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
            <Link href="/terms-and-conditions" className="text-gray-600 hover:text-gray-900">
              Terms & Conditions
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
