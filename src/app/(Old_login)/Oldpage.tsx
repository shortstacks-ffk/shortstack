import { GalleryVerticalEnd } from "lucide-react";
import Image from "next/image";
import login_mascout from "../../../public/assets/img/Login Mascout 2ldpi.png";
import main_logo from "../../../public/assets/img/Main Primary Logo - Colorfu Black Greenldpi.png";

import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left Panel */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <Image src={main_logo} alt="Main Logo" width={120} height={100} />
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="relative hidden lg:flex flex-col items-center justify-center bg-[hsl(79,89%,43%)] py-10 px-6 lg:block overflow-hidden">
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <Image
            src={login_mascout}
            alt="Mascot Image"
            width={350}
            height={350}
            className="mb-4"
          />
          <h1 className="text-3xl font-bold text-white mb-2">
            Introducing a new learning experience
          </h1>
          <p className="text-md text-white leading-6">
            Empower your kids to save smart, spend wisely, and grow their money
            skills with our fun, interactive app. Let's build strong financial
            habits together!
          </p>
        </div>

        {/* Semi-Circle Arc */}
        <div className="absolute -bottom-60 -left-5 w-[320px] h-[320px] bg-[hsl(79,65%,60%)] rounded-full"></div>
      </div>
    </div>
  );
}
