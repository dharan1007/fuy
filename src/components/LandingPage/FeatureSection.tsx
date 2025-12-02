'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Palette, Users, Compass, ShoppingBag, Sparkles, Heart, TrendingUp, Globe } from 'lucide-react';

const features = [
  {
    title: "Space",
    icon: Palette,
    tagline: "Your Creative Universe",
    description: "Unleash your creativity and document your journey in a space designed for self-expression and growth.",
    features: [
      {
        name: "Canvas",
        icon: Sparkles,
        desc: "Transform your thoughts into beautiful visual stories. Journal with rich media, templates, and AI-powered insights to track your personal growth and creative evolution."
      },
      {
        name: "Hopin",
        icon: Globe,
        desc: "Discover and plan extraordinary adventures. From weekend getaways to bucket-list experiences, collaborate with friends and find hidden gems recommended by fellow explorers."
      },
      {
        name: "Wrex",
        icon: TrendingUp,
        desc: "Visualize your progress with beautiful analytics. Set goals, track milestones, and celebrate achievements with a community that supports your journey to becoming your best self."
      }
    ]
  },
  {
    title: "Connect",
    icon: Users,
    tagline: "Build Meaningful Relationships",
    description: "Foster authentic connections and strengthen bonds with people who matter most in your life.",
    features: [
      {
        name: "Together Planning",
        icon: Users,
        desc: "Coordinate effortlessly with your circle. Share calendars, plan events, and make group decisions seamlessly. Never miss a moment with synchronized schedules and smart reminders."
      },
      {
        name: "Bond",
        icon: Heart,
        desc: "Deepen relationships through shared experiences. Create memory albums, exchange thoughtful messages, and build traditions that strengthen your connections over time."
      },
      {
        name: "Dashboard",
        icon: TrendingUp,
        desc: "Stay in sync with your social circle. Get personalized updates, celebrate friends' milestones, and never miss important moments in the lives of people you care about."
      },
      {
        name: "Chat Assistance",
        icon: Sparkles,
        desc: "AI-powered onboarding makes joining effortless. Get personalized recommendations, discover relevant communities, and connect with like-minded individuals from day one."
      }
    ]
  },
  {
    title: "Exploring",
    icon: Compass,
    tagline: "Create, Share, Inspire",
    description: "Express yourself, share your story, and inspire others while discovering content that resonates with your passions.",
    features: [
      {
        name: "Posting",
        icon: Sparkles,
        desc: "Share your moments, thoughts, and creativity with the world. Rich media support, beautiful layouts, and powerful editing tools make every post a masterpiece."
      },
      {
        name: "Content Creation",
        icon: Palette,
        desc: "Craft compelling stories with professional-grade tools. From photos and videos to long-form articles, create content that captivates and engages your audience."
      },
      {
        name: "Getting Attention",
        icon: TrendingUp,
        desc: "Grow your influence organically. Smart algorithms surface your content to interested audiences, while analytics help you understand what resonates and refine your strategy."
      },
      {
        name: "Discovery",
        icon: Compass,
        desc: "Find content that speaks to you. Personalized recommendations, trending topics, and curated collections ensure you never run out of inspiration and new perspectives."
      }
    ]
  },
  {
    title: "Multiverse",
    icon: ShoppingBag,
    tagline: "Your Digital Marketplace",
    description: "Monetize your creativity and discover unique products in a thriving ecosystem of creators and brands.",
    features: [
      {
        name: "Digital Products",
        icon: Sparkles,
        desc: "Sell your digital creations effortlessly. From art and music to courses and templates, reach a global audience and earn from your passion with built-in payment processing."
      },
      {
        name: "Physical Stores",
        icon: ShoppingBag,
        desc: "Showcase your brand and products beautifully. Create stunning storefronts, manage inventory, and connect with customers who appreciate quality and authenticity."
      },
      {
        name: "Brand Visibility",
        icon: TrendingUp,
        desc: "Get discovered by the right audience. Featured placements, targeted recommendations, and community engagement tools help your brand stand out in a crowded marketplace."
      },
      {
        name: "Creator Economy",
        icon: Heart,
        desc: "Turn your passion into profit. Fair revenue sharing, transparent analytics, and supportive community tools empower creators to build sustainable businesses doing what they love."
      }
    ]
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
                className="backdrop-blur-sm border border-white/10 rounded-3xl p-8 sm:p-12 pointer-events-auto hover:border-white/20 transition-all duration-500"
              >
                {/* Header */}
                <div className="mb-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    viewport={{ once: false }}
                    className="flex items-center gap-4 mb-4"
                  >
                    <div className="p-4 rounded-2xl bg-white/10">
                      <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <div>
                      <h2 className="text-4xl sm:text-6xl font-bold text-white">
                        {feature.title}
                      </h2>
                    </div>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    viewport={{ once: false }}
                    className="text-2xl sm:text-3xl font-semibold text-white/90 mb-3"
                  >
                    {feature.tagline}
                  </motion.p>

                  <motion.p
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    viewport={{ once: false }}
                    className="text-lg text-gray-300 max-w-3xl"
                  >
                    {feature.description}
                  </motion.p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {feature.features.map((item, idx) => {
                    const ItemIcon = item.icon;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 + idx * 0.1 }}
                        viewport={{ once: false }}
                        whileHover={{ scale: 1.03, y: -5 }}
                        className="backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/30 transition-all duration-300 group"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2 rounded-lg bg-white/10 group-hover:scale-110 transition-transform">
                            <ItemIcon className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white">{item.name}</h3>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{item.desc}</p>
                      </motion.div>
                    );
                  })}
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
              className="px-10 py-5 backdrop-blur-md border-2 border-white/30 text-white font-bold rounded-full hover:border-white/50 transition-all hover:scale-105 text-lg"
            >
              Sign In
            </a>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
