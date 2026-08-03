import "@rsc/ui/styles.css";
import "./globals.css";
import "./styles.css";

import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import type { ReactNode } from "react";

import { Toaster } from "sonner";
import { ThemeProvider, ThemeToggle } from "@rsc/ui";

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
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(()=>{try{const k='rsc-theme';const s=localStorage.getItem(k);const t=s==='light'||s==='dark'?s:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch{}})()",
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
          <ThemeToggle className="rsc-global-theme-toggle" />
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
