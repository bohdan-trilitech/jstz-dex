"use client";

import { createContext, useContext, useState, type PropsWithChildren } from "react";

import { useAssetsContext } from "@/contexts/assets.context";
import { requestAddress } from "@/lib/jstz-signer.service";
import { DexAPI } from "@/services/dex-api";
import {
  Asset,
  BalanceMutationResponse,
  MintResult,
  Transaction,
  UserBalance,
  WalletResponse,
} from "@/types/dex";

interface WalletContext {
  isAdmin: boolean;
  userAddress: string;
  userBalances: UserBalance;
  setUserBalances: (balances: UserBalance) => void;
  isConnected: boolean;
  checkExtensionStatus: () => Promise<void>;
  extensionStatus: "checking" | "available" | "unavailable";
  loading: boolean;
  connectWallet: () => Promise<WalletResponse>;
  disconnectWallet: () => void;
  loadUserBalances: () => Promise<WalletResponse>;
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  updateMeta: (response: MintResult) => Promise<void>;
}

const WalletContext = createContext<WalletContext>({} as WalletContext);

interface WalletProps extends PropsWithChildren {}

export function WalletContextProvider({ children }: WalletProps) {
  const { setAssets } = useAssetsContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [userBalances, setUserBalances] = useState<UserBalance>({});
  const [isConnected, setIsConnected] = useState(false);
  const [extensionStatus, setExtensionStatus] = useState<"checking" | "available" | "unavailable">(
    "checking",
  );
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const checkExtensionStatus = async (retries?: number, currentRetry?: number) => {
    try {
      const isAvailable = await DexAPI.checkExtensionAvailability();
      console.log(isAvailable);
      setExtensionStatus(isAvailable ? "available" : "unavailable");
    } catch (error) {
      const maxRetries = retries ?? 1;
      const retryCount = currentRetry ?? 0;
      if (retryCount < maxRetries) {
        void checkExtensionStatus(maxRetries, retryCount + 1);
        return;
      }
      setExtensionStatus("unavailable");
      console.error("Extension check failed:", error);
    }
  };

  const connectWallet = async () => {
    if (extensionStatus !== "available") {
      throw new Error("Extension is not available. Please install the jstz Signer extension.");
    }

    setLoading(true);
    try {
      const meta = await loadWalletMeta();

      if (meta.address) {
        setUserAddress(meta.address ?? "");
        setIsConnected(true);
      }
      return meta;
    } catch (error) {
      throw error;
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
      setIsAdmin(walletMeta.isOperator);

      return walletMeta;
    } catch (error) {
      console.error("Failed to load user balances:", error);
      throw error;
    }
  };

  function updateUserBalances(newBalances: UserBalance) {
    if (typeof newBalances === "object" && newBalances !== null) {
      setUserBalances(newBalances);
    }
  }

  function updateTransactions(newTransactions: Transaction[]) {
    if (Array.isArray(newTransactions)) {
      setTransactions(newTransactions);
    }
  }

  async function updateMeta(response: MintResult) {
    if (
      typeof response !== "object" ||
      !response.assets ||
      !response.balances ||
      !response.transactions
    )
      return;
    setAssets(response.assets);
    setUserBalances(response.balances);
    setTransactions(response.transactions);
  }

  return (
    <WalletContext
      value={{
        isAdmin,
        userAddress,
        userBalances,
        setUserBalances: updateUserBalances,
        isConnected,
        extensionStatus,
        loading,
        transactions,
        checkExtensionStatus,
        connectWallet,
        disconnectWallet,
        loadUserBalances: loadWalletMeta,
        setTransactions: updateTransactions,
        updateMeta,
      }}
    >
      {children}
    </WalletContext>
  );
}

export function useWalletContext() {
  return useContext(WalletContext);
}
