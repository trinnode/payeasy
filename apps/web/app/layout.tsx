import "../lib/env";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from 'nextjs-toploader';
import FavoritesProvider from "@/components/FavoritesProvider";
import ComparisonProvider from "@/components/ComparisonProvider";
import ComparisonBar from "@/components/ComparisonBar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PayEasy | Shared Rent on Stellar",
  description: "Secure, blockchain-powered rent sharing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-950 text-white`}>
        <NextTopLoader color="#7D00FF" showSpinner={false} />
        <FavoritesProvider>
          <ComparisonProvider>
            {children}
            <ComparisonBar />
          </ComparisonProvider>
        </FavoritesProvider>
      </body>
    </html>
  );
}
