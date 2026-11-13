import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VIRALINDO — Streaming Hiburan",
  description: "Temukan film, serial, dokumenter, dan video pilihan di VIRALINDO.",
  applicationName: "VIRALINDO",
};
export const viewport: Viewport = { themeColor: "#09090b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
