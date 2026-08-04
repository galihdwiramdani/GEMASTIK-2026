import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// 🟢 Mengimpor dan mengonfigurasi Plus Jakarta Sans dari Google Fonts
const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"], 
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ocusense AI | Dasbor Klinis",
  description: "Sistem Skrining Medis Presisi Tinggi Berbasis Edge AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        {/* 🟢 MENGEMBALIKAN Ikon Phosphor (Mendukung fill, duotone, bold, dll) */}
        <script src="https://unpkg.com/@phosphor-icons/web" async></script>
      </head>
      
      <body className={`${jakartaSans.className} antialiased bg-background-main text-slate-900`}>
        {children}
      </body>
    </html>
  );
}