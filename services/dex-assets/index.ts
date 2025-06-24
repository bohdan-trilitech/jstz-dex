import { AutoRouter, json } from "itty-router";
import { z } from "zod";

const ONE_TOKEN = 1;
const SUPER_OPERATOR_ADDRESS = "tz1ZXxxkNYSUutm5VZvfudakRxx2mjpWko4J";

// Schemas
const assetSchema = z.object({
  name: z.string().min(2),
  issuer: z.string(),
  symbol: z.string().min(1),
  basePrice: z.number().min(0),
  slope: z.number().min(0.0001),
  supply: z.number(),
  listed: z.boolean(),
});

const createAssetSchema = assetSchema
  .extend({
    initialSupply: z.number().min(0),
  })
  .omit({ supply: true, listed: true, issuer: true });

const transactionSchema = z.object({
  type: z.enum(["buy", "sell", "swap", "list", "unlist"]),
  symbol: z.string().optional(),
  fromSymbol: z.string().optional(),
  toSymbol: z.string().optional(),
  amount: z.number().min(1).optional(),
  received: z.number().min(0).optional(),
  cost: z.number().optional(),
  basePrice: z.number().min(0).optional(),
  slope: z.number().min(0.0001).optional(),
  time: z.number().default(Date.now()),
});

const buySchema = z.object({
  symbol: z.string(),
  amount: z.number().min(1),
});

const swapSchema = z.object({
  fromSymbol: z.string(),
  toSymbol: z.string(),
  amount: z.number().min(1),
});

const sellSchema = z.object({
  symbol: z.string(),
  amount: z.number().min(1),
});

const listAssetSchema = assetSchema.pick({
  symbol: true,
  basePrice: true,
  slope: true,
});

const messageResponseSchema = z.object({
  message: z.string(),
});

const assetMutatingResponseSchema = z.object({
  assets: z.array(assetSchema),
});

const balanceMutationResponseSchema = z.object({
  balances: z.record(z.string(), z.number()),
});

const walletMetadataSchema = balanceMutationResponseSchema.extend({
  isOperator: z.boolean().optional(),
  address: z.string().optional(),
  assets: z.array(assetSchema),
  transactions: z.array(transactionSchema),
});

const swapResponseSchema = messageResponseSchema.extend({
  valueUsed: z.number(),
});

const buyResponseSchema = messageResponseSchema.extend({
  cost: z.number(),
});

const router = AutoRouter();

// Helpers
function getCaller(req: Request) {
  return req.headers.get("referer") as string;
}

async function getOperators() {
  const operatorAddresses = await Kv.get<string>("operators");
  if (!operatorAddresses) return [];
  return JSON.parse(operatorAddresses) as string[];
}

async function isOperator(address: string) {
  const operators = await getOperators();

  return address === SUPER_OPERATOR_ADDRESS || operators.includes(address);
}

async function updateUserBalance(address: string, symbol: string, delta: number) {
  const balanceKey = `balances/${address}/${symbol}`;
  const indexKey = `balances/${address}`;
  const current = await Kv.get(balanceKey);
  const newBalance = (current ? parseInt(current as string) : 0) + delta;
  await Kv.set(balanceKey, newBalance.toString());

  // update balance index
  const existingKeysRaw = await Kv.get(indexKey);
  const keys: string[] = existingKeysRaw ? JSON.parse(existingKeysRaw as string) : [];
  if (!keys.includes(symbol)) {
    keys.push(symbol);
    await Kv.set(indexKey, JSON.stringify(keys));
  }
}

async function logTransaction(address: string, entry: any) {
  const key = `txs/${address}`;
  const existing = await Kv.get(key);
  const txs = existing ? JSON.parse(existing as string) : [];
  txs.push({ ...entry, time: Date.now() });
  await Kv.set(key, JSON.stringify(txs));
}

async function getWalletBalances(address: string) {
  const indexKey = `balances/${address}`;
  const keysRaw = await Kv.get(indexKey);
  const keys: string[] = keysRaw ? JSON.parse(keysRaw as string) : [];
  const balances: Record<string, number> = {};
  for (const symbol of keys) {
    const value = await Kv.get<string>(`balances/${address}/${symbol}`);
    if (value) {
      balances[symbol] = parseInt(value);
    }
  }
  return balances;
}

