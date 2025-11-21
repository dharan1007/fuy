'use client';

import React from 'react';
import { motion } from 'framer-motion';

const features = [
  {
    title: "Connect",
    description: "Build meaningful connections with people who share your passions.",
    color: "from-blue-400 to-cyan-300"
  },
  {
    title: "Share",
    description: "Express yourself through photos, videos, and thoughts in a safe space.",
    color: "from-purple-400 to-pink-300"
  },
  {
    title: "Grow",
    description: "Discover new ideas and expand your horizons with our community.",
    color: "from-amber-400 to-orange-300"
  }
];

export default function FeatureSection() {
  return (
    <div className="w-full relative z-10 pointer-events-none">
      {features.map((feature, index) => (
        <section key={index} className="w-full h-screen flex items-center justify-center p-8">
          <div className={`max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
            <div className={`space-y-6 pointer-events-auto ${index % 2 === 1 ? 'md:order-2' : ''}`}>
              <motion.h2 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: false, margin: "-100px" }}
                className={`text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${feature.color}`}
              >
                {feature.title}
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: false, margin: "-100px" }}
                className="text-xl text-gray-300 leading-relaxed"
              >
                {feature.description}
              </motion.p>
            </div>
            <div className="hidden md:block">
              {/* 3D content will be positioned here by the Scene component */}
            </div>
          </div>
        </section>
      ))}
      
      <section className="w-full h-[50vh] flex items-center justify-center">
        <div className="text-center pointer-events-auto">
          <h2 className="text-4xl font-bold text-white mb-8">Ready to join?</h2>
          <a href="/signup" className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all hover:scale-105">
            Create Account
          </a>
        </div>
      </section>
    </div>
  );
}
