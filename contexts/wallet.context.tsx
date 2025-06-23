"use client";

import { createContext, useContext, useState, type PropsWithChildren } from "react";

import { useAssetsContext } from "@/contexts/assets.context";
import { requestAddress } from "@/lib/jstz-signer.service";
import { DexAPI } from "@/services/dex-api";
import type { Asset, Transaction, UserBalance, WalletResponse } from "@/types/dex";

interface WalletContext {
  userAddress: string;
  userBalances: UserBalance;
  setUserBalances: (balances: UserBalance) => void;
  isConnected: boolean;
  checkExtensionStatus: () => Promise<void>;
  extensionStatus: "checking" | "available" | "unavailable";
  loading: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  loadUserBalances: () => Promise<WalletResponse>;
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
}

const WalletContext = createContext<WalletContext>({} as WalletContext);

interface WalletProps extends PropsWithChildren {}

export function WalletContextProvider({ children }: WalletProps) {
  const { setAssets } = useAssetsContext();
  const [userAddress, setUserAddress] = useState("");
  const [userBalances, setUserBalances] = useState<UserBalance>({});
  const [isConnected, setIsConnected] = useState(false);
  const [extensionStatus, setExtensionStatus] = useState<"checking" | "available" | "unavailable">(
    "available",
  );
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const checkExtensionStatus = async () => {
    setExtensionStatus("checking");
    try {
      const isAvailable = await DexAPI.checkExtensionAvailability();
      console.log(isAvailable);
      setExtensionStatus(isAvailable ? "available" : "unavailable");
    } catch (error) {
      setExtensionStatus("unavailable");
      console.error("Extension check failed:", error);
    }
  };

  const connectWallet = async () => {
    if (extensionStatus !== "available") {
      return;
    }

    setLoading(true);
    try {
      const { address } = await loadWalletMeta();
      setUserAddress(address);
      setIsConnected(true);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setUserAddress("");
    setUserBalances({});
  };

  const loadWalletMeta = async () => {
    try {
      const walletMeta = await DexAPI.getMyWallet();
      setUserBalances(walletMeta.balances);
      setTransactions(walletMeta.transactions);
      setAssets(walletMeta.assets);

      return walletMeta;
    } catch (error) {
      console.error("Failed to load user balances:", error);
      throw error;
    }
  };

  return (
    <WalletContext
      value={{
        userAddress,
        userBalances,
        setUserBalances,
        isConnected,
        extensionStatus,
        loading,
        transactions,
        checkExtensionStatus,
        connectWallet,
        disconnectWallet,
        loadUserBalances: loadWalletMeta,
        setTransactions,
      }}
    >
      {children}
    </WalletContext>
  );
}

export function useWalletContext() {
  return useContext(WalletContext);
}
