import type { Metadata, Viewport } from "next";
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME } from "@/lib/app";
import { AuthProvider } from "@/components/AuthProvider";
import { Footer } from "@/components/Footer";
import { LocaleProvider } from "@/components/LocaleProvider";
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
      {/*
        Language sits outermost. A screen that fails to load a rider bikes
        still has to be able to say so in their own words, so nothing below
        this can be the thing that decides which language that is.

        The lang attribute above starts as "en" and is corrected on the client
        once the choice is known — see LocaleProvider. It cannot be right here,
        because this html is prerendered at build time and shared by everyone.
      */}
      <body className="min-h-full">
        <LocaleProvider>
        <RecordsProvider>
          <AuthProvider>
            <SyncProvider>
              {children}
              <Footer />
              <TabBar />
            </SyncProvider>
          </AuthProvider>
        </RecordsProvider>
        </LocaleProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
