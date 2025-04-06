import "@/src/app/globals.css"

export const metadata = {
  title: 'ShortStack',
  description: 'Financial education platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}