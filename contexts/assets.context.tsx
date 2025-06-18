"use client";
import { createContext, useContext, useState, type PropsWithChildren } from "react";

import { useToast } from "@/hooks/use-toast";
import { DexAPI } from "@/services/dex-api";
import type { Asset } from "@/types/dex";

interface AssetsContext {
  assets: Asset[];
  setAssets: (assets: Asset[]) => void;
  loadAssets: () => Promise<void>;
}

const AssetsContext = createContext<AssetsContext>({} as AssetsContext);

interface AssetsProps extends PropsWithChildren {}

export function AssetsContextProvider({ children }: AssetsProps) {
  const [assets, setAssets] = useState<Asset[]>([]);

  const { toast } = useToast();

  const loadAssets = async () => {
    try {
      const data = await DexAPI.getAssets();
      setAssets(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load assets",
        variant: "destructive",
      });
    }
  };

  return (
    <AssetsContext
      value={{
        assets,
        setAssets,
        loadAssets,
      }}
    >
      {children}
    </AssetsContext>
  );
}

export function useAssetsContext() {
  return useContext(AssetsContext);
}
