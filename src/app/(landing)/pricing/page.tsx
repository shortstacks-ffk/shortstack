"use client";

import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PricingPage() {
  return (
    <>
      {/* Main Content Section */}
      <section className="bg-white text-center py-24 px-4 min-h-[70vh] flex flex-col items-center justify-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-green-600 mb-6">Pricing</h1>
          
          <div className="space-y-8">
            <div className="bg-green-50 p-8 md:p-12 rounded-xl border border-green-100 shadow-sm">
              <h2 className="text-2xl md:text-3xl font-semibold mb-4">Coming Soon!</h2>
              <p className="text-gray-600 text-lg mb-8">
                We're currently finalizing our pricing plans to offer the best value for schools, teachers, and families.
                Check back soon for detailed information on our subscription options.
              </p>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-medium text-green-700 mb-2">Want to be notified when pricing is available?</h3>
                <p className="text-gray-600 mb-4">Join our waitlist to receive updates about pricing and special launch offers.</p>
                <Button className="bg-green-600 hover:bg-green-700">
                  Join Waitlist
                </Button>
              </div>
            </div>
            
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}