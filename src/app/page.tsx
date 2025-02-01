// home page app/page.tsx
import Link from "next/link"


export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Add this temporarily */}
      {/* <TailwindTest /> */}

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-88px)] py-2">
        <h1 className="text-[54px] font-bold mb-6">Welcome to ShortStacks</h1>
        <p className="text-[36px] mb-32">Welcome to Financial Freedom</p>

        <h2 className="text-[36px] mb-10">Are you a Teacher or a Student</h2>

        <div className="flex gap-8 w-full max-w-4xl justify-center">
          <Link
            href="/teacher"
            className="w-full max-w-md text-center py-4 px-8 bg-[#99D420] hover:bg-[#89C410] text-white text-2xl font-semibold rounded-full transition-colors"
          >
            Teacher
          </Link>
          <Link
            href="/student"
            className="w-full max-w-md text-center py-4 px-8 bg-[#99D420] hover:bg-[#89C410] text-white text-2xl font-semibold rounded-full transition-colors"
          >
            Student
          </Link>
        </div>
      </div>
    </div>
  )
}