async function getAssets() {
  const keysRaw = await Kv.get<string>("assets");
  const keys: string[] = keysRaw ? JSON.parse(keysRaw as string) : [];
  const assets = [];

  for (const key of keys) {
    const data = await Kv.get<string>(key);
    if (data) assets.push(JSON.parse(data));
  }
  return assets;
}

async function getWalletTransactions(address: string) {
  const data = await Kv.get(`txs/${address}`);
  return data ? JSON.parse(data) : [];
}

async function addAssetsMetadata(response?: Record<string, unknown>) {
  const assets = await getAssets();

  const assetsResponse = assetMutatingResponseSchema.parse({ assets });

  return { ...response, ...assetsResponse };
}

async function addWalletMetadata(address: string, response?: Record<string, unknown>) {
  const assetsResponse = await addAssetsMetadata(response);

  const balances = await getWalletBalances(address);
  const transactions = await getWalletTransactions(address);

  console.log('Wallet Address:', address);

  const walletMetaResponse = walletMetadataSchema.parse({
    isOperator: await isOperator(address),
    address,
    balances,
    transactions,
    ...assetsResponse,
  });

  console.log("Assets Response:", assetsResponse);

  return { ...response, ...walletMetaResponse };
}

function successResponse(message: any, status = 200) {
  return json({ ...message, status }, { status });
}

function errorResponse(message: any, status = 400) {
  return successResponse({ message }, status);
}

// Routes
router.get("/assets", async () => {
  return successResponse(await addAssetsMetadata());
});

router.post("/assets/mint", async (request) => {
  const address = getCaller(request);

  if (!(await isOperator(address))) {
    return errorResponse("Unauthorized: Only operators can mint assets.");
  }

  const body = await request.json();
  const parsed = createAssetSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message);

  const { name, symbol, initialSupply, basePrice, slope } = parsed.data;
  const key = `assets/${symbol}`;
  const exists = await Kv.get(key);
  if (exists) return errorResponse("Asset already exists.");

  const asset = {
    name,
    symbol,
    supply: initialSupply,
    basePrice,
    slope,
    listed: true,
    issuer: address,
  };
  await Kv.set(key, JSON.stringify(asset));

  const indexKey = "assets";
  const current = await Kv.get(indexKey);
  const assetKeys = current ? JSON.parse(current as string) : [];
  assetKeys.push(key);
  await Kv.set(indexKey, JSON.stringify(assetKeys));

  return successResponse(
    await addAssetsMetadata({
      message: `Asset '${symbol}' minted and listed.`,
    }),
  );
});

router.get("/assets/:symbol", async (request) => {
  const { symbol } = request.params;
  const data = await Kv.get<string>(`assets/${symbol}`);
  if (!data) return errorResponse("Asset not found.");
  return successResponse(JSON.parse(data));
});

router.post("/assets/list", async (request) => {
  const address = getCaller(request);

  if (!(await isOperator(address))) {
    return errorResponse("Unauthorized: Only operators can list assets.");
  }

  const body = await request.json();
  const parsed = listAssetSchema.safeParse(body);
  if (!parsed.success) return parsed.error.message;

  const { symbol, basePrice, slope } = parsed.data;
  const key = `assets/${symbol}`;
  const data = await Kv.get<string>(key);
  if (!data) return errorResponse("Asset not found.");

  const asset = JSON.parse(data);
  asset.listed = true;
  asset.basePrice = basePrice;
  asset.slope = slope;

  if (asset.issuer !== address) {
    return errorResponse("Unauthorized: Only the asset issuer can list it.");
  }

  await Kv.set(key, JSON.stringify(asset));
  await logTransaction(address, { type: "list", symbol, basePrice, slope });

  return successResponse(
    await addAssetsMetadata({ message: `Asset '${symbol}' listed by ${address}.` }),
  );
});

router.post("/assets/unlist", async (request) => {
  const address = getCaller(request);

  if (!(await isOperator(address))) {
    return errorResponse("Unauthorized: Only operators can unlist assets.");
  }

  const body = await request.json();
  const { symbol } = body;
  if (!symbol || !address) return errorResponse("Missing symbol or address.");

  const key = `assets/${symbol}`;
  const data = await Kv.get<string>(key);
  if (!data) return errorResponse("Asset not found.");

  const asset = JSON.parse(data);
  asset.listed = false;

  if (asset.issuer !== address) {
    return errorResponse("Unauthorized: Only the asset issuer can unlist it.");
  }

  await Kv.set(key, JSON.stringify(asset));
  await logTransaction(address, { type: "unlist", symbol });

  return successResponse(
    await addAssetsMetadata({
      message: `Asset '${symbol}' unlisted by ${address}.`,
    }),
  );
});

