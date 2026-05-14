import type { Metadata } from "next"
import "./globals.css"


export const metadata: Metadata = {
  title: "FiNK — Smart Family Finance",
  description: "Aplikasi keuangan keluarga berbasis sistem Kakeibo",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
