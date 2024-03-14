#  Interact with Ethereum

## Introduction

At this section you can find an instruction for working with evm HTLC contracts

### Prerequisites

-   Node.js and npm installed on your machine.
-   Basic understanding of Smart Contracts and HTLC
-   `.env` file configured with private keys.

## Getting Started

```bash
# navigate to the evm example directory
$ cd examples/evm

# copy .env.example file to .env and configure
$ cp .env.example .env
```

Ensure you have the required environment variables set up in your `.env` file. These include:
-   `FROM_PRIVATE_KEY`: Sender's Wallet private key.
-   `TO_PRIVATE_KEY`: Recipient's Wallet private key.

## Running the script

#### Generate HTLC contract

This script facilitates the creation of a HTLC contact, generates a secret and its hash, and sends funds to the created contract address.

```bash
npm run start:htlc
```

#### Lock Ethereum funds

To lock Ethereum funds by creating an HTLC on the Ethereum network using hashlock. It requires the following parameter (script located at `src/native/lock.ts`):
- `hashlock`: The hashlock obtained from other network.

```bash
npm run start:lock
```

#### Withdraw (receiver)

This script facilitates the withdrawal process from a Ethereum HTLC. It requires the following parameters (script located at `src/native/withdraw.ts`):

- `contractId`: The HTLC contract ID created on Ethereum network.
- `proof`: The secret preimage that unlocks the funds.

```bash
npm run start:withdraw
```

#### Refund (Sender)

This script enables the sender to refund the locked funds from a Ethreum HTLC after the time lock has expired, assuming the receiver has not withdrawn the funds.
It requires the following parameter (script located at `src/native/refund.ts`):

- `contractId`: The HTLC contract ID created on Ethereum network.
```bash
npm run start:refund
```
