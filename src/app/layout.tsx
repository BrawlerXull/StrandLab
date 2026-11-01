import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", weight: ["400", "500", "600"], style: ["normal", "italic"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "StrandLab · your hair, measured",
  description:
    "StrandLab measures your curl pattern, frizz, density and length with YouCam Hair AI, adds porosity and today's dew point, and tells you which ingredients your hair actually needs — before you buy.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F6F3EE" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} ${mono.variable} font-sans bg-paper text-ink antialiased`}>{children}</body>
    </html>
  );
}
