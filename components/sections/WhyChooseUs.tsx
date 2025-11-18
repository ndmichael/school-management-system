"use client";

import { features, stats } from "@/data";
import { SectionHeader, FeatureCard } from "@/components/shared";
import { motion } from "framer-motion";

export function WhyChooseUs() {
  return (
    <section className="relative py-28 px-6 sm:px-8 lg:px-12 bg-white overflow-hidden">

      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -top-32 -right-20 w-[420px] h-[420px] bg-primary-300/30 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-16 w-[420px] h-[420px] bg-secondary-300/30 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto">

        <SectionHeader
          badge="Why Choose SYK"
          title="Leading Healthcare Education"
          description="We combine academic excellence with hands-on clinical training to prepare you for a successful healthcare career."
          centered
        />

        {/* Features Grid */}
        <motion.div 
          className="mt-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-10"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mt-24 rounded-3xl p-12 bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-xl"
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <p className="text-5xl font-extrabold drop-shadow-lg">{stat.value}</p>
                <p className="text-primary-100/90 tracking-wide text-lg">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}
