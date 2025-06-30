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

  const { showToast } = useToast();

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const data = await DexAPI.getAssets();
      console.log(data);
      setAssets(data?.assets);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to list assets", 500);
    } finally {
      setIsLoading(false);
    }
  };

  function updateAssets(newAssets: Asset[]) {
    if (Array.isArray(newAssets)) {
      setAssets(newAssets);
    }
  }

  return (
    <AssetsContext
      value={{
        assets,
        setAssets: updateAssets,
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
