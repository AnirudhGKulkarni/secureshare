import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Shield } from "lucide-react";

const DEFAULT_ACCOUNT = {
  name: "trustNsolutions pvt ltd",
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

  // Plan price mapping (amounts are INCLUSIVE of all taxes)
  const planPrices: Record<string, number> = {
    Starter: 2050,
    Professional: 5550,
  };
    const initialPlan = params.get("plan") || "Professional";
    const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan);

    // amounts in planPrices are inclusive of tax
    const inclusiveAmount = selectedPlan in planPrices ? planPrices[selectedPlan] : rawAmount;
    // compute base and tax breakdown for inclusive pricing
    const baseRaw = inclusiveAmount / (1 + taxRate);
    const base = Math.round(baseRaw);
    const tax = inclusiveAmount - base;
    // split tax equally into CGST and SGST (adjust for rounding)
    const cgst = Math.floor(tax / 2);
    const sgst = tax - cgst;
    const amount = inclusiveAmount; // displayed total (inclusive)
    const total = amount;

    // Helper: format currency (INR)
    const fmt = (n: number) => `₹${n.toLocaleString()}`;

    const generateBill = () => {
      const billDate = new Date().toLocaleString();
      const billHtml = `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Invoice - ${selectedPlan}</title>
            <style>
              body { font-family: Inter, Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; }
              .header { display:flex; align-items:center; justify-content:space-between; }
              .logos { display:flex; gap:12px; align-items:center; }
              .company { text-align:right }
              .title { font-size:18px; font-weight:700; color:#0ea5e9; }
              .box { border:1px solid #e6eef8; padding:16px; border-radius:8px; margin-top:18px }
              table { width:100%; border-collapse:collapse; margin-top:12px }
              th, td { padding:8px 6px; border-bottom:1px solid #eee; text-align:left }
              .right { text-align:right }
              .total { font-size:18px; font-weight:700; color:#7c3aed }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logos">
                <img src="/tnplogo.jpg" alt="trustNpay" style="width:88px; height:88px; object-fit:cover; border-radius:50%" />
                <img src="/trustNshare.jpg" alt="trustNshare" style="width:88px; height:88px; object-fit:cover; border-radius:8px" />
              </div>
              <div class="company">
                <div class="title">trustNpay</div>
                <div style="font-size:12px; color:#475569">Secure Payments by trustNsolutions</div>
                <div style="margin-top:6px; font-size:12px; color:#64748b">Invoice: ${Math.floor(Math.random()*900000)+100000}</div>
                <div style="font-size:12px; color:#64748b">Date: ${billDate}</div>
              </div>
            </div>

            <div class="box">
              <div style="font-weight:600">Bill To:</div>
              <div style="margin-top:6px">${payeeName || userContact || 'Guest'}</div>
              <div style="margin-top:2px; color:#64748b">${payeeEmail || ''}</div>

              <table>
                <thead>
                  <tr><th>Description</th><th class="right">Amount</th></tr>
                </thead>
                <tbody>
                  <tr><td>${selectedPlan} subscription (base price)</td><td class="right">${fmt(base)}</td></tr>
                  <tr><td>CGST (${(taxRate*100/2).toFixed(1)}%)</td><td class="right">${fmt(cgst)}</td></tr>
                  <tr><td>SGST (${(taxRate*100/2).toFixed(1)}%)</td><td class="right">${fmt(sgst)}</td></tr>
                </tbody>
                <tfoot>
                  <tr><td style="padding-top:8px;">Total (Inclusive)</td><td class="right total">${fmt(total)}</td></tr>
                </tfoot>
              </table>
            </div>

            <div style="margin-top:18px; font-size:12px; color:#64748b">This is a system generated invoice.</div>
          </body>
        </html>
      `;

      const w = window.open('', '_blank', 'noopener');
      if (!w) return;
      w.document.open();
      w.document.write(billHtml);
      w.document.close();
      setTimeout(() => { w.focus(); w.print(); }, 300);
    };

    
    // UI / form state that was referenced before declaration
    const [userContact, setUserContact] = useState<string>("");
    const [payeeName, setPayeeName] = useState<string>("");
    const [payeeEmail, setPayeeEmail] = useState<string>("");
    const [showDetailsOpen, setShowDetailsOpen] = useState<boolean>(false);
    const tabs = ["UPI", "Credit/Debit Cards", "Bank Transfers"];
    const [paymentTab, setPaymentTab] = useState<string>(tabs[0]);
    const [selected, setSelected] = useState<string>(tabs[0]);
    const [upiId, setUpiId] = useState<string>(DEFAULT_ACCOUNT.upi);
    const [cardNumber, setCardNumber] = useState<string>("");
    const [cardName, setCardName] = useState<string>("");
    const [processing, setProcessing] = useState<boolean>(false);
    const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

    const generatePdfFromHtml = (html: string) => {
      try {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const w = window.open(url, '_blank', 'noopener');
        if (!w) {
          URL.revokeObjectURL(url);
          return;
        }
        // revoke after some time
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (e) {
        console.error('Failed to open invoice window', e);
      }
    };

    const buildInvoiceHtml = () => {
      const billDate = new Date().toLocaleString();
      const baseUrl = window.location.origin;
      return `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Invoice - ${selectedPlan}</title>
            <style>
              body { font-family: Inter, Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; }
              .header { display:flex; align-items:center; justify-content:space-between; }
              .logos { display:flex; gap:12px; align-items:center; }
              .company { text-align:right }
              .title { font-size:18px; font-weight:700; color:#0ea5e9; }
              .box { border:1px solid #e6eef8; padding:16px; border-radius:8px; margin-top:18px }
              table { width:100%; border-collapse:collapse; margin-top:12px }
              th, td { padding:8px 6px; border-bottom:1px solid #eee; text-align:left }
              .right { text-align:right }
              .total { font-size:18px; font-weight:700; color:#7c3aed }
              .footer { margin-top:20px; display:flex; justify-content:space-between; align-items:center; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logos">
                <img src="${baseUrl}/tnplogo.jpg" alt="trustNpay" style="width:88px; height:88px; object-fit:cover; border-radius:50%" />
                <img src="${baseUrl}/trustNshare.jpg" alt="trustNshare" style="width:88px; height:88px; object-fit:cover; border-radius:8px" />
              </div>
              <div class="company">
                <div class="title">trustNpay</div>
                <div style="font-size:12px; color:#475569">Secure Payments by trustNsolutions</div>
                <div style="margin-top:6px; font-size:12px; color:#64748b">Invoice: ${Math.floor(Math.random()*900000)+100000}</div>
                <div style="font-size:12px; color:#64748b">Date: ${billDate}</div>
              </div>
            </div>

            <div class="box">
              <div style="font-weight:600">Bill To:</div>
              <div style="margin-top:6px">${payeeName || userContact || 'Guest'}</div>
              <div style="margin-top:2px; color:#64748b">${payeeEmail || ''}</div>

              <table>
                <thead>
                  <tr><th>Description</th><th class="right">Amount</th></tr>
                </thead>
                <tbody>
                  <tr><td>${selectedPlan} subscription (base price)</td><td class="right">${fmt(base)}</td></tr>
                  <tr><td>CGST (${(taxRate*100/2).toFixed(1)}%)</td><td class="right">${fmt(cgst)}</td></tr>
                  <tr><td>SGST (${(taxRate*100/2).toFixed(1)}%)</td><td class="right">${fmt(sgst)}</td></tr>
                </tbody>
                <tfoot>
                  <tr><td style="padding-top:8px;">Total (Inclusive)</td><td class="right total">${fmt(total)}</td></tr>
                </tfoot>
              </table>
            </div>

            <div class="footer">
              <div style="font-size:12px; color:#64748b">This is a system generated invoice.</div>
              <div><img src="${baseUrl}/trustNshare.jpg" alt="trustNshare" style="width:120px; opacity:0.9" /></div>
            </div>
          </body>
        </html>
      `;
    };
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

    const navigate = useNavigate();
    const { refreshProfile } = useAuth();

    const [showBillModal, setShowBillModal] = useState<boolean>(false);

    const goToDashboard = async () => {
      // Refresh profile then force a full-page redirect to the admin dashboard
      try {
        await refreshProfile();
      } catch (e) {
        // ignore
      }
      try {
        window.location.href = "/dashboard";
      } catch (e) {
        navigate("/dashboard");
      }
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
            // Mark the user's profile as paid so route-protection won't redirect to /pricing
            try {
              if (auth?.currentUser) {
                const { doc, updateDoc } = await import("firebase/firestore");
                const userDocRef = doc(firestore, "users", auth.currentUser.uid);
                await updateDoc(userDocRef, { paid: true, paidAt: new Date().toISOString() });
                // Refresh in-memory profile so role-protection sees paid immediately
                try {
                  await refreshProfile();
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.warn("refreshProfile failed after payment:", e);
                }
              }
            } catch (e) {
              // non-fatal: log and continue
              // eslint-disable-next-line no-console
              console.warn("Could not update user paid flag:", e);
            }
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
      // Finalize: show bill generation modal instead of redirecting immediately
      try {
        setConfirmOpen(false);
        setShowBillModal(true);
      } finally {
        setProcessing(false);
      }
    };

      return (
    <div className="relative min-h-screen bg-white text-slate-900 py-6 px-4">
      {/* Top branding header (trustNpay) with inline logo for consistent layout */}
      <div className="w-full bg-white border-b mb-6">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center mr-3">
            <div className="relative">
              {/* Glow behind the logo */}
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 block w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-r from-sky-400/30 via-purple-400/25 to-pink-400/20 filter blur-2xl" aria-hidden="true" />
              {/* Logo (above glow) */}
              <div className="relative z-10 w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-white shadow flex items-center justify-center border border-slate-200">
                <img src="/tnplogo.jpg" alt="trustNpay logo" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <div className="font-bold text-slate-900 text-lg md:text-xl">trustNpay</div>
              <div className="text-sm text-slate-600">Secure Payments by trustNsolutions</div>
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
                <div>Incl. of taxes: <span className="font-medium">{fmt(tax)}</span></div>
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
                          className={`text-left px-3 py-2 rounded-md w-full ${paymentTab === t ? "bg-gradient-to-r from-sky-50 to-purple-50 border border-sky-300/60" : "hover:bg-slate-100"}`}
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
                          <button type="button" onClick={verifyAndPay} className="px-4 py-2 rounded-full bg-gradient-to-r from-sky-500 to-purple-600 text-white font-semibold">Verify & Pay</button>
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
                            <button type="button" onClick={verifyAndPay} className="px-4 py-2 rounded-full bg-gradient-to-r from-sky-500 to-purple-600 text-white font-semibold">Pay Now</button>
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
                            <button type="button" onClick={verifyAndPay} className="px-4 py-2 rounded-full bg-gradient-to-r from-sky-500 to-purple-600 text-white font-semibold">Proceed</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* EMI option removed */}
                  </div>
                </div>
              </div>

            </div>

            <div className="p-6 md:col-span-1">
                <div className="mb-4">
                <h4 className="text-sm text-slate-700">Price Summary</h4>
                <div className="mt-2 text-lg font-bold text-sky-700">{fmt(amount)}</div>
                <div className="text-sm text-slate-600">Incl. of taxes: {fmt(tax)}</div>
                <div className="mt-2 text-xl font-semibold text-purple-700">Total: {fmt(total)}</div>
                <div className="text-xs text-slate-500 mt-2">Plan: {selectedPlan}</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-100">
                <div className="font-semibold text-sky-700">Paying To</div>
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

        {/* Bill modal shown after successful payment */}
        {showBillModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowBillModal(false)} />
            <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 p-6">
              <h3 className="text-xl font-bold mb-2 text-slate-900">Payment successful — Generate invoice</h3>
              <div className="text-sm text-slate-700 mb-4">Your payment of <span className="font-semibold">{fmt(total)}</span> was recorded. Generate and save your invoice below.</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <button onClick={() => generatePdfFromHtml(buildInvoiceHtml())} className="w-full px-4 py-3 rounded-full bg-gradient-to-r from-sky-500 to-purple-600 text-white font-semibold">Generate & Download PDF</button>
                <button onClick={async () => { setShowBillModal(false); await goToDashboard(); }} className="w-full px-4 py-3 rounded-full border border-slate-200 text-slate-700">Go to dashboard</button>
              </div>

            </div>
          </div>
        )}
    </div>
  );
};

export default PaymentGateway;
