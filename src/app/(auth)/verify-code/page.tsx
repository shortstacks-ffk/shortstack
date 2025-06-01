"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, ArrowLeft } from "lucide-react";
import login_mascout from "@/public/assets/img/Mascout 2ldpi.png";

export default function VerifyCodePage() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Get email from session storage
    const resetEmail = sessionStorage.getItem("resetEmail");
    if (!resetEmail) {
      // If no email is found, redirect to forgot password
      router.push("/forgot-password");
    } else {
      setEmail(resetEmail);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid verification code");
      } else {
        // Store token for password reset
        sessionStorage.setItem("resetToken", data.resetToken);
        router.push("/reset-password");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Verification error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
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

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to resend code");
      } else {
        setError(""); // Clear any errors
        // Show temporary success message
        const successMessage = document.getElementById("resend-success");
        if (successMessage) {
          successMessage.classList.remove("hidden");
          setTimeout(() => {
            successMessage.classList.add("hidden");
          }, 5000);
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
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
            <Link href="/forgot-password" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft size={16} className="mr-1" />
              Back to forgot password
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold mb-1">Verify Code</h1>
          <p className="text-gray-600 mb-6">
            Please enter the 7-digit verification code that was sent to {email || "your email"}.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          <div id="resend-success" className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md hidden">
            <p className="text-sm">Verification code has been resent to your email.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').substring(0, 7))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-center tracking-widest"
                placeholder="1234567"
                required
                maxLength={7}
                pattern="[0-9]{7}"
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">Enter the 7-digit code from your email</p>
            </div>

            <button
              type="submit"
              disabled={isLoading || code.length !== 7}
              className="w-full py-2 px-4 bg-[#97d700] text-white font-semibold rounded-md hover:bg-[#86c000] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading ? "Verifying..." : "Verify Code"}
            </button>
            
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                className="text-sm text-green-500 hover:text-green-600 focus:outline-none"
              >
                Didn't receive a code? Resend
              </button>
            </div>
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
            Almost There!
          </h1>
          <p className="text-md font-semibold text-white max-w-lg text-center">
            Check your email for a 7-digit verification code and enter it to continue your password reset.
          </p>
        </div>
        
        {/* Single arch in bottom left */}
        <div className="absolute -bottom-60 -left-5 w-[320px] h-[320px] bg-[hsl(79,65%,60%)] rounded-full"></div>
      </div>
    </div>
  );
}