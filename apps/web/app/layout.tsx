import "@rsc/ui/styles.css";
import "./globals.css";
import "./styles.css";

import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import type { ReactNode } from "react";

import { Toaster } from "sonner";
import { ThemeProvider } from "@rsc/ui";

import { QueryProvider } from "@/src/components/providers/query-provider";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DineOut NG",
    template: "DineOut NG | %s",
  },
  description: "Order across DineOut NG kitchens in one simple checkout.",
  metadataBase: new URL("https://dineoutng.com"),
  keywords: ["food", "delivery", "dineout", "restaurants", "Nigeria", "order online"],
  authors: [{ name: "DineOut NG" }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/icons/favicon-32x32.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://dineoutng.com",
    siteName: "DineOut NG",
    title: "DineOut NG — Order from Multiple Kitchens, Pay Once",
    description: "Order across DineOut NG kitchens in one simple checkout.",
    images: [
      {
        url: "/icons/og-image.png",
        width: 1200,
        height: 630,
        alt: "DineOut NG",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DineOut NG — Order from Multiple Kitchens, Pay Once",
    description: "Order across DineOut NG kitchens in one simple checkout.",
    images: ["/icons/og-image.png"],
  },
  other: {
    "msapplication-TileColor": "#0e0e14",
    "theme-color": "#0e0e14",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0e0e14" />
        <link rel="manifest" href="/site.webmanifest" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(()=>{try{const k='rsc-theme';const s=localStorage.getItem(k);const t=s==='light'||s==='dark'?s:'dark';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch{}})()",
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