router.get("/users/operators", async (request) => {
  const callerAddress = getCaller(request);
  if (!(await isOperator(callerAddress))) {
    return errorResponse("Unauthorized: Only operators can manage operator list.");
  }
  const operators = await getOperators();
  return successResponse(
    await addWalletMetadata(callerAddress, {
      operators,
      message: "Fetched operator list successfully.",
    }),
  );
});

router.post("/users/operators", async (request) => {
  const callerAddress = getCaller(request);
  if (!(await isOperator(callerAddress))) {
    return errorResponse("Unauthorized: Only operators can manage operator list.");
  }

  const body = await request.json();
  const { address } = body;

  const operators = await getOperators();

  if (operators.includes(address)) {
    return successResponse(
      await addWalletMetadata(address, {
        message: "Address is already an operator.",
      }),
    );
  }

  operators.push(address);

  await Kv.set("operators", JSON.stringify(operators));

  return successResponse(
    await addWalletMetadata(address, {
      operators,
      message: "Address has been added as an operator.",
    }),
  );
});

router.delete("/users/operators", async (request) => {
  const callerAddress = getCaller(request);
  if (!(await isOperator(callerAddress))) {
    return errorResponse("Unauthorized: Only operators can manage operator list.");
  }

  const body = await request.json();
  const { address } = body;

  const operators = await getOperators();

  if (!operators.includes(address)) {
  }

  const index = operators.indexOf(address);

  if (index > -1) {
    operators.splice(index, 1);
  } else {
    return successResponse(
      await addWalletMetadata(address, {
        message: "Address is not an operator.",
      }),
    );
  }

  await Kv.set("operators", JSON.stringify(operators));

  return successResponse(
    await addWalletMetadata(address, {
      operators,
      message: "Address has been removed from operators.",
    }),
  );
});

router.get("/users/me", async (request) => {
  const address = getCaller(request);

  return successResponse(await addWalletMetadata(address));
});

router.get("/users/me/balances", async (request) => {
  const address = getCaller(request);

  const balances = await getWalletBalances(address);

  const response = balanceMutationResponseSchema.parse(balances);

  return successResponse(response);
});

router.get("/users/me/txs", async (request) => {
  const address = getCaller(request);

  const data = await getWalletTransactions(address);
  return successResponse(data);
});

router.get("/users/:address", async (request) => {
  const { address } = request.params;

  return successResponse(await addWalletMetadata(address));
});

router.get("/users/:address/balances", async (request) => {
  const { address } = request.params;
  const balances = await getWalletBalances(address);

  const response = balanceMutationResponseSchema.parse(balances);

  return successResponse(response);
});

router.get("/users/:address/txs", async (request) => {
  const { address } = request.params;
  const data = await getWalletTransactions(address);
  return successResponse(data);
});

router.post("/buy", async (request) => {
  try {
    const body = await request.json();
    const parsed = buySchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.message);

    const address = getCaller(request);

    const { symbol, amount } = parsed.data;
    const key = `assets/${symbol}`;
    const data = await Kv.get(key);
    if (!data) return errorResponse("Asset not found.");

    const asset = JSON.parse(data);
    if (!asset.listed) return errorResponse("Asset is not listed for purchase.");

    let totalCost = 0;
    for (let i = 0; i < amount; i++) {
      totalCost += asset.basePrice + asset.supply * asset.slope;
      asset.supply += ONE_TOKEN;
    }

    const tezBalance = await Ledger.balance(address);

    if (tezBalance < totalCost) {
      return errorResponse("Insufficient tez balance to complete purchase.");
    }

    await Ledger.transfer(asset.issuer, totalCost);

    if (totalCost <= 0) {
      return errorResponse("Buy amount too low to register value.");
    }

    await Kv.set(key, JSON.stringify(asset));
    await updateUserBalance(address, symbol, amount);
    await logTransaction(address, {
      type: "buy",
      symbol,
      amount,
      cost: totalCost,
    });

    const response = buyResponseSchema.parse({
      message: `Successfully bought ${amount} ${symbol}.`,
      cost: totalCost,
    });

    return successResponse(await addWalletMetadata(address, response));
  } catch (err) {
    if (err instanceof Error) {
      return errorResponse(`Error: ${err.message}`);
    }
    return errorResponse(`Error: ${err}`);
  }
});

