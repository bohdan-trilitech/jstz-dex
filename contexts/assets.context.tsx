"use client";
import { createContext, useContext, useState, type PropsWithChildren } from "react";

import { useToast } from "@/hooks/use-toast";
import { DexAPI } from "@/services/dex-api";
import type { Asset } from "@/types/dex";

interface AssetsContext {
  assets: Asset[];
  setAssets: (assets: Asset[]) => void;
  loadAssets: () => Promise<void>;
  isLoading: boolean
}

const AssetsContext = createContext<AssetsContext>({} as AssetsContext);

interface AssetsProps extends PropsWithChildren {}

export function AssetsContextProvider({ children }: AssetsProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const data = await DexAPI.getAssets();
      setAssets(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load assets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AssetsContext
      value={{
        assets,
        setAssets,
        loadAssets,
        isLoading
      }}
    >
      {children}
    </AssetsContext>
  );
}

export function useAssetsContext() {
  return useContext(AssetsContext);
}
