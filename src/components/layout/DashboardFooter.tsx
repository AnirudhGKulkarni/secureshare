import { Shield } from 'lucide-react';

export const DashboardFooter = () => {
  return (
    <footer className="bg-card border-t border-border text-muted-foreground py-8 px-6 mt-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand / About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground">trustNshare</span>
            </div>
            <p className="text-sm leading-relaxed">
              Enterprise-grade file sharing with military-grade encryption and complete compliance.
            </p>
          </div>

          {/* Contact & Support */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact & Support</h3>
            <div className="space-y-2">
              <div className="text-sm">superadmin@trustnshare.com</div>
              <div className="text-sm">+91 1234567890</div>
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="/ABOUT%20US.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-primary transition-colors duration-300"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="/PRIVACY%20POLICY.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-primary transition-colors duration-300"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/TERMS%20AND%20CONDITIONS.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-primary transition-colors duration-300"
                >
                  Terms & Conditions
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              {/* Social Links */}
              <div className="flex items-center gap-3">
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
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-primary hover:text-primary hover:bg-primary/10 transition-all duration-300 text-muted-foreground hover:scale-110 active:scale-95 text-xs"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
            <p className="text-sm flex items-center gap-2">
              <span className="text-primary">©</span> 2025 trustNshare. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};