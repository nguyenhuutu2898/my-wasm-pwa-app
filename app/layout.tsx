// src/app/layout.tsx
import './globals.css'; // Đảm bảo bạn có tệp CSS toàn cục
import React from 'react';
import AuthProvider from './providers';

export const metadata = {
  title: 'Next.js PWA Wasm Simple',
  description: 'Ví dụ Next.js PWA với WebAssemblyScript',
  manifest: '/manifest.json', // Link manifest
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MyPWAWasm',
    startupImage: [], // Có thể thêm màn hình khởi động
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8b5cf6" />
        <link rel="apple-touch-icon" href="/icons/icon1.svg" />
        <meta name="description" content="Ví dụ Next.js PWA với WebAssemblyScript" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}