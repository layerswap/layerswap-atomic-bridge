# @layerswap/evm

This package is for HTLC transactions between the any blockchains. HTLC allows direct transactions between different chains. Usage and examples are shown below.

### Deployed Contracts


#### Sepolia（TestNet）

##### native

- Endpoint: https://sepolia.etherscan.io/address/0x9b2e421e5F516bcC991A355E8712af72621C54dF
- Contract address: 0x9b2e421e5F516bcC991A355E8712af72621C54dF

##### ERC20
- Endpoint: https://sepolia.etherscan.io/address/0x2F16E9D5bd67F30AB355369413cA94d858FbDd91
- Contract address: 0x2F16E9D5bd67F30AB355369413cA94d858FbDd91


##### ERC20 Token
- Endpoint: https://sepolia.etherscan.io/address/0xe2E65a43dC5616B1e28472DfD72F40D3a4f81c6E
- Contract address: 0xe2E65a43dC5616B1e28472DfD72F40D3a4f81c6E


## Introduction

Install the necessary libraries

**npm**

```bash
npm install --save web3 @layerswap/evm
```

**yarn**

```bash
yarn add web3 @layerswap/evm
```

HTLC issues a secret and key in advance and uses this to issue a secret lock.

When both parties agree to the transaction, the secret and key are exchanged separately, and the key is used to receive a token. This is how the cross-chain swap is performed.


## Create HTLC contract

You can publish using this package with the following operations.

The output hashPair contains a secret and a proof. The secret is shared in advance, and the proof is issued at a mutually agreed timing.


[native/create-htlc.ts](../../examples/evm/src/native/create-htlc.ts)<br>

[erc20/lock.ts](../../examples/evm/src/erc20/lock.ts)<br>

## Issue a secret lock (aka hashlock)

[lock.ts](../../examples/evm/src/native/lock.ts)

## Unlocking by Proof

With a secret lock, locked assets are withdrawn through a secret proof transaction.


[native/withdraw.ts](../../examples/evm/src/native/withdraw.ts)<br>

[erc20/withdraw.ts](../../examples/evm/src/erc20/withdraw.ts)<br>

## Batch Withdraw

To withdraw multiple HTLCs in a batch.

[native/batc.ts](../../examples/evm/src/native/batch-withdraw.ts)<br>

[erc20/withdraw.ts](../../examples/evm/src/erc20/batch-withdraw.ts)<br>

For more detailed examples, please check the sample collection below

[examples](examples/README.md)


## More Documents

- [about ethereum](https://ethereum.org/)
