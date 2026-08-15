import type { Metadata, Viewport } from "next";
import { RecordsProvider } from "@/components/RecordsProvider";
import { TabBar } from "@/components/TabBar";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shim Calculator — KTM LC8",
  description:
    "Work out valve shim sizes and part numbers for KTM LC8 950/990 engines, and keep a record of your clearances. Works offline.",
  manifest: "/manifest.webmanifest",
  applicationName: "Shim Calc",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Shim Calc",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0d0e10",
  width: "device-width",
  initialScale: 1,
  // Lets the app paint under the notch and home indicator when installed.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <RecordsProvider>
          {children}
          <TabBar />
        </RecordsProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
