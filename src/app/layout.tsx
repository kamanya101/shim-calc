import type { Metadata, Viewport } from "next";
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME } from "@/lib/app";
import { AuthProvider } from "@/components/AuthProvider";
import { Footer } from "@/components/Footer";
import { RecordsProvider } from "@/components/RecordsProvider";
import { SyncProvider } from "@/components/SyncProvider";
import { TabBar } from "@/components/TabBar";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  // Sub-pages set just their own name; the template appends the app's.
  title: { default: APP_NAME, template: `%s — ${APP_NAME}` },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  applicationName: APP_SHORT_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_SHORT_NAME,
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
          <AuthProvider>
            <SyncProvider>
              {children}
              <Footer />
              <TabBar />
            </SyncProvider>
          </AuthProvider>
        </RecordsProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
