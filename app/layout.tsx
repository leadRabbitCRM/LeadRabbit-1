import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { Providers } from "./providers";
import AuthProvider from "./session-provider";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

import { siteConfig } from "@/config/site";

// Initialize cron scheduler on app startup
import "@/lib/initScheduler";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LeadRabbit CRM",
    startupImage: [
      "/icons/profile.png",
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "LeadRabbit CRM",
    title: {
      default: siteConfig.name,
      template: `%s - ${siteConfig.name}`,
    },
    description: siteConfig.description,
  },
  twitter: {
    card: "summary",
    title: {
      default: siteConfig.name,
      template: `%s - ${siteConfig.name}`,
    },
    description: siteConfig.description,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icons/profile.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/profile.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/profile.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#5B62E3" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Also add PWA specific viewport meta
  viewportFit: "cover",
};
const poppins = localFont({
  src: [
    {
      path: "../public/fonts/Poppins-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/Poppins-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Poppins-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/Poppins-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/Poppins-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/Poppins-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-poppins",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      suppressHydrationWarning
      className={`${poppins.variable} light`}
      lang="en"
    >
      <head />
      <body className="text-foreground antialiased bg-[#f7f7f7] font-poppins">
        <AuthProvider>
          <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
            {children}
            {/* <PWAInstallPrompt /> */}
            <ServiceWorkerRegistration />
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
