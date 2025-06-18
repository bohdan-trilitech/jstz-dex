"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, History } from "lucide-react"
import { DexAPI } from "@/services/dex-api"
import type { UserBalance, Transaction } from "@/types/dex"
import { useWalletContext } from "@/contexts/wallet.context";

interface PortfolioProps {
  userAddress: string
  userBalances: UserBalance
}

export function Portfolio({ userAddress, userBalances }: PortfolioProps) {
  const {loading, transactions} = useWalletContext()

  const formatTransactionType = (tx: Transaction) => {
    switch (tx.type) {
      case "buy":
        return `Bought ${tx.amount} ${tx.symbol}`
      case "sell":
        return `Sold ${tx.amount} ${tx.symbol}`
      case "swap":
        return `Swapped ${tx.amount} ${tx.fromSymbol} → ${tx.received} ${tx.toSymbol}`
      case "list":
        return `Listed ${tx.symbol}`
      case "unlist":
        return `Unlisted ${tx.symbol}`
      default:
        return "Unknown transaction"
    }
  }

  const getTransactionBadgeVariant = (type: string) => {
    switch (type) {
      case "buy":
        return "default"
      case "sell":
        return "default"
      case "swap":
        return "secondary"
      case "list":
        return "outline"
      case "unlist":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Portfolio Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(userBalances).length === 0 ? (
            <p className="text-muted-foreground">No tokens in portfolio</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(userBalances).map(([symbol, balance]) => (
                <div key={symbol} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{symbol}</p>
                    <p className="text-sm text-muted-foreground">Balance</p>
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
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{formatTransactionType(tx)}</p>
                    <p className="text-sm text-muted-foreground">{new Date(tx.time).toLocaleString()}</p>
                    {tx.cost && <p className="text-sm text-muted-foreground">Cost: {tx.cost.toFixed(4)}</p>}
                  </div>
                  <Badge variant={getTransactionBadgeVariant(tx.type)}>{tx.type.toUpperCase()}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
