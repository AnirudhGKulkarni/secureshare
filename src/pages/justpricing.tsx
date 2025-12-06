import React, { useState } from "react";
import { CheckCircle, Shield } from "lucide-react";
import FrontNavbar from "@/components/FrontNavbar";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

const plans = [
  {
    name: "Starter",
    price: "₹2,250",
    period: "per user/month",
    description: "Perfect for small teams",
    features: [
      "Up to 5 users",
      "5GB storage per user",
      "Basic encryption",
      "Email support",
    ],
    cta: "Start Free Trial",
    featured: false,
  },
  {
    name: "Professional",
    price: "₹5,550",
    period: "per user/month",
    description: "For growing businesses",
    features: [
      "Unlimited users",
      "Unlimited storage",
      "Military-grade encryption",
      "Priority support",
      "Advanced audit logs",
    ],
    cta: "Start Free Trial",
    featured: true,
    badge: "Best Choice",
  },
];

const comparison = [
  { name: "Users", starter: "Up to 5", professional: "Unlimited" },
  { name: "Storage", starter: "5GB per user", professional: "Unlimited" },
  { name: "Encryption", starter: "Basic AES", professional: "Military-grade" },
  { name: "API Access", starter: "No", professional: "Yes" },
  { name: "Custom Branding", starter: "No", professional: "Yes" },
  { name: "SSO/SAML", starter: "No", professional: "Yes" },
  { name: "Audit Logs", starter: "30 days", professional: "Unlimited" },
  { name: "Support", starter: "Email", professional: "Priority" },
];

const JustPricing: React.FC = () => {
  const isDarkMode = true; // enforce dark theme like the landing page
  const bgClass = isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900";
  const cardBgClass = isDarkMode ? "bg-gray-800" : "bg-white";

  // Feedback modal state (same as FrontPage)
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbName, setFbName] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbMessage, setFbMessage] = useState("");

  return (
    <div className={`${bgClass} min-h-screen`}> 
      <FrontNavbar isDarkMode={isDarkMode} />

      {/* Two Pricing Cards */}
      <section className={`py-16 px-6 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-2xl ${
                plan.featured
                  ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white border-transparent"
                  : `${cardBgClass} ${isDarkMode ? "border-gray-800" : "border-gray-200"}`
              }`}
            >
              <div className="p-8">
                {plan.featured && (
                  <div className="mb-4 inline-block bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">{plan.badge}</div>
                )}
                <h3 className="text-3xl font-extrabold mb-2">{plan.name}</h3>
                <p className={`mb-6 ${plan.featured ? "text-blue-100" : isDarkMode ? "text-gray-300" : "text-gray-600"}`}>{plan.description}</p>
                <div className="mb-6 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold">{plan.price}</span>
                  <span className={`${plan.featured ? "text-blue-100" : isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{plan.period}</span>
                </div>
                {/* Removed Start Free Trial button as requested */}
                <ul className="space-y-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3">
                      <CheckCircle className={`w-5 h-5 ${plan.featured ? "text-green-400" : "text-green-500"}`} />
                      <span className={plan.featured ? "text-blue-50" : ""}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Detailed Feature Comparison */}
      <section className={`py-12 px-6 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-10">Detailed Feature Comparison</h2>
          <div className={`overflow-x-auto rounded-2xl shadow-lg border ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}>
            <table className={`w-full ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
              <thead>
                <tr className={`${isDarkMode ? "bg-gray-700 text-white" : "bg-gray-50 text-gray-900"}`}>
                  <th className="px-6 py-4 text-left font-bold">Feature</th>
                  <th className="px-6 py-4 text-center font-bold">Starter</th>
                  <th className="px-6 py-4 text-center font-bold text-blue-500">Professional</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, idx) => (
                  <tr key={idx} className={`${isDarkMode ? "border-gray-700 hover:bg-gray-700/50" : "border-gray-100 hover:bg-blue-50"} border-b transition-colors`}>
                    <td className="px-6 py-4 font-semibold">{row.name}</td>
                    <td className="px-6 py-4 text-center">{row.starter}</td>
                    <td className="px-6 py-4 text-center text-blue-500 font-semibold">{row.professional}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer - copied from FrontPage for exact match */}
      <footer className={`${isDarkMode ? "bg-gray-900 border-t border-gray-800" : "bg-gray-900 border-t border-gray-800"} text-white py-16 px-6`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand / About */}
          <div className="animate-fade-in" id="about">
            <div className="flex items-center gap-2 mb-4 group cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold group-hover:text-blue-400 transition-colors">trustNshare</span>
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
              <div className="text-gray-400">trustnshare1@gmail.com</div>
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
                <span className="text-blue-400">©</span> 2025 trustNshare. All rights reserved.
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
                      page: "JustPricing",
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

export default JustPricing;
