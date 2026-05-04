import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

export const dynamic = 'force-dynamic';
import "./globals.css";
import { ClientLayout } from "@/components/ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Family Digital Agreement - Transparent Parental Controls",
  description: "A family-focused digital agreement platform with transparent monitoring, goal setting, and rewards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientLayout>
          <div className="flex flex-col min-h-screen">
            <main className="flex-grow">
              {children}
            </main>
            <footer className="py-8 border-t border-gray-200 bg-white">
              <div className="max-w-7xl mx-auto px-4 text-center">
                <p className="text-sm text-gray-500">© 2026 TanHK. All rights reserved. <span className="mx-2">•</span> Dated: 3 May 2026</p>
                <p className="mt-1 font-medium text-indigo-600/70">Family Digital Agreement</p>
                
                <div className="mt-6 pt-6 border-t border-gray-100 max-w-2xl mx-auto">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Privacy & Transparency</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    This platform is built on the principle of mutual trust. All collected browsing data is stored privately within your family's database and is never shared, sold, or used by third parties. Data collection is solely for personal insight and agreement-based digital parenting.
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </ClientLayout>
      </body>
    </html>
  );
}