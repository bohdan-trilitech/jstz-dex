"use client";

import { Wallet, BarChart3, Settings, AlertTriangle, WifiOff, Chrome } from "lucide-react";

import { AssetManagement } from "@/components/asset-management";
import { Portfolio } from "@/components/portfolio";
import { ThemeModeToggle } from "@/components/theme-toggle";
import { TradingInterface } from "@/components/trading-interface";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWalletContext } from "@/contexts/wallet.context";
import Logo from "@/components/logo";

export default function DexApp() {
  const {
    isConnected,
    extensionStatus,
    checkExtensionStatus,
    loading: connecting,
    connectWallet,
    disconnectWallet,
    userAddress,
    userBalances,
  } = useWalletContext();

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          {/* Extension Status Alert */}
          {extensionStatus !== "checking" && (
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
                    onClick={connectWallet}
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
            <div>
              <Logo />
              <p className="text-muted-foreground text-sm">Bonding Curve Exchange</p>
            </div>
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
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="trade" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trade" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Trade
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manage Assets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trade" className="mt-6">
            <div className="flex justify-center">
              <TradingInterface
                userAddress={userAddress}
                userBalances={userBalances}
                extensionAvailable={extensionStatus === "available"}
              />
            </div>
          </TabsContent>

          <TabsContent value="portfolio" className="mt-6">
            <Portfolio userAddress={userAddress} userBalances={userBalances} />
          </TabsContent>

          <TabsContent value="manage" className="mt-6">
            <AssetManagement
              userAddress={userAddress}
              extensionAvailable={extensionStatus === "available"}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
