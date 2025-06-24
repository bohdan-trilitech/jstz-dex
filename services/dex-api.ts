import { callSmartFunction, checkExtensionAvailability } from "@/lib/jstz-signer.service";
import {
  Asset,
  UserBalance,
  Transaction,
  SwapResult,
  BuyResult,
  AssetMutatingResponse,
  WalletResponse,
  SellResult, OperatorsResponse,
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
          body: body ? Array.from(encoder.encode(JSON.stringify(body))) : null,
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
    basePrice: number;
    slope: number;
  }): Promise<AssetMutatingResponse> {
    return this.makeSmartFunctionCall<AssetMutatingResponse>("POST", "/assets/list", data);
  }

  static async unlistAsset(symbol: string): Promise<AssetMutatingResponse> {
    return this.makeSmartFunctionCall<AssetMutatingResponse>("POST", "/assets/unlist", {
      symbol,
    });
  }

  static async getOperators(): Promise<OperatorsResponse> {
    try {
      const result = await this.makeSmartFunctionCall<OperatorsResponse>("GET", "/users/operators");
      console.log(result);
      return result?.status === 200 ? result : {
        isOperator: false,
        address: "",
        assets: [],
        balances: {},
        transactions: [],
        operators: [],
        message: "Error fetching operators",
        status: 400,
      };
    } catch (error) {
      console.error("Failed to fetch operators:", error);
      return {
        isOperator: false,
        address: "",
        assets: [],
        balances: {},
        transactions: [],
        operators: [],
        message: "",
        status: 400,
      };
    }
  }

  static async addOperator(address: string): Promise<OperatorsResponse> {
    return this.makeSmartFunctionCall<OperatorsResponse>("POST", "/users/operators", {
      address,
    });
  }

  static async removeOperator(address: string): Promise<OperatorsResponse> {
    return this.makeSmartFunctionCall<OperatorsResponse>("DELETE", "/users/operators", {
      address,
    });
  }

  static async getMyWallet(): Promise<WalletResponse> {
    try {
      const result = await this.makeSmartFunctionCall<WalletResponse>("GET", `/users/me`);
      return result || {};
    } catch (error) {
      console.error("Failed to fetch user balances:", error);
      return {
        isOperator: false,
        address: "",
        assets: [],
        balances: {},
        transactions: [],
      };
    }
  }

  static async getMyBalances(): Promise<UserBalance> {
    try {
      const result = await this.makeSmartFunctionCall<UserBalance>("GET", `/users/me/balances`);
      return result || {};
    } catch (error) {
      console.error("Failed to fetch user balances:", error);
      return {};
    }
  }

  static async getMyTransactions(): Promise<Transaction[]> {
    try {
      const result = await this.makeSmartFunctionCall<Transaction[]>("GET", `/users/me/txs`);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      return [];
    }
  }

  static async getUserBalances(address: string): Promise<UserBalance> {
    try {
      const result = await this.makeSmartFunctionCall<UserBalance>(
        "GET",
        `/users/${address}/balances`,
      );
      return result || {};
    } catch (error) {
      console.error("Failed to fetch user balances:", error);
      return {};
    }
  }

  static async getUserTransactions(address: string): Promise<Transaction[]> {
    try {
      const result = await this.makeSmartFunctionCall<Transaction[]>(
        "GET",
        `/users/${address}/txs`,
      );
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      return [];
    }
  }

  static async buyTokens(data: { symbol: string; amount: number }): Promise<BuyResult> {
    console.log(data);
    return this.makeSmartFunctionCall<BuyResult>("POST", "/buy", data);
  }

  static async sellTokens(data: { symbol: string; amount: number }): Promise<SellResult> {
    return this.makeSmartFunctionCall<SellResult>("POST", "/sell", data);
  }

  static async swapTokens(data: {
    fromSymbol: string;
    toSymbol: string;
    amount: number;
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
