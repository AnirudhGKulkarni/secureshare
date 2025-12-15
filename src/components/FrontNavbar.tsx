import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface FrontNavbarProps {
  isDarkMode?: boolean;
  onThemeToggle?: () => void;
  minimal?: boolean;
}

const FrontNavbar: React.FC<FrontNavbarProps> = ({ isDarkMode = false, onThemeToggle, minimal = false }) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, profile } = useAuth();

  const dashboardRoute = useMemo(() => {
    // If not logged in or profile missing, no dashboard
    if (!currentUser || !profile) return null;

    // If status pending -> waiting approval
    if (profile?.status === "pending") return "/waiting-approval";

    // Route by role
    const role = profile?.role || "client";
    if (role === "super_admin") return "/super-admin";
    if (role === "admin") return "/dashboard";
    return "/client";
  }, [currentUser, profile]);

  const toggleDropdown = (menu: string) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  const scrollToHash = (hash: string) => {
    const id = hash.startsWith('#') ? hash.slice(1) : hash;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navItems = [
    { label: "Home", href: "/" },
    {
      label: "Services",
      href: "#services",
      hasDropdown: true,
      submenu: [
        { label: "File Sharing", href: "#file-sharing" },
        { label: "End-to-End Encryption", href: "#encryption" },
        { label: "Access Control", href: "#access-control" },
        { label: "Audit Logs", href: "#audit-logs" },
      ],
    },
    {
      label: "Solutions",
      href: "#solutions",
      hasDropdown: true,
      submenu: [
        { label: "For Enterprises", href: "#enterprise" },
        { label: "For Finance", href: "#finance" },
        { label: "For Healthcare", href: "#healthcare" },
        { label: "For Legal", href: "#legal" },
      ],
    },
    { label: "Pricing", href: "/justpricing" },
    { label: "About", href: "#about" },
  ];

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 backdrop-blur-md border-b ${
      isDarkMode 
        ? "bg-gray-900/80 border-gray-800/50 shadow-lg" 
        : "bg-white/80 border-gray-200/50 shadow-md"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Auth context */}
          {/** Using auth here to compute dashboard route **/}
          {/** Move hook usage to top-level of component render **/}
          
          {/* Logo with smooth entrance */}
          <div className="flex items-center gap-3 flex-shrink-0 animate-fade-in">
            <Link to="/" className="block">
              <div className="h-12 md:h-16 overflow-hidden">
                <img src="/trustNshare.jpg" alt="trustNshare" className="h-12 md:h-16 object-contain block dark:hidden" />
                <img src="/bg.png" alt="trustNshare dark" className="h-12 md:h-16 object-contain hidden dark:block" />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Items */}
          {!minimal && (
            <div className={`hidden lg:flex space-x-1 transition-all duration-300 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
            {navItems.map((item) => {
              const isAnchor = item.href.startsWith('#');
              return (
                <div key={item.label} className="relative group">
                  {item.hasDropdown ? (
                    <>
                      <button
                        onClick={() => toggleDropdown(item.label)}
                        className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-1 font-medium ${
                          isDarkMode
                            ? "text-gray-300 hover:text-white hover:bg-gray-800/50"
                            : "text-gray-700 hover:text-blue-600 hover:bg-gray-100/50"
                        }`}
                      >
                        {item.label}
                        <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
                      </button>
                      {/* Dropdown Menu with smooth animation */}
                      {item.submenu && (
                        <div
                          className={`absolute left-0 mt-2 w-56 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 py-2 border ${
                            isDarkMode 
                              ? "bg-gray-800/95 border-gray-700 shadow-2xl" 
                              : "bg-white/95 border-gray-100 shadow-2xl"
                          }`}
                        >
                          {item.submenu.map((subitem, idx) => (
                            <button
                              key={subitem.label}
                              type="button"
                              className={`w-full text-left px-4 py-3 text-sm transition-all duration-300 ${
                                isDarkMode
                                  ? "text-gray-300 hover:text-white hover:bg-gray-700/50"
                                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                              } ${idx === 0 ? "rounded-t-lg" : ""} ${idx === item.submenu.length - 1 ? "rounded-b-lg" : ""}`}
                              onClick={() => {
                                scrollToHash(subitem.href);
                                setOpenDropdown(null);
                              }}
                            >
                              {subitem.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : isAnchor ? (
                    <button
                      onClick={() => scrollToHash(item.href)}
                      className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-1 font-medium ${
                        isDarkMode
                          ? "text-gray-300 hover:text-white hover:bg-gray-800/50"
                          : "text-gray-700 hover:text-blue-600 hover:bg-gray-100/50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Link
                      to={item.href}
                      className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-1 font-medium ${
                        isDarkMode
                          ? "text-gray-300 hover:text-white hover:bg-gray-800/50"
                          : "text-gray-700 hover:text-blue-600 hover:bg-gray-100/50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              );
            })}
            </div>
          )}

          {/* Right Side - Auth */}
          <div className="flex items-center gap-2 sm:gap-4">

            {/* Desktop Auth Buttons */}
            {!minimal && (
              <div className="hidden md:flex gap-2 sm:gap-3">
              {dashboardRoute && (
                <Link
                  to={dashboardRoute}
                  className="rounded-lg px-4 py-2 text-sm font-medium bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:from-emerald-700 hover:to-emerald-800"
                >
                  Dashboard
                </Link>
              )}
              {/* Show Logout only when logged in */}
              {currentUser && profile && (
                <button
                  onClick={async () => {
                    try {
                      await signOut(auth);
                      // After logout, optionally refresh to clear protected UI
                      window.location.href = "/";
                    } catch (e) {
                      console.error("Logout failed", e);
                    }
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium border border-red-500 text-red-600 hover:bg-red-50 transition-all duration-300"
                >
                  Logout
                </button>
              )}
              {(!currentUser || !profile) && (
                <>
                  <Link
                    to="/login"
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                      isDarkMode
                        ? "text-white border border-gray-600 hover:border-blue-400 hover:text-blue-400 hover:bg-gray-800/50"
                        : "text-gray-700 border border-gray-300 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    Login/Signup
                  </Link>
                  <Link
                    to="/admin-signup"
                    className="rounded-lg px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:from-blue-700 hover:to-blue-800"
                  >
                    Admin Signup
                  </Link>
                </>
              )}
              </div>
            )}

            {/* Mobile Menu Button */}
            {!minimal && (
              <button 
                className={`lg:hidden p-2 rounded-lg transition-all duration-300 ${
                  isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                }`}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu with smooth transition */}
        {!minimal && mobileMenuOpen && (
          <div className={`lg:hidden pb-4 border-t animate-slide-in-left ${
            isDarkMode ? "border-gray-800" : "border-gray-200"
          }`}>
            {navItems.map((item) => {
              const isAnchor = item.href.startsWith('#');
              return (
                <div key={item.label}>
                  {item.hasDropdown ? (
                    <>
                      <button
                        onClick={() => toggleDropdown(item.label)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 flex items-center justify-between font-medium ${
                          isDarkMode
                            ? "text-gray-300 hover:text-white hover:bg-gray-800/50"
                            : "text-gray-700 hover:text-blue-600 hover:bg-gray-100/50"
                        }`}
                      >
                        {item.label}
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${
                          openDropdown === item.label ? "rotate-180" : ""
                        }`} />
                      </button>

                      {openDropdown === item.label && item.submenu && (
                        <div className="pl-4 mt-1 animate-slide-in-left">
                          {item.submenu.map((subitem) => (
                            <button
                              key={subitem.label}
                              type="button"
                              className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all duration-300 ${
                                isDarkMode
                                  ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                                  : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                              }`}
                              onClick={() => {
                                scrollToHash(subitem.href);
                                setMobileMenuOpen(false);
                              }}
                            >
                              {subitem.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : isAnchor ? (
                    <button
                      onClick={() => {
                        scrollToHash(item.href);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 flex items-center justify-between font-medium ${
                        isDarkMode
                          ? "text-gray-300 hover:text-white hover:bg-gray-800/50"
                          : "text-gray-700 hover:text-blue-600 hover:bg-gray-100/50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Link
                      to={item.href}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 flex items-center justify-between font-medium ${
                        isDarkMode
                          ? "text-gray-300 hover:text-white hover:bg-gray-800/50"
                          : "text-gray-700 hover:text-blue-600 hover:bg-gray-100/50"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              );
            })}

            {/* Mobile Auth Buttons */}
            <div className={`px-4 py-4 border-t gap-2 flex flex-col ${
              isDarkMode ? "border-gray-800" : "border-gray-200"
            }`}>
              {dashboardRoute && (
                <Link
                  to={dashboardRoute}
                  className="text-center rounded-lg px-4 py-2 text-sm font-medium bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              {currentUser && profile && (
                <button
                  onClick={async () => {
                    try {
                      await signOut(auth);
                      setMobileMenuOpen(false);
                      window.location.href = "/";
                    } catch (e) {
                      console.error("Logout failed", e);
                    }
                  }}
                  className="text-center rounded-lg px-4 py-2 text-sm font-medium border border-red-500 text-red-600 hover:bg-red-50 transition-all duration-300"
                >
                  Logout
                </button>
              )}
              {(!currentUser || !profile) && (
                <>
                  <Link
                    to="/login"
                    className={`text-center rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 ${
                      isDarkMode
                        ? "text-white border border-gray-600 hover:border-blue-400 hover:text-blue-400 hover:bg-gray-800"
                        : "text-gray-700 border border-gray-300 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    Login
                  </Link>
                  <Link
                    to="/admin-signup"
                    className="text-center rounded-lg px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all duration-300"
                  >
                    Admin Signup
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default FrontNavbar;
