import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata = {
  title: 'Retroalimentación DUOC',
  description: 'Dashboard de gestión de retroalimentación efectiva',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-theme="duoctheme">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
