import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { ToastProvider } from "@/components/ui";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "E-Patti",
  description: "Teen Patti score tracking and settlement calculation. No real-money transfers."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} font-sans`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
