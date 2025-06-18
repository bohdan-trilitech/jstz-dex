import { z } from "zod"

// Asset schemas
export const mintAssetSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol must be 10 characters or less"),
  initialSupply: z.coerce.number().min(0, "Initial supply must be 0 or greater"),
  basePrice: z.coerce.number().min(0, "Base price must be greater than 0"),
  slope: z.coerce.number().min(0.0001, "Slope must be at least 0.0001"),
})

export const listAssetSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  basePrice: z.coerce.number().min(0, "Base price must be greater than 0"),
  slope: z.coerce.number().min(0.0001, "Slope must be at least 0.0001"),
})

// Trading schemas
export const buyTokenSchema = z.object({
  assetSymbol: z.string().min(1, "Please select an asset"),
  amount: z.coerce.number().min(1, "Amount must be at least 1"),
})

export const sellTokenSchema = z.object({
  assetSymbol: z.string().min(1, "Please select an asset to sell"),
  amount: z.coerce.number().min(1, "Amount must be at least 1"),
})

export const swapTokenSchema = z
  .object({
    fromSymbol: z.string().min(1, "Please select a token to swap from"),
    toSymbol: z.string().min(1, "Please select a token to swap to"),
    amount: z.coerce.number().min(1, "Amount must be at least 1"),
  })
  .refine((data) => data.fromSymbol !== data.toSymbol, {
    message: "Cannot swap the same token",
    path: ["toSymbol"],
  })

// Wallet connection schema
export const walletConnectionSchema = z.object({
  address: z
    .string()
    .min(1, "Address is required")
    .regex(/^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/, "Invalid Tezos address format"),
})

// Type exports
export type MintAssetForm = z.infer<typeof mintAssetSchema>
export type ListAssetForm = z.infer<typeof listAssetSchema>
export type BuyTokenForm = z.infer<typeof buyTokenSchema>
export type SellTokenForm = z.infer<typeof sellTokenSchema>
export type SwapTokenForm = z.infer<typeof swapTokenSchema>
export type WalletConnectionForm = z.infer<typeof walletConnectionSchema>
