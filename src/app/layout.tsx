import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/AppState";
import { Footer, Header } from "@/components/Shell";
import CoachWidget from "@/components/Coach";
import { RegisterSW } from "@/components/Pwa";
import { DISPLAY_BOOT } from "@/lib/display";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", weight: ["400", "500", "600"], style: ["normal", "italic"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "StrandLab · AI hair-care advisor",
  description:
    "StrandLab measures your curl pattern, frizz, density and length with YouCam Hair AI, adds porosity and today's dew point, and tells you which ingredients your hair actually needs — before you buy.",
  applicationName: "StrandLab",
  appleWebApp: { capable: true, title: "StrandLab", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F6F3EE", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply saved text size / contrast before first paint */}
        <script dangerouslySetInnerHTML={{ __html: DISPLAY_BOOT }} />
      </head>
      <body className={`${serif.variable} ${sans.variable} ${mono.variable} font-sans bg-paper text-ink antialiased min-h-screen flex flex-col`}>
        <AppProvider>
          <Header />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
          <CoachWidget />
          <RegisterSW />
        </AppProvider>
      </body>
    </html>
  );
}