router.post("/swap", async (request) => {
  try {
    const body = await request.json();
    const parsed = swapSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.message);

    const address = getCaller(request);

    const { fromSymbol, toSymbol, amount } = parsed.data;
    const fromKey = `assets/${fromSymbol}`;
    const toKey = `assets/${toSymbol}`;
    const fromData = await Kv.get(fromKey);
    const toData = await Kv.get(toKey);
    if (!fromData || !toData) errorResponse("One or both assets not found.");

    const fromAsset = JSON.parse(fromData ?? "{}");
    const toAsset = JSON.parse(toData ?? "{}");
    if (!fromAsset.listed || !toAsset.listed) return errorResponse("Assets must be listed.");

    const userBalance = await Kv.get(`balances/${address}/${fromSymbol}`);
    if (!userBalance || parseInt(userBalance) < amount) {
      return errorResponse("Insufficient balance to swap.");
    }

    if (fromAsset.supply < amount) {
      return errorResponse("Not enough supply to perform swap.");
    }

    let totalValue = 0;
    for (let i = 0; i < amount; i++) {
      fromAsset.supply -= ONE_TOKEN;
      totalValue += fromAsset.basePrice + fromAsset.supply * fromAsset.slope;
    }

    let tokensReceived = 0;
    let spent = 0;
    while (spent + toAsset.basePrice + toAsset.supply * toAsset.slope <= totalValue) {
      spent += toAsset.basePrice + toAsset.supply * toAsset.slope;
      toAsset.supply += ONE_TOKEN;
      tokensReceived += ONE_TOKEN;
    }

    if (tokensReceived === 0) {
      return errorResponse("Swap value too low to receive any target tokens.");
    }

    await Kv.set(fromKey, JSON.stringify(fromAsset));
    await Kv.set(toKey, JSON.stringify(toAsset));
    await updateUserBalance(address, fromSymbol, -amount);
    await updateUserBalance(address, toSymbol, tokensReceived);
    await logTransaction(address, {
      type: "swap",
      fromSymbol,
      toSymbol,
      amount,
      received: tokensReceived,
    });

    const response = swapResponseSchema.parse({
      message: `Swapped ${amount} ${fromSymbol} for ${tokensReceived} ${toSymbol}.`,
      valueUsed: spent,
    });

    return successResponse(await addWalletMetadata(address, response));
  } catch (err) {
    if (err instanceof Error) {
      return errorResponse(`Error: ${err.message}`);
    }
    return errorResponse(`Error: ${err}`);
  }
});

router.post("/sell", async (request) => {
  try {
    const body = await request.json();
    const parsed = sellSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.message);

    const address = getCaller(request);

    const { symbol, amount } = parsed.data;
    const key = `assets/${symbol}`;
    const data = await Kv.get(key);
    if (!data) return errorResponse("Asset not found.");

    const asset = JSON.parse(data);
    if (!asset.listed) return errorResponse("Asset is not listed.");

    const userBalance = await Kv.get(`balances/${address}/${symbol}`);
    if (!userBalance || parseInt(userBalance) < amount) {
      return errorResponse("Insufficient balance to sell.");
    }

    // Calculate total return from bonding curve (reverse of buy logic)
    let totalReturn = 0;
    for (let i = 0; i < amount; i++) {
      asset.supply -= ONE_TOKEN;
      totalReturn += asset.basePrice + asset.supply * asset.slope;
    }

    if (totalReturn <= 0) {
      return errorResponse("Sell amount too low to register value.");
    }

    await Kv.set(key, JSON.stringify(asset));
    await updateUserBalance(address, symbol, -amount);
    await Ledger.transfer(address, totalReturn);
    await logTransaction(address, {
      type: "sell",
      symbol,
      amount,
      cost: -totalReturn,
    });

    return successResponse(
      await addWalletMetadata(address, {
        message: `Sold ${amount} ${symbol} for estimated value ${totalReturn.toFixed(2)}`,
      }),
    );
  } catch (err) {
    if (err instanceof Error) {
      return errorResponse(`Error: ${err.message}`);
    }
    return errorResponse(`Error: ${err}`);
  }
});

const handler = (request: Request): Promise<Response> => router.fetch(request);

export default handler;
