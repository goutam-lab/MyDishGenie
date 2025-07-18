// app/layout.tsx (Updated)
import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import SmoothScroller from '@/components/SmoothScroller' // Import the new component

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'MyDishGenie - AI Recipe Suggester',
  description: 'Confused what to cook? Let AI find your perfect Indian dish!',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <AuthProvider>
          <SmoothScroller> {/* Wrap your content with the scroller */}
            {children}
          </SmoothScroller>
        </AuthProvider>
      </body>
    </html>
  )
}
