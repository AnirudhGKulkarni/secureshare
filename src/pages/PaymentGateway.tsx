import React, { useEffect, useMemo, useState } from "react";
import { Shield } from "lucide-react";

const DEFAULT_ACCOUNT = {
  name: "trustN solutions pvt ltd",
  accountNumber: "000123456789",
  ifsc: "TRUS0001234",
  upi: "trustn.sol@trustnpay",
  bank: "TrustN Bank",
};

const taxRate = 0.18; // 18% tax for demonstration

const PaymentGateway: React.FC = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const plan = params.get("plan") || "Custom";
  const rawAmount = parseFloat(params.get("amount") || "0") || 0;
  const inviteId = params.get("invite") || null;

  // Plan price mapping
  const planPrices: Record<string, number> = {
    Starter: 2250,
    Professional: 5550,
  };
  
    const initialPlan = params.get("plan") || "Professional";
    const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan);

    const amount = selectedPlan in planPrices ? planPrices[selectedPlan] : rawAmount;
    const tax = Math.round(amount * taxRate);
    const total = amount + tax;

    // Helper: format currency (INR)
    const fmt = (n: number) => `₹${n.toLocaleString()}`;

    // UI/tab state (only UPI, Cards, Bank Transfers)
    const tabs = ["UPI", "Credit/Debit Cards", "Bank Transfers"];
    const [paymentTab, setPaymentTab] = useState<string>(tabs[0]);
    const [selected, setSelected] = useState<string>("UPI");
    const [showDetailsOpen, setShowDetailsOpen] = useState<boolean>(false);
    const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
    const [processing, setProcessing] = useState<boolean>(false);

    // Contact / inputs
    const [userContact, setUserContact] = useState<string>("Guest");
    // payee details to show name + email instead of generic Guest
    const [payeeName, setPayeeName] = useState<string>("");
    const [payeeEmail, setPayeeEmail] = useState<string>("");
    const [upiId, setUpiId] = useState<string>(DEFAULT_ACCOUNT.upi);
    const [cardNumber, setCardNumber] = useState<string>("");
    const [cardName, setCardName] = useState<string>("");
    const [cardExpiry, setCardExpiry] = useState<string>("");
    const [cardCvv, setCardCvv] = useState<string>("");
    const [acctNumber, setAcctNumber] = useState<string>(DEFAULT_ACCOUNT.accountNumber);
    const [acctName, setAcctName] = useState<string>("");
    const [ifsc, setIfsc] = useState<string>(DEFAULT_ACCOUNT.ifsc);
    const [nickname, setNickname] = useState<string>("");

    // Try to populate user contact from firebase auth (optional)
    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const fb = await import("../lib/firebase");
          if (!mounted) return;
          const auth = (fb as any).auth;
          const user = auth?.currentUser;
          if (user) setUserContact((user.email as string) || (user.displayName as string) || "User");
          if (user) {
            setPayeeEmail((user.email as string) || "");
            setPayeeName(((user.displayName as string) || (user.email as string)) || "");
          }
        } catch (e) {
          // ignore; keep Guest
        }
      })();
      return () => {
        mounted = false;
      };
    }, []);

    const verifyAndPay = () => {
      setConfirmOpen(true);
    };

    const doPayment = async () => {
      setProcessing(true);
      try {
        // Attempt to record the payment in Firestore if available
        const fb = await import("../lib/firebase");
        const firestore = (fb as any).firestore;
        const auth = (fb as any).auth;
        if (firestore) {
          const { collection, addDoc } = await import("firebase/firestore");
          const createdAt = new Date();
          // subscription dates: start = next day, expiry = start + 50 days - 1
          let startDate: Date | null = null;
          let expiryDate: Date | null = null;
          if (selectedPlan === "Starter") {
            startDate = new Date(createdAt);
            startDate.setDate(startDate.getDate() + 1);
            expiryDate = new Date(startDate);
            expiryDate.setDate(startDate.getDate() + 50 - 1);
          }

          const payload = {
            plan: selectedPlan,
            amount: total,
            tax,
            method: selected,
            contact: userContact,
            payeeName: payeeName || null,
            payeeEmail: payeeEmail || null,
            account: DEFAULT_ACCOUNT,
            createdAt,
            startDate: startDate ? startDate.toISOString() : null,
            expiryDate: expiryDate ? expiryDate.toISOString() : null,
            inviteId,
          } as any;
          try {
            if (auth?.currentUser) {
              payload["userId"] = auth.currentUser.uid;
            }
            await addDoc(collection(firestore, "payments"), payload);
          } catch (err) {
            // non-fatal: log and continue to redirect
            // eslint-disable-next-line no-console
            console.warn("Could not write payment to Firestore:", err);
          }
        }
      } catch (err) {
        // ignore external errors and continue
        // eslint-disable-next-line no-console
        console.warn(err);
      }
      // Finalize: redirect to dashboard (preserve existing flow)
      try {
        window.location.href = "/dashboard";
      } finally {
        setProcessing(false);
      }
    };

      return (
    <div className="relative min-h-screen bg-white text-slate-900 py-6 px-4">
      {/* Top branding header (trustNpay) with inline logo for consistent layout */}
      <div className="w-full bg-white border-b mb-6">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="hidden md:flex items-center mr-3">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-white shadow flex items-center justify-center">
              <img src="/tnplogo.jpg" alt="trustNpay logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <div className="font-bold text-slate-900 text-base">trustNpay</div>
              <div className="text-xs text-slate-600">Secure Payments by trustNsolutions</div>
            </div>
          </div>
        </div>
      </div>

      {/* contact info row with details toggle */}
      <div className="max-w-6xl mx-auto mb-2 px-4">
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-4">
          <div className="text-sm text-slate-700">{(payeeName || userContact) ? `${payeeName || userContact}${payeeEmail ? ` • ${payeeEmail}` : ""}` : "Guest"}</div>
          <button
            type="button"
            aria-expanded={showDetailsOpen}
            onClick={() => setShowDetailsOpen((s) => !s)}
            className="ml-auto text-sm text-sky-600 flex items-center gap-2"
          >
            <span>{showDetailsOpen ? "Hide Details" : "Show Details"}</span>
            <svg className={`w-4 h-4 transition-transform ${showDetailsOpen ? "rotate-180" : "rotate-0"}`} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 8l5 5 5-5" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {showDetailsOpen && (
        <div className="max-w-6xl mx-auto mb-6 px-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-sm text-slate-700 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="font-semibold text-slate-900">Plan details</div>
                <div className="mt-2">Plan: <span className="font-medium">{selectedPlan}</span></div>
                <div>Amount: <span className="font-medium">{fmt(amount)}</span></div>
                <div>Taxes & fees: <span className="font-medium">{fmt(tax)}</span></div>
                <div className="mt-1">Total: <span className="font-semibold">{fmt(total)}</span></div>
                {selectedPlan === "Starter" && (
                  <div className="mt-2 text-sm text-slate-600">
                    <div className="font-medium">Starter plan validity: 50 days</div>
                    <div className="text-xs">Starts: {(() => {
                      const purchase = new Date();
                      const start = new Date(purchase);
                      start.setDate(start.getDate() + 1);
                      return start.toLocaleDateString();
                    })()}</div>
                    <div className="text-xs">Expires: {(() => {
                      const purchase = new Date();
                      const start = new Date(purchase);
                      start.setDate(start.getDate() + 1);
                      const expiry = new Date(start);
                      expiry.setDate(start.getDate() + 50 - 1);
                      return expiry.toLocaleDateString();
                    })()}</div>
                  </div>
                )}
              </div>
              <div>
                <div className="font-semibold text-slate-900">Recipient / Bank</div>
                <div className="mt-2">Paying To: <span className="font-medium">{DEFAULT_ACCOUNT.name}</span></div>
                <div>A/c: <span className="font-medium">{DEFAULT_ACCOUNT.accountNumber}</span></div>
                <div>IFSC: <span className="font-medium">{DEFAULT_ACCOUNT.ifsc}</span></div>
                <div>UPI: <span className="font-medium">{DEFAULT_ACCOUNT.upi}</span></div>
                
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="w-full bg-white rounded-2xl shadow overflow-hidden border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            <div className="p-6 md:col-span-2 border-r border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div>
                  <div className="font-bold text-slate-900">Powered by trustNpay</div>
                  <div className="text-xs text-slate-500">a unit of trustNshare</div>
                </div>
              </div>

              {/* Payment controls moved into the main left pane (tabs + detail pane) */}
              <div className="bg-white rounded-lg p-2 border border-slate-100">
                <div className="grid grid-cols-3 md:grid-cols-3 gap-0">
                  <div className="col-span-1 md:col-span-1 border-r border-slate-200 p-2">
                    <div className="flex flex-col space-y-2">
                      {tabs.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setPaymentTab(t);
                            if (t === "UPI") setSelected("UPI");
                            else if (t === "Credit/Debit Cards") setSelected("Cards");
                            else if (t === "Bank Transfers") setSelected("Bank Transfer");
                            else setSelected(t);
                          }}
                          className={`text-left px-3 py-2 rounded-md w-full ${paymentTab === t ? "bg-sky-50 border border-sky-300" : "hover:bg-slate-100"}`}
                        >
                          <div className="font-semibold">{t}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-2 p-3">
                    {/* Detail pane */}
                    {paymentTab === "UPI" && (
                      <div className="p-3 bg-white rounded-md">
                        <div className="text-sm text-slate-700 mb-2">Scan UPI QR or use Wallet</div>
                        <div className="w-full h-36 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                          <img src="/QR.jpg" alt="UPI QR" className="max-h-32 object-contain" />
                        </div>
                        <div className="text-sm text-slate-600">UPI ID: <span className="font-semibold text-slate-900">{upiId}</span></div>
                        <div className="text-xs text-slate-500 mt-2">Open your UPI/wallet app and pay the amount. We'll record the transaction once you confirm.</div>
                        <div className="mt-4 flex justify-end">
                          <button type="button" onClick={verifyAndPay} className="px-4 py-2 rounded-full bg-gradient-to-r from-sky-600 to-sky-700 text-white font-semibold">Verify & Pay</button>
                        </div>
                      </div>
                    )}

                    {paymentTab === "Credit/Debit Cards" && (
                      <div className="p-3 bg-white rounded-md">
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-sm text-slate-600">Card Number</label>
                            <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4242 4242 4242 4242" className="w-full mt-2 rounded-lg bg-white border border-slate-200 px-3 py-2" />
                          </div>
                          <div>
                            <label className="text-sm text-slate-600">Name on Card</label>
                            <input value={cardName} onChange={(e) => setCardName(e.target.value)} className="w-full mt-2 rounded-lg bg-white border border-slate-200 px-3 py-2" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm text-slate-600">Expiry (MM/YY)</label>
                              <input value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} className="w-full mt-2 rounded-lg bg-white border border-slate-200 px-3 py-2" />
                            </div>
                            <div>
                              <label className="text-sm text-slate-600">CVV</label>
                              <input value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} className="w-full mt-2 rounded-lg bg-white border border-slate-200 px-3 py-2" />
                            </div>
                          </div>
                          <div className="flex justify-end mt-2">
                            <button type="button" onClick={verifyAndPay} className="px-4 py-2 rounded-full bg-gradient-to-r from-sky-600 to-sky-700 text-white font-semibold">Pay Now</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentTab === "Bank Transfers" && (
                      <div className="p-3 bg-white rounded-md">
                        <div className="text-sm text-slate-700 mb-2">NetBanking / Bank Transfer</div>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-sm text-slate-600">Account Number</label>
                            <input value={acctNumber} onChange={(e) => setAcctNumber(e.target.value)} placeholder="000123456789" className="w-full mt-2 rounded-lg bg-white border border-slate-200 px-3 py-2" />
                          </div>
                          <div>
                            <label className="text-sm text-slate-600">Account Holder Name</label>
                            <input value={acctName} onChange={(e) => setAcctName(e.target.value)} placeholder="Full name" className="w-full mt-2 rounded-lg bg-white border border-slate-200 px-3 py-2" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm text-slate-600">IFSC Code</label>
                              <input value={ifsc} onChange={(e) => setIfsc(e.target.value)} placeholder="IFSC1234567" className="w-full mt-2 rounded-lg bg-white border border-slate-200 px-3 py-2" />
                            </div>
                            <div>
                              <label className="text-sm text-slate-600">Nickname (optional)</label>
                              <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Office account" className="w-full mt-2 rounded-lg bg-white border border-slate-200 px-3 py-2" />
                            </div>
                          </div>
                          <div className="flex justify-end mt-2">
                            <button type="button" onClick={verifyAndPay} className="px-4 py-2 rounded-full bg-gradient-to-r from-sky-600 to-sky-700 text-white font-semibold">Proceed</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentTab === "EMI" && (
                      <div className="p-3 bg-white rounded-md">
                        <div className="text-sm text-slate-700 mb-2">EMI options coming from banks</div>
                        <div className="text-xs text-slate-500">Select EMI plans at checkout with available card/netbanking providers.</div>
                        <div className="flex justify-end mt-4">
                          <button type="button" onClick={verifyAndPay} className="px-4 py-2 rounded-full bg-gradient-to-r from-sky-600 to-sky-700 text-white font-semibold">Choose EMI</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            <div className="p-6 md:col-span-1">
              <div className="mb-4">
                <h4 className="text-sm text-slate-700">Price Summary</h4>
                <div className="mt-2 text-lg font-bold text-slate-900">{fmt(amount)}</div>
                <div className="text-sm text-slate-600">Taxes & fees: {fmt(tax)}</div>
                <div className="mt-2 text-xl font-semibold text-slate-900">Total: {fmt(total)}</div>
                <div className="text-xs text-slate-500 mt-2">Plan: {selectedPlan}</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-100">
                <div className="font-semibold text-slate-900">Paying To</div>
                <div className="text-sm text-slate-700 mt-2">{DEFAULT_ACCOUNT.name}</div>
                <div className="text-xs text-slate-500 mt-2">A/c: {DEFAULT_ACCOUNT.accountNumber} • IFSC: {DEFAULT_ACCOUNT.ifsc}</div>
                <div className="text-xs text-slate-500 mt-2">UPI: {DEFAULT_ACCOUNT.upi}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !processing && setConfirmOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6">
            <h3 className="text-xl font-bold mb-2 text-slate-900">Confirm payment</h3>
            <div className="text-sm text-slate-700 mb-4">You're paying <span className="font-semibold text-slate-900">{fmt(total)}</span> for <span className="font-semibold text-slate-900">{plan}</span> using <span className="font-semibold text-slate-900">{selected}</span>.</div>

            <div className="mb-4 text-sm text-slate-600">
              <div>Paying To: {DEFAULT_ACCOUNT.name}</div>
              <div>A/c: {DEFAULT_ACCOUNT.accountNumber} • IFSC: {DEFAULT_ACCOUNT.ifsc}</div>
              <div>Transaction will be recorded against your account.</div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={processing} className="px-4 py-2 rounded-full border border-slate-200">Cancel</button>
              <button type="button" onClick={doPayment} disabled={processing} className="px-4 py-2 rounded-full bg-sky-600 text-white font-semibold">{processing ? "Processing..." : "Confirm & Pay"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentGateway;
