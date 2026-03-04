import React, { useState } from "react";
import { CheckCircle, Shield, Facebook, Linkedin, Instagram, ArrowUp } from "lucide-react";
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
      "Premium Hardware Access",
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
  { name: "Encryption", starter: "Basic AES", professional: "Military-grade" },
  { name: "Premium Hardware Access", starter: "No", professional: "Yes" },
  { name: "Custom Branding", starter: "No", professional: "Yes" },
  { name: "SSO/SAML", starter: "No", professional: "Yes" },
  { name: "Audit Logs", starter: "30 days", professional: "Unlimited" },
  { name: "Support", starter: "Email", professional: "Priority" },
];

const JustPricing: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-preference');
      if (saved === 'light' || saved === 'dark') {
        return saved === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDarkMode);
      document.documentElement.classList.toggle('light', !isDarkMode);
      localStorage.setItem('theme-preference', isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode]);

  // Add video-bg-page class for transparent background (video shows through)
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('video-bg-page');
      document.body.classList.add('video-bg-page');
      return () => {
        document.documentElement.classList.remove('video-bg-page');
        document.body.classList.remove('video-bg-page');
      };
    }
  }, []);

  const handleThemeToggle = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next);
      }
      return next;
    });
  };

  const bgClass = isDarkMode ? "text-white" : "text-gray-900";
  const cardBgClass = isDarkMode ? "bg-gray-800" : "bg-white";

  // Feedback modal state (same as FrontPage)
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbName, setFbName] = useState("");
  const [fbMessage, setFbMessage] = useState("");
  const [emailProvider, setEmailProvider] = useState("");

  const bgVideoRef = React.useRef<HTMLVideoElement>(null);

  // Force video reload when dark mode changes
  React.useEffect(() => {
    const video = bgVideoRef.current;
    if (video) {
      video.load();
      video.play().catch(() => {});
    }
  }, [isDarkMode]);

  return (
    <div className={`${bgClass} min-h-screen relative`}> 
      {/* Global Background Video */}
      <div className="fixed inset-0 w-full h-full -z-50">
        <video
          ref={bgVideoRef}
          key={isDarkMode ? 'dark-bg' : 'light-bg'}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          src={isDarkMode ? "/darkvideo.mp4" : "/lightvideo.mp4"}
          poster={isDarkMode ? "/bg.png" : "/lbg.png"}
        />
        {/* Optional overlay to ensure text readability */}
        <div className={`absolute inset-0 ${isDarkMode ? 'bg-gray-900/60' : 'bg-white/60'}`} />
      </div>

      <FrontNavbar isDarkMode={isDarkMode} onThemeToggle={handleThemeToggle} />

      {/* Two Pricing Cards */}
      <section className={`py-16 px-6`}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-2xl ${
                plan.featured
                  ? `bg-gradient-to-br from-teal-600 to-teal-700 text-white shadow-2xl scale-105 border-teal-500`
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
      <section className={`py-12 px-6`}>
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
      <footer 
        className={`footer-bg-image ${isDarkMode ? "bg-gray-900 border-t border-gray-800 text-white" : "bg-white border-t border-gray-200 text-gray-900"} py-16 px-6`}
        style={isDarkMode ? { backgroundImage: 'url(/footer%20bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' } : { backgroundImage: 'url(/footerlbg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand / About */}
          <div className="animate-fade-in" id="about">
            <div className="flex items-center gap-2 mb-4 group cursor-pointer">
             <img src="/lbg.png" alt="trustNshare light" className="h-12 md:h-16 object-contain block dark:hidden" />
             <img src="/bg.png" alt="trustNshare" className="h-12 md:h-16 object-contain hidden dark:block" />
            </div>
            <p className={`text-sm leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-700"}`}>Enterprise-grade file sharing with military-grade encryption and complete compliance.</p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: '#113738' }}
              >
                Send Feedback
              </button>
            </div>
          </div>

          {/* Contact & Feedback */}
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <div className={`flex items-center gap-2 font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Contact support</div>
              <div className={isDarkMode ? "text-gray-400" : "text-gray-700"}>trustnshare1@gmail.com</div>
              <div className={isDarkMode ? "text-gray-400" : "text-gray-700"}>+91 987654321</div>
            </div>
            {/* Removed duplicate middle Send Feedback button */}
          </div>

          {/* Company */}
          <div>
            <h3 className={`text-lg font-bold mb-6 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Company</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="/ABOUT%20US.pdf?v=20251220"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`transition-colors duration-300 flex items-center gap-2 group ${isDarkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-700 hover:text-blue-600"}`}
                >
                  <span className={`opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>→</span>
                  About Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className={`${isDarkMode ? "border-gray-700" : "border-gray-300"} pt-8 mt-8 border-t`}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
            {/* Social Links */}
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { icon: Facebook, label: "Facebook", url: "https://facebook.com" },
                { icon: Linkedin, label: "LinkedIn", url: "https://linkedin.com" },
                { icon: Instagram, label: "Instagram", url: "https://instagram.com" }
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={social.label}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${isDarkMode ? "border-gray-600 text-gray-400 hover:border-blue-400 hover:text-blue-400 hover:bg-blue-400/10" : "border-gray-400 text-gray-700 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-600/10"}`}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
              {/* Policy Links */}
              <a
                href="/PRIVACY%20POLICY.pdf?v=20251220"
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-colors duration-300 ${isDarkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-700 hover:text-blue-600"}`}
              >
                Privacy Policy
              </a>
              <a
                href="/TERMS%20AND%20CONDITIONS.pdf?v=20251220"
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-colors duration-300 ${isDarkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-700 hover:text-blue-600"}`}
              >
                Terms and Conditions
              </a>
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="flex items-center gap-2">
                <span className="text-blue-400">©</span> 2026 trustNshare. All rights reserved.
              </p>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`p-3 rounded-full border-2 font-bold text-lg transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center ${isDarkMode ? "border-blue-500 text-blue-400 bg-blue-500/20 hover:border-blue-400 hover:bg-blue-500/30 hover:text-blue-300" : "border-blue-600 text-blue-600 bg-blue-600/20 hover:border-blue-700 hover:bg-blue-600/30 hover:text-blue-700"}`}
                aria-label="Back to top"
                title="Back to top"
              >
                <ArrowUp className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Feedback Modal */}
      {feedbackOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => !fbLoading && setFeedbackOpen(false)} />
          <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl animate-fade-in ${
            isDarkMode 
              ? "bg-gray-900 border-gray-800 text-white" 
              : "bg-white border-gray-200 text-gray-900"
          }`}>
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">Send Feedback</h3>
                  <p className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>We value your thoughts. Share ideas, issues, or praise.</p>
                </div>
                <button
                  type="button"
                  onClick={() => !fbLoading && setFeedbackOpen(false)}
                  className={`${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!fbMessage.trim()) {
                    alert("Please enter your feedback.");
                    return;
                  }

                  if (!emailProvider) {
                    alert("Please select a platform to send feedback.");
                    return;
                  }
                  
                  const subject = `Feedback from ${fbName || 'User'}`;
                  const body = `Name: ${fbName || 'Not provided'}

Message:
${fbMessage}`;

                  let mailLink = "";
                  const recipient = "trustnshare1@gmail.com";
                  
                  switch(emailProvider) {
                    case "gmail":
                      mailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      window.open(mailLink, '_blank');
                      break;
                    case "outlook":
                      mailLink = `https://outlook.office.com/mail/deeplink/compose?to=${recipient}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      window.open(mailLink, '_blank');
                      break;
                    case "yahoo":
                      mailLink = `https://compose.mail.yahoo.com/?to=${recipient}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      window.open(mailLink, '_blank');
                      break;
                    case "aol":
                      mailLink = `https://mail.aol.com/webmail-std/en-us/compose-message?to=${recipient}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      window.open(mailLink, '_blank');
                      break;
                    case "zoho":
                      mailLink = `https://mail.zoho.com/zm/#compose/to=${recipient}&subject=${encodeURIComponent(subject)}&content=${encodeURIComponent(body)}`;
                      window.open(mailLink, '_blank');
                      break;
                    case "proton":
                      mailLink = `https://mail.proton.me/u/0/compose?to=${recipient}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      window.open(mailLink, '_blank');
                      break;
                    default: // default app and others (iCloud, GMX, Mail.com, etc.)
                      mailLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      window.location.href = mailLink;
                      break;
                  }
                  
                  setFeedbackOpen(false);
                  setFbName("");
                  setFbMessage("");
                }}
              >
                <div>
                  <div>
                    <label className={`block text-sm mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Name</label>
                    <input
                      value={fbName}
                      onChange={(e) => setFbName(e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                        isDarkMode 
                          ? "bg-gray-900 border-gray-700 text-white" 
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                   <label className={`block text-sm mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Send via</label>
                   <select
                      value={emailProvider}
                      onChange={(e) => setEmailProvider(e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                        isDarkMode 
                          ? "bg-gray-900 border-gray-700 text-white" 
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                   >
                      <option value="" disabled>Select a platform to send feedback</option>
                      <option value="gmail">Gmail (by Google)</option>
                      <option value="outlook">Outlook.com (by Microsoft)</option>
                      <option value="yahoo">Yahoo Mail</option>
                      <option value="icloud">iCloud Mail (by Apple)</option>
                      <option value="aol">AOL Mail</option>
                      <option value="zoho">Zoho Mail</option>
                      <option value="proton">ProtonMail</option>
                      <option value="gmx">GMX</option>
                      <option value="mailcom">Mail.com</option>
                      <option value="tuta">Tuta (formerly Tutanota)</option>
                      <option value="startmail">StartMail</option>
                      <option value="mailfence">Mailfence</option>
                      <option value="neomail">Neo Mail</option>
                      <option value="default">Default Mail App</option>
                   </select>
                </div>

                <div>
                  <label className={`block text-sm mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Your feedback</label>
                  <textarea
                    value={fbMessage}
                    onChange={(e) => setFbMessage(e.target.value)}
                    required
                    rows={5}
                    className={`w-full rounded-lg border px-3 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                        isDarkMode 
                          ? "bg-gray-900 border-gray-700 text-white" 
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    placeholder="Tell us what’s working and what could be better"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => !fbLoading && setFeedbackOpen(false)}
                    className={`rounded-full px-4 py-2 border ${
                      isDarkMode 
                        ? "border-gray-700 text-gray-300 hover:bg-gray-800" 
                        : "border-gray-300 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={fbLoading}
                    className="rounded-lg px-5 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:transform-none"
                    style={{ backgroundColor: '#113738' }}
                  >
                    Send Feedback
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
