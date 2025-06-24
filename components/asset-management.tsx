"use client";

import { zodResolver } from "@hookform/resolvers/zod";

import { Plus, List, X, Check, RefreshCw } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAssetsContext } from "@/contexts/assets.context";
import { useWalletContext } from "@/contexts/wallet.context";
import { useToast } from "@/hooks/use-toast";
import {
  mintAssetSchema,
  listAssetSchema,
  type MintAssetForm,
  type ListAssetForm,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { DexAPI } from "@/services/dex-api";

export function AssetManagement() {
  const { assets, setAssets, loadAssets, isLoading } = useAssetsContext();
  const { isAdmin, extensionStatus, userAddress } = useWalletContext();
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const extensionAvailable = extensionStatus === "available" || extensionStatus === "checking";

  const mintForm = useForm<MintAssetForm>({
    resolver: zodResolver(mintAssetSchema),
    defaultValues: {
      name: "",
      symbol: "",
      initialSupply: 0,
      basePrice: 0.0001,
      slope: 0.0001,
    },
  });

  const listForm = useForm<ListAssetForm>({
    resolver: zodResolver(listAssetSchema),
    defaultValues: {
      symbol: "",
      basePrice: 0.0001,
      slope: 0.0001,
    },
  });

  const onMintSubmit = async (data: MintAssetForm) => {
    if (!extensionAvailable) {
      showToast("Cannot mint assets while jstz signer extension is disconnected", 400);
      return;
    }

    try {
      const result = await DexAPI.mintAsset({
        name: data.name,
        symbol: data.symbol.toUpperCase(),
        initialSupply: data.initialSupply,
        basePrice: data.basePrice,
        slope: data.slope,
      });

      showToast(result.message, result.status);

      mintForm.reset();
      setAssets(result.assets);
    } catch (error) {
      showToast( error instanceof Error ? error.message : "Failed to mint asset", 500);
    }
  };

  const onListSubmit = async (data: ListAssetForm) => {
    if (!extensionAvailable) {
      showToast("Cannot list assets while jstz signer extension is disconnected", 400);
      return;
    }

    try {
      const result = await DexAPI.listAsset({
        symbol: data.symbol.toUpperCase(),
        basePrice: data.basePrice,
        slope: data.slope,
      });

      showToast(result.message, result.status);

      listForm.reset();
      setAssets(result.assets);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to list asset", 500);
    }
  };

  const handleUnlist = async (symbol: string) => {
    if (!extensionAvailable) {
      showToast("Cannot unlist assets while jstz signer extension is disconnected", 400);
      return;
    }

    setLoading(true);
    try {
      const result = await DexAPI.unlistAsset(symbol);

      showToast(result.message, result.status);

      setAssets(result.assets);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to unlist asset", 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Asset Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="mint" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mint">Mint New Asset</TabsTrigger>
                {isAdmin && <TabsTrigger value="list">List Existing Asset</TabsTrigger>}
              </TabsList>

              <TabsContent value="mint" className="space-y-4">
                <Form {...mintForm}>
                  <form onSubmit={mintForm.handleSubmit(onMintSubmit)} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={mintForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Asset Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., My Token" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={mintForm.control}
                        name="symbol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Symbol</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., MTK"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={mintForm.control}
                        name="initialSupply"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initial Supply</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={mintForm.control}
                        name="basePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Base Price</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.0001" placeholder="0.0001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={mintForm.control}
                        name="slope"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slope</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.0001" placeholder="0.0001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={mintForm.formState.isSubmitting || !extensionAvailable}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {mintForm.formState.isSubmitting
                        ? "Minting..."
                        : !extensionAvailable
                          ? "Extension Unavailable"
                          : "Mint Asset"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="list" className="space-y-4">
                <Form {...listForm}>
                  <form onSubmit={listForm.handleSubmit(onListSubmit)} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={listForm.control}
                        name="symbol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Asset Symbol</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., MTK"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={listForm.control}
                        name="basePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Base Price</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.0001" placeholder="0.0001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={listForm.control}
                        name="slope"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slope</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.0001" placeholder="0.0001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={listForm.formState.isSubmitting || !extensionAvailable}
                      className="w-full"
                    >
                      <List className="mr-2 h-4 w-4" />
                      {listForm.formState.isSubmitting
                        ? "Listing..."
                        : !extensionAvailable
                          ? "Extension Unavailable"
                          : "List Asset"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Assets{" "}
            <Button disabled={isLoading} variant="link" onClick={loadAssets}>
              <RefreshCw className={cn(isLoading && "animate-spin")} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <div key={asset.symbol} className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{asset.name}</h3>
                  <Badge variant={asset.listed ? "default" : "secondary"}>
                    {asset.listed ? "Listed" : "Unlisted"}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">Symbol: {asset.symbol}</p>
                <p className="text-muted-foreground text-sm">Supply: {asset.supply}</p>
                <p className="text-muted-foreground text-sm">
                  Current Price: {(asset.basePrice + asset.supply * asset.slope).toFixed(4)}
                </p>
                <p className="text-muted-foreground text-sm">Base Price: {asset.basePrice}</p>
                <p className="text-muted-foreground text-sm">Slope: {asset.slope}</p>
                {isAdmin && asset.issuer === userAddress  &&
                  (asset.listed ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleUnlist(asset.symbol)}
                      disabled={loading || !extensionAvailable}
                      className="w-full"
                    >
                      <X className="mr-2 h-4 w-4" />
                      {!extensionAvailable ? "Extension Unavailable" : "Unlist"}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onListSubmit(asset)}
                      disabled={loading || !extensionAvailable}
                      className="w-full"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {!extensionAvailable ? "Extension Unavailable" : "List"}
                    </Button>
                  ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
