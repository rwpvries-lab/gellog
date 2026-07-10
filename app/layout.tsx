import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SplashWrapper } from "./components/SplashWrapper";
import { ClarityConsentBanner } from "./components/ClarityConsentBanner";
import { ClarityLoader } from "./components/ClarityLoader";
import { ThemeProvider } from "@/src/app/ThemeProvider";
import { createClient } from "@/src/lib/supabase/server";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
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
  viewportFit: "cover",
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

  // Only enable Clarity in production deploys where a project ID is configured
  // (also loads inside the Capacitor webview, which just renders this same
  // hosted page — see CLAUDE.md native app notes).
  const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const clarityEnabled =
    Boolean(clarityProjectId) && process.env.NODE_ENV === "production";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${jakarta.variable}`}
    >
      <head>
        {/* Blocking script: sets .dark/.light before React hydrates to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('gellog-theme');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.add(d?'dark':'light');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <SplashWrapper user={!!user}>{children}</SplashWrapper>
        </ThemeProvider>
        {clarityEnabled && clarityProjectId && (
          <>
            <ClarityLoader projectId={clarityProjectId} />
            <ClarityConsentBanner projectId={clarityProjectId} />
          </>
        )}
      </body>
    </html>
  );
}
