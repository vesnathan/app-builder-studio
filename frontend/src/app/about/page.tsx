"use client";

import { Button } from "@nextui-org/react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-brand-green to-brand-lime py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            About App Builder Studio
          </h1>
          <p className="text-xl text-white/90">
            Custom app development for startups and growing businesses
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-brand-green mb-6 text-center">
            Our Story
          </h2>
          <div className="prose prose-lg max-w-none text-gray-700">
            <p className="mb-4">
              App Builder Studio was founded with a simple mission: to help
              businesses build custom software that actually works. No templates,
              no WordPress sites, no cookie-cutter solutions.
            </p>
            <p className="mb-4">
              With deep expertise in React, Next.js, Node.js, and AWS cloud
              infrastructure, our team builds web applications and mobile apps
              that are fast, scalable, and maintainable. We write clean code
              that your future developers will thank you for.
            </p>
            <p>
              From MVPs for early-stage startups to enterprise applications
              handling millions of users, we're committed to delivering software
              that solves real problems and drives business growth.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-brand-green mb-12 text-center">
            Why Choose Us
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="w-16 h-16 bg-brand-lime rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-3xl">💻</span>
              </div>
              <h3 className="text-xl font-semibold text-brand-green mb-3 text-center">
                Modern Tech Stack
              </h3>
              <p className="text-gray-700 text-center">
                React, Next.js, Node.js, TypeScript, AWS - we use proven
                technologies that scale with your business
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="w-16 h-16 bg-brand-lime rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-xl font-semibold text-brand-green mb-3 text-center">
                Ship Fast
              </h3>
              <p className="text-gray-700 text-center">
                We help startups launch MVPs quickly and iterate based on real
                user feedback - not assumptions
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="w-16 h-16 bg-brand-lime rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-3xl">🤝</span>
              </div>
              <h3 className="text-xl font-semibold text-brand-green mb-3 text-center">
                Long-term Partner
              </h3>
              <p className="text-gray-700 text-center">
                We don't just deliver and disappear - we partner with you for
                ongoing development, maintenance, and support
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-brand-green">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Build Your App?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Contact us today for a free consultation and project estimate
          </p>
          <Link href="/contact">
            <Button
              size="lg"
              className="bg-white text-brand-green font-semibold"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
