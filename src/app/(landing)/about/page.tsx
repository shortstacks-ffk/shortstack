"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/src/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      {/* Main Content Section */}
      <section className="bg-white py-20 px-4 min-h-[70vh]">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-green-600 mb-6">About ShortStacks</h1>
          
          <div className="bg-green-50 p-8 md:p-12 rounded-xl border border-green-100 shadow-sm mb-12">
            <div className="relative mx-auto w-[160px] h-[160px] mb-8">
              <Image
                src="/assets/img/Mascout 9ldpi.png"
                alt="ShortStacks Mascot"
                fill
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full mb-6">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Our full story is coming soon</span>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">Our Mission</h2>
            <p className="text-gray-600 text-lg mb-6">
              At ShortStacks, we're on a mission to empower the next generation with financial 
              literacy skills they'll use for a lifetime. We believe that learning about money 
              management should be engaging, interactive, and start at an early age.
            </p>
            
            <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
              <h3 className="font-medium text-green-700 mb-2">Check back soon for:</h3>
              <ul className="text-left text-gray-600 space-y-2 mb-4 mx-auto max-w-md">
                <li>• Our founding story</li>
                <li>• Meet the team</li>
                <li>• Our educational approach</li>
                <li>• Testimonials from schools and teachers</li>
                <li>• Educational partners</li>
              </ul>
            </div>
          </div>
          
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}