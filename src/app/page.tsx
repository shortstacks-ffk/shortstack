// home page app/page.tsx

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <h1 className="text-4xl font-bold text-green-500">Welcome to ShortStack</h1>
      <p className="mt-4 text-lg text-gray-600">
        A platform to manage your classes efficiently.
      </p>
      <Link href="/dashboard">
        <p className="mt-6 px-6 py-3 text-white bg-green-500 rounded hover:bg-green-600">
          Go to Teacher's Dashboard
        </p>
      </Link>
    </div>
  );
}
