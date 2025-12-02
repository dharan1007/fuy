'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Palette, Users, Compass, ShoppingBag } from 'lucide-react';

const features = [
  {
    title: "Space",
    icon: Palette,
    description: "Your creative universe awaits",
    features: [
      { name: "Canvas", desc: "Express yourself through journaling and visual storytelling" },
      { name: "Hopin", desc: "Plan adventures and discover new experiences" },
      { name: "Wrex", desc: "Track your progress and celebrate achievements" }
    ],
    color: "from-indigo-500 via-purple-500 to-pink-500",
    bgGradient: "from-indigo-900/20 via-purple-900/20 to-pink-900/20"
  },
  {
    title: "Connect",
    icon: Users,
    description: "Build meaningful relationships",
    features: [
      { name: "Together Planning", desc: "Collaborate and coordinate with friends seamlessly" },
      { name: "Bond", desc: "Strengthen connections through shared experiences" },
      { name: "Dashboard", desc: "Stay updated with your social circle" },
      { name: "Chat Assistance", desc: "AI-powered onboarding and support for newcomers" }
    ],
    color: "from-emerald-500 via-teal-500 to-cyan-500",
    bgGradient: "from-emerald-900/20 via-teal-900/20 to-cyan-900/20"
  },
  {
    title: "Exploring",
    icon: Compass,
    description: "Create and share your story",
    features: [
      { name: "Posting", desc: "Share your thoughts and moments with the world" },
      { name: "Content Creation", desc: "Craft compelling stories with rich media" },
      { name: "Getting Attention", desc: "Reach your audience and grow your influence" },
      { name: "Discovery", desc: "Find content that resonates with you" }
    ],
    color: "from-orange-500 via-red-500 to-rose-500",
    bgGradient: "from-orange-900/20 via-red-900/20 to-rose-900/20"
  },
  {
    title: "Multiverse",
    icon: ShoppingBag,
    description: "Your marketplace for digital and physical",
    features: [
      { name: "Digital Products", desc: "Sell and discover unique digital creations" },
      { name: "Physical Stores", desc: "Showcase your brand and products" },
      { name: "Brand Visibility", desc: "Get discovered by the right audience" },
      { name: "Creator Economy", desc: "Monetize your passion and creativity" }
    ],
    color: "from-violet-500 via-fuchsia-500 to-pink-500",
    bgGradient: "from-violet-900/20 via-fuchsia-900/20 to-pink-900/20"
  }
];

export default function FeatureSection() {
  return (
    <div className="w-full relative z-10 pointer-events-none">
      {features.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <section key={index} className="w-full min-h-screen flex items-center justify-center p-4 sm:p-8">
            <div className="max-w-6xl w-full">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: false, margin: "-100px" }}
                className={`bg-gradient-to-br ${feature.bgGradient} backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-12 pointer-events-auto hover:border-white/20 transition-all duration-500`}
              >
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    viewport={{ once: false }}
                    className={`p-4 rounded-2xl bg-gradient-to-br ${feature.color}`}
                  >
                    <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </motion.div>
                  <div>
                    <motion.h2
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      viewport={{ once: false }}
                      className={`text-4xl sm:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${feature.color}`}
                    >
                      {feature.title}
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      viewport={{ once: false }}
                      className="text-lg sm:text-xl text-gray-300 mt-2"
                    >
                      {feature.description}
                    </motion.p>
                  </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {feature.features.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 + idx * 0.1 }}
                      viewport={{ once: false }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>
        );
      })}

      {/* CTA Section */}
      <section className="w-full min-h-screen flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: false }}
          className="text-center pointer-events-auto max-w-3xl"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: false }}
            className="text-5xl sm:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-6"
          >
            Ready to Begin?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: false }}
            className="text-xl text-gray-300 mb-12"
          >
            Join thousands creating, connecting, and growing together
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: false }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a
              href="/signup"
              className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all hover:scale-105 shadow-2xl shadow-purple-500/30 text-lg"
            >
              Create Account
            </a>
            <a
              href="/login"
              className="px-10 py-5 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white font-bold rounded-full hover:bg-white/20 transition-all hover:scale-105 text-lg"
            >
              Sign In
            </a>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
