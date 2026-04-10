import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "./components/BottomNav";
import { SplashWrapper } from "./components/SplashWrapper";
import { ThemeProvider } from "@/src/app/ThemeProvider";
import { createClient } from "@/src/lib/supabase/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gellog",
  description:
    "Log every ice cream. Track your flavours. Find the best spots.",
  icons: {
    icon: "/icon.png",
    apple: "/icon-1024.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#D97706",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking script: sets .dark/.light before React hydrates to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('gellog-theme');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.add(d?'dark':'light');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          {user ? <SplashWrapper /> : null}
          <div className={user ? "min-h-screen pb-28" : "min-h-screen"}>
            {children}
          </div>
          {user ? <BottomNav /> : null}
        </ThemeProvider>
      </body>
    </html>
  );
}
