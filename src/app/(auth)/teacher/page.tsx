'use client'
import Image from "next/image";
import Link from "next/link";
import login_mascout from "@/public/assets/img/Mascout 2ldpi.png";


import * as Clerk from '@clerk/elements/common'
import * as SignUp from '@clerk/elements/sign-up'

export default function TeacherSignUpPage() {
  return (
    <div className="flex min-h-[calc(120vh-100px)] overflow-y-auto">
      {/* Left side - Sign Up Form */}

      <div className="flex-1 flex flex-col items-start justify-center max-w-xl px-8 py-12 mx-auto mt-6">
       <h1 className="text-[40px] font-bold mb-4">Create Account</h1>

        <p className="text-gray-600 mb-8">
          Do you have an account?{" "}
          <Link href="/teacher/login" className="text-gray-900 underline hover:text-gray-700">
            Sign in now
          </Link>
        </p>

         <SignUp.Root>
                  <SignUp.Step name="start" className="w-full">
                    <div className="space-y-4">
                    <Clerk.Field name="identifier" className="space-y-2">
                      <Clerk.Label className="text-sm font-medium text-zinc-950">Email</Clerk.Label>
                      <Clerk.Input
                        type="text"
                        required
                        className="w-full rounded-md bg-white px-3.5 py-2 text-sm outline-none ring-1 ring-inset ring-zinc-300 hover:ring-zinc-400 focus:ring-[1.5px] focus:ring-zinc-950 data-[invalid]:ring-red-400"
                      />
                      <Clerk.FieldError className="block text-sm text-red-400" />
                    </Clerk.Field>
                    <Clerk.Field name="password" className="space-y-2">
                      <Clerk.Label className="text-sm  font-medium text-zinc-950">Password</Clerk.Label>
                      <Clerk.Input
                        type="password"
                        required
                        className="w-full rounded-md bg-white px-3.5 py-2 text-sm outline-none ring-1 ring-inset ring-zinc-300 hover:ring-zinc-400 focus:ring-[1.5px] focus:ring-zinc-950 data-[invalid]:ring-red-400"
                      />
                      <Clerk.FieldError className="block text-sm text-red-400" />
                    </Clerk.Field>

                    <Clerk.Field name="password" className="space-y-2">
                      <Clerk.Label className="text-sm  font-medium text-zinc-950">Password verification</Clerk.Label>
                      <Clerk.Input
                        type="password"
                        required
                        className="w-full rounded-md bg-white px-3.5 py-2 text-sm outline-none ring-1 ring-inset ring-zinc-300 hover:ring-zinc-400 focus:ring-[1.5px] focus:ring-zinc-950 data-[invalid]:ring-red-400"
                      />
                      <Clerk.FieldError className="block text-sm text-red-400" />
                    </Clerk.Field>
        
                  <SignUp.Action
                    submit
                    className="w-full rounded-xl bg-[#93D404] hover:bg-[#86BF09] px-4 py-3 text-center text-sm font-medium text-white shadow outline-none focus-visible:outline-[1.5px] active:text-white/70"
                  >
                    Continue
                  </SignUp.Action>
        
                  </div>
                  </SignUp.Step>
                </SignUp.Root> 

        {/* <div className="w-full">
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "w-full shadow-none p-0",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "border-2 border-gray-200 hover:bg-gray-50",
                formButtonPrimary: "bg-[#99D420] hover:bg-[#89C410] text-white",
                footerAction: "pb-0",
                footer: "hidden",
              },
            }}
            // fallbackRedirectUrl="/dashboard"
            routing="hash"
            signInUrl="/teacher/sign-in"
          />
        </div> */}

        <Link
          href="/"
          className="mt-6 text-center w-full py-4 px-6 border-2 border-[#99D420] text-[#99D420] font-semibold rounded-full hover:bg-gray-50 transition-colors"
        >
          Go Back
        </Link> 
      </div>

      {/* Right side - Mascot and Text */}
      <div className="hidden lg:flex flex-1 bg-[#99D420] flex-col items-center justify-center text-white px-12 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-lg">
          <Image
            src={login_mascout}
            alt="ShortStacks Mascot"
            width={300}
            height={300}
            className="mx-auto mb-12"
          />
          <h2 className="text-4xl font-bold mb-6">
            Introducing a new learning experience
          </h2>
          <p className="text-xl">
            Empower your kids to save smart, spend wisely, and grow their money
            skills with our fun, interactive app. Let's build strong financial
            habits together!
          </p>
        </div>
      </div>
    </div>
  );
}
