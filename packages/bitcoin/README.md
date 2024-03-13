# @atomic-port/bitcoin

This package is for HTLC transactions between the any blockchains. HTLC allows direct transactions between different chains. Usage and examples are shown below.

<br>

## Attention

This script was created and released for research and experimentation and is not intended to encourage actual use.
Trading of crypto assets may require licenses, applications, or approvals in some countries.
Please consider using them at your own risk.

<br>

## Test is now open to the public.

Transactions on each chain in this library are currently available only on the testnet.
If you wish to use it in a production environment, please change the network and other parameters.

<br>

## Introduction

Install the necessary libraries

**npm**

```
npm install --save @mempool/mempool.js bip65 bitcoinjs-lib@6 ecpair tiny-secp256k1 varuint-bitcoin @atomic-port/bitcoin
```

**yarn**

```
yarn add @mempool/mempool.js bip65 bitcoinjs-lib@6 ecpair tiny-secp256k1 varuint-bitcoin @atomic-port/bitcoin
```

HTLC issues a secret and key in advance and uses this to issue a secret lock.
When both parties agree to the transaction, the secret and key are exchanged separately, and the key is used to receive a token. This is how the cross-chain swap is performed.

<br>

## Create HTLC contract

You can publish using this package with the following operations.
The output hashPair contains a secret and a proof. The secret is shared in advance, and the proof is issued at a mutually agreed timing.

[create-htlc.ts](../../examples/bitcoin/src/create-htlc.ts)

## Issue a secret lock (aka hashlock)


[lock.ts](../../examples/bitcoin/src/lock.ts)

<br>

## Unlocking by Proof

With a secret lock, locked assets are withdrawn through a secret proof transaction.

[withDraw.ts](../../examples/bitcoin/src/withdraw.ts)

<br>

For more detailed examples, please check the sample collection below
[examples](examples/README.md)

<br>

## More Documents

- [about bitcoin](https://bitcoin.org/)
