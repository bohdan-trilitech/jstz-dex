import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";
import { AssetsContextProvider } from "@/contexts/assets.context";
import { WalletContextProvider } from "@/contexts/wallet.context";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Jstz DEX",
  description: "Jstz bonding curve exchenge dApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AssetsContextProvider>
            <WalletContextProvider>
              {children}
              <Toaster/>
            </WalletContextProvider>
          </AssetsContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
