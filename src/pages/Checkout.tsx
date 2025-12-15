import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FrontNavbar from "@/components/FrontNavbar";
import { Shield } from "lucide-react";

const planPrices: Record<string, number> = {
  Starter: 2250,
  Professional: 5550,
};

const planFeatures: Record<string, string[]> = {
  Starter: ["50 day access", "Basic support", "Single user"],
  Professional: ["60 day validity", "Unlimited projects", "Priority support", "Multi-user access", "Advanced audit logs"],
};

const fmt = (n: number) => `₹${n.toLocaleString()}`;

const Checkout: React.FC = () => {
  const isDarkMode = true;
  const bgClass = isDarkMode ? "bg-gray-900 text-white" : "bg-white text-slate-900";
  const cardBg = isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200";
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialPlan = params.get("plan") || "Professional";
  const rawAmount = parseFloat(params.get("amount") || "0") || 0;
  const invite = params.get("invite") || null;

  const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan);

  const amount = selectedPlan in planPrices && planPrices[selectedPlan] > 0 ? planPrices[selectedPlan] : rawAmount;

  // compute validity dates based on selected plan
  const getValidity = (planName: string) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() + 1);
    let days = 0;
    if (planName === "Starter") days = 50;
    else if (planName === "Professional") days = 60;
    const expiry = new Date(start);
    expiry.setDate(start.getDate() + days - 1);
    return { start, expiry, days };
  };
  const validity = getValidity(selectedPlan);

  const navigate = useNavigate();

  const proceedToPayment = () => {
    const q = new URLSearchParams();
    q.set("plan", selectedPlan);
    q.set("amount", String(amount));
    if (invite) q.set("invite", invite);
    navigate(`/payment?${q.toString()}`);
  };

  return (
      <div className={`${bgClass} min-h-screen`}>
        <FrontNavbar isDarkMode={isDarkMode} minimal />

      {/* Small hero to match front page theming */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Checkout</h1>
          <p className="text-sm text-gray-300">Confirm your plan and proceed to a secure payment.</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`md:col-span-2 ${cardBg} rounded-2xl p-6 shadow-sm`}>
            <p className="text-sm text-gray-300 mb-6">Review your selected plan, switch plans, and proceed to payment.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {Object.keys(planPrices).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPlan(p)}
                  className={`p-4 rounded-lg transition-all text-left ${selectedPlan === p ? "ring-2 ring-sky-400" : "hover:bg-gray-700/40"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{p}</div>
                    <div className="text-sm font-bold">{fmt(planPrices[p])}</div>
                  </div>
                  <div className="text-xs text-white mt-2">{planFeatures[p].slice(0, 2).join(" • ")}</div>
                </button>
              ))}
            </div>

            <div className={`${cardBg} rounded-lg p-4`}> 
              <h3 className="font-semibold mb-2">Plan Details</h3>

              <div className="mt-4">
                <h4 className="font-semibold">Features</h4>
                <ul className="list-disc list-inside mt-2 text-sm text-white space-y-1">
                  {(planFeatures[selectedPlan] || []).map((f, i) => (
                    <li key={i} className="text-white">{f}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-300 font-medium">{selectedPlan} Plan validity: {validity.days} days</div>
                <div className="mt-2 text-sm text-gray-300">Start: <span className="text-gray-100 font-medium">{validity.start.toLocaleDateString()}</span></div>
                <div className="text-sm text-gray-300">Expires: <span className="text-gray-100 font-medium">{validity.expiry.toLocaleDateString()}</span></div>
              </div>
            </div>
          </div>

          <div className={`${cardBg} rounded-2xl p-6 shadow-sm`}> 
            <h4 className="text-sm text-gray-300">Price Summary</h4>
            <div className="mt-3 text-2xl font-bold">{fmt(amount)}</div>
            <div className="text-sm text-gray-300">Plan: {selectedPlan}</div>

            <div className="mt-6">
              <div className="mb-4 pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-300">Starts: <span className="text-gray-100 font-medium">{validity.start.toLocaleDateString()}</span></div>
                <div className="text-xs text-gray-300">Expires: <span className="text-gray-100 font-medium">{validity.expiry.toLocaleDateString()}</span></div>
              </div>
              <button onClick={proceedToPayment} className="w-full px-4 py-3 rounded-full bg-gradient-to-r from-sky-600 to-sky-700 text-white font-semibold">Proceed to payment</button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer copied from FrontPage for consistent look */}
      <footer className={`bg-gray-900 border-t border-gray-800 text-white py-16 px-6`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 mb-4 group cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold group-hover:text-blue-400 transition-colors">trustNshare</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">Enterprise-grade file sharing with military-grade encryption and complete compliance.</p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold">Contact support</div>
              <div className="text-gray-400">trustnshare1@gmail.com</div>
              <div className="text-gray-400">91+1234567890</div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-6 text-white">Company</h3>
            <ul className="space-y-3">
              <li>
                <a href="/ABOUT%20US.pdf" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors duration-300 flex items-center gap-2 group">
                  <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  About Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
            <div className="flex items-center gap-3 flex-wrap">
              <a href="#" title="Facebook" className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:border-blue-400 hover:text-blue-400 hover:bg-blue-400/10 transition-all duration-300 text-gray-400 hover:scale-110 active:scale-95">f</a>
              <a href="#" title="LinkedIn" className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:border-blue-400 hover:text-blue-400 hover:bg-blue-400/10 transition-all duration-300 text-gray-400 hover:scale-110 active:scale-95">in</a>
              <a href="#" title="Twitter" className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:border-blue-400 hover:text-blue-400 hover:bg-blue-400/10 transition-all duration-300 text-gray-400 hover:scale-110 active:scale-95">𝕏</a>
              <a href="#" title="Instagram" className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:border-blue-400 hover:text-blue-400 hover:bg-blue-400/10 transition-all duration-300 text-gray-400 hover:scale-110 active:scale-95">📷</a>
              <a href="/PRIVACY%20POLICY.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors duration-300">Privacy Policy</a>
              <a href="/TERMS%20AND%20CONDITIONS.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors duration-300">Terms and Conditions</a>
            </div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="rounded-full px-4 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-blue-400 hover:bg-blue-400/10 transition">Back to top</button>
              <p className="flex items-center gap-2"><span className="text-blue-400">©</span> 2025 trustNshare. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Checkout;
