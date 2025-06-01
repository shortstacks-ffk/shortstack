"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, ArrowLeft } from "lucide-react";
import login_mascout from "@/public/assets/img/Mascout 2ldpi.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to process request");
      } else {
        // If successful, store email in session storage for the next step
        sessionStorage.setItem("resetEmail", email);
        setSuccess(true);
        // Redirect to verification page after 2 seconds
        setTimeout(() => {
          router.push("/verify-code");
        }, 2000);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Forgot password error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <Link href="/teacher" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft size={16} className="mr-1" />
              Back to login
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold mb-1">Forgot Password</h1>
          <p className="text-gray-600 mb-6">
            Enter your email address, and we'll send you a verification code to reset your password.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
              <p className="text-sm">
                If an account exists with this email, we've sent a verification code.
                Redirecting you to the next step...
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="your.email@example.com"
                required
                disabled={isLoading || success}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full py-2 px-4 bg-[#97d700] text-white font-semibold rounded-md hover:bg-[#86c000] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading ? "Sending..." : "Send Verification Code"}
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel with green color */}
      <div className="hidden lg:block lg:w-1/2 bg-[#97d700] relative overflow-hidden">
        {/* Content and mascot */}
        <div className="flex flex-col items-center justify-center h-full text-center px-10">
          <Image
            src={login_mascout}
            alt="Mascot Image"
            width={400}
            height={400}
            className="mb-6"
            priority
          />
          <h1 className="text-3xl font-bold text-white mb-4">
            Password Recovery
          </h1>
          <p className="text-md font-semibold text-white max-w-lg text-center">
            Don't worry, we've got you covered! Follow these simple steps to recover your account.
          </p>
        </div>
        
        {/* Single arch in bottom left */}
        <div className="absolute -bottom-60 -left-5 w-[320px] h-[320px] bg-[hsl(79,65%,60%)] rounded-full"></div>
      </div>
    </div>
  );
}