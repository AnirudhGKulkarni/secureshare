import React, { useEffect, useState } from "react";
import { 
  ChevronLeft, ChevronRight, Shield, Lock, Users, Eye, CheckCircle, 
  Zap, Globe, BarChart3, FileText, Award, Star
} from "lucide-react";
import FrontNavbar from "@/components/FrontNavbar";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";


type AttackDataPoint = { label: string; count: number };

const mockAttackData: AttackDataPoint[] = [
  { label: "Phishing", count: 42 },
  { label: "Malware", count: 31 },
  { label: "DDoS", count: 18 },
  { label: "Ransomware", count: 12 },
  { label: "Insider", count: 6 },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$29",
    period: "per user/month",
    description: "Perfect for small teams",
    features: ["Up to 5 users", "5GB storage per user", "Basic encryption", "Email support"],
    cta: "Start Free Trial",
    featured: false,
  },
  {
    name: "Professional",
    price: "$79",
    period: "per user/month",
    description: "For growing businesses",
    features: ["Unlimited users", "Unlimited storage", "Military-grade encryption", "Priority support", "Advanced audit logs"],
    cta: "Start Free Trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact sales",
    description: "For large organizations",
    features: ["Everything in Professional", "Custom integrations", "Dedicated support", "SLA guarantee", "On-premises option"],
    cta: "Contact Sales",
    featured: false,
  },
];

const trustedPartners = [
  "Microsoft", "Google Cloud", "AWS", "Adobe", "Salesforce", "Slack"
];

