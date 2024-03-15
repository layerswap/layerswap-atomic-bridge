#  Interact with Ethereum

## Introduction

At this section you can find an instruction for working with Ethereum HTLC contracts

### Prerequisites

-   Node.js and npm installed on your machine.
-   `.env` file configured with private keys.

## Getting Started

```bash
# navigate to the emv example directory
$ cd examples/evm

# copy .env.example file to .env and configure
$ cp .env.example .env
```

Ensure you have the required environment variables set up in your `.env` file. These include:
-   `FROM_PRIVATE_KEY`: Sender's Wallet Import Format key.
-   `TO_PRIVATE_KEY`: Recipient's Wallet Import Format key.

## Running the script

#### Generate HTLC contract and HashPair

This script facilitates the creation of a HTLC contract, generates a secret and its hash, and sends funds to the created contract (for ERC20, please add the suffix "-erc20" to each command)

```bash
npm run start:htlc
```

#### Create HTLC contract via hashlock
Create HTLC contract via hashlock and locks the specified amount of tokens in an HTLC contract.

```bash
npm run start:lock
```

#### Withdraw (receiver)

Withdraws the funds locked in the HTLC contract. It requires the following parameters (script located at `src/withdraw.ts`):

- `contractId`: The ID of the HTLC contract.
- `proof`: The secret preimage that unlocks the funds.

```bash
npm run start:withdraw
```

#### Withdraw (receiver)

Withdraws the funds locked in the HTLC contract. It requires the following parameters (script located at `src/withdraw.ts`):

- `contractIds`: An array of contract IDs to withdraw.
- `proof`: An array of secrets corresponding to the contract IDs.

```bash
npm run start:withdraw
```

#### Refund (Sender)

This script enables the sender to refund the locked funds from a HTLC contract after the time lock has expired, assuming the receiver has not withdrawn the funds.
It requires the following parameter (script located at `src/refund.ts`):

-   `contractId`: The ID of the HTLC contract.
```bash
npm run start:refund
```
