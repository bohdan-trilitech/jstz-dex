# jstz-dex Example

This is an example decentralized exchange (DEX) application built with Next.js.

## Getting Started

To run this project locally, follow these steps:

### Prerequisites

You can use either pnpm or npm for package management.

### Installation

1. Navigate to the `jstz-dex` directory:

    ```bash
    cd examples/jstz-dex
    ```

2. Install the dependencies using your preferred package manager:

    ```bash
    # Using pnpm
    pnpm install
    # Or using npm
    npm install
    ```

### Deploying the DEX smart function

1. Navigate to the `jstz-dex/services/dex-assets` directory:

    ```bash
    cd examples/jstz-dex/services/dex-assets
    ```

2. Install the dependencies using your preferred package manager:

    ```bash
    # Using pnpm
    pnpm install
    # Or using npm
    npm install
    ```

3. (optional) Run jstz container if not running already:

    ```bash
    jstz sandbox --container start
    ```
   NOTE: if you don't have jstz CLI installed, please follow the [installation instructions](https://jstz.tezos.com/installation)

4. Build and deploy the DEX smart function:

    ```bash
    # Using pnpm
    pnpm run build
    # Or using npm
    npm run build
    ```
   Smart function will be automatically deployed to the local Jstz sandbox.
   Address of the deployed smart function will be printed in the console and automatically replaced in the `.env` file.

### Running the Development Server

To start the development server, run:

```bash
pnpm run dev
```

The application will be accessible at `http://localhost:3202`.
