import React, { useEffect, useMemo, useState } from "react";
import { Shield } from "lucide-react";

const DEFAULT_ACCOUNT = {
  name: "trustN solutions pvt ltd",
  accountNumber: "000123456789",
  ifsc: "TRUS0001234",
  upi: "sandbox@trustnpay",
  bank: "TrustN Bank",
};

const taxRate = 0.05; // 18% tax for demonstration

const PaymentGateway: React.FC = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const plan = params.get("plan") || "Custom";
  const rawAmount = parseFloat(params.get("amount") || "0") || 0;
  const inviteId = params.get("invite") || null;

  const [amount] = useState<number>(rawAmount);
  const [tax] = useState<number>(Math.round(amount * taxRate));
  const [total] = useState<number>(amount + Math.round(amount * taxRate));

  const [selected, setSelected] = useState<string>("UPI");
  const [upiId, setUpiId] = useState<string>(DEFAULT_ACCOUNT.upi);
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardName, setCardName] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [cardCvv, setCardCvv] = useState<string>("");
  const [bank, setBank] = useState<string>(DEFAULT_ACCOUNT.bank);
  const [wallet, setWallet] = useState<string>("Paytm");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // minor: ensure upi prefilled
    setUpiId(DEFAULT_ACCOUNT.upi);
  }, []);

  const fmt = (n: number) => `₹${n.toLocaleString()}`;

  const verifyAndPay = () => {
    setConfirmOpen(true);
  };

  const doPayment = async () => {
    setProcessing(true);
    try {
      const { auth, firestore } = await import("@/lib/firebase");
      const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
      const user = auth.currentUser;
      if (!user) {
        alert("No user session found. Please login and try again.");
        window.location.href = "/login";
        return;
      }

      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, {
        paid: true,
        paidAt: serverTimestamp(),
        plan: plan,
        planAmount: amount,
        paymentMethod: selected,
        paymentInfo: {
          account: DEFAULT_ACCOUNT,
          details:
            selected === "UPI"
              ? { upi: upiId }
              : selected === "Cards"
              ? { cardName, cardNumber: cardNumber ? `**** **** **** ${cardNumber.slice(-4)}` : null }
              : selected === "Netbanking"
              ? { bank }
              : selected === "Wallet"
              ? { wallet }
              : { note: "Pay Later / other" },
        },
      });

      if (inviteId) {
        try {
          const { doc: d, updateDoc: upd } = await import("firebase/firestore");
          await upd(d(firestore, "pricing_invites", inviteId), { used: true });
        } catch (e) {
          console.warn("Could not mark invite used", e);
        }
      }

      // Simulate success and redirect
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Payment/Firestore error", err);
      alert("Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-6">
      <div className="max-w-5xl mx-auto bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          <div className="p-6 md:col-span-1 border-r border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold">Powered by trustNpay</div>
                <div className="text-xs text-gray-400">a unit of trustNshare</div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-sm text-gray-300">Paying To</h3>
              <div className="font-semibold">{DEFAULT_ACCOUNT.name}</div>
              <div className="text-sm text-gray-400 mt-2">A/c: {DEFAULT_ACCOUNT.accountNumber}</div>
              <div className="text-sm text-gray-400">IFSC: {DEFAULT_ACCOUNT.ifsc}</div>
              <div className="text-sm text-gray-400">UPI: {DEFAULT_ACCOUNT.upi}</div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm text-gray-300">Price Summary</h4>
              <div className="mt-2 text-lg font-bold">{fmt(amount)}</div>
              <div className="text-sm text-gray-400">Taxes & fees: {fmt(tax)}</div>
              <div className="mt-2 text-xl font-semibold">Total: {fmt(total)}</div>
              <div className="text-xs text-gray-500 mt-2">Plan: {plan}</div>
            </div>
          </div>

          <div className="p-6 md:col-span-2">
            <h2 className="text-2xl font-bold mb-4">Payment Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                "UPI",
                "Cards",
                "Netbanking",
                "Wallet",
                "Pay Later",
              ].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelected(opt)}
                  className={`rounded-lg px-4 py-3 text-left border ${selected === opt ? "border-blue-400 bg-gray-700" : "border-gray-700"}`}
                >
                  <div className="font-semibold">{opt}</div>
                  <div className="text-xs text-gray-400">{opt === "UPI" ? "UPI QR / ID" : opt === "Cards" ? "Visa / Mastercard / Amex" : ""}</div>
                </button>
              ))}
            </div>

            <div className="mt-6">
              {selected === "UPI" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-gray-700 bg-gray-900">
                    <div className="text-sm text-gray-300 mb-2">Scan UPI QR (placeholder)</div>
                    <div className="w-full h-40 bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">QR CODE</div>
                  </div>
                  <div className="p-4 rounded-lg border border-gray-700 bg-gray-900">
                    <label className="text-sm text-gray-300">UPI ID</label>
                    <input value={upiId} onChange={(e) => setUpiId(e.target.value)} className="w-full mt-2 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2" />
                    <div className="text-xs text-gray-400 mt-2">Scan with any UPI app or use the UPI ID above.</div>
                  </div>
                </div>
              )}

              {selected === "Cards" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-300">Card Number</label>
                    <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4242 4242 4242 4242" className="w-full mt-2 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300">Name on Card</label>
                    <input value={cardName} onChange={(e) => setCardName(e.target.value)} className="w-full mt-2 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300">Expiry (MM/YY)</label>
                    <input value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} className="w-full mt-2 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300">CVV</label>
                    <input value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} className="w-full mt-2 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2" />
                  </div>
                </div>
              )}

              {selected === "Netbanking" && (
                <div>
                  <label className="text-sm text-gray-300">Select Bank</label>
                  <select value={bank} onChange={(e) => setBank(e.target.value)} className="w-full mt-2 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2">
                    <option>TrustN Bank</option>
                    <option>Axis Bank</option>
                    <option>HDFC Bank</option>
                    <option>State Bank of India</option>
                  </select>
                </div>
              )}

              {selected === "Wallet" && (
                <div>
                  <label className="text-sm text-gray-300">Wallet Provider</label>
                  <select value={wallet} onChange={(e) => setWallet(e.target.value)} className="w-full mt-2 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2">
                    <option>Paytm</option>
                    <option>PhonePe</option>
                    <option>Mobikwik</option>
                  </select>
                </div>
              )}

              {selected === "Pay Later" && (
                <div>
                  <div className="text-sm text-gray-300">PayLater provider will handle eligibility and terms.</div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-4">
                <button type="button" onClick={verifyAndPay} className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 font-semibold">Verify and Pay</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !processing && setConfirmOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-gray-900 border border-gray-700 p-6">
            <h3 className="text-xl font-bold mb-2">Confirm payment</h3>
            <div className="text-sm text-gray-300 mb-4">You're paying <span className="font-semibold">{fmt(total)}</span> for <span className="font-semibold">{plan}</span> using <span className="font-semibold">{selected}</span>.</div>

            <div className="mb-4 text-sm text-gray-400">
              <div>Paying To: {DEFAULT_ACCOUNT.name}</div>
              <div>A/c: {DEFAULT_ACCOUNT.accountNumber} • IFSC: {DEFAULT_ACCOUNT.ifsc}</div>
              <div>Transaction will be recorded against your account.</div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={processing} className="px-4 py-2 rounded-full border border-gray-700">Cancel</button>
              <button type="button" onClick={doPayment} disabled={processing} className="px-4 py-2 rounded-full bg-green-600 font-semibold">{processing ? "Processing..." : "Confirm & Pay"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentGateway;
