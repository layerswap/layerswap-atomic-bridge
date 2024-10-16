# Disclaimer: Development in Progress

Please note that this project is actively under development. It is not ready for deployment on any mainnet environments.
As we continue to experiment and test new ideas, expect significant changes to the interface. Please be prepared for ongoing modifications.

# Hashed Timelock Contracts (HTLCs)

This part of the repository contains anchor solana programs (smart contracts) for implementing Hashed Timelock Contracts (HTLCs) on Solana both for spl Token and sol transactions. 
This programs enable users to create, manage, and interact with HTLCs, facilitating secure and trustless transactions. The programs include functions such as creating new HTLCs, redeeming funds locked in HTLCs with a secret hash, and refunding funds in case of expiration or non-redeem. Users can refer to the program's source code and documentation for detailed information on each function's usage and parameters.

## Programs Overview

### HashedTimelock.sol

**Description**: This program allows users to create HTLCs and PHTLCs on Solana for spl token/sol transactions. It follows a protocol where a sender can create a new HTLC for a specific spl token/sol, a receiver can claim the spl/sol after revealing the secret, and the sender can refund the spl/sol if the time lock expires.

#### Functions

- **commit**: Allows a sender to create a new PHTLC for spl tokens by specifying the receiver, messenger, timelock, token contract, and amount.
- **lock**: Allows a sender to create a new HTLC for spl tokens by specifying the receiver, hashlock, timelock, token contract, and amount.
- **redeem**: Allows the receiver to claim the spl tokens locked in the HTLC by providing the secret hash.
- **lockCommit**: Allows the messenger to lock the commited funds by the given hashlock.
- **unlock**: Allows the sender to unlock the spl tokens if the timelock expires and the receiver has not redeemed the funds.
- **uncommit**: Allows the sender to uncommit the spl tokens if the timelock expires and the messenger has not locked the funds.
- **getLockDetails/getCommitDetails**: Retrieves details of a specific HTLC/PHTLC by its contract ID.


## Deployment

### Prerequisites

- solana and anchor installed
- Solana network connection (e.g., localhost, devnet, etc.)
- Sol or test tokens for deployment gas fees

### Steps

1. Clone this repository:

   ```bash
   git clone <repository_url>

2. Navigate to the project directory:

    ```bash
    cd <project_directory>

3. Build Program:

   ```bash
   anchor build
   
4. Deploy the program
    ```bash
    anchor deploy

5. Test the contracts:

    ```bash
    anchor test/anchor test --skip-local-validator --skip-deploy (To not to redploy the program).

Usage
Once deployed, users can interact with the contracts using Solana wallets or through contract function calls programmatically.

For HashedTimelockERC20.cairo: Users can create HTLCs for ERC20 tokens, redeem tokens, and request refunds.
Refer to the contract source code for function details and usage instructions.

## Acknowledgements

- The initial Anchor implementation was based on the work done in the safe-pay project (https://github.com/PirosB3/SafePaySolana)
