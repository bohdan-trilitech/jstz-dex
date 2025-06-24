export interface Asset {
  name: string;
  symbol: string;
  supply: number;
  basePrice: number;
  slope: number;
  listed: boolean;
  issuer: string;
}

export interface UserBalance {
  [symbol: string]: number;
}

export interface Transaction {
  type: "buy" | "sell" | "swap" | "list" | "unlist";
  symbol?: string;
  fromSymbol?: string;
  toSymbol?: string;
  amount?: number;
  received?: number;
  cost?: number;
  basePrice?: number;
  slope?: number;
  time: number;
}

export interface MessageResponse {
  message: string;
  status: number;
}

export interface AssetMutatingResponse extends MessageResponse {
  assets: Asset[];
}

export interface BalanceMutationResponse extends WalletResponse {}

export interface WalletResponse {
  isOperator: boolean;
  address: string;
  assets: Asset[];
  balances: UserBalance;
  transactions: Transaction[];
}

export interface SwapResult extends MessageResponse,BalanceMutationResponse {
  valueUsed: number;
}

export interface BuyResult extends MessageResponse,BalanceMutationResponse {
  cost: number;
}
export interface SellResult extends MessageResponse,BalanceMutationResponse {
  message: string;
}

export interface OperatorsResponse extends MessageResponse, WalletResponse {
  operators: string[];
}
