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
              FUY Media ("we," "us," "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our real-time messaging platform, web and mobile applications, and services (collectively, the "Platform").
            </p>
            <p className="text-gray-600 mb-4">
              Please read this Privacy Policy carefully. By accessing or using FUY Media, you acknowledge that you have read, understood, and agree to be bound by all the provisions of this Privacy Policy.
            </p>
            <p className="text-gray-600">
              <strong>Contact:</strong> fuymedia@gmail.com
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1.1 Account Information</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Name, email address, and username</li>
                    <li>Password and authentication credentials</li>
                    <li>Profile picture and user bio</li>
                    <li>Phone number (optional)</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1.2 Message and Communication Data</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Content of messages you send and receive</li>
                    <li>Timestamps of messages</li>
                    <li>Conversation metadata (participants, creation date)</li>
                    <li>Typing indicators and read receipts</li>
                    <li>File attachments and media shared in conversations</li>
                    <li>Conversation history</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1.3 User Relationships and Presence Data</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Follower and following relationships</li>
                    <li>Friendship status and connections</li>
                    <li>Online/offline status</li>
                    <li>Last activity timestamps</li>
                    <li>Typing indicators when composing messages</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1.4 Technical and Device Data</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>IP address and geolocation data</li>
                    <li>Device type, operating system, and version</li>
                    <li>Browser type and version</li>
                    <li>Device identifiers</li>
                    <li>Cookies and session identifiers</li>
                    <li>Crash reports and error logs</li>
                    <li>App version and settings</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1.5 Usage Analytics</h3>
                <div className="space-y-3 text-gray-600 ml-4">
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Features used and interaction patterns</li>
                    <li>Time spent on the platform</li>
                    <li>Pages and sections accessed</li>
                    <li>Search queries and filtering preferences</li>
                    <li>How you interact with other users</li>
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
                <li><strong>Real-Time Messaging:</strong> Deliver messages instantly to other users</li>
                <li><strong>User Relationships:</strong> Manage your followers, following, and friendships</li>
                <li><strong>Presence Tracking:</strong> Display online/offline status and typing indicators</li>
                <li><strong>Search Functionality:</strong> Enable searching for followers and users</li>
                <li><strong>Communication:</strong> Send notifications about messages and activity</li>
                <li><strong>Service Delivery:</strong> Provide Platform features and functionality</li>
                <li><strong>Analytics:</strong> Understand usage patterns and improve Platform</li>
                <li><strong>Security:</strong> Detect fraud, prevent abuse, and maintain safety</li>
                <li><strong>Legal Compliance:</strong> Meet regulatory and legal obligations</li>
                <li><strong>Customer Support:</strong> Respond to inquiries and technical issues</li>
                <li><strong>Marketing:</strong> Send updates about new features (with consent)</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Share Your Information</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3.1 Messages and Conversations</h3>
                <p className="text-gray-600">
                  Your messages are shared only with the intended recipient(s) in your conversations. Messages are not publicly visible unless you choose to share them.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3.2 User Relationships</h3>
                <p className="text-gray-600">
                  Your followers/following list and user profile information are visible to other users who have accepted your friendship or followed you back.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3.3 Service Providers</h3>
                <p className="text-gray-600">
                  We share information with trusted third parties who help us operate the Platform:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                  <li>Cloud hosting and database providers</li>
                  <li>Email and notification service providers</li>
                  <li>Analytics and monitoring services</li>
                  <li>Payment processors (if applicable)</li>
                  <li>Customer support platforms</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3.4 Business Transfers</h3>
                <p className="text-gray-600">
                  If FUY Media is acquired, merges with another company, or undergoes restructuring, your information may be transferred as part of that transaction.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3.5 Legal Requirements</h3>
                <p className="text-gray-600">
                  We may disclose your information if required by law, court order, or government request.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3.6 Your Consent</h3>
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
                <li>TLS/SSL encryption for all data transmitted between your device and our servers</li>
                <li>Encrypted data storage and secure database access controls</li>
                <li>Secure password hashing using industry-standard algorithms</li>
                <li>Real-time connection security for WebSocket communications</li>
                <li>Regular security audits and vulnerability testing</li>
                <li>Firewalls and intrusion detection systems</li>
                <li>Limited access to personal data by authorized personnel only</li>
                <li>Session management and authentication mechanisms</li>
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
                  You can access, review, and update your personal information anytime through your account settings. You can modify your profile information, notification preferences, and privacy settings.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5.2 Data Deletion</h3>
                <p className="text-gray-600">
                  You can request deletion of your account and personal data by contacting us at fuymedia@gmail.com. We will delete your information within 30 days, except where retention is legally required.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5.3 Message Deletion</h3>
                <p className="text-gray-600">
                  You can delete individual messages or entire conversations from your account. Deleted messages will be removed from your view, but may remain in the recipient's account.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5.4 Notification Preferences</h3>
                <p className="text-gray-600">
                  You can control what notifications you receive by adjusting your notification settings in your account preferences.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5.5 Cookie Preferences</h3>
                <p className="text-gray-600">
                  You can manage cookies through your browser settings. Some features may not work if cookies are disabled.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5.6 Data Portability</h3>
                <p className="text-gray-600">
                  You can request a copy of your data in a portable format. Contact fuymedia@gmail.com for this request.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Children's Privacy</h2>

            <div className="space-y-4 text-gray-600">
              <p>
                FUY Media is not intended for children under 13. We do not knowingly collect information from children under 13. If we become aware that a child under 13 has provided us with information, we will delete it immediately.
              </p>
              <p>
                For children 13-18, parental consent is required to use the Platform. Parents can contact us to request deletion of their child's account or information.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>

            <div className="space-y-4 text-gray-600">
              <p>
                We retain your personal information for the following periods:
              </p>
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
                    <td className="border border-gray-300 px-4 py-2">While account is active</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">Messages and Conversation History</td>
                    <td className="border border-gray-300 px-4 py-2">Until deletion by user or account termination</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Friendship and Follower Data</td>
                    <td className="border border-gray-300 px-4 py-2">Until user revokes relationship</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">Analytics and Usage Data</td>
                    <td className="border border-gray-300 px-4 py-2">12 months</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Session Logs</td>
                    <td className="border border-gray-300 px-4 py-2">90 days</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">Cookies and Tracking Data</td>
                    <td className="border border-gray-300 px-4 py-2">1-2 years</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Backup and Archive Data</td>
                    <td className="border border-gray-300 px-4 py-2">Up to 90 days after deletion</td>
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
                Your information may be transferred to, stored in, and processed in countries other than your country of residence. Currently, our primary data storage location is in India. These countries may have data protection laws that differ from your home country.
              </p>
              <p>
                By using FUY Media, you consent to the transfer of your information to countries outside your country of residence, which may not have the same data protection laws. We ensure that any international transfers comply with applicable data protection laws and are protected by appropriate safeguards.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Third-Party Links</h2>

            <div className="space-y-4 text-gray-600">
              <p>
                FUY Media may contain links to third-party websites and services. We are not responsible for their privacy practices. Please review their privacy policies before providing personal information.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Us</h2>

            <div className="space-y-4 text-gray-600">
              <p>
                If you have questions about this Privacy Policy or our privacy practices, please contact our Privacy Compliance Officer:
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-3">Privacy Compliance Officer</p>
                <p>Email: <a href="mailto:fuymedia@gmail.com" className="text-blue-600 hover:text-blue-700">fuymedia@gmail.com</a></p>
              </div>
              <p className="mt-4">
                We will respond to your request within 30 days.
              </p>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Policy Updates</h2>

            <div className="space-y-4 text-gray-600">
              <p>
                We reserve the right to modify this Privacy Policy at any time. Changes and clarifications will take effect immediately upon their posting on the Platform.
              </p>
              <p>
                If we make material changes to this policy, we will notify you by:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Posting a prominent notice in the application</li>
                <li>Sending you an email notification</li>
                <li>Requiring you to accept the updated policy before continuing to use the service</li>
              </ul>
              <p className="mt-4">
                Your continued use of FUY Media after changes are posted constitutes your acceptance of the updated policy.
              </p>
              <p>
                <strong>Last Updated:</strong> November 15, 2025<br/>
                <strong>Effective Date:</strong> November 15, 2025
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
