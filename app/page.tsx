"use client";

import {
  Wallet,
  BarChart3,
  AlertTriangle,
  WifiOff,
  Chrome,
  Coins,
  SettingsIcon, FileQuestion,
} from "lucide-react";

import { AssetManagement } from "@/components/asset-management";
import Logo from "@/components/logo";
import { Portfolio } from "@/components/portfolio";
import { Settings } from "@/components/settings";
import { ThemeModeToggle } from "@/components/theme-toggle";
import { TradingInterface } from "@/components/trading-interface";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWalletContext } from "@/contexts/wallet.context";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useRemoteConfigContext } from "@/contexts/remote-config.context";

export default function DexApp() {
  const {
    isAdmin,
    isConnected,
    extensionStatus,
    checkExtensionStatus,
    loading: connecting,
    connectWallet,
    disconnectWallet,
    userAddress,
  } = useWalletContext();

  const {jstzDexUrl} = useRemoteConfigContext()

  useEffect(() => {
    checkExtensionStatus();
  }, []);

  const {showToast} = useToast()

  async function onConnect() {
    try {
      const meta = await connectWallet();

      if (meta.address) {
        showToast("Welcome!", 200);
        return
      }
      showToast("Failed to connect wallet", 500);
    } catch (error) {
      console.error("Connection error:", error);
      showToast(error instanceof Error ? error.message : "Failed to connect wallet", 500);
    }
  }

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          {/* Extension Status Alert */}
          {extensionStatus !== "checking" ? (
            <Alert variant={extensionStatus === "available" ? "default" : "destructive"}>
              <div className="flex items-center justify-between gap-2">
                {extensionStatus === "available" ? (
                  <Chrome className="h-4 w-4" />
                ) : (
                  <WifiOff className="h-4 w-4" />
                )}
                <AlertDescription>
                  {extensionStatus === "available"
                    ? "jstz Signer extension detected"
                    : "jstz Signer extension not found. Please install the extension to continue."}
                </AlertDescription>
                <ThemeModeToggle />
              </div>
              {extensionStatus === "unavailable" && (
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={checkExtensionStatus}>
                    Retry Detection
                  </Button>
                </div>
              )}
            </Alert>
          ) : (
            <Alert variant={"default" }>
              <div className="flex items-center justify-between gap-2">
                <Chrome className="h-4 w-4" />
                <AlertDescription>
                  jstz Signer extension checking status
                </AlertDescription>
                <ThemeModeToggle />
              </div>
            </Alert>
          )}

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">
                <Logo />
              </CardTitle>
              <p className="text-muted-foreground">Decentralized Exchange on Tezos Smart Rollups</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {extensionStatus === "available" ? (
                <>
                  <div className="space-y-2 text-center">
                    <p className="text-muted-foreground text-sm">
                      Connect your jstz wallet to start trading
                    </p>
                  </div>
                  <Button
                    onClick={onConnect}
                    className="w-full"
                    disabled={connecting || extensionStatus !== "available"}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    {connecting ? "Connecting..." : "Connect jstz Wallet"}
                  </Button>
                </>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="bg-muted rounded-lg p-4">
                    <Chrome className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">
                      Please install the jstz Signer browser extension to use this DEX
                    </p>
                  </div>
                  <Button variant="outline" onClick={checkExtensionStatus} className="w-full">
                    Check Again
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2 justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                     className="lucide lucide-circle-question-mark-icon lucide-circle-question-mark">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
                <p className="text-muted-foreground text-sm">
                  New to Jstz DEX?{" "}
                </p>
                <a target="_blank" href="https://github.com/bohdan-trilitech/jstz-dex/blob/main/docs/USING_DEX.md">
                  Check docs
                </a>
              </div>

              {extensionStatus === "unavailable" && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    The jstz Signer extension is required to sign transactions and interact with the
                    DEX.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br">
      <header className="border-b shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Tooltip>
              <TooltipTrigger>
                <div>
                  <Logo />
                  <p className="text-muted-foreground text-sm">Bonding Curve Exchange</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-muted-foreground text-sm">
                  {process.env.NEXT_PUBLIC_JSTZ_NODE_ENDPOINT}
                </p>
                <p className="text-muted-foreground text-sm">
                  {jstzDexUrl ?? process.env.NEXT_PUBLIC_DEX_BASE_URL}
                </p>
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-4">
              {/* Extension Status Indicator */}
              <div className="flex items-center gap-2">
                {extensionStatus === "available" ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <Chrome className="h-4 w-4" />
                    <span className="text-xs">Extension Ready</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600">
                    <WifiOff className="h-4 w-4" />
                    <span className="text-xs">Extension Error</span>
                  </div>
                )}
              </div>

              <div className="text-right">
                <p className="text-sm font-medium">Connected</p>
                <p className="text-muted-foreground text-xs">
                  {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                </p>
              </div>
              <Button variant="outline" onClick={disconnectWallet}>
                Disconnect
              </Button>
              <ThemeModeToggle />
              <a target="_blank" href="https://github.com/bohdan-trilitech/jstz-dex/blob/main/docs/USING_DEX.md">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                     className="lucide lucide-circle-question-mark-icon lucide-circle-question-mark">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </a>

            </div>
          </div>
        </div>
      </header>

      {/* Extension Status Banner */}
      {extensionStatus === "unavailable" && (
        <div className="border-b border-yellow-200 bg-yellow-50">
          <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">
                  Extension issue detected. Some features may not work properly.
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={checkExtensionStatus}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="trade" className="w-full">
          <TabsList className={cn("grid w-full grid-cols-3", isAdmin && "grid-cols-4")}>
            <TabsTrigger value="trade" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Trade
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Assets
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                Settings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="trade" className="mt-6">
            <div className="flex justify-center">
              <TradingInterface />
            </div>
          </TabsContent>

          <TabsContent value="portfolio" className="mt-6">
            <Portfolio />
          </TabsContent>

          <TabsContent value="manage" className="mt-6">
            <AssetManagement />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Settings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
