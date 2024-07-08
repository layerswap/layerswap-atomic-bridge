# Layerswap Atomic Bridge
Permissionless, trustless cross-chain bridging protocol without Oracles

## Disclaimer: Development in Progress

Please note that this project is actively under development. It is not ready for deployment on any mainnet environments.
As we continue to experiment and test new ideas, expect significant changes to the interface. Please be prepared for ongoing modifications.

## Protcol design and motivation

An Ideal bridging solution ❌ **SHOULD NOT**:

- Rely on third parties
- Require complex infrastructure
- Introduce additional security assumptions

It **SHOULD** be trustless, open to any participant, and free of external dependencies. This is where the concept of Atomic Swaps comes into play. Atomic Swaps allow for permissionless, trustless asset exchange between two parties without relying on any external verification.

Read full article [here](https://layerswap.notion.site/Layerswap-V2-Atomic-Bridging-Protocol-58944b7ddce54b838a23feee3aebebf5).

---

## Supported Networks

- Bitcoin
  - [Learn more about Bitcoin](https://bitcoin.org/)
  - Bitcoin HTLC package can be found [here](./packages/bitcoin/README.md)
- Ethereum
  - [Learn more about Ethereum](https://ethereum.org/)
  - Ethereum PHTLC package can be found [here](./packages/evm/README.md)
- Starknet
  - [Learn more about Starknet](https://www.starknet.io/en/)
  - Starknet PHTLC package can be found [here](./packages/starknet/README.md)
- TON
  - [Learn more about TON](https://ton.org/)
  - Starknet PHTLC package can be found [here](./packages/ton/README.md)


## Prerequisites

- Node.js and npm installed on your machine.
- Basic understanding of Bitcoin transactions, Smart Contracts, HTLC

## Getting Started

Clone the repository to your local machine:

```bash
git clone git@github.com:layerswap/layerswap-atomic-bridge.git

# navigate to the project directory
cd layerswap-atomic-bridge

# install dependencies
npm install
```

#### Building the project

Once you have cloned the repository and installed all dependencies, you can build the project by running the build command. This command will compile the TypeScript files and make sure everything is set up correctly.

```bash
npm run build
```

This command executes the build scripts defined in the `package.json` file. It sequentially builds each package defined within the monorepo, ensuring that all necessary components are compiled and ready for use.

> If you are working on a specific package, such as the `bitcoin` package, and wish to only build that package, you can do so by running:
> ```bash
> npm run build:bitcoin
> ```