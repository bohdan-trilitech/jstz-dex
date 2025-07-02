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
  OperatorsResponse, BalanceMutationResponse, MintResult,
} from "@/types/dex";
import { toMutez, toTez } from "@/utils/currency.utils";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const TRANSFER_HEADER = "X-JSTZ-TRANSFER";
const REFUND_HEADER = "X-JSTZ-AMOUNT";

interface SmartFunctionCallOptions {
  gasLimit?: number;
  baseURL?: string;
  headers?: Record<string, string>;
}

function getRemoteConfigUrl() {
  const persistedUrl = JSON.parse(localStorage.getItem("remote-config") ?? "{}");
  return persistedUrl?.JSTZ_DEX_ADDRESS ?? "";
}

export class DexAPI {
  private static async makeSmartFunctionCall<T>(
    method: string,
    path: string,
    body?: any,
    options?: SmartFunctionCallOptions,
  ): Promise<T> {
    const { gasLimit = 100000, baseURL, headers = {} } = options || {};

    let jstzDexUrl = getRemoteConfigUrl();

    if (process.env.NODE_ENV === "development") {
      jstzDexUrl = process.env.NEXT_PUBLIC_DEX_BASE_URL;
    }

    console.log(jstzDexUrl);

    const uri = `${baseURL ?? jstzDexUrl}${path ?? ""}`;
    return new Promise((resolve, reject) => {
      callSmartFunction({
        smartFunctionRequest: {
          _type: "RunFunction",
          body: body ? Array.from(encoder.encode(JSON.stringify(body))) : null,
          gasLimit,
          headers,
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

  static async getAssets(): Promise<AssetMutatingResponse> {
    try {
      const result = await this.makeSmartFunctionCall<AssetMutatingResponse>("GET", "/assets");
      return Array.isArray(result?.assets)
        ? result
        : {
            status: 400,
            message: "Error fetching assets",
            assets: [],
          };
    } catch (error) {
      console.error("Failed to fetch assets:", error);
      return {
        status: 400,
        message: "Error fetching assets",
        assets: [],
      };
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
  }): Promise<MintResult> {
    const transferAmount = this.calculateTokenPrice(
      {
        supply: data.initialSupply,
        basePrice: data.basePrice,
        slope: data.slope,
      },
      data.initialSupply,
    );

    console.log("Minting asset with transfer amount:", transferAmount);
    const headers: Record<string, string> = {};
    if (transferAmount > 0) {
      headers[TRANSFER_HEADER] = transferAmount.toFixed(0);
    }
    return this.makeSmartFunctionCall<MintResult>("POST", "/assets/mint", data, {
      headers,
    });
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
      return result?.status === 200
        ? result
        : {
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
      const result = await this.makeSmartFunctionCall<WalletResponse & { message?: string }>(
        "GET",
        `/users/me`,
      );
      if (!result.address) {
        if (result.message) {
          throw new Error(result.message);
        }
        throw new Error("DEX API is not available");
      }
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

  static async buyTokens(data: {
    symbol: string;
    amount: number;
    chargeAmount: number;
  }): Promise<BuyResult> {
    console.log("Buying tokens:", data);
    console.log(toMutez(data.chargeAmount).toFixed(0));
    return this.makeSmartFunctionCall<BuyResult>("POST", "/buy", data, {
      headers: {
        [TRANSFER_HEADER]: toMutez(data.chargeAmount).toFixed(0),
      },
    });
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

  static calculateTokenPrice(
    asset: Pick<Asset, "basePrice" | "slope" | "supply">,
    amount = 1,
  ): number {
    const { basePrice, slope, supply } = asset;

    let totalCost = 0;
    totalCost = amount * (basePrice + supply * slope + (slope * (amount - 1)) / 2);
    return +totalCost.toFixed(0);
  }

  static calculateSellReturn(
    asset: Pick<Asset, "basePrice" | "slope" | "supply">,
    amount = 1,
  ): number {
    const { basePrice, slope, supply } = asset;

    let totalCost = 0;
    totalCost = amount * (basePrice + (supply - 1) * slope - (slope * (amount - 1)) / 2);
    return +totalCost.toFixed(0);
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
