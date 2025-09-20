import type { Metadata } from "next"

import "./globals.css"

import Header from "./components/header"
import AuthProvider from "./providers"

export const metadata: Metadata = {
  title: {
    default: "My App · Google Sheets",
    template: "%s · My App",
  },
  description: "Quản lý Google Sheets trực quan: xem, chỉnh sửa và đồng bộ dữ liệu",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "My App",
  },
  themeColor: "#312e81",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900">
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
              {children}
            </main>
            <footer className="border-t border-slate-200 bg-white/80 py-4 text-center text-xs text-slate-500">
              © {new Date().getFullYear()} My App · Đồng bộ Google Sheets an toàn
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
