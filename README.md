# Layerswap V8 Atomic Bridge
Permissionless, trustless cross-chain bridging protocol without Oracles

## The Motivation

An Ideal bridging solution ❌ **SHOULD NOT**:

- Rely on third parties
- Require complex infrastructure
- Introduce additional security assumptions

It **SHOULD** be trustless, open to any participant, and free of external dependencies. This is where the concept of Atomic Swaps comes into play. Atomic Swaps allow for permissionless, trustless asset exchange between two parties without relying on any external verification.

Read full article [here](https://layerswap.notion.site).

## Core concept

The network-adding process in the Layerswap protocol is similar to adding an ERC20 token to the Uniswap protocol, making bridging trustless and permissionless.

## Architecture

![image](https://github.com/user-attachments/assets/b9ce1642-179a-4cc2-b1c2-b137153ad66b)

## Disclaimer: Development in Progress

Please note that this project is actively under development. It is not ready for deployment on any mainnet environments.
As we continue to experiment and test new ideas, expect significant changes to the interface. Please be prepared for ongoing modifications.

## Supported Networks

- [Bitcoin](./packages/bitcoin/README.md)
- [Ethereum](./packages/evm/README.md)
- [Starknet](./packages/starknet/README.md)
- [TON](./packages/ton/README.md)
- [Solana](./packages/solana/README.md)
- Aptos/Sui (in progress)
- Stacks (in progress)

---

## Acknowledgements

- The initial HTLC implementation was based on the work done in the atomic-port project by Yuki Uichiro (https://github.com/ymuichiro/atomic-port)
