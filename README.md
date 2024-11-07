# Layerswap V8: Permissionless, Trustless Cross-Chain Bridging Protocol

Live in tesnets - [Layerswap V8](https://layerswap.io/v8)

Read the protocol description and sepc [draft] - [Layerswap V8 Notion](https://layerswap.notion.site)

## TL;DR

- Introduces PreHTLC, an improved version of HTLC for practical atomic swaps
- Permissionless and trustless protocol without reliance on 3rd parties
- Supports multi-hop transactions for bridging between indirectly connected chains
- Alpha version available for testing on multiple testnets

## Introduction

Layerswap V8 is a revolutionary bridging protocol designed to address the challenges of seamless asset movement across the rapidly expanding cryptocurrency ecosystem. As the number of blockchain networks grows, including L1s, L2s, side-chains, and app-chains, the need for efficient and secure cross-chain asset transfer becomes critical.

## Key Features

- **Trustless**: No reliance on oracle-based systems or 3rd parties
- **Permissionless**: Open for any participant to join without compromising security
- **Multi-hop Transactions**: Enables bridging between chains without direct LP connections
- **Censorship Resistant**: Decentralized design resistant to censorship attempts

## Architecture

![image](https://github.com/user-attachments/assets/b9ce1642-179a-4cc2-b1c2-b137153ad66b)

## How It Works

Layerswap V8 introduces PreHTLC (Pre-Hashed Time Lock Contract), an improved version of HTLC that addresses key limitations:

1. User creates a PreHTLC, committing funds for the selected LP
2. LP detects the transaction, generates a Secret, and creates an HTLC on the destination chain
3. User observes the destination transaction and converts their PreHTLC to an HTLC on the source chain
4. LP reveals the Secret on both chains to complete the transfer

This approach resolves issues with secret management, claim transactions on the destination chain, and liveness requirements.


## Disclaimer: Development in Progress

Please note that this project is actively under development. It is not ready for deployment on any mainnet environments.
As we continue to experiment and test new ideas, expect significant changes to the interface. Please be prepared for ongoing modifications.

## Supported Networks

- [Bitcoin](./chains/bitcoin/README.md)
- [EVM](./chains/evm/README.md)
- [Starknet](./chains/starknet/README.md)
- [TON](./chains/ton/README.md)
- [Solana](./chains/solana/README.md)
- Aptos/Sui (in progress)
- Stacks (in progress)

---

## Acknowledgements

- The initial HTLC implementation was based on the work done in the atomic-port project by Yuki Uichiro (https://github.com/ymuichiro/atomic-port)
