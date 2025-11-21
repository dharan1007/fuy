'use client';

import React from 'react';
import { motion } from 'framer-motion';

const features = [
  {
    title: "Space",
    subtitle: "The Origin",
    description: "Where it all begins. A limitless void of potential awaiting your spark.",
    color: "from-indigo-900 via-purple-900 to-black"
  },
  {
    title: "Earth",
    subtitle: "Connect",
    description: "Build grounded, meaningful connections that stand the test of time.",
    color: "from-emerald-800 via-green-700 to-stone-900"
  },
  {
    title: "Water",
    subtitle: "Share",
    description: "Let your thoughts and creativity flow freely like a river to the sea.",
    color: "from-cyan-700 via-blue-600 to-slate-900"
  },
  {
    title: "Fire",
    subtitle: "Grow",
    description: "Ignite your passion and transform your potential into reality.",
    color: "from-orange-600 via-red-600 to-stone-900"
  },
  {
    title: "Air",
    subtitle: "Ascend",
    description: "Rise above the noise. Experience true freedom and clarity.",
    color: "from-sky-300 via-white to-slate-400"
  }
];

export default function FeatureSection() {
  return (
    <div className="w-full relative z-10 pointer-events-none">
      {features.map((feature, index) => (
        <section key={index} className="w-full h-screen flex items-center justify-center p-8">
          <div className={`max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
            <div className={`space-y-6 pointer-events-auto ${index % 2 === 1 ? 'md:order-2' : ''}`}>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: false, margin: "-100px" }}
                className="text-xl md:text-2xl font-medium text-white/60 block mb-2"
              >
                {feature.subtitle}
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
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
