import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle, Shield } from "lucide-react";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

const pricingPlans = [
  {
    name: "Starter",
    price: "₹2,250",
    period: "per user/month",
    description: "Perfect for small teams",
    features: ["Up to 5 users", "5GB storage per user", "Basic encryption", "Email support"],
    cta: "Buy this plan",
    featured: false,
  },
  {
    name: "Professional",
    price: "₹5,550",
    period: "per user/month",
    description: "For growing businesses",
    features: ["Unlimited users", "Unlimited storage", "Military-grade encryption", "Priority support", "Advanced audit logs"],
    cta: "Buy this plan",
    featured: true,
  },
];

const comparisonFeatures = [
  { name: "Users", starter: "Up to 5", professional: "Unlimited" },
  { name: "Storage", starter: "5GB per user", professional: "Unlimited" },
  { name: "Encryption", starter: "Basic AES", professional: "Military-grade" },
  { name: "API Access", starter: "No", professional: "Yes" },
  { name: "Custom Branding", starter: "No", professional: "Yes" },
  { name: "SSO/SAML", starter: "No", professional: "Yes" },
  { name: "Audit Logs", starter: "30 days", professional: "Unlimited" },
  { name: "Support", starter: "Email", professional: "Priority" },
];

const Pricing: React.FC = () => {
  // Enforce dark theme permanently on Pricing page
  const isDarkMode = true;

  const bgClass = isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900";
  const cardBgClass = isDarkMode ? "bg-gray-800" : "bg-white";

  // Feedback modal state (same as FrontPage)
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbName, setFbName] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbMessage, setFbMessage] = useState("");

  // Access gate: only open via shared link from Super Admin
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const inviteId = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("invite");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const verifyAccess = async () => {
      // Require an invite token in the URL
      if (!inviteId) {
        setAllowed(false);
        return;
      }
      try {
        // pricing_invites/{inviteId} created by Super Admin dashboard when sharing
        const ref = doc(firestore, "pricing_invites", inviteId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setAllowed(false);
          return;
        }
        const data = snap.data() as any;
        // Optional expiration check
        const expiresAt = data?.expiresAt?.toMillis?.() ? new Date(data.expiresAt.toMillis()) : null;
        if (expiresAt && Date.now() > expiresAt.getTime()) {
          setAllowed(false);
          return;
        }
        // Optional: one-time use check
        const revoked = !!data?.revoked;
        if (revoked) {
          setAllowed(false);
          return;
        }
        setAllowed(true);
      } catch (e) {
        console.warn("Invite verification failed", e);
        setAllowed(false);
      }
    };
    verifyAccess();
  }, [inviteId]);

  if (allowed === null) {
    return (
      <div className={`${bgClass} min-h-screen flex items-center justify-center`}>
        <div className="text-sm text-gray-400">Verifying access…</div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className={`${bgClass} min-h-screen flex items-center justify-center px-6`}>
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold mb-2">403 — Access Restricted</h2>
          <p className="text-gray-400 mb-4">This pricing page can only be opened via a valid link shared by the Super Admin.</p>
          <p className="text-gray-500 text-sm">If you believe this is a mistake, please contact support or request a new invite.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bgClass} transition-colors duration-300`}>

      {/* Hero Section */}
      <section className={`relative w-full py-20 px-6 ${isDarkMode ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" : "bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700"} text-white overflow-hidden`}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-8 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Choose the plan that fits your organization. No hidden fees, no surprises.
          </p>
        </div>
      </section>

      {/* Pricing Plans Section */}
      <section className={`py-20 px-6 ${isDarkMode ? "bg-gray-800" : "bg-gray-50"}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {pricingPlans.map((plan, idx) => (
              <div
                key={idx}
                className={`rounded-2xl shadow-lg transition-all duration-300 transform hover:shadow-2xl hover:-translate-y-2 group animate-fade-in border ${
                  plan.featured
                    ? `${isDarkMode ? "bg-gradient-to-br from-blue-600 to-purple-600 scale-105 border-blue-500" : "bg-gradient-to-br from-blue-600 to-purple-700 border-purple-400"} text-white shadow-2xl`
                    : `${cardBgClass} ${isDarkMode ? "border-gray-700 hover:border-blue-500" : "border-gray-200 hover:border-blue-400"}`
                }`}
                style={{animationDelay: `${idx * 0.1}s`}}
              >
                <div className="p-8">
                  {plan.featured && (
                    <div className="mb-4 inline-block bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
                      Best Choice
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className={`mb-6 text-sm ${plan.featured ? "text-blue-100" : isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {plan.description}
                  </p>
                  <div className="mb-6">
                    <span className={`text-4xl font-bold ${plan.featured ? "text-white" : ""}`}>{plan.price}</span>
                    <span className={`text-sm ml-2 ${plan.featured ? "text-blue-100" : isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {plan.period}
                    </span>
                  </div>
                  <button
                    className={`w-full py-3 rounded-xl font-bold transition-all duration-300 transform mb-8 hover:scale-105 active:scale-95 shadow-lg ${
                      plan.featured
                        ? "bg-white text-blue-600 hover:bg-gray-100 hover:shadow-xl"
                        : isDarkMode
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
                    }`}
                  >
                    {plan.cta}
                  </button>
                  <ul className="space-y-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 transition-transform duration-300 group hover:translate-x-1">
                        <CheckCircle className={`w-5 h-5 flex-shrink-0 ${plan.featured ? "text-green-400" : "text-green-600"}`} />
                        <span className={plan.featured ? "text-blue-50" : ""}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Removed: Need a Custom Plan box */}
        </div>
      </section>

      {/* Features Comparison Section */}
      <section className={`py-20 px-6 ${isDarkMode ? "bg-gray-800" : "bg-gray-50"}`}>
        <div className="max-w-7xl mx-auto">
          <h2 className={`text-4xl font-bold text-center mb-16 animate-fade-in ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Detailed Feature Comparison
          </h2>

          <div className={`overflow-x-auto rounded-2xl shadow-lg border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
            <table className={`w-full ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
              <thead>
                <tr className={`border-b ${isDarkMode ? "border-gray-700 bg-gray-700" : "border-gray-200 bg-gray-50"}`}>
                  <th className={`px-6 py-4 text-left font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Feature</th>
                  <th className={`px-6 py-4 text-center font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Starter</th>
                  <th className={`px-6 py-4 text-center font-bold text-blue-600`}>Professional</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, idx) => (
                  <tr
                    key={idx}
                    className={`border-b transition-all duration-300 group hover:scale-x-105 ${isDarkMode ? "border-gray-700 hover:bg-gray-700/50" : "border-gray-100 hover:bg-blue-50"}`}
                  >
                    <td className={`px-6 py-4 font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {feature.name}
                    </td>
                    <td className={`px-6 py-4 text-center group-hover:scale-110 transition-transform ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      {feature.starter}
                    </td>
                    <td className="px-6 py-4 text-center text-blue-600 font-semibold group-hover:scale-110 transition-transform">{feature.professional}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={`py-20 px-6 ${bgClass}`}>
        <div className="max-w-4xl mx-auto">
          <h2 className={`text-4xl font-bold text-center mb-16 animate-fade-in ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {[
              {
                question: "Can I change my plan anytime?",
                answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle.",
              },
              {
                question: "Do you offer discounts for annual billing?",
                answer: "Yes, we offer 20% discount when you pay annually. Contact our sales team to learn more.",
              },
              {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards, wire transfers, and popular digital payment methods.",
              },
              {
                question: "Is there a free trial?",
                answer: "Yes, all plans come with a 14-day free trial. No credit card is required to start.",
              },
              {
                question: "What happens after my free trial ends?",
                answer: "Your trial will end and you'll need to choose a plan to continue. You won't be charged until you explicitly choose a plan.",
              },
              {
                question: "Can I cancel anytime?",
                answer: "Yes, you can cancel your subscription at any time. We don't have long-term contracts.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border group hover:-translate-y-1 animate-fade-in ${isDarkMode ? "bg-gray-800 border-gray-700 hover:border-blue-500" : "bg-white border-gray-200 hover:border-blue-400"}`}
                style={{animationDelay: `${idx * 0.05}s`}}
              >
                <h3 className={`text-lg font-bold mb-3 group-hover:text-blue-600 transition-colors ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  {faq.question}
                </h3>
                <p className={isDarkMode ? "text-gray-300 leading-relaxed" : "text-gray-700 leading-relaxed"}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Removed: Ready to Get Started CTA section */}

      {/* Footer - Enhanced (exact from FrontPage) */}
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
                      page: "Pricing",
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

export default Pricing;
