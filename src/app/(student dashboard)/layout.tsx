import "@/src/app/globals.css"
import { AuthProvider } from "@/src/components/providers/auth-provider"

export default function StudentRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}