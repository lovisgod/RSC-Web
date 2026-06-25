import "@rsc/ui/styles.css";
import "./globals.css";
import "./styles.css";

import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import type { ReactNode } from "react";

import { QueryProvider } from "@/src/components/providers/query-provider";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RSC Kitchens",
    template: "%s · RSC Kitchens",
  },
  description: "Order across RSC kitchens in one simple checkout.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={roboto.variable}>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
