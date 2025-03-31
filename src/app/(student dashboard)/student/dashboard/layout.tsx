import { DashboardSidebar } from "@/src/components/students/StudentSidebarLeft"
import "@/src/app/globals.css"
import { AuthProvider } from "@/src/components/providers/auth-provider"

export const metadata = {
  title: 'Student Dashboard - ShortStack',
  description: 'Financial education platform',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AuthProvider>
          <div className="flex flex-col md:flex-row min-h-screen">
            {/* Sidebar */}
            <DashboardSidebar />

            {/* Main content */}
            <main className="flex-1 bg-gray-50">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}