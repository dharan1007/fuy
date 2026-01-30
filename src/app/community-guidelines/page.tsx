'use client';

import React from 'react';
import Link from 'next/link';

export default function CommunityGuidelinesPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="text-blue-600 mb-4 inline-block">&larr; Back to Home</Link>
                    <h1 className="text-4xl font-bold text-gray-900">Community Guidelines and Content Policy</h1>
                    <p className="mt-2 text-lg text-gray-600">FUY Media</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-white rounded-lg shadow-sm p-8 prose prose-lg max-w-none">
                    <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center bg-gray-50">
                        <p className="text-gray-500 italic">
                            [Please paste the content from "Community Guidelines and Content Policy for Fuy.docx" here]
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
