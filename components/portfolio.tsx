"use client";

import { Wallet, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWalletContext } from "@/contexts/wallet.context";
import type { Transaction } from "@/types/dex";

import {Jstz} from "@jstz-dev/jstz-client"
import { useEffect, useState } from "react";
import { toTezString } from "@/utils/currency.utils";

export function Portfolio() {
  const { loading, transactions, userBalances, userAddress } = useWalletContext();

  const [tezBalance, setTezBalance] = useState<number | null>(null)

  useEffect(() => {
    void getTezBalance()
  }, []);

  const getTezBalance = async () => {
    const jstzClient = new Jstz({
      baseURL: process.env.NEXT_PUBLIC_JSTZ_NODE_ENDPOINT
    });
    if (!jstzClient) {
      throw new Error("JSTZ client is not initialized");
    }

    try {
      const balance = await jstzClient.accounts.getBalance(userAddress);
      setTezBalance(balance);
    } catch (error) {
      console.error("Failed to fetch Tezos balance:", error);
      return 0;
    }
  }

  const formatTransactionType = (tx: Transaction) => {
    switch (tx.type) {
      case "mint":
        return `Minted ${tx.amount} ${tx.symbol}`;
      case "buy":
        return `Bought ${tx.amount} ${tx.symbol}`;
      case "sell":
        return `Sold ${tx.amount} ${tx.symbol}`;
      case "swap":
        return `Swapped ${tx.amount} ${tx.fromSymbol} → ${tx.received} ${tx.toSymbol}`;
      case "list":
        return `Listed ${tx.symbol}`;
      case "unlist":
        return `Unlisted ${tx.symbol}`;
      default:
        return "Unknown transaction";
    }
  };

  const getTransactionBadgeVariant = (type: string) => {
    switch (type) {
      case "mint":
        return "default";
      case "buy":
        return "default";
      case "sell":
        return "default";
      case "swap":
        return "secondary";
      case "list":
        return "outline";
      case "unlist":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Portfolio Balance
            </div>
            <p className="text-sm text-muted-foreground">
              {userAddress ? `Address: ${userAddress}` : "Connect your wallet to see your portfolio"}
            </p>
            <p className="text-sm text-muted-foreground">
              {tezBalance ? `Balance: ${toTezString(tezBalance)}` : "Tez balance is unavailable"}
            </p>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(userBalances).length === 0 ? (
            <p className="text-muted-foreground">No tokens in portfolio</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(userBalances).map(([symbol, balance]) => (
                <div
                  key={symbol}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-semibold">{symbol}</p>
                    <p className="text-muted-foreground text-sm">Balance</p>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    {balance}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-muted-foreground">No transactions yet</p>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{formatTransactionType(tx)}</p>
                    <p className="text-muted-foreground text-sm">
                      {new Date(tx.time).toLocaleString()}
                    </p>
                    {tx.cost && (
                      <p className="text-muted-foreground text-sm">Cost: {toTezString(tx.cost)}</p>
                    )}
                  </div>
                  <Badge variant={getTransactionBadgeVariant(tx.type)}>
                    {tx.type.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
