"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";
import login_mascout from "@/public/assets/img/Mascout 2ldpi.png";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // Password validation states
  const [hasLength, setHasLength] = useState(false);
  const [hasUpper, setHasUpper] = useState(false);
  const [hasLower, setHasLower] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);

  useEffect(() => {
    // Get email and token from session storage
    const resetEmail = sessionStorage.getItem("resetEmail");
    const resetToken = sessionStorage.getItem("resetToken");
    
    if (!resetEmail || !resetToken) {
      // If missing data, redirect to forgot password
      router.push("/forgot-password");
    } else {
      setEmail(resetEmail);
      setToken(resetToken);
    }
  }, [router]);

  useEffect(() => {
    // Real-time password validation
    setHasLength(password.length >= 8);
    setHasUpper(/[A-Z]/.test(password));
    setHasLower(/[a-z]/.test(password));
    setHasNumber(/[0-9]/.test(password));
    setPasswordsMatch(password === confirmPassword && password !== "");
  }, [password, confirmPassword]);

  const isPasswordValid = hasLength && hasUpper && hasLower && hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Check if passwords match
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    // Check if password meets requirements
    if (!isPasswordValid) {
      setError("Password doesn't meet all requirements");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, token, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset password");
      } else {
        // Show success message and clean up session storage
        setSuccess(true);
        sessionStorage.removeItem("resetEmail");
        sessionStorage.removeItem("resetToken");
        
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          router.push("/teacher");
        }, 3000);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Password reset error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {!success && (
            <div className="mb-6">
              <Link href="/verify-code" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                <ArrowLeft size={16} className="mr-1" />
                Back to verification
              </Link>
            </div>
          )}
          
          <h1 className="text-3xl font-bold mb-1">
            {success ? "Password Reset Complete" : "Create New Password"}
          </h1>
          <p className="text-gray-600 mb-6">
            {success 
              ? "Your password has been successfully reset. You will be redirected to the login page shortly."
              : "Please create a strong password that you don't use on any other website."}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success ? (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-start gap-3">
              <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Password reset successful!</p>
                <p className="text-sm mt-1">Redirecting you to the login page...</p>
                <Link 
                  href="/teacher" 
                  className="text-sm text-green-600 hover:text-green-800 underline mt-2 inline-block"
                >
                  Click here if you're not redirected automatically
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md pr-10 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <Eye size={20} className="text-gray-500" />
                    ) : (
                      <EyeOff size={20} className="text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md pr-10 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <Eye size={20} className="text-gray-500" />
                    ) : (
                      <EyeOff size={20} className="text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password requirements */}
              <div className="space-y-2 border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-700">Password Requirements:</p>
                <ul className="space-y-1">
                  <li className="flex items-center text-sm">
                    <span className={`inline-block w-4 h-4 mr-2 rounded-full ${hasLength ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    At least 8 characters
                  </li>
                  <li className="flex items-center text-sm">
                    <span className={`inline-block w-4 h-4 mr-2 rounded-full ${hasUpper ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    At least one uppercase letter (A-Z)
                  </li>
                  <li className="flex items-center text-sm">
                    <span className={`inline-block w-4 h-4 mr-2 rounded-full ${hasLower ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    At least one lowercase letter (a-z)
                  </li>
                  <li className="flex items-center text-sm">
                    <span className={`inline-block w-4 h-4 mr-2 rounded-full ${hasNumber ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    At least one number (0-9)
                  </li>
                  <li className="flex items-center text-sm">
                    <span className={`inline-block w-4 h-4 mr-2 rounded-full ${passwordsMatch ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    Passwords match
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isPasswordValid || !passwordsMatch}
                className="w-full py-2 px-4 bg-[#97d700] text-white font-semibold rounded-md hover:bg-[#86c000] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:hover:bg-[#97d700]"
              >
                {isLoading ? "Updating..." : "Reset Password"}
              </button>
            </form>
          )}
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
            {success ? "Welcome Back!" : "Final Step!"}
          </h1>
          <p className="text-md font-semibold text-white max-w-lg text-center">
            {success 
              ? "You can now log in with your new password and continue your teaching journey."
              : "Create a strong, unique password to keep your account secure."}
          </p>
        </div>
        
        {/* Single arch in bottom left */}
        <div className="absolute -bottom-60 -left-5 w-[320px] h-[320px] bg-[hsl(79,65%,60%)] rounded-full"></div>
      </div>
    </div>
  );
}