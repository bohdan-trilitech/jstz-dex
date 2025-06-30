import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AssetsContextProvider } from "@/contexts/assets.context";
import { WalletContextProvider } from "@/contexts/wallet.context";

import "./globals.css";

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
          <TooltipProvider>
            <AssetsContextProvider>
              <WalletContextProvider>
                {children}
                <Toaster />
              </WalletContextProvider>
            </AssetsContextProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
