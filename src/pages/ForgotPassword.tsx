// src/pages/ForgotPassword.tsx
import React from "react";
import { AlertTriangle, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const ForgotPassword: React.FC = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 p-6 text-gray-100">
      {/* Back to Login */}
      <Link to="/login" className="absolute top-4 left-4 z-50 inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm hover:bg-gray-800 hover:border-blue-500 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Login
      </Link>
      
      <Card className="w-full max-w-md shadow-elevated bg-gray-900 text-gray-100 border border-yellow-600/50">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-600 to-orange-600 shadow-lg">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Password Reset</CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Caution Notice */}
            <div className="rounded-lg border border-yellow-600/40 bg-yellow-950/30 p-4">
              <p className="text-sm leading-relaxed text-yellow-100">
                <span className="font-semibold block mb-2">⚠ Please Note:</span>
                To reset your password, please <span className="font-semibold text-yellow-300">contact the administrator</span> directly. 
              </p>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <p className="text-sm text-gray-300">
                When contacting support, please provide:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="text-sm text-gray-400 flex items-start gap-2">
                  <span className="text-yellow-400 font-bold mt-0.5">•</span>
                  <span>The <span className="font-semibold text-gray-300">valid email address</span> you used to create your account</span>
                </li>
                <li className="text-sm text-gray-400 flex items-start gap-2">
                  <span className="text-yellow-400 font-bold mt-0.5">•</span>
                  <span>A brief description of your issue</span>
                </li>
              </ul>
            </div>

            {/* Contact Information */}
            <div className="rounded-lg bg-gray-800/50 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-200">Administrator Contact:</p>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <a href="mailto:trustnshare1@gmail.com" className="hover:text-blue-400 transition-colors">
                  trustnshare1@gmail.com
                </a>
              </div>
            </div>

            {/* Action Button */}
            <Link to="/login">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-opacity">
                Back to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
