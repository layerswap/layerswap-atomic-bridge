#  Interact with Bitcoin

## Introduction

At this section you can find an instruction for working with Bitcoin HTLC contracts

### Prerequisites

-   Node.js and npm installed on your machine.
-   Basic understanding of Bitcoin transactions and HTLC
-   `.env` file configured with Bitcoin WIF (Wallet Import Format) keys.

## Getting Started

```bash
# navigate to the bitcoin example directory
$ cd examples/bitcoin

# copy .env.example file to .env and configure
$ cp .env.example .env
```

Ensure you have the required environment variables set up in your `.env` file. These include:
-   `FROM_WIF`: Sender's Wallet Import Format key.
-   `TO_WIF`: Recipient's Wallet Import Format key.
-   `AMOUNT`: Default amount of Bitcoin to lock in the contract (fallback to 5000 if not specified).
-   `LOCK_HEIGHT`: Default lock height for the contract (fallback to 2 if not specified).
-   `OP_RETURN_DATA`:: To include data in your transaction (data is limited to 80 bytes).

## Running the script

#### Generate HTLC address

This script facilitates the creation of a Bitcoin HTLC address, generates a secret and its hash, and sends funds to the created contract address.

```bash
npm run start:lock
```

#### Withdraw (receiver)

This script facilitates the withdrawal process from a Bitcoin HTLC. It requires the following parameters (script located at `src/withdraw.ts`):

-   `hash`: The trx hash of the preimage used to lock funds in the HTLC.
-   `contractAddress`: The address of the HTLC contract on the Bitcoin.
-   `witnessScript`: The script that dictates the spending conditions of the HTLC.
-   `proof`: The secret preimage that unlocks the funds.

```bash
npm run start:withdraw
```

#### Refund (Sender)

This script enables the sender to refund the locked funds from a Bitcoin HTLC after the time lock has expired, assuming the receiver has not withdrawn the funds.
It requires the following parameters (script located at `src/refund.ts`):

-   `hash`: The trx hash of the preimage that was used to lock the funds.
-   `contractAddress`: The address of the HTLC contract on the Bitcoin.
-   `witnessScript`: The script that dictates the spending conditions of the HTLC.
```bash
npm run start:refund
```
