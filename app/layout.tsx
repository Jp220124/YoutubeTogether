import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "WatchTube - Watch YouTube Together",
  description: "Sync videos with friends, family, or colleagues anywhere in the world. No downloads required.",
  keywords: "youtube, watch together, sync videos, watch party, online streaming",
  authors: [{ name: "WatchTube Team" }],
  openGraph: {
    title: "WatchTube - Watch YouTube Together",
    description: "Sync videos with friends anywhere in the world",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}