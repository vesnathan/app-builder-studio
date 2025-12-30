"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { Button } from "@nextui-org/react";
import { useSearchParams } from "next/navigation";
import { HeroSlider } from "@/components/HeroSlider";
import { AddressSection } from "@/components/AddressSection";
import ParallaxGap from "@/components/layout/ParallaxGap";

// reCAPTCHA site key - same as contact form
const RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
  "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"; // Test key

// Google reCAPTCHA type declaration
interface Grecaptcha {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
}

declare global {
  interface Window {
    grecaptcha: Grecaptcha;
  }
}

// Quote form data interface
interface QuoteFormData {
  formType: string;
  recaptchaToken: string;
  preselected_service?: string;
  [key: string]: FormDataEntryValue | string | undefined;
}

const SERVICE_TYPES = [
  { value: "WEB_APP", label: "Web Application" },
  { value: "MOBILE_APP", label: "Mobile App (iOS/Android)" },
  { value: "MVP", label: "MVP / Prototype" },
  { value: "API", label: "API Development" },
  { value: "CLOUD", label: "Cloud Infrastructure" },
  { value: "CONSULTING", label: "Technical Consulting" },
  { value: "OTHER", label: "Other - Please Describe" },
];

const BUSINESS_TYPES = [
  { value: "STARTUP", label: "Startup / New Business" },
  { value: "SMALL_BUSINESS", label: "Small Business" },
  { value: "ECOMMERCE", label: "E-Commerce / Online Store" },
  { value: "PROFESSIONAL", label: "Professional Services" },
  { value: "NONPROFIT", label: "Non-Profit Organization" },
  { value: "OTHER", label: "Other" },
];

const TIMELINE_OPTIONS = [
  { value: "ASAP", label: "ASAP" },
  { value: "1_MONTH", label: "Within 1 Month" },
  { value: "3_MONTHS", label: "Within 3 Months" },
  { value: "FLEXIBLE", label: "Flexible Timeline" },
];

