import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "./components/BottomNav";
import { SplashWrapper } from "./components/SplashWrapper";
import { createClient } from "@/src/lib/supabase/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gellog",
  description:
    "Log every ice cream. Track your flavours. Find the best spots.",
  themeColor: "#D97706",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SplashWrapper />
        <div className="min-h-screen pb-20">{children}</div>
        {user ? <BottomNav /> : null}
      </body>
    </html>
  );
}

