"use client";

import { zodResolver } from "@hookform/resolvers/zod";

import { ArrowUpDown, TrendingDown, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAssetsContext } from "@/contexts/assets.context";
import { useWalletContext } from "@/contexts/wallet.context";
import { useToast } from "@/hooks/use-toast";
import {
  buyTokenSchema,
  sellTokenSchema,
  swapTokenSchema,
  type BuyTokenForm,
  type SellTokenForm,
  type SwapTokenForm,
} from "@/lib/schemas";
import { DexAPI } from "@/services/dex-api";
import type { Asset, BalanceMutationResponse, UserBalance } from "@/types/dex";
import { toTez, toTezString } from "@/utils/currency.utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function TradingInterface() {
  const { assets, setAssets } = useAssetsContext();
  const { updateMeta, userBalances, extensionStatus } = useWalletContext();

  const extensionAvailable = extensionStatus === "available" || extensionStatus === "checking";

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedSellAsset, setSelectedSellAsset] = useState<Asset | null>(null);
  const { showToast } = useToast();

  const buyForm = useForm<BuyTokenForm>({
    resolver: zodResolver(buyTokenSchema),
    defaultValues: {
      assetSymbol: "",
      amount: 1,
    },
  });

  const sellForm = useForm<SellTokenForm>({
    resolver: zodResolver(sellTokenSchema),
    defaultValues: {
      assetSymbol: "",
      amount: 1,
    },
  });

  const swapForm = useForm<SwapTokenForm>({
    resolver: zodResolver(swapTokenSchema),
    defaultValues: {
      fromSymbol: "",
      toSymbol: "",
      amount: 1,
    },
  });

  // Watch for asset selection changes
  const watchedAssetSymbol = buyForm.watch("assetSymbol");
  useEffect(() => {
    if (watchedAssetSymbol) {
      const asset = assets.find((a) => a.symbol === watchedAssetSymbol);
      setSelectedAsset(asset || null);
    }
  }, [watchedAssetSymbol, assets]);


  const onBuySubmit = async (data: BuyTokenForm) => {
    if (!extensionAvailable) {
      showToast("Cannot execute trades while the jstz signer extension is disconnected", 500);
      return;
    }

    try {
      const result = await DexAPI.buyTokens({
        symbol: data.assetSymbol,
        amount: data.amount,
        chargeAmount: toTez(calculateBuyPrice())
      });

      showToast(`${result.message}`, result.status);

      buyForm.reset();
      setSelectedAsset(null)

      void updateMeta(result);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to buy tokens", 500);
    }
  };

  const onSellSubmit = async (data: SellTokenForm) => {
    if (!extensionAvailable) {
      showToast("Cannot execute trades while the jstz signer extension is disconnected", 500);
      return;
    }

    try {
      const result = await DexAPI.sellTokens({
        symbol: data.assetSymbol,
        amount: data.amount,
      });

      showToast(result.message, result.status);

      sellForm.reset();
      setSelectedAsset(null)

      void updateMeta(result);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to sell tokens", 500);
    }
  };

  const onSwapSubmit = async (data: SwapTokenForm) => {
    if (!extensionAvailable) {
      showToast("Cannot execute trades while the jstz signer extension is disconnected", 500);
      return;
    }

    try {
      const result = await DexAPI.swapTokens({
        fromSymbol: data.fromSymbol,
        toSymbol: data.toSymbol,
        amount: data.amount,
      });

      showToast(result.message, result.status);

      swapForm.reset();
      void updateMeta(result);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to swap tokens", 500);
    }
  };

  const calculateBuyPrice = () => {
    if (!selectedAsset || !buyForm.watch("amount")) return 0;
    console.log("Calculating buy price for asset:", selectedAsset, "amount:", buyForm.watch("amount"));
    return DexAPI.calculateTokenPrice(selectedAsset, buyForm.watch("amount"));
  };

  const calculateSellReturn = () => {
    if (!selectedSellAsset || !sellForm.watch("amount")) return 0;
    return DexAPI.calculateSellReturn(selectedSellAsset, sellForm.watch("amount"));
  };

  // Get max swap amount for validation
  const maxSwapAmount = swapForm.watch("fromSymbol")
    ? userBalances[swapForm.watch("fromSymbol")] || 0
    : 0;
  const maxSellAmount = sellForm.watch("assetSymbol")
    ? userBalances[sellForm.watch("assetSymbol")] || 0
    : 0;

  // Get user's owned tokens for selling
  const ownedTokens = Object.entries(userBalances ?? {}).filter(([_, balance]) => balance > 0);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Trading Interface
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="buy">Buy Tokens</TabsTrigger>
            <TabsTrigger value="sell">Sell Tokens</TabsTrigger>
            <TabsTrigger value="swap">Swap Tokens</TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4">
            <Form {...buyForm}>
              <form onSubmit={buyForm.handleSubmit(onBuySubmit)} className="space-y-4">
                <FormField
                  control={buyForm.control}
                  name="assetSymbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Asset</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose an asset to buy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assets?.map((asset) => (
                            <SelectItem key={asset.symbol} disabled={!asset.listed} value={asset.symbol}>
                              <div className="flex w-full items-center justify-between">
                                <span>
                                  {asset.name} ({asset.symbol})
                                </span>
                                <Badge variant="secondary">
                                  {toTezString(asset.basePrice + asset.supply * asset.slope)}
                                </Badge>
                                {!asset.listed &&
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="destructive">
                                        Unlisted
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      This asset is not currently listed for trading
                                    </TooltipContent>
                                  </Tooltip>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedAsset && (
                  <div className="bg-muted space-y-2 rounded-lg p-4">
                    <div className="flex justify-between">
                      <span>Current Price:</span>
                      <span className="font-mono">
                        {toTezString(
                          selectedAsset.basePrice +
                          selectedAsset.supply * selectedAsset.slope
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Supply:</span>
                      <span className="font-mono">{selectedAsset.supply}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Base Price:</span>
                      <span className="font-mono">{toTezString(selectedAsset.basePrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Slope:</span>
                      <span className="font-mono">{toTezString(selectedAsset.slope)}</span>
                    </div>
                  </div>
                )}

                <FormField
                  control={buyForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Enter amount to buy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {buyForm.watch("amount") && selectedAsset && (
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex justify-between font-semibold">
                      <span>Total Cost:</span>
                      <span className="font-mono">{toTezString(calculateBuyPrice())}</span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={buyForm.formState.isSubmitting || !extensionAvailable}
                  className="w-full"
                >
                  {buyForm.formState.isSubmitting
                    ? "Buying..."
                    : !extensionAvailable
                      ? "Extension Unavailable"
                      : "Buy Tokens"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            <Form {...sellForm}>
              <form onSubmit={sellForm.handleSubmit(onSellSubmit)} className="space-y-4">
                <FormField
                  control={sellForm.control}
                  name="assetSymbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Asset to Sell</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose an asset to sell" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ownedTokens.map(([symbol, balance]) => {
                            const asset = assets.find((a) => a.symbol === symbol);
                            return (
                              <SelectItem key={symbol} value={symbol}>
                                <div className="flex w-full items-center justify-between">
                                  <span>{symbol}</span>
                                  <Badge variant="outline">Balance: {balance}</Badge>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {ownedTokens.length === 0 && (
                        <p className="text-muted-foreground text-sm">
                          You don't own any tokens to sell
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {selectedSellAsset && (
                  <div className="bg-muted space-y-2 rounded-lg p-4">
                    <div className="flex justify-between">
                      <span>Current Sell Price:</span>
                      <span className="font-mono">
                        {toTezString(
                          selectedSellAsset.basePrice +
                          (selectedSellAsset.supply - 1) * selectedSellAsset.slope
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Supply:</span>
                      <span className="font-mono">{selectedSellAsset.supply}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Your Balance:</span>
                      <span className="font-mono">
                        {userBalances[selectedSellAsset.symbol] || 0}
                      </span>
                    </div>
                  </div>
                )}

                <FormField
                  control={sellForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter amount to sell"
                          max={maxSellAmount}
                          {...field}
                        />
                      </FormControl>
                      {sellForm.watch("assetSymbol") && (
                        <p className="text-muted-foreground text-sm">
                          Available: {maxSellAmount} {sellForm.watch("assetSymbol")}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {sellForm.watch("amount") && selectedSellAsset && (
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex justify-between font-semibold">
                      <span>Estimated Return:</span>
                      <span className="font-mono">{calculateSellReturn().toFixed(4)}</span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={
                    sellForm.formState.isSubmitting ||
                    !extensionAvailable ||
                    ownedTokens.length === 0
                  }
                  className="w-full"
                  variant="destructive"
                >
                  <TrendingDown className="mr-2 h-4 w-4" />
                  {sellForm.formState.isSubmitting
                    ? "Selling..."
                    : !extensionAvailable
                      ? "Extension Unavailable"
                      : ownedTokens.length === 0
                        ? "No Tokens to Sell"
                        : "Sell Tokens"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="swap" className="space-y-4">
            <Form {...swapForm}>
              <form onSubmit={swapForm.handleSubmit(onSwapSubmit)} className="space-y-4">
                <FormField
                  control={swapForm.control}
                  name="fromSymbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select token to swap from" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(userBalances).map(([symbol, balance]) => (
                            <SelectItem key={symbol} value={symbol}>
                              <div className="flex w-full items-center justify-between">
                                <span>{symbol}</span>
                                <Badge variant="outline">Balance: {balance}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-center">
                  <ArrowUpDown className="text-muted-foreground h-4 w-4" />
                </div>

                <FormField
                  control={swapForm.control}
                  name="toSymbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select token to receive" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assets.map((asset) => (
                            <SelectItem key={asset.symbol} value={asset.symbol}>
                              {asset.name} ({asset.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={swapForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter amount to swap"
                          {...field}
                        />
                      </FormControl>
                      {swapForm.watch("fromSymbol") && (
                        <p className="text-muted-foreground text-sm">
                          Available: {maxSwapAmount} {swapForm.watch("fromSymbol")}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={swapForm.formState.isSubmitting || !extensionAvailable}
                  className="w-full"
                >
                  {swapForm.formState.isSubmitting
                    ? "Swapping..."
                    : !extensionAvailable
                      ? "Extension Unavailable"
                      : "Swap Tokens"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