const FrontPage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDarkMode] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbName, setFbName] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbMessage, setFbMessage] = useState("");
  // Update this path to the image you placed in /public (e.g., /screens/demo.png)
  const screenImageSrc = "/image.png";
  // Optional: use a laptop frame image from /public. Example: /laptop-frame.png
  const useImageLaptop = false;
  const laptopFrameSrc = "/laptop-frame.png";
  // Adjust these to match your laptop frame's screen area (percentages of the frame image)
  const screenRect = {
    top: "9%",
    left: "5%",
    width: "90%",
    height: "66%",
  } as const;

  const carouselItems = [
    {
      title: "Secure File Sharing",
      description: "Share files with end-to-end encryption and access control",
      icon: Shield,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Military-Grade Encryption",
      description: "256-bit encryption ensuring your data is always protected",
      icon: Lock,
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Granular Access Control",
      description: "Control who can access your files with detailed permissions",
      icon: Users,
      color: "from-pink-500 to-pink-600",
    },
    {
      title: "Audit Trails",
      description: "Track every action taken on your sensitive documents",
      icon: Eye,
      color: "from-green-500 to-green-600",
    },
    {
      title: "Compliance Ready",
      description: "Meet regulatory requirements with our secure platform",
      icon: CheckCircle,
      color: "from-orange-500 to-orange-600",
    },
  ];

  const testimonials = [
    {
      name: "John Smith",
      company: "Tech Corp",
      content: "TrustNShare revolutionized how we handle sensitive documents. Highly recommended!",
      rating: 5,
    },
    {
      name: "Sarah Johnson",
      company: "Finance Inc",
      content: "The security features are exceptional. Our compliance audits became much easier.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      company: "Legal Associates",
      content: "Best document sharing solution for law firms. The audit trails are invaluable.",
      rating: 5,
    },
    {
      name: "Emily Davis",
      company: "Healthcare Plus",
      content: "HIPAA compliant and user-friendly. Our patients trust us more now.",
      rating: 5,
    },
    {
      name: "Robert Wilson",
      company: "Enterprise Solutions",
      content: "Seamless integration with our workflows. Outstanding customer support too!",
      rating: 5,
    },
  ];

  const features = [
    {
      icon: Lock,
      title: "End-to-End Encryption",
      description: "All files are encrypted before being sent to our servers",
    },
    {
      icon: Users,
      title: "Access Control",
      description: "Granular permissions for individual files and folders",
    },
    {
      icon: Eye,
      title: "Audit Logs",
      description: "Complete visibility into who accessed what and when",
    },
  ];

  // Auto-advance carousel every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);

  const CurrentIcon = carouselItems[currentSlide].icon;
  const bgClass = isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900";
  const cardBgClass = isDarkMode ? "bg-gray-800" : "bg-white";

  return (
    <div className={`${bgClass} transition-colors duration-300`}>
      <FrontNavbar isDarkMode={isDarkMode} />

      {/* Hero Section with CTA */}
      <section className={`relative w-full py-20 px-6 ${isDarkMode ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" : "bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700"} text-white overflow-hidden`}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-8 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                Secure File Sharing for Modern Businesses
              </h1>
              <p className="text-xl opacity-90 mb-8 animate-fade-in">
                Protect your sensitive data with military-grade encryption, granular access controls, and complete audit visibility.
              </p>
        
            </div>
            <div className="hidden md:block animate-scale-in">
              <div className={`${isDarkMode ? "bg-gray-700/50 border-gray-600" : "bg-white/10 border-white/30"} backdrop-blur-md rounded-2xl p-8 border shadow-2xl transition-all duration-300 hover:shadow-3xl hover:scale-105`}>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <span className="text-lg">256-bit AES encryption</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <span className="text-lg">Real-time access control</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <span className="text-lg">Complete audit trails</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <span className="text-lg">GDPR & HIPAA compliant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Carousel Section */}
      <section className={`relative w-full h-96 overflow-hidden ${isDarkMode ? "bg-gray-800" : "bg-gradient-to-r from-blue-50 to-purple-50"}`}>
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Carousel Content with Animation */}
          <div className="text-center text-white z-10 px-6 animate-scale-in" key={`carousel-${currentSlide}`}>
            <div className={`bg-gradient-to-r ${carouselItems[currentSlide].color} rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-lg transform transition-transform duration-500 hover:scale-110`}>
              <CurrentIcon className="w-10 h-10" />
            </div>
            <h2 className="text-4xl font-bold mb-4 transition-all duration-500">{carouselItems[currentSlide].title}</h2>
            <p className="text-xl opacity-90 transition-all duration-500">{carouselItems[currentSlide].description}</p>
          </div>

          {/* Carousel Background with smooth transition */}
          <div className={`absolute inset-0 bg-gradient-to-r ${carouselItems[currentSlide].color} -z-10 transition-all duration-700`}></div>

          {/* Navigation Buttons with enhanced styling */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/50 text-white rounded-full p-3 transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg backdrop-blur-sm"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/30 hover:bg-white/50 text-white rounded-full p-3 transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg backdrop-blur-sm"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots with enhanced styling */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
            {carouselItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`rounded-full transition-all duration-300 transform hover:scale-150 ${
                  idx === currentSlide ? "bg-white w-8 h-2 shadow-lg" : "bg-white/50 w-2 h-2 hover:bg-white/75"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section id="stats" className={`py-16 px-6 ${isDarkMode ? "bg-gray-800" : "bg-gray-50"}`}>
        <div className="max-w-7xl mx-auto">
          <h2 className={`text-3xl font-bold mb-12 text-center animate-fade-in ${isDarkMode ? "text-white" : "text-gray-900"}`}>Current Cyber Threats</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {mockAttackData.map((attack, idx) => (
              <a
                key={attack.label}
                href="https://www.cybersecuritydive.com/" 
                target="_blank"
                rel="noopener noreferrer"
                className={`${cardBgClass} p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group transform hover:-translate-y-2 border ${
                  isDarkMode ? "border-gray-700 hover:border-blue-500" : "border-gray-200 hover:border-blue-400"
                }`}
                style={{animationDelay: `${idx * 0.1}s`}}
              >
                <h3 className={`text-3xl font-bold mb-2 group-hover:text-blue-600 transition-colors duration-300 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{attack.count}</h3>
                <p className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{attack.label} Attacks</p>
                <p className={`text-xs flex items-center gap-1 opacity-75 group-hover:opacity-100 transition-opacity ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>Read latest articles <span className="group-hover:translate-x-1 transition-transform">→</span></p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section - Enhanced */}
      <section id="services" className={`py-20 px-6 ${bgClass}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className={`text-4xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Comprehensive Security Solutions</h2>
            <p className={`text-lg ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Everything you need to share files securely and stay compliant
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const FeatureIcon = feature.icon;
              return (
                <div 
                  key={idx} 
                  className={`${cardBgClass} p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border group animate-fade-in ${
                    isDarkMode ? "border-gray-700 hover:border-blue-500 hover:bg-gray-700/50" : "border-gray-200 hover:border-blue-400 hover:bg-blue-50/30"
                  }`}
                  style={{animationDelay: `${idx * 0.1}s`}}
                >
                  <div className={`w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <FeatureIcon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className={`text-xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{feature.title}</h3>
                  <p className={isDarkMode ? "text-gray-400 mb-4" : "text-gray-600 mb-4"}>{feature.description}</p>
                  {/* Removed "Learn more" link for a cleaner card */}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Live Demo CTA (between Services and Testimonials) */}
      <section className={`relative w-full py-24 px-6 ${isDarkMode ? "bg-gray-900" : "bg-gray-900 text-white"}`}>
        {/* soft background accents */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 -left-10 w-80 h-80 bg-red-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-10">
            
            <h2 className="mt-2 text-3xl md:text-4xl font-extrabold leading-tight">
              Experience the future of proactive cybersecurity
            </h2>
            <p className="mt-3 text-gray-300 max-w-3xl mx-auto">
              A modern and trusted secure-sharing platform that lets you exchange files, documents, and sensitive data with confidence. With strong encryption, smart access control, and a smooth user experience, it ensures every interaction stays private, protected, and effortless.
            </p>
            
          </div>

          {/* laptop-style mockup */}
          <div className="relative mt-6 flex justify-center">
            <div className="relative w-full max-w-5xl">
              <div className="rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl overflow-hidden">
                <div className="p-6 md:p-10 relative">
                  {useImageLaptop ? (
                    <>
                      {/* Laptop frame from /public */}
                      <img
                        src={laptopFrameSrc}
                        alt="Laptop device frame"
                        className="w-full h-auto block select-none pointer-events-none"
                        draggable={false}
                      />
                      {/* Screen overlay */}
                      <div
                        className="absolute z-10 overflow-hidden rounded-[12px] ring-1 ring-gray-800/60"
                        style={{
                          top: screenRect.top,
                          left: screenRect.left,
                          width: screenRect.width,
                          height: screenRect.height,
                        }}
                      >
                        <img
                          src={screenImageSrc}
                          alt="TrustNShare product screenshot"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Fallback: vector laptop with simulated UI and overlayed screen image */}
                      <div
                        className="absolute z-10 overflow-hidden rounded-[12px] ring-1 ring-gray-800/60"
                        style={{ top: "7.7%", left: "3.33%", width: "93.33%", height: "73.08%" }}
                      >
                        <img
                          src={screenImageSrc}
                          alt="TrustNShare product screenshot"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <svg viewBox="0 0 1200 520" className="w-full h-auto" role="img" aria-label="Product demo mockup">
                        <defs>
                          <linearGradient id="screenGrad" x1="0" x2="1">
                            <stop offset="0%" stopColor="#0f172a" />
                            <stop offset="100%" stopColor="#111827" />
                          </linearGradient>
                          <linearGradient id="accentGrad" x1="0" x2="1">
                            <stop offset="0%" stopColor="#2563eb" />
                            <stop offset="100%" stopColor="#7c3aed" />
                          </linearGradient>
                        </defs>
                        <rect x="20" y="20" width="1160" height="420" rx="18" fill="#0b1220" stroke="#1f2937" />
                        <rect x="40" y="40" width="1120" height="380" rx="12" fill="url(#screenGrad)" />
                        <circle cx="60" cy="60" r="6" fill="#ef4444" />
                        <circle cx="80" cy="60" r="6" fill="#f59e0b" />
                        <circle cx="100" cy="60" r="6" fill="#10b981" />
                        <rect x="60" y="90" width="180" height="310" rx="10" fill="#111827" stroke="#1f2937" />
                        <rect x="80" y="110" width="140" height="14" rx="7" fill="#334155" />
                        <rect x="80" y="140" width="120" height="10" rx="5" fill="#1f2937" />
                        <rect x="80" y="170" width="120" height="10" rx="5" fill="#1f2937" />
                        <rect x="80" y="200" width="120" height="10" rx="5" fill="#1f2937" />
                        <rect x="80" y="230" width="120" height="10" rx="5" fill="#1f2937" />
                        <rect x="80" y="260" width="120" height="10" rx="5" fill="#1f2937" />
                        <rect x="80" y="290" width="120" height="10" rx="5" fill="#1f2937" />
                        <rect x="80" y="320" width="120" height="10" rx="5" fill="#1f2937" />
                        <rect x="80" y="350" width="120" height="10" rx="5" fill="#1f2937" />
                        <rect x="260" y="110" width="860" height="80" rx="10" fill="#0b1220" stroke="#1f2937" />
                        <rect x="280" y="130" width="200" height="16" rx="8" fill="#334155" />
                        <rect x="500" y="130" width="140" height="16" rx="8" fill="#334155" />
                        <rect x="660" y="130" width="120" height="16" rx="8" fill="#334155" />
                        <rect x="800" y="130" width="120" height="16" rx="8" fill="#334155" />
                        <rect x="260" y="210" width="860" height="180" rx="12" fill="#0b1220" stroke="#1f2937" />
                        <path d="M280 360 C 360 260, 440 300, 520 260 S 700 230, 780 300 S 940 260, 1100 320" stroke="url(#accentGrad)" strokeWidth="6" fill="none" />
                        <rect x="280" y="240" width="60" height="8" rx="4" fill="#334155" />
                        <rect x="350" y="240" width="40" height="8" rx="4" fill="#334155" />
                        <rect x="400" y="240" width="50" height="8" rx="4" fill="#334155" />
                        <rect x="940" y="110" width="180" height="80" rx="10" fill="#111827" stroke="#1f2937" />
                        <rect x="960" y="130" width="80" height="12" rx="6" fill="#334155" />
                        <rect x="960" y="150" width="60" height="10" rx="5" fill="#1f2937" />
                        <rect x="100" y="440" width="1000" height="16" rx="8" fill="#0b1220" />
                      </svg>
                    </>
                  )}
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </section>

     
      {/* Testimonials Section - Enhanced */}
      <section id="testimonials" className={`py-20 px-6 ${bgClass}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className={`text-4xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Trusted by Industry Leaders</h2>
            <p className={`text-lg ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              See what our customers have to say about TrustNShare
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {testimonials.map((testimonial, idx) => (
              <div 
                key={idx} 
                className={`${cardBgClass} p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border group animate-fade-in ${
                  isDarkMode ? "border-gray-700 hover:border-blue-500" : "border-gray-200 hover:border-blue-400"
                }`}
                style={{animationDelay: `${idx * 0.1}s`}}
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400 transition-transform group-hover:scale-110" />
                  ))}
                </div>
                <p className={`mb-4 italic leading-relaxed ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>"{testimonial.content}"</p>
                <div className="border-t" style={{borderColor: isDarkMode ? '#374151' : '#e5e7eb'}}></div>
                <p className={`font-bold text-sm mt-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{testimonial.name}</p>
                <p className={`text-xs group-hover:text-blue-500 transition-colors ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{testimonial.company}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer - Enhanced */}
      <footer className={`${isDarkMode ? "bg-gray-900 border-t border-gray-800" : "bg-gray-900 border-t border-gray-800"} text-white py-16 px-6`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand / About */}
          <div className="animate-fade-in" id="about">
            <div className="flex items-center gap-2 mb-4 group cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold group-hover:text-blue-400 transition-colors">TrustNShare</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">Enterprise-grade file sharing with military-grade encryption and complete compliance.</p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="rounded-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow hover:opacity-90 transition"
              >
                Send Feedback
              </button>
            </div>
          </div>

          {/* Contact & Feedback */}
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold">Contact support</div>
              <div className="text-gray-400">superadmin@trustnshare.com</div>
              <div className="text-gray-400">91+1234567890</div>
            </div>
            {/* Removed duplicate middle Send Feedback button */}
          </div>

          {/* Company */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-white">Company</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="/ABOUT%20US.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors duration-300 flex items-center gap-2 group"
                >
                  <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  About Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
            {/* Social Links */}
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { icon: "f", label: "Facebook" },
                { icon: "in", label: "LinkedIn" },
                { icon: "𝕏", label: "Twitter" },
                { icon: "📷", label: "Instagram" }
              ].map((social) => (
                <a
                  key={social.label}
                  href="#"
                  title={social.label}
                  className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:border-blue-400 hover:text-blue-400 hover:bg-blue-400/10 transition-all duration-300 text-gray-400 hover:scale-110 active:scale-95"
                >
                  {social.icon}
                </a>
              ))}
              {/* Policy Links */}
              <a
                href="/PRIVACY%20POLICY.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors duration-300"
              >
                Privacy Policy
              </a>
              <a
                href="/TERMS%20AND%20CONDITIONS.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors duration-300"
              >
                Terms and Conditions
              </a>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="rounded-full px-4 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-blue-400 hover:bg-blue-400/10 transition"
                aria-label="Back to top"
              >
                Back to top
              </button>
              <p className="flex items-center gap-2">
                <span className="text-blue-400">©</span> 2025 TrustNShare. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Feedback Modal */}
      {feedbackOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => !fbLoading && setFeedbackOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 text-white shadow-2xl animate-fade-in">
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">Send Feedback</h3>
                  <p className="text-sm text-gray-400 mt-1">We value your thoughts. Share ideas, issues, or praise.</p>
                </div>
                <button
                  type="button"
                  onClick={() => !fbLoading && setFeedbackOpen(false)}
                  className="text-gray-400 hover:text-white"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <form
                className="mt-6 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!fbMessage.trim()) {
                    alert("Please enter your feedback.");
                    return;
                  }
                  try {
                    setFbLoading(true);
                    await addDoc(collection(firestore, "feedback"), {
                      name: fbName.trim() || null,
                      email: fbEmail.trim() || null,
                      message: fbMessage.trim(),
                      createdAt: serverTimestamp(),
                      page: "FrontPage",
                    });
                    setFbName("");
                    setFbEmail("");
                    setFbMessage("");
                    setFeedbackOpen(false);
                    alert("Thanks for your feedback!");
                  } catch (err) {
                    console.error("Failed to submit feedback:", err);
                    alert("Couldn't send feedback. Please try again.");
                  } finally {
                    setFbLoading(false);
                  }
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1 text-gray-300">Name</label>
                    <input
                      value={fbName}
                      onChange={(e) => setFbName(e.target.value)}
                      className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-gray-300">Email</label>
                    <input
                      type="email"
                      value={fbEmail}
                      onChange={(e) => setFbEmail(e.target.value)}
                      className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-1 text-gray-300">Your feedback</label>
                  <textarea
                    value={fbMessage}
                    onChange={(e) => setFbMessage(e.target.value)}
                    required
                    rows={5}
                    className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Tell us what’s working and what could be better"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => !fbLoading && setFeedbackOpen(false)}
                    className="rounded-full px-4 py-2 border border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={fbLoading}
                    className="rounded-full px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow disabled:opacity-60"
                  >
                    {fbLoading ? "Sending..." : "Send Feedback"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FrontPage;
