"use client";

import Image from "next/image";

export default function LandingPage() {
  return (
    <>
      {/* Main Hero Section */}
      <section className="bg-green-600 text-white relative overflow-hidden min-h-[58vh] flex items-start justify-center pt-12 md:pt-1 lg:pt-2">
        <div className="max-w-7xl mx-auto relative z-10 text-center px-4">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold md:mb-6 leading-tight">
            Empowering Kids with Real-World<br />Financial Skills
          </h1>
        </div>

        {/* Mascot positioned below and behind the section end */}
        <div className="absolute bottom-[-170px] md:bottom-[-175px] left-1/2 transform -translate-x-1/2 z-5">
          {/* Mascot Head - Made bigger */}
          <div className="relative w-[400px] h-[400px] md:w-[500px] md:h-[500px]">
            <Image
              src="/assets/img/mascout_head.png"
              alt="ShortStacks Mascot"
              fill
              style={{ 
                objectFit: 'contain',
              }}
              priority
              className="filter drop-shadow-lg"
            />
          </div>
        </div>

        {/* Mascot Hands positioned below and ahead of the section end */}
        {/* Left Hand */}
        <div className="absolute bottom-[-80px] md:bottom-[-100px] left-[20%] w-[120px] h-[120px] md:w-[150px] md:h-[150px] z-30 filter drop-shadow-lg">
          <Image
            src="/assets/img/mascout_hand.png"
            alt="Mascot left hand"
            width={150}
            height={150}
            className="transform rotate-[-5deg]"
          />
        </div>

        {/* Right Hand */}
        <div className="absolute bottom-[-80px] md:bottom-[-100px] right-[20%] w-[120px] h-[120px] md:w-[150px] md:h-[150px] z-50 filter drop-shadow-lg">
          <Image
            src="/assets/img/mascout_hand.png"
            alt="Mascot right hand"
            width={150}
            height={150}
            className="transform rotate-[5deg] scale-x-[-1]"
          />
        </div>

        {/* Background decoration circles */}
        <div className="absolute top-20 left-[10%] w-32 h-32 rounded-full bg-green-500 opacity-20"></div>
        <div className="absolute bottom-32 right-[5%] w-16 h-16 rounded-full bg-green-500 opacity-20"></div>
        <div className="absolute animate-bounce-delayed opacity-20 top-20 left-[15%] w-16 h-16 bg-yellow-300 rounded-full"></div>
        <div className="absolute animate-bounce-slow opacity-20 top-36 right-[20%] w-12 h-12 bg-green-300 rounded-full"></div>
      </section>

      {/* Additional content below the hero - with 40vh height and grey background */}
      <section className="py-16 px-4 bg-gray-100 min-h-[40vh] relative z-10">
        <h2 className="text-lg text-gray-700 mb-8 mx-auto text-center">Placeholders</h2>
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-center">Our Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">Financial Education</h3>
              <p className="text-gray-600">Teaching kids the value of money through interactive lessons and exercises.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">Saving Goals</h3>
              <p className="text-gray-600">Help children set and achieve savings goals with visual tracking.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">Money Management</h3>
              <p className="text-gray-600">Simple tools to track spending and develop budgeting skills.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}