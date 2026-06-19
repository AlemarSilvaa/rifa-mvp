import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rifa Online',
  description: 'Participe de rifas beneficentes online',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 min-h-screen">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
