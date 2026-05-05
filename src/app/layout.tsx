import type { Metadata } from 'next'
import AuthNavbar from '@/components/AuthNavbar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tender With Us',
  description: 'Transparent public tender accountability platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AuthNavbar />
        {children}
      </body>
    </html>
  )
}