function QuoteForm() {
  const searchParams = useSearchParams();
  const preselectedService = searchParams.get("service");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const formContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load reCAPTCHA script
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setRecaptchaLoaded(true);
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector(`script[src*="recaptcha"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    const formData = new FormData(e.currentTarget);

    try {
      // Get reCAPTCHA token
      let recaptchaToken = "";
      if (recaptchaLoaded && window.grecaptcha) {
        recaptchaToken = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, {
          action: "quote_form",
        });
      }

      // Build data object from form
      const data: QuoteFormData = {
        formType: "quote",
        recaptchaToken,
      };

      // Add all form fields
      formData.forEach((value, key) => {
        data[key] = value;
      });

      if (preselectedService) {
        data.preselected_service = preselectedService;
      }

      const response = await fetch(
        "https://r0nhsnxik1.execute-api.ap-southeast-2.amazonaws.com/contact",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (response.ok) {
        setSubmitStatus("success");
        (e.target as HTMLFormElement).reset();
      } else {
        setSubmitStatus("error");
      }
      // Scroll to form container to show success/error message with offset
      setTimeout(() => {
        if (formContainerRef.current) {
          const yOffset = -100;
          const y = formContainerRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 100);
    } catch (error) {
      console.error("Form submission error:", error);
      setSubmitStatus("error");
      setTimeout(() => {
        if (formContainerRef.current) {
          const yOffset = -100;
          const y = formContainerRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green font-roboto-slab";
  const labelClassName =
    "block text-sm font-medium text-gray-700 mb-2 font-roboto-slab";
  const selectClassName =
    "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green font-roboto-slab bg-white";

  return (
    <div className="min-h-screen">
      {/* Hero Slider */}
      <HeroSlider />

      {/* Address/Contact Section */}
      <AddressSection />

      {/* Contact Form in Parallax Gap */}
      <ParallaxGap
        image="/images/hero-team-collaboration.jpg"
        minHeight="auto"
        overlay="linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.85) 100%)"
      >
        <section className="py-20 w-full">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-white mb-4 font-josefin">
                  Get a Free Quote
                </h2>
                <div className="w-16 h-1 bg-brand-green mb-6 mx-auto" />
                <p className="text-xl text-white/90 font-roboto-slab mb-2">
                  Custom app development tailored to your business needs
                </p>
                <p className="text-white/80 font-roboto-slab">
                  Serving businesses nationwide
                </p>
              </div>

              <div ref={formContainerRef} className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
                {submitStatus === "success" && (
                  <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg font-roboto-slab">
                    Thank you! Your quote request has been received. We'll get
                    back to you within 24 hours with a custom quote for your
                    project.
                  </div>
                )}
                {submitStatus === "error" && (
                  <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg font-roboto-slab">
                    Sorry, there was an error submitting your quote request.
                    Please try again or email us directly at
                    hello@app-builder-studio.com
                  </div>
                )}

                <div className="mb-8 p-4 bg-brand-green/10 rounded-lg border-2 border-brand-green/30">
                  <p className="text-gray-700 text-center font-roboto-slab">
                    <strong className="text-brand-green font-josefin">
                      Ready to Grow Your Business?
                    </strong>{" "}
                    Tell us about your project and we'll provide a custom quote
                    tailored to your specific needs and budget.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-xl font-semibold text-brand-green mb-4 font-josefin">
                      Your Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClassName}>First Name *</label>
                        <input
                          type="text"
                          name="firstName"
                          placeholder="John"
                          required
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className={labelClassName}>Last Name *</label>
                        <input
                          type="text"
                          name="lastName"
                          placeholder="Smith"
                          required
                          className={inputClassName}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className={labelClassName}>Email *</label>
                        <input
                          type="email"
                          name="email"
                          placeholder="john@example.com"
                          required
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className={labelClassName}>Phone *</label>
                        <input
                          type="tel"
                          name="phone"
                          placeholder="0400 123 456"
                          required
                          className={inputClassName}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Business Type */}
                  <div>
                    <h3 className="text-xl font-semibold text-brand-green mb-4 font-josefin">
                      Business Information
                    </h3>
                    <div>
                      <label className={labelClassName}>
                        What type of business do you have? *
                      </label>
                      <select
                        name="businessType"
                        required
                        className={selectClassName}
                      >
                        <option value="">Select business type</option>
                        {BUSINESS_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4">
                      <label className={labelClassName}>
                        Website (if you have one)
                      </label>
                      <input
                        type="url"
                        name="currentWebsite"
                        placeholder="https://example.com"
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  {/* Service Required */}
                  <div>
                    <h3 className="text-xl font-semibold text-brand-green mb-4 font-josefin">
                      Service Required
                    </h3>
                    <div>
                      <label className={labelClassName}>
                        What service do you need? *
                      </label>
                      <select
                        name="serviceType"
                        required
                        defaultValue={preselectedService || ""}
                        className={selectClassName}
                      >
                        <option value="">Select a service</option>
                        {SERVICE_TYPES.map((service) => (
                          <option key={service.value} value={service.value}>
                            {service.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Company Details */}
                  <div>
                    <h3 className="text-xl font-semibold text-brand-green mb-4 font-josefin">
                      Company Details
                    </h3>
                    <div>
                      <label className={labelClassName}>Company Name *</label>
                      <input
                        type="text"
                        name="companyName"
                        placeholder="Your Company Pty Ltd"
                        required
                        className={inputClassName}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className={labelClassName}>Industry</label>
                        <input
                          type="text"
                          name="industry"
                          placeholder="e.g., Retail, Healthcare, etc."
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className={labelClassName}>Timeline *</label>
                        <select
                          name="timeline"
                          required
                          className={selectClassName}
                        >
                          <option value="">When do you need this?</option>
                          {TIMELINE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Project Details */}
                  <div>
                    <h3 className="text-xl font-semibold text-brand-green mb-4 font-josefin">
                      Project Details
                    </h3>
                    <div>
                      <label className={labelClassName}>
                        Tell us about your project *
                      </label>
                      <textarea
                        name="description"
                        placeholder="e.g., We need a new website for our online store with payment integration and inventory management. We currently have 100+ products..."
                        rows={5}
                        required
                        className={`${inputClassName} resize-none`}
                      />
                      <p className="text-sm text-gray-500 mt-2 font-roboto-slab">
                        Please include: project goals, features needed, budget
                        range, and any existing systems or platforms
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full bg-brand-green text-white font-semibold text-lg font-josefin"
                      size="lg"
                      isLoading={isSubmitting}
                      isDisabled={isSubmitting}
                    >
                      {isSubmitting ? "Sending..." : "Get Free Quote"}
                    </Button>
                    <p className="text-center text-sm text-gray-500 mt-3 font-roboto-slab">
                      We'll respond within 24 hours
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </ParallaxGap>

      {/* About Section - solid background with curved edges */}
      <section className="relative -mt-[1px]">
        {/* Wave curve at top */}
        <div
          className="absolute top-0 left-0 right-0 w-full overflow-visible leading-[0] z-10"
          style={{ transform: "translateY(-100%)" }}
        >
          <svg
            className="relative block w-full h-[60px]"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path d="M0,120 C300,20 900,20 1200,120 Z" fill="#f9fafb" />
          </svg>
        </div>

        <div className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-left mb-12">
                <h2 className="text-3xl font-bold text-gray-800 mb-2 font-josefin">
                  Why Choose App Builder Studio
                </h2>
                <div className="w-16 h-1 bg-brand-green mb-6" />
                <p className="text-gray-600 font-roboto-slab leading-relaxed">
                  We're a custom app development company dedicated to helping
                  businesses succeed with scalable software solutions.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                {[
                  {
                    icon: "✓",
                    title: "Modern Tech Stack",
                    desc: "React, Next.js, Node.js, AWS - we use proven technologies that scale",
                  },
                  {
                    icon: "✓",
                    title: "Custom Development",
                    desc: "No templates or WordPress - every line of code is written for your project",
                  },
                  {
                    icon: "✓",
                    title: "Startup Friendly",
                    desc: "From MVP to scale - we help startups launch fast and iterate quickly",
                  },
                  {
                    icon: "✓",
                    title: "Enterprise Ready",
                    desc: "Scalable architecture designed to handle growth and high traffic",
                  },
                  {
                    icon: "✓",
                    title: "Ongoing Support",
                    desc: "We don't disappear after launch - we're here to maintain and improve",
                  },
                  {
                    icon: "✓",
                    title: "Transparent Process",
                    desc: "Regular updates, clear communication, and no surprises on pricing",
                  },
                ].map((item, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-shrink-0">
                      <i className="text-brand-green text-xl">{item.icon}</i>
                    </div>
                    <div>
                      <h6 className="font-bold text-gray-800 mb-1 font-roboto-slab">
                        {item.title}
                      </h6>
                      <p className="text-gray-600 text-sm font-roboto-slab leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Wave curve at bottom */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-[0]">
          <svg
            className="relative block w-full h-[60px]"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 C300,100 900,100 1200,0 L1200,120 L0,120 Z"
              fill="#282828"
            />
          </svg>
        </div>
      </section>
    </div>
  );
}

export default function QuotePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <QuoteForm />
    </Suspense>
  );
}
