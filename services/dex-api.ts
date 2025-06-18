import { callSmartFunction, checkExtensionAvailability } from "@/lib/jstz-signer.service";
import {
  Asset,
  UserBalance,
  Transaction,
  SwapResult,
  BuyResult,
  AssetMutatingResponse,
  WalletResponse,
  SellResult,
} from "@/types/dex";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface SmartFunctionCallOptions {
  gasLimit?: number;
  baseURL?: string;
}

export class DexAPI {
  private static async makeSmartFunctionCall<T>(
    method: string,
    path: string,
    body?: any,
    options?: SmartFunctionCallOptions,
  ): Promise<T> {
    const { gasLimit = 100000, baseURL } = options || {};

    const uri = `${baseURL ?? process.env.NEXT_PUBLIC_DEX_BASE_URL}${path ?? ""}`;
    return new Promise((resolve, reject) => {
      callSmartFunction({
        smartFunctionRequest: {
          _type: "RunFunction",
          body: body ? Array.from(encoder.encode(JSON.stringify(body))) : [],
          gasLimit,
          headers: {},
          method,
          uri,
        },
        onSignatureReceived: async (response, jstzClient) => {
          const { operation, signature } = response.data;

          try {
            const {
              result: { inner },
            } = await jstzClient.operations.injectAndPoll({
              inner: operation,
              signature,
            });

            let returnedMessage: any = "No message.";

            if (typeof inner === "object" && "body" in inner && inner.body) {
              try {
                returnedMessage = JSON.parse(decoder.decode(new Uint8Array(inner.body)));
              } catch {
                returnedMessage = decoder.decode(new Uint8Array(inner.body));
              }
            }

            if (typeof inner === "string") {
              returnedMessage = inner;
            }

            console.info(`Completed call to ${uri}. Response:`, returnedMessage);
            resolve(returnedMessage);
          } catch (err) {
            console.error("Error in smart function call:", err);
            reject(err);
          }
        },
      }).catch(reject);
    });
  }

  static async getAssets(): Promise<Asset[]> {
    try {
      const result = await this.makeSmartFunctionCall<Asset[]>("GET", "/assets");
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("Failed to fetch assets:", error);
      return [];
    }
  }

  static async getAsset(symbol: string): Promise<Asset> {
    return this.makeSmartFunctionCall<Asset>("GET", `/assets/${symbol}`);
  }

  static async mintAsset(data: {
    name: string;
    symbol: string;
    initialSupply: number;
    basePrice: number;
    slope: number;
  }): Promise<AssetMutatingResponse> {
    return this.makeSmartFunctionCall<AssetMutatingResponse>("POST", "/assets/mint", data);
  }

  static async listAsset(data: {
    symbol: string;
    address: string;
    basePrice: number;
    slope: number;
  }): Promise<AssetMutatingResponse> {
    return this.makeSmartFunctionCall<AssetMutatingResponse>("POST", "/assets/list", data);
  }

  static async unlistAsset(symbol: string, address: string): Promise<AssetMutatingResponse> {
    return this.makeSmartFunctionCall<AssetMutatingResponse>("POST", "/assets/unlist", {
      symbol,
      address,
    });
  }

  static async getWallet(address: string): Promise<WalletResponse> {
    try {
      const result = await this.makeSmartFunctionCall<WalletResponse>("GET", `/user/${address}`);
      return result || {};
    } catch (error) {
      console.error("Failed to fetch user balances:", error);
      return {
        assets: [],
        balances: {},
        transactions: [],
      };
    }
  }

  static async getUserBalances(address: string): Promise<UserBalance> {
    try {
      const result = await this.makeSmartFunctionCall<UserBalance>(
        "GET",
        `/user/${address}/balances`,
      );
      return result || {};
    } catch (error) {
      console.error("Failed to fetch user balances:", error);
      return {};
    }
  }

  static async getUserTransactions(address: string): Promise<Transaction[]> {
    try {
      const result = await this.makeSmartFunctionCall<Transaction[]>("GET", `/user/${address}/txs`);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      return [];
    }
  }

  static async buyTokens(data: {
    symbol: string;
    amount: number;
    address: string;
  }): Promise<BuyResult> {
    console.log(data);
    return this.makeSmartFunctionCall<BuyResult>("POST", "/buy", data);
  }

  static async sellTokens(data: {
    symbol: string;
    amount: number;
    address: string;
  }): Promise<SellResult> {
    return this.makeSmartFunctionCall<SellResult>("POST", "/sell", data);
  }

  static async swapTokens(data: {
    fromSymbol: string;
    toSymbol: string;
    amount: number;
    address: string;
  }): Promise<SwapResult> {
    return this.makeSmartFunctionCall<SwapResult>("POST", "/swap", data);
  }

  static calculateTokenPrice(asset: Asset, quantity = 1): number {
    let totalCost = 0;
    for (let i = 0; i < quantity; i++) {
      totalCost += asset.basePrice + (asset.supply + i) * asset.slope;
    }
    return totalCost;
  }

  static calculateSellReturn(asset: Asset, quantity = 1): number {
    let totalReturn = 0;
    for (let i = 0; i < quantity; i++) {
      totalReturn += asset.basePrice + (asset.supply - 1 - i) * asset.slope;
    }
    return totalReturn;
  }

  static async checkExtensionAvailability(): Promise<boolean> {
    try {
      const response = await checkExtensionAvailability();
      return response.data.success;
    } catch (error) {
      console.error("Extension not available:", error);
      return false;
    }
  }
}
