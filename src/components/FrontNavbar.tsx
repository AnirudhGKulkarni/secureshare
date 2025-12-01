import React from "react";
import { Link } from "react-router-dom";

const Navbar: React.FC = () => {
  return (
    <nav className="bg-white/70 backdrop-blur-sm shadow sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-bold">
              SecureShare
            </Link>
            <div className="hidden md:flex space-x-4 text-sm text-muted-foreground">
              <Link to="/reports" className="hover:underline">Reports</Link>
              <Link to="/about" className="hover:underline">About</Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-md px-3 py-2 text-sm font-medium bg-gradient-to-r from-primary to-accent-foreground text-white shadow"
            >
              Login/Signup
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